# DuoJazz integration prototype (browser only)

This folder is a **separate, playable browser experiment**. It is not a port of the native SwiftUI iPad app.

```bash
cd browser-prototype
python3 -m http.server 4173 --bind 127.0.0.1
# open http://127.0.0.1:4173/
# backing A/B (dev only): http://127.0.0.1:4173/sound.html  Current / New (busy) / New-simple
node --test js/*.test.mjs
```

Deep links for screenshots and review:

- `/?screen=home`
- `/?screen=home&demo=path`
- `/?screen=setup&lesson=learn-lick`
- `/?screen=session&lesson=learn-lick&card=learn`
- `/?screen=session&lesson=integrate-minor-home&card=quiz`
- `/?screen=wrapup&lesson=learn-lick&keys=fourths&demo=grades`
- `/?screen=home&demo=medal`
- `/?screen=session&lesson=learn-lick&card=play&mic=denied`

## Music

Recognizable **Cry Me a River** minor cell (`9–1–5–♭3–2–1`, one bar) over the **opening eight bars of Autumn Leaves** in concert G minor:

`| Cm7 | F7 | B♭maj7 | E♭maj7 | Am7♭5 | D7 | Gm6 | Gm6 |`

Chart variant: Ultimate Guitar `autumn-leaves-chords-4419731` (jbpicon, key Gm, capo none, Verse 1). Tonic bars are Gm6 as on that chart. This is not the tune’s head, and it is not DuoJazz `iivi-cry-me-enclosure`.

Two ways to use the same cell:

1. **Minor home** — minor-tonic shape on the i6 arrival (bar 7).
2. **Altered dominant** — the same cell a major third down over V7 (bar 6), then a composed resolution into i.

Application copy (shape, target chord, door) is derived from the current concert key. It is not hard-coded to G minor.

## Lesson flow

The module is the Cry Me a River cell. Module home is a Duolingo-style winding path of record-sleeve lesson nodes (Learn amber, minor-home teal, altered-dominant oxblood). A terracotta banner shows the lick and medal count. Tapping any sleeve opens setup. Three always-open lessons:

1. **Learn the lick** — isolated cell.
2. **Integrate: minor home** — land it on the i6 arrival (bar 7).
3. **Integrate: altered dominant** — over V7 (bar 6).

A setup sheet remembers choices per lesson: one key / cycle 4ths / chromatic / random, start key, all cards or Listen + Quiz, tempo, and melody octave. The session is full screen: Learn → Play → Listen → Quiz, then a wrap-up per key.

Melody octave (−1 / Original / +1) still moves only the model line and displayed phrase. Default notation is **concert bass clef**. Continue without a take on Play, Listen, or Quiz is **Skipped**, never a 0% pass. Pitch observations reset at the start of every card and every take.

Play, Listen, and Quiz cards are graded from the microphone (YIN in an AudioWorklet) on pitch (±50 cents) and onset timing. Learn is not graded. A key is mastered when Quiz is passed in Learn the lick and in at least one integration lesson. Bronze / Silver / Gold at 1 / 6 / 12 keys. Progress is monotonic in localStorage.

## What it is not

- Not native iPad / Xcode / simulator verification
- No accounts, backend, or paid services
- Real microphone accuracy needs a check on an iPad with a horn. Headless grading uses `window.__DUOJAZZ__.feedPitchTrack`.
