import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { promisify } from "node:util";
import { precacheSource, releaseAssets, versionSource } from "../tools/generate-precache.mjs";
import { computeBumps } from "../tools/bump-assets.mjs";
import { startStaticServer } from "../tools/dev-server.mjs";

const execFileAsync = promisify(execFile);

test("releaseAssets matches single-pass precacheSource and versionSource", async () => {
  const [assets, precache, version] = await Promise.all([
    releaseAssets(),
    precacheSource(),
    versionSource(),
  ]);
  assert.equal(assets.precache, precache);
  assert.equal(assets.version, version);
  assert.ok(assets.paths.includes("./js/app.js".slice(2)));
});

test("computeBumps increments max version only for changed asset categories", () => {
  const indexHtml = [
    '<link rel="stylesheet" href="./css/tokens.css?v=150">',
    '<link rel="stylesheet" href="./css/styles.css?v=151">',
    '<link rel="stylesheet" href="./css/hig.css?v=156">',
    '<script src="./js/verovio-bind.js?v=150" defer></script>',
    '<script type="module" src="./js/app.js?v=161"></script>',
    '<script type="module" src="./js/pwa.js?v=160"></script>',
  ].join("\n");
  const pitchJs = 'const WORKLET_URL = new URL("./pitch-worklet.js?v=159", import.meta.url);';
  const soundPageJs = 'await ctx.audioWorklet.addModule(new URL("./pitch-worklet.js?v=159", import.meta.url));';

  const cssOnly = computeBumps({
    changedFiles: ["css/hig.css", "js/app.test.mjs"],
    indexHtml,
    pitchJs,
    soundPageJs,
  });
  assert.equal(cssOnly.nextVersion, 162);
  assert.equal(cssOnly.changed.indexHtml, true);
  assert.equal(cssOnly.changed.pitchJs, false);
  assert.match(cssOnly.indexHtml, /hig\.css\?v=162/);
  assert.match(cssOnly.indexHtml, /app\.js\?v=161/);

  const workletAndJs = computeBumps({
    changedFiles: ["js/pitch-worklet.js", "js/app-home.js"],
    indexHtml,
    pitchJs,
    soundPageJs,
  });
  assert.equal(workletAndJs.changed.indexHtml, true);
  assert.equal(workletAndJs.changed.pitchJs, true);
  assert.equal(workletAndJs.changed.soundPageJs, true);
  assert.match(workletAndJs.indexHtml, /app\.js\?v=162/);
  assert.match(workletAndJs.pitchJs, /pitch-worklet\.js\?v=162/);
  assert.match(workletAndJs.soundPageJs, /pitch-worklet\.js\?v=162/);
});

test("dev-server serves index and JS with no-store and blocks traversal", async () => {
  const server = await startStaticServer({ port: 0, liveReload: false });
  try {
    const homeRes = await fetch(server.url);
    assert.equal(homeRes.status, 200);
    assert.equal(homeRes.headers.get("cache-control"), "no-store");
    assert.match(homeRes.headers.get("content-type"), /text\/html/);
    assert.match(await homeRes.text(), /<title>DuoJazz<\/title>/);

    const jsRes = await fetch(new URL("js/app.js", server.url));
    assert.equal(jsRes.status, 200);
    assert.equal(jsRes.headers.get("cache-control"), "no-store");
    assert.match(jsRes.headers.get("content-type"), /text\/javascript/);

    const encodedTraversal = await fetch(`${server.url}%2e%2e%2fpackage.json`);
    assert.equal(encodedTraversal.status, 403);

    for (const rawPath of ["/../package.json", "/%2e%2e/package.json"]) {
      const rawStatus = await new Promise((resolve, reject) => {
        const req = httpRequest({ host: "127.0.0.1", port: server.port, path: rawPath }, (res) => {
          res.resume();
          resolve(res.statusCode);
        });
        req.on("error", reject);
        req.end();
      });
      assert.equal(rawStatus, 403, rawPath);
    }

    const realPackage = await readFile(new URL("../package.json", import.meta.url), "utf8");
    const directPkg = await fetch(`${server.url}package.json`);
    assert.equal(await directPkg.text(), realPackage);
  } finally {
    await server.close();
  }
});

test("new-lick --dry-run emits a valid contract and custom-lick snippet", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "tools/new-lick.mjs",
    "--id", "test-sample-lick",
    "--name", "Test Sample Lick",
    "--key", "F",
    "--quality", "minor",
    "--dry-run",
  ], { cwd: new URL("..", import.meta.url).pathname });
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.dryRun, true);
  assert.equal(parsed.contractPath, "references/lick-drafts/test-sample-lick.json");
  assert.equal(parsed.testPath, "js/test-sample-lick.test.mjs");
  assert.equal(parsed.contract.defaultKeyId, "F");
  assert.match(parsed.snippet, /id: "test-sample-lick"/);
});
