import { execFile, execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { releaseAssets } from "./generate-precache.mjs";

const execFileAsync = promisify(execFile);
const root = new URL("../", import.meta.url);
const rootPath = root.pathname;

function isCheckableJs(file) {
  const normalized = file.replaceAll("\\", "/");
  if (!/\.(js|mjs)$/.test(normalized)) return false;
  if (normalized.startsWith("js/vendor/")) return false;
  if (normalized === "precache.js") return false;
  return normalized === "sw.js" || normalized.startsWith("js/") || normalized.startsWith("tools/");
}

function isPrecachedAsset(file) {
  const normalized = file.replaceAll("\\", "/");
  if (["index.html", "gallery.html", "sound.html", "manifest.webmanifest", "sw.js"].includes(normalized)) return true;
  if (/^(js|css|fonts|icons|images|sound)\//.test(normalized) && !normalized.endsWith(".test.mjs")) return true;
  return false;
}

async function listRepoJsFiles() {
  const files = ["sw.js"];
  for (const dir of ["js", "tools"]) {
    for (const file of await readdir(new URL(dir, root), { recursive: true })) {
      const rel = `${dir}/${file}`.replaceAll("\\", "/");
      if (isCheckableJs(rel)) files.push(rel);
    }
  }
  return files.sort();
}

function listStagedFiles() {
  const out = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
    cwd: root,
    encoding: "utf8",
  });
  return out.split(/\r?\n/).filter(Boolean);
}

async function checkSyntax(files) {
  const concurrency = 8;
  const failures = [];
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    await Promise.all(batch.map(async (file) => {
      try {
        await execFileAsync(process.execPath, ["--check", file], { cwd: rootPath });
      } catch (err) {
        failures.push({ file, output: err.stderr || err.message });
      }
    }));
  }
  return failures;
}

async function findOxlint() {
  const candidates = ["oxlint", `${process.env.HOME ?? ""}/.local/bin/oxlint`].filter(Boolean);
  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ["--version"]);
      return bin;
    } catch {
      // Try next candidate.
    }
  }
  return null;
}

async function runOxlint(bin, targets) {
  if (!targets.length) return { ok: true, output: "" };
  const args = [
    "-D", "correctness",
    "-A", "no-unused-vars",
    "-A", "no-useless-escape",
    "-A", "unicorn/no-useless-spread",
    "-A", "unicorn/no-new-array",
    "-A", "unicorn/no-useless-fallback-in-spread",
    "-A", "unicorn/prefer-set-size",
    "--ignore-pattern", "js/vendor/**",
    ...targets,
  ];
  try {
    const { stdout, stderr } = await execFileAsync(bin, args, { cwd: rootPath });
    return { ok: true, output: `${stdout}${stderr}`.trim() };
  } catch (err) {
    return { ok: false, output: `${err.stdout ?? ""}${err.stderr ?? ""}`.trim() || err.message };
  }
}

async function checkPrecacheFreshness() {
  const [assets, currentPrecache, currentVersion] = await Promise.all([
    releaseAssets(),
    readFile(new URL("precache.js", root), "utf8"),
    readFile(new URL("js/version.js", root), "utf8"),
  ]);
  const stale = [];
  if (currentPrecache !== assets.precache) stale.push("precache.js");
  if (currentVersion !== assets.version) stale.push("js/version.js");
  return stale;
}

const args = new Set(process.argv.slice(2));
const stagedOnly = args.has("--staged");
const checkPrecache = args.has("--precache");

const staged = stagedOnly ? listStagedFiles() : [];
const jsFiles = stagedOnly ? staged.filter(isCheckableJs) : await listRepoJsFiles();

if (jsFiles.length) {
  const syntaxFailures = await checkSyntax(jsFiles);
  if (syntaxFailures.length) {
    for (const failure of syntaxFailures) {
      console.error(`Syntax error in ${failure.file}:\n${failure.output}`);
    }
    process.exit(1);
  }
  console.log(`syntax ok (${jsFiles.length} files)`);

  const oxlintBin = await findOxlint();
  if (oxlintBin) {
    const lintTargets = stagedOnly ? jsFiles : ["js", "tools", "sw.js"];
    const lint = await runOxlint(oxlintBin, lintTargets);
    if (lint.output) console.log(lint.output);
    if (!lint.ok) process.exit(1);
  } else {
    console.log("oxlint not installed; ran node --check only");
  }
} else if (stagedOnly) {
  console.log("no staged JS files to check");
}

if (checkPrecache || (stagedOnly && staged.some(isPrecachedAsset))) {
  const stale = await checkPrecacheFreshness();
  if (stale.length) {
    console.error(`Stale generated release file(s): ${stale.join(", ")}. Run \`npm run release\` (or \`npm run precache\`) and stage the updated files.`);
    process.exit(1);
  }
  console.log("precache fresh");
}
