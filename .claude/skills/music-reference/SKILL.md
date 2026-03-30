---
name: music-reference
description: Full music theory reference for authoring licks, understanding intervals, and working with the DuoJazz music type system
user-invocable: true
---

# Music Reference

Use this when authoring new licks or working with music theory types in DuoJazz.

## Interval Table (Semitones from Root)

| Semitones | Name | Scale Degree | Example (root=C) |
|-----------|------|-------------|-------------------|
| 0 | Unison | 1 | C |
| 1 | Minor 2nd | b2 | Db |
| 2 | Major 2nd | 2 | D |
| 3 | Minor 3rd | b3 | Eb |
| 4 | Major 3rd | 3 | E |
| 5 | Perfect 4th | 4 | F |
| 6 | Tritone | b5/#4 | F#/Gb |
| 7 | Perfect 5th | 5 | G |
| 8 | Minor 6th | b6 | Ab |
| 9 | Major 6th | 6 | A |
| 10 | Minor 7th | b7 | Bb |
| 11 | Major 7th | 7 | B |
| 12 | Octave | 8 | C |

Negative intervals go below root. Intervals >12 go above the octave.

## Common Jazz Patterns as Intervals

**Major scale:** 0, 2, 4, 5, 7, 9, 11, 12
**Dorian:** 0, 2, 3, 5, 7, 9, 10, 12
**Mixolydian:** 0, 2, 4, 5, 7, 9, 10, 12
**Bebop dominant:** 0, 2, 4, 5, 7, 9, 10, 11, 12
**Blues scale:** 0, 3, 5, 6, 7, 10, 12
**Chromatic approach below:** target - 1
**Chromatic enclosure:** target + 1, target - 1, target

## NoteValue Beats

| Value | Beats | Code |
|-------|-------|------|
| Whole | 4.0 | `.whole` |
| Half | 2.0 | `.half` |
| Quarter | 1.0 | `.quarter` |
| Eighth | 0.5 | `.eighth` |
| Sixteenth | 0.25 | `.sixteenth` |
| Dotted X | X * 1.5 | `.dotted(.quarter)` |
| Triplet X | X * 2/3 | `.triplet(.eighth)` |

## Example: Authoring a New Lick

```swift
// "Cry Me a River" opening phrase (in intervals from root)
static let cryMeARiver = Lick(
    id: "cry-me-a-river",
    name: "Cry Me a River",
    tags: [.ballad, .standard],
    timeSignature: (4, 4),
    notes: [
        LickNote(interval: 12, startBeat: 1.0, value: .quarter),     // octave
        LickNote(interval: 11, startBeat: 2.0, value: .eighth),      // 7th
        LickNote(interval: 9, startBeat: 2.5, value: .eighth),       // 6th
        LickNote(interval: 7, startBeat: 3.0, value: .dotted(.quarter)), // 5th
        LickNote(interval: 4, startBeat: 4.5, value: .eighth),       // 3rd
    ]
)
```

## MIDI Reference

- Middle C = MIDI 60 = `Key.c.midiRoot`
- `Key.rawValue` = semitones from C (0-11)
- `note.midiPitch(root: key.midiRoot)` = absolute MIDI pitch
- Octave shift = ±12 MIDI values

## Instrument Presets (Concert Pitch Ranges)

| Instrument | Transposition | Range (MIDI) | Clef |
|------------|--------------|-------------|------|
| Alto Sax | Eb | 49-80 | treble |
| Tenor Sax | Bb | 44-76 | treble |
| Trumpet | Bb | 52-84 | treble |
| Trombone | C | 40-72 | bass |
| Flute | C | 60-96 | treble |
| Clarinet | Bb | 50-91 | treble |
| Piano | C | 21-108 | treble |
| Guitar | C | 40-76 | treble |
