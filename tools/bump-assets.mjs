import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { releaseAssets } from "./generate-precache.mjs";

const root = new URL("../", import.meta.url);

function maxNumericVersion(...texts) {
  let max = 0;
  for (const text of texts) {
    for (const match of String(text ?? "").matchAll(/\?v=(\d+)/g)) {
      const value = Number(match[1]);
      if (value > max) max = value;
    }
  }
  return max;
}

function replaceVersionRef(source, assetPath, nextVersion, bumps, targetFile) {
  const escaped = assetPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(${escaped}\\?v=)(\\d+)`, "g");
  let changed = false;
  const updated = source.replace(pattern, (_, prefix, prev) => {
    if (Number(prev) === nextVersion) return `${prefix}${prev}`;
    changed = true;
    bumps.push({ file: targetFile, ref: assetPath, from: Number(prev), to: nextVersion });
    return `${prefix}${nextVersion}`;
  });
  return { text: updated, changed };
}

/** Compute deterministic `?v=` query bumps for changed application assets. */
export function computeBumps({ changedFiles = [], indexHtml, pitchJs, soundPageJs, bumpAll = false }) {
  const normalized = changedFiles.map((file) => String(file).replaceAll("\\", "/"));
  const nextVersion = maxNumericVersion(indexHtml, pitchJs, soundPageJs) + 1;

  const indexTargets = new Set();
  let bumpWorklet = false;

  if (bumpAll) {
    for (const ref of [
      "./css/tokens.css",
      "./css/styles.css",
      "./css/hig.css",
      "./js/verovio-bind.js",
      "./js/app.js",
      "./js/pwa.js",
    ]) indexTargets.add(ref);
    bumpWorklet = true;
  } else {
    for (const file of normalized) {
      if (file === "css/tokens.css" || file === "css/styles.css" || file === "css/hig.css") {
        indexTargets.add(`./${file}`);
      } else if (file === "js/verovio-bind.js") {
        indexTargets.add("./js/verovio-bind.js");
      } else if (file === "js/pwa.js" || file === "sw.js") {
        indexTargets.add("./js/pwa.js");
      } else if (file === "js/pitch-worklet.js") {
        bumpWorklet = true;
        indexTargets.add("./js/app.js");
      } else if (file.startsWith("js/") && file.endsWith(".js") && file !== "js/version.js" && !file.endsWith(".test.mjs")) {
        indexTargets.add("./js/app.js");
      }
    }
  }

  const bumps = [];
  let nextIndexHtml = indexHtml;
  for (const ref of indexTargets) {
    nextIndexHtml = replaceVersionRef(nextIndexHtml, ref, nextVersion, bumps, "index.html").text;
  }

  let nextPitchJs = pitchJs;
  let nextSoundPageJs = soundPageJs;
  if (bumpWorklet) {
    nextPitchJs = replaceVersionRef(nextPitchJs, "./pitch-worklet.js", nextVersion, bumps, "js/pitch.js").text;
    nextSoundPageJs = replaceVersionRef(nextSoundPageJs, "./pitch-worklet.js", nextVersion, bumps, "js/sound-page.js").text;
  }

  return {
    nextVersion,
    bumps,
    indexHtml: nextIndexHtml,
    pitchJs: nextPitchJs,
    soundPageJs: nextSoundPageJs,
    changed: {
      indexHtml: nextIndexHtml !== indexHtml,
      pitchJs: nextPitchJs !== pitchJs,
      soundPageJs: nextSoundPageJs !== soundPageJs,
    },
  };
}

function listChangedFiles() {
  const output = execFileSync("git", ["status", "--porcelain", "-uall"], {
    cwd: root,
    encoding: "utf8",
  });
  const files = [];
  for (const line of output.split(/\r?\n/)) {
    if (!line) continue;
    const raw = line.slice(3).trim();
    const arrow = raw.lastIndexOf(" -> ");
    files.push(arrow >= 0 ? raw.slice(arrow + 4) : raw);
  }
  return files;
}

if (process.argv[1] && new URL(process.argv[1], "file:").href === import.meta.url) {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const bumpAll = args.has("--all");
  const [indexHtml, pitchJs, soundPageJs] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("js/pitch.js", root), "utf8"),
    readFile(new URL("js/sound-page.js", root), "utf8"),
  ]);
  const changedFiles = bumpAll ? [] : listChangedFiles();
  const plan = computeBumps({ changedFiles, indexHtml, pitchJs, soundPageJs, bumpAll });

  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, changedFiles, nextVersion: plan.nextVersion, bumps: plan.bumps }, null, 2));
    process.exit(0);
  }

  const writes = [];
  if (plan.changed.indexHtml) writes.push(writeFile(new URL("index.html", root), plan.indexHtml));
  if (plan.changed.pitchJs) writes.push(writeFile(new URL("js/pitch.js", root), plan.pitchJs));
  if (plan.changed.soundPageJs) writes.push(writeFile(new URL("js/sound-page.js", root), plan.soundPageJs));
  await Promise.all(writes);

  const assets = await releaseAssets();
  await Promise.all([
    writeFile(new URL("js/version.js", root), assets.version),
    writeFile(new URL("precache.js", root), assets.precache),
  ]);

  if (plan.bumps.length) {
    for (const bump of plan.bumps) {
      console.log(`bumped ${bump.file}: ${bump.ref}?v=${bump.from} -> ?v=${bump.to}`);
    }
  } else {
    console.log("no ?v= asset query bumps needed");
  }
  console.log(`precache updated: ${assets.precacheVersion.slice(0, 8)} (release ${assets.release})`);
}
