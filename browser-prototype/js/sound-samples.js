/**
 * Lazy-load + Cache Storage for the sampled backing pack used by the app and sound.html.
 */

export const SAMPLE_VERSION = "duojazz-sound-v1";
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

export function sampleUrl(kind, file) {
  return new URL(`${kind}/${file}`, SAMPLE_ROOT).href;
}

export function allSampleEntries() {
  return [
    ...PIANO_NOTES.map((note) => ({
      key: `piano:${note.midi}`,
      kind: "piano",
      midi: note.midi,
      url: sampleUrl("piano", `${note.name}.m4a`),
    })),
    ...BASS_NOTES.map((note) => ({
      key: `bass:${note.midi}`,
      kind: "bass",
      midi: note.midi,
      url: sampleUrl("bass", `${note.name}.m4a`),
    })),
    ...Object.entries(DRUM_FILES).map(([drum, file]) => ({
      key: `drum:${drum}`,
      kind: "drum",
      drum,
      url: sampleUrl("drums", file),
    })),
  ];
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
    const notes = kind === "bass" ? BASS_NOTES : PIANO_NOTES;
    const pick = nearestNote(notes, midi);
    const buffer = this.buffers.get(`${kind}:${pick.midi}`)?.buffer;
    return { ...pick, buffer };
  }

  drum(name) {
    return this.buffers.get(`drum:${name}`)?.buffer ?? null;
  }

  async load(ctx, { onProgress } = {}) {
    const started = typeof performance !== "undefined" ? performance.now() : Date.now();
    const manifest = await loadManifest();
    this.packBytes = manifest.totalBytes ?? 0;
    const cache = await openCache();
    const entries = allSampleEntries();
    const queue = [...entries];
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
        onProgress?.({ loaded, total: entries.length, bytes: this.networkBytes });
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    this.ready = true;
    this.coldMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - started;
    return this;
  }
}
