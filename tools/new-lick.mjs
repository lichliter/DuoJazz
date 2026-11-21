import { access, mkdir, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") {
      args.dryRun = true;
    } else if (token.startsWith("--") && i + 1 < argv.length) {
      args[token.slice(2)] = argv[++i];
    }
  }
  return args;
}

function buildContract({ id, name, key, quality }) {
  return {
    id,
    name,
    status: "draft",
    source: {
      title: name,
      notes: "Document the musical source, adaptation status, and pitch/rhythm confirmation.",
    },
    keyQuality: quality,
    defaultKeyId: key,
    pickupBeats: 0,
    learnBeats: 4,
    notes: [
      { pitch: key, interval: 0, diatonicStep: 0, durationBeats: 1 },
    ],
    endRestBeats: 3,
  };
}

function buildTestTemplate({ id, name, key }) {
  return `import test from "node:test";
import assert from "node:assert/strict";
import { MODULES, lickById } from "./registry.js";
import { getKey, phraseNotes } from "./music.js";

test("${name} contract and notation invariants", () => {
  const lick = lickById("${id}");
  assert.equal(lick.id, "${id}");
  const mod = MODULES.find((item) => item.id === "${id}");
  assert.ok(mod, "Module ${id} should be registered");
  const notes = phraseNotes(getKey("${key}"), "concert", "${id}-learn");
  assert.ok(notes.length > 0);
});
`;
}

function buildCustomLickSnippet({ id, name, key, quality }) {
  const backingQuality = quality === "minor" ? "minor7" : "major7";
  return `  {
    lick: {
      id: ${JSON.stringify(id)},
      name: ${JSON.stringify(name)},
      shortName: ${JSON.stringify(name)},
      source: "Brian’s lick",
      octave: -1,
      pickupBeats: 0,
      learnBeats: 4,
      keyQuality: ${JSON.stringify(quality)},
      defaultKeyId: ${JSON.stringify(key)},
      elements: [N(0, 1), R(3)],
    },
    learnForm: {
      id: ${JSON.stringify(`${id}-learn`)},
      title: ${JSON.stringify(name)},
      shortTitle: "The lick",
      keyQuality: ${JSON.stringify(quality)},
      bars: [bar([chord(0, ${JSON.stringify(backingQuality)})])],
    },
    learnApplication: {
      id: ${JSON.stringify(`${id}-learn`)},
      lickId: ${JSON.stringify(id)},
      formId: ${JSON.stringify(`${id}-learn`)},
      label: "Learn the lick",
      cellTonicInterval: 0,
      phraseStartBar: 1,
      leadIn: [],
      resolve: [],
      copyKind: "learn",
    },
    module: {
      id: ${JSON.stringify(id)},
      lickId: ${JSON.stringify(id)},
      name: ${JSON.stringify(name)},
      lessons: [{
        id: ${JSON.stringify(`${id}-learn`)},
        kind: "learn",
        applicationId: ${JSON.stringify(`${id}-learn`)},
        title: "Learn the lick",
        coverTitle: "Learn the lick",
        summary: "Describe the phrase and harmonic center.",
        context: "The lick in this key",
        defaultKeyId: ${JSON.stringify(key)},
      }],
    },
    practiceDefinitions(lick) {
      return [];
    },
  },`;
}

async function exists(url) {
  try {
    await access(url);
    return true;
  } catch {
    return false;
  }
}

const opts = parseArgs(process.argv.slice(2));
const id = opts.id;
const name = opts.name;
const key = opts.key ?? "C";
const quality = opts.quality ?? "minor";

if (!id || !name || !/^[a-z0-9-]+$/.test(id) || !["major", "minor"].includes(quality)) {
  console.error('Usage: npm run new-lick -- --id <slug> --name "<Name>" [--key C] [--quality major|minor] [--dry-run]');
  process.exit(1);
}

const contractUrl = new URL(`references/lick-drafts/${id}.json`, root);
const testUrl = new URL(`js/${id}.test.mjs`, root);
const contractJson = JSON.stringify(buildContract({ id, name, key, quality }), null, 2) + "\n";
const testSource = buildTestTemplate({ id, name, key });
const snippet = buildCustomLickSnippet({ id, name, key, quality });

if (opts.dryRun) {
  console.log(JSON.stringify({
    dryRun: true,
    contractPath: `references/lick-drafts/${id}.json`,
    testPath: `js/${id}.test.mjs`,
    contract: JSON.parse(contractJson),
    snippet,
  }, null, 2));
  process.exit(0);
}

if (await exists(contractUrl) || await exists(testUrl)) {
  console.error(`Target files for "${id}" already exist.`);
  process.exit(1);
}

await mkdir(new URL("references/lick-drafts", root), { recursive: true });
await Promise.all([
  writeFile(contractUrl, contractJson),
  writeFile(testUrl, testSource),
]);

console.log(`Created references/lick-drafts/${id}.json and js/${id}.test.mjs.`);
console.log("\nAdd this entry to CUSTOM_LICKS in js/licks/custom-licks.js:\n");
console.log(snippet);
