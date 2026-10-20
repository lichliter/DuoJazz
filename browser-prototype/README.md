# DuoJazz integration prototype (browser only)

This folder is a **separate, playable browser experiment**. It is not a port of the native SwiftUI iPad app and does not replace it.

Open `index.html` via a local static server (modules will not load from `file://`):

```bash
cd browser-prototype
python3 -m http.server 4173 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:4173/`.

Music-logic tests (no browser, no audio hardware):

```bash
cd browser-prototype
node --test js/music.test.mjs
```

## What it is

One focus phrase: DuoJazz lick `short-ii-v-i` (Short ii–V–I).

1. **Learn** — hear it, inspect exact notes and rhythm, choose concert key and tempo.
2. **Place** — eight-bar loop. Improvise bars 1–2, take a cue into bars 3–4, resolve, keep going 5–8.
3. **Make it yours** — fade notation and entrance cues; quoting is optional.

Audio is a browser synth with count-in, start / pause / restart, looping accompaniment, optional model phrase, and swing eighths. B♭ written labels are concert + major second; **sound remains concert**. Self-assessment is manual. The prototype does not grade pitch or musicality.

## What it is not

- Not native iPad / Xcode / simulator verification
- Not a React Native or PWA migration
- No accounts, backend, microphone, or paid services
- Key coverage is tracked separately and is **not** a gate before application
