# DuoJazz browser prototype

A **separate** playable browser prototype for learning one major ii–V–I phrase, placing it in an audible eight-bar form, then fading scaffolding. It does **not** replace the native SwiftUI app and does **not** verify native iPad, Safari-on-device, or microphone grading.

Phrase source: `BuiltInLicks.shortIIVI` in the native catalog (intervals from I, concert pitch).

## Run locally

From this folder:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/`. Chrome/Firefox recommended. Web Audio starts on the first Play tap.

## Loop

1. **Learn** — see/hear the line; pick key and tempo; optional model melody.
2. **Place** — 8 bars: I (improv) → short ii–V–I (the phrase) → I / vi / ii / V (continue). Count-in is one bar.
3. **Make it yours** — fade notation, hide the entrance cue, try a written variation. Quoting every chorus is optional.

Self-assessment stores recall ratings and application ratings **separately** in `localStorage`. Nothing here is automated ear training.

## Tests

```bash
node --test tests/*.test.mjs
```

## Limits

- Browser synthesis (oscillators), not AudioKit or a sampled piano.
- No accounts, backend, mic permission, or pitch detection.
- Layout is iPad-friendly in a browser viewport; that is not a Simulator or device sign-off.
