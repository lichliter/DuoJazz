// Bound account startup even when the SDK is waiting on a stalled auth lock.
export function withTimeout(promise, milliseconds = 15000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Connection timed out. Please try again.')), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Keep the deadline signal alive through reading the response body as well as
// receiving headers. This covers auth, preference saves, and progress requests.
export function fetchWithTimeout(input, init = {}) {
  const signal = AbortSignal.timeout(20000);
  const original = init.signal ?? (input instanceof Request ? input.signal : undefined);
  if (!original) return fetch(input, { ...init, signal });
  const controller = new AbortController();
  const abort = event => {
    controller.abort(event.target.reason);
    original.removeEventListener('abort', abort);
    signal.removeEventListener('abort', abort);
  };
  if (original.aborted) controller.abort(original.reason);
  else {
    original.addEventListener('abort', abort, { once: true });
    signal.addEventListener('abort', abort, { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal });
}
