# DuoJazz integration prototype (browser only)

This folder is a **separate, playable browser experiment**. It is not a port of the native SwiftUI iPad app.

```bash
cd browser-prototype
python3 -m http.server 4173 --bind 127.0.0.1
# open http://127.0.0.1:4173/
node --test js/music.test.mjs js/lesson.test.mjs
```

## Music

Recognizable **Cry Me a River** minor cell (`9–1–5–♭3–2–1`, one bar) over the **opening eight bars of Autumn Leaves** in concert G minor:

`| Cm7 | F7 | B♭maj7 | E♭maj7 | Am7♭5 | D7 | Gm6 | Gm6 |`

Chart variant: Ultimate Guitar `autumn-leaves-chords-4419731` (jbpicon, key Gm, capo none, Verse 1). Tonic bars are Gm6 as on that chart. This is not the tune’s head, and it is not DuoJazz `iivi-cry-me-enclosure`.

Two ways to use the same cell:

1. **Minor home** — minor-tonic shape on the i6 arrival (bar 7).
2. **Altered dominant** — the same cell a major third down over V7 (bar 6), then a composed resolution into i.

Application copy (shape, target chord, door) is derived from the current concert key. It is not hard-coded to G minor.

## Lesson

Four goals, no unlocks and no required order:

1. **Learn** — hear, read, and echo the cell in one key.
2. **Use in a solo** — Listen / Play with help / Play freely over the eight bars. Listen shows the original model; help uses rhythmic slashes plus Get ready / HERE; freely keeps slashes and removes prescribed entrance cues, including bar-number leakage in the surrounding copy.
3. **Explore keys** — the same idea in another minor key. Twelve keys are optional, not a gate.
4. **Check yourself** — learner-controlled recall versus application checks, with a hidden answer until reveal. Marks are stored per key, application, and check kind.

Harmony always lives on one staff. There is no duplicate chord strip. Melody octave (−1 / Original / +1) stays in the transport and still moves only the model line and displayed phrase.

Default notation is **concert bass clef** in a trombone register (G minor cell: A3 G3 D3 Bb2 A2 G2). Treble clef and B♭ written names are separate settings; changing clef does not transpose the audio.

## What it is not

- Not native iPad / Xcode / simulator verification
- No accounts, backend, microphone, or paid services
- Key coverage is optional and is **not** a gate
