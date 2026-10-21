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

1. **Minor home** — G-minor shape at the Gm arrival (bar 7).
2. **Altered dominant** — E♭-minor shape over D7 (bar 6), then a composed resolution into Gm.

## Lesson

Default path (isolated cell practice is optional, not a gate):

1. **Hear** — an original eight-bar model solo with a lead-in, the cell at its real location, and a continuation/resolution.
2. **Try** — the same backing without the model; entrance cue and room before/after.
3. **Yours** — chord chart only. Entrance labels, target styling, phrase notation, and default model playback are removed.
4. **Check-in** — optional self-assessment after playing. Recall stays separate from application, and the two harmonic jobs do not share marks.

Default notation is **concert bass clef** in a trombone register (G minor cell: A3 G3 D3 Bb2 A2 G2). A **melody octave** control next to the chorus (−1 / Original / +1) shifts the model line and displayed phrase by exact octaves; accompaniment, bass, chord symbols, key, count-in, and click stay put. Treble clef and B♭ written names are separate settings; changing clef does not transpose the audio. Eighth notes are beamed in beat groups.

Tempo stays in the transport. Key, clef, B♭ written names, swing, metronome, and guide tones live in Settings. Melody octave is saved locally and is not a Settings item.

## What it is not

- Not native iPad / Xcode / simulator verification
- No accounts, backend, microphone, or paid services
- Key coverage is optional and is **not** a gate
