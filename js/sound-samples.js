/**
 * Lazy-load + Cache Storage for sampled backing and the selected instrument's demo line.
 */

export const SAMPLE_VERSION = "duojazz-sound-v2";
export const MANIFEST_URL = new URL("../sound/manifest.json", import.meta.url);

export const PIANO_NOTES = [
  { name: "A2", midi: 45 },
  { name: "C3", midi: 48 },
  { name: "Ds3", midi: 51 },
  { name: "Fs3", midi: 54 },
  { name: "A3", midi: 57 },
  { name: "C4", midi: 60 },
  { name: "Ds4", midi: 63 },
  { name: "Fs4", midi: 66 },
  { name: "A4", midi: 69 },
  { name: "C5", midi: 72 },
];

export const BASS_NOTES = [
  { name: "E1", midi: 28 },
  { name: "F1", midi: 29 },
  { name: "G1", midi: 31 },
  { name: "A1", midi: 33 },
  { name: "C2", midi: 36 },
  { name: "E2", midi: 40 },
  { name: "G2", midi: 43 },
  { name: "A2", midi: 45 },
  { name: "C3", midi: 48 },
  { name: "E3", midi: 52 },
];

export const GUITAR_NOTES = [
  { name: "E2", midi: 40 },
  { name: "G2", midi: 43 },
  { name: "As2", midi: 46 },
  { name: "Cs3", midi: 49 },
  { name: "E3", midi: 52 },
  { name: "G3", midi: 55 },
  { name: "As3", midi: 58 },
  { name: "Cs4", midi: 61 },
  { name: "E4", midi: 64 },
  { name: "G4", midi: 67 },
];

export const TRUMPET_NOTES = [
  { name: "E3", midi: 52 },
  { name: "G3", midi: 55 },
  { name: "As3", midi: 58 },
  { name: "Cs4", midi: 61 },
  { name: "E4", midi: 64 },
  { name: "G4", midi: 67 },
  { name: "As4", midi: 70 },
  { name: "Cs5", midi: 73 },
  { name: "E5", midi: 76 },
  { name: "G5", midi: 79 },
];

export const TENOR_SAX_NOTES = [
  { name: "Gs2", midi: 44 },
  { name: "B2", midi: 47 },
  { name: "D3", midi: 50 },
  { name: "F3", midi: 53 },
  { name: "Gs3", midi: 56 },
  { name: "B3", midi: 59 },
  { name: "D4", midi: 62 },
  { name: "F4", midi: 65 },
  { name: "G4", midi: 67 },
];

export const ALTO_SAX_NOTES = [
  { name: "Cs3", midi: 49 },
  { name: "E3", midi: 52 },
  { name: "G3", midi: 55 },
  { name: "As3", midi: 58 },
  { name: "Cs4", midi: 61 },
  { name: "E4", midi: 64 },
  { name: "G4", midi: 67 },
  { name: "As4", midi: 70 },
  { name: "C5", midi: 72 },
];

export const TROMBONE_NOTES = [
  { name: "E2", midi: 40 },
  { name: "G2", midi: 43 },
  { name: "As2", midi: 46 },
  { name: "Cs3", midi: 49 },
  { name: "E3", midi: 52 },
  { name: "G3", midi: 55 },
  { name: "As3", midi: 58 },
  { name: "Cs4", midi: 61 },
  { name: "E4", midi: 64 },
  { name: "G4", midi: 67 },
];

export const SAMPLE_NOTES = {
  piano: PIANO_NOTES,
  bass: BASS_NOTES,
  guitar: GUITAR_NOTES,
  trumpet: TRUMPET_NOTES,
  "tenor-sax": TENOR_SAX_NOTES,
  "alto-sax": ALTO_SAX_NOTES,
  trombone: TROMBONE_NOTES,
};

export const DRUM_FILES = {
  kick: "kick.m4a",
  snare: "snare.m4a",
  hat: "hat.m4a",
  hatClosed: "hatClosed.m4a",
  ride: "ride.m4a",
  rideBell: "rideBell.m4a",
  brushTap: "brushTap.m4a",
  brushRide: "brushRide.m4a",
};

const SAMPLE_ROOT = new URL("../sound/samples/", import.meta.url);
const BACKING_KINDS = new Set(["piano", "bass"]);

export function sampleUrl(kind, file) {
  return new URL(`${kind}/${file}`, SAMPLE_ROOT).href;
}

function noteEntries(kind, notes) {
  return notes.map((note) => ({
    key: `${kind}:${note.midi}`,
    kind,
    midi: note.midi,
    url: sampleUrl(kind, `${note.name}.m4a`),
  }));
}

export function backingSampleEntries() {
  return [
    ...noteEntries("piano", PIANO_NOTES),
    ...noteEntries("bass", BASS_NOTES),
    ...Object.entries(DRUM_FILES).map(([drum, file]) => ({
      key: `drum:${drum}`,
      kind: "drum",
      drum,
      url: sampleUrl("drums", file),
    })),
  ];
}

export function melodySampleEntries(sampleSet) {
  const notes = SAMPLE_NOTES[sampleSet];
  if (!notes) return [];
  return noteEntries(sampleSet, notes);
}

export function loadEntriesFor(sampleSet = "piano") {
  const seen = new Set();
  const entries = [];
  for (const entry of [...backingSampleEntries(), ...melodySampleEntries(sampleSet)]) {
    if (seen.has(entry.key)) continue;
    seen.add(entry.key);
    entries.push(entry);
  }
  return entries;
}

export function allSampleEntries() {
  const seen = new Set();
  const entries = [];
  for (const entry of [
    ...backingSampleEntries(),
    ...Object.keys(SAMPLE_NOTES).flatMap((kind) => melodySampleEntries(kind)),
  ]) {
    if (seen.has(entry.key)) continue;
    seen.add(entry.key);
    entries.push(entry);
  }
  return entries;
}

export function nearestNote(notes, midi) {
  let best = notes[0];
  let bestDist = Infinity;
  for (const note of notes) {
    const dist = Math.abs(note.midi - midi);
    if (dist < bestDist) {
      best = note;
      bestDist = dist;
    }
  }
  return {
    ...best,
    playbackRate: 2 ** ((midi - best.midi) / 12),
  };
}

async function openCache() {
  if (typeof caches === "undefined") return null;
  try {
    return await caches.open(SAMPLE_VERSION);
  } catch {
    return null;
  }
}

async function fetchArrayBuffer(url, cache) {
  if (cache) {
    const hit = await cache.match(url);
    if (hit) {
      const arrayBuffer = await hit.arrayBuffer();
      return { arrayBuffer, fromCache: true, bytes: arrayBuffer.byteLength };
    }
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Sample failed: ${url}`);
  if (cache) {
    try {
      await cache.put(url, response.clone());
    } catch {
      /* private mode */
    }
  }
  const arrayBuffer = await response.arrayBuffer();
  return { arrayBuffer, fromCache: false, bytes: arrayBuffer.byteLength };
}

export async function loadManifest() {
  const response = await fetch(MANIFEST_URL);
  if (!response.ok) return { totalBytes: 0, files: [] };
  return response.json();
}

export class SampleLibrary {
  constructor() {
    this.buffers = new Map();
    this.ready = false;
    this.error = null;
    this.networkBytes = 0;
    this.packBytes = 0;
    this.coldMs = null;
    this.fromCache = true;
  }

  nearest(kind, midi) {
    const notes = SAMPLE_NOTES[kind] ?? PIANO_NOTES;
    const pick = nearestNote(notes, midi);
    const buffer = this.buffers.get(`${kind}:${pick.midi}`)?.buffer;
    return { ...pick, buffer };
  }

  drum(name) {
    return this.buffers.get(`drum:${name}`)?.buffer ?? null;
  }

  hasKind(kind) {
    const notes = SAMPLE_NOTES[kind];
    if (!notes?.length) return false;
    return notes.every((note) => this.buffers.has(`${kind}:${note.midi}`));
  }

  get backingReady() {
    return backingSampleEntries().every((entry) => this.buffers.has(entry.key));
  }

  hasMelody(sampleSet) {
    if (BACKING_KINDS.has(sampleSet)) return this.hasKind(sampleSet);
    return this.hasKind(sampleSet);
  }

  async load(ctx, { onProgress, sampleSet = "piano" } = {}) {
    const started = typeof performance !== "undefined" ? performance.now() : Date.now();
    const manifest = await loadManifest();
    this.packBytes = manifest.totalBytes ?? 0;
    const cache = await openCache();
    const entries = loadEntriesFor(sampleSet).filter((entry) => !this.buffers.has(entry.key));
    const queue = [...entries];
    const total = Math.max(1, entries.length);
    let loaded = 0;
    this.networkBytes = 0;
    this.fromCache = true;
    const worker = async () => {
      while (queue.length) {
        const entry = queue.shift();
        const { arrayBuffer, fromCache, bytes } = await fetchArrayBuffer(entry.url, cache);
        if (!fromCache) {
          this.fromCache = false;
          this.networkBytes += bytes;
        }
        const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        this.buffers.set(entry.key, { ...entry, buffer });
        loaded += 1;
        onProgress?.({ loaded, total, bytes: this.networkBytes });
      }
    };
    if (entries.length) await Promise.all([worker(), worker(), worker(), worker()]);
    this.ready = this.backingReady;
    this.coldMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - started;
    return this;
  }
}
