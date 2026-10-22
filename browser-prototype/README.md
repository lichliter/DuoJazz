# DuoJazz integration prototype (browser only)

This folder is a **separate, playable browser experiment**. It is not a port of the native SwiftUI iPad app.

```bash
cd browser-prototype
python3 -m http.server 4173 --bind 127.0.0.1
# open http://127.0.0.1:4173/
node --test js/music.test.mjs js/lesson.test.mjs js/session.test.mjs
```

Deep links for screenshots and review:

- `/?screen=home`
- `/?screen=setup&lesson=learn-lick`
- `/?screen=session&lesson=learn-lick&card=learn`
- `/?screen=session&lesson=integrate-minor-home&card=quiz`
- `/?screen=wrapup&lesson=learn-lick&keys=fourths`

## Music

Recognizable **Cry Me a River** minor cell (`9–1–5–♭3–2–1`, one bar) over the **opening eight bars of Autumn Leaves** in concert G minor:

`| Cm7 | F7 | B♭maj7 | E♭maj7 | Am7♭5 | D7 | Gm6 | Gm6 |`

Chart variant: Ultimate Guitar `autumn-leaves-chords-4419731` (jbpicon, key Gm, capo none, Verse 1). Tonic bars are Gm6 as on that chart. This is not the tune’s head, and it is not DuoJazz `iivi-cry-me-enclosure`.

Two ways to use the same cell:

1. **Minor home** — minor-tonic shape on the i6 arrival (bar 7).
2. **Altered dominant** — the same cell a major third down over V7 (bar 6), then a composed resolution into i.

Application copy (shape, target chord, door) is derived from the current concert key. It is not hard-coded to G minor.

## Lesson flow

The module is the Cry Me a River cell. Module home shows the lick, a 12-key strip, and three always-open lessons:

1. **Learn the lick** — isolated cell.
2. **Integrate: minor home** — land it on the i6 arrival (bar 7).
3. **Integrate: altered dominant** — over V7 (bar 6).

A setup sheet remembers choices per lesson: one key / cycle 4ths / chromatic / random, start key, all cards or Listen + Quiz, tempo, and melody octave. The session is full screen: Learn → Play → Listen → Quiz, then a wrap-up per key.

Melody octave (−1 / Original / +1) still moves only the model line and displayed phrase. Default notation is **concert bass clef**.

## What it is not

- Not native iPad / Xcode / simulator verification
- No accounts, backend, or paid services
- Phase 1: no microphone, pitch grading, or medal progress
