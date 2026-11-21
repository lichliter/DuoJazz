import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { withAppUrl } from "./lib/browser-harness.mjs";

const execFileAsync = promisify(execFile);
const root = new URL("../", import.meta.url);

const SCRIPTS = [
  "guest",
  "review",
  "account-saving",
  "chart-master",
  "hardening",
  "library",
  "offline-cache",
  "offline-signout",
];

const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
const targets = requested.length
  ? requested.map((name) => name.replace(/^verify-/, "").replace(/\.mjs$/, ""))
  : SCRIPTS;

for (const name of targets) {
  if (!SCRIPTS.includes(name)) {
    console.error(`Unknown verify script "${name}". Available: ${SCRIPTS.join(", ")}`);
    process.exit(1);
  }
}

const summary = [];
await withAppUrl(async (appUrl) => {
  for (const name of targets) {
    const file = `tools/verify-${name}.mjs`;
    const started = performance.now();
    try {
      const { stdout, stderr } = await execFileAsync(process.execPath, [file], {
        cwd: root.pathname,
        env: { ...process.env, APP_URL: appUrl },
        maxBuffer: 10 * 1024 * 1024,
      });
      const ms = Math.round(performance.now() - started);
      summary.push({ name, ok: true, ms });
      console.log(`PASS ${file} (${ms}ms)`);
      if (stdout.trim()) console.log(stdout.trim());
      if (stderr.trim()) console.error(stderr.trim());
    } catch (err) {
      const ms = Math.round(performance.now() - started);
      summary.push({ name, ok: false, ms });
      console.error(`FAIL ${file} (${ms}ms)`);
      if (err.stdout) console.log(err.stdout.trim());
      if (err.stderr) console.error(err.stderr.trim());
      throw err;
    }
  }
});

console.log("\nVerification Summary:");
for (const row of summary) {
  console.log(`  ${row.ok ? "PASS" : "FAIL"}  verify-${row.name}.mjs  ${row.ms}ms`);
}
