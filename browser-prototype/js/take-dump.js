/**
 * Debug capture for one rapid-fire attempt.
 * The JSON is what Brian downloads from Save take on iPad Safari.
 */

export function createTakeLog() {
  return {
    frames: [],
    chunks: [],
    recorder: null,
    mimeType: "",
    blob: null,
    stopPromise: null,
    closing: false,
    recordSealed: false,
  };
}

export function pushTakeFrame(log, frame) {
  if (!log || log.closing) return;
  log.frames.push({
    t: frame?.t ?? 0,
    hz: frame?.hz ?? 0,
    amp: frame?.amp ?? frame?.rms ?? 0,
    confidence: typeof frame?.confidence === "number" && Number.isFinite(frame.confidence)
      ? frame.confidence
      : 0,
  });
}

export function openTakeRecorder(log, stream, Recorder = globalThis.MediaRecorder) {
  if (!log) return null;
  log.chunks = [];
  log.blob = null;
  log.closing = false;
  log.recordSealed = false;
  if (typeof Recorder !== "function" || !stream) {
    log.recorder = null;
    log.stopPromise = Promise.resolve(null);
    return log;
  }
  let recorder;
  try {
    recorder = new Recorder(stream);
  } catch {
    log.recorder = null;
    log.stopPromise = Promise.resolve(null);
    return log;
  }
  log.recorder = recorder;
  log.mimeType = recorder.mimeType || "";
  log.stopPromise = new Promise((resolve) => {
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) log.chunks.push(event.data);
    });
    recorder.addEventListener("stop", () => {
      const type = log.mimeType || recorder.mimeType || "application/octet-stream";
      const blob = new Blob(log.chunks, { type });
      log.blob = blob.size ? blob : null;
      resolve(log.blob);
    });
    recorder.addEventListener("error", () => resolve(null));
  });
  try {
    recorder.start(200);
  } catch {
    log.recorder = null;
    log.stopPromise = Promise.resolve(null);
  }
  return log;
}

export function closeTakeRecorder(log) {
  if (!log) return Promise.resolve(null);
  if (log.closing) return log.stopPromise ?? Promise.resolve(log.blob ?? null);
  log.closing = true;
  const recorder = log.recorder;
  if (!recorder || recorder.state === "inactive") {
    return log.stopPromise ?? Promise.resolve(log.blob ?? null);
  }
  try {
    recorder.requestData?.();
  } catch {
    /* The stop event still flushes the last buffer. */
  }
  try {
    recorder.stop();
  } catch {
    return Promise.resolve(null);
  }
  return log.stopPromise ?? Promise.resolve(null);
}

export function buildTakeRecord(input) {
  const frames = Array.isArray(input?.frames) ? input.frames : [];
  return {
    userAgent: input?.userAgent ?? "",
    sampleRate: input?.sampleRate ?? null,
    trackSettings: input?.trackSettings ?? null,
    instrument: input?.instrument ?? null,
    lesson: input?.lesson ?? null,
    key: input?.key ?? null,
    expectedMidis: Array.isArray(input?.expectedMidis) ? input.expectedMidis.slice() : [],
    frames: frames.map((frame) => ({
      t: frame?.t ?? 0,
      hz: frame?.hz ?? 0,
      amp: frame?.amp ?? 0,
      confidence: frame?.confidence ?? 0,
    })),
    result: input?.result ?? null,
    audioBase64: input?.audioBase64 ?? null,
    audioMimeType: input?.audioMimeType ?? null,
  };
}

export function takeFileName(stamp = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  const name = [
    stamp.getFullYear(),
    pad(stamp.getMonth() + 1),
    pad(stamp.getDate()),
  ].join("");
  const clock = [pad(stamp.getHours()), pad(stamp.getMinutes()), pad(stamp.getSeconds())].join("");
  return `duojazz-take-${name}-${clock}.json`;
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const comma = text.indexOf(",");
      resolve(comma >= 0 ? text.slice(comma + 1) : text);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read-failed"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Save one JSON take. A blob link runs inside the tap.
 * If that download is blocked, hand the same file to the share sheet.
 */
export async function deliverTake(record, options = {}) {
  const filename = options.filename || takeFileName();
  const json = JSON.stringify(record);
  const blob = options.blob ?? new Blob([json], { type: "application/json" });
  const doc = options.document ?? globalThis.document;
  const nav = options.navigator ?? globalThis.navigator;
  const URLApi = options.URL ?? globalThis.URL;
  const FileApi = options.File ?? globalThis.File;
  const file = new FileApi([blob], filename, { type: "application/json" });
  const link = doc?.createElement?.("a");
  const downloadSupported = Boolean(link && "download" in link);
  if (downloadSupported && !options.downloadBlocked) {
    try {
      const url = URLApi.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      link.rel = "noopener";
      (doc.body ?? doc.documentElement).appendChild(link);
      link.click();
      link.remove();
      const revoke = () => URLApi.revokeObjectURL?.(url);
      if (typeof setTimeout === "function") setTimeout(revoke, 1500);
      else revoke();
      return { method: "download", filename, file };
    } catch {
      /* Share sheet below. */
    }
  }
  if (typeof nav?.share === "function") {
    const payload = { files: [file], title: filename };
    if (typeof nav.canShare !== "function" || nav.canShare(payload)) {
      await nav.share(payload);
      return { method: "share", filename, file };
    }
  }
  throw new Error("save-unavailable");
}
