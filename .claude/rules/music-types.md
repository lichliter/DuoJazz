---
description: Music theory types and lick authoring conventions
globs: ["**/*.swift"]
---

# Music Types Reference

## Core Principle
Licks are stored as **intervals (semitones from root)**, not absolute pitches. This makes them key-agnostic.

## Interval Reference
| Degree | Semitones | Name |
|--------|-----------|------|
| 1 (root) | 0 | Unison |
| b2 | 1 | Minor 2nd |
| 2 | 2 | Major 2nd |
| b3 | 3 | Minor 3rd |
| 3 | 4 | Major 3rd |
| 4 | 5 | Perfect 4th |
| b5 | 6 | Tritone |
| 5 | 7 | Perfect 5th |
| b6 | 8 | Minor 6th |
| 6 | 9 | Major 6th |
| b7 | 10 | Minor 7th |
| 7 | 11 | Major 7th |
| 8 | 12 | Octave |

## Key Types

- `NoteValue` — rhythm: `.whole`, `.half`, `.quarter`, `.eighth`, `.sixteenth`, `.dotted(base)`, `.triplet(base)`
- `LickNote` — single note: `interval` (semitones from root), `startBeat`, `value` (NoteValue)
- `Key` — enum with `rawValue` = semitones from C, `midiRoot` = 60 + rawValue
- `KeyOption` — wraps Key with display name, VexFlow signature, flat/sharp spelling
- `Lick` — id, name, tags, timeSignature, notes, chordProgression
- `Instrument` — transposition, range, defaultClef, `recommendedOctaveOffset(for:in:)`
- `Clef` — treble/bass/alto/tenor with `vexflowId`, `middleLineMidi`, `octaveOffset`

## Lick Authoring Pattern

```swift
Lick(
    id: "unique-id",
    name: "Display Name",
    tags: [.iiVI, .bebop],
    timeSignature: (4, 4),
    notes: [
        LickNote(interval: 0, startBeat: 1.0, value: .eighth),  // root
        LickNote(interval: 4, startBeat: 1.5, value: .eighth),  // 3rd
        // ... startBeat increments by note duration
    ],
    chordProgression: ChordProgression(...)  // optional
)
```

- `startBeat` is 1-based (beat 1 = start of measure)
- Intervals can go negative (below root) or above 12 (above octave)
- `pitches(in: .c)` converts intervals to absolute MIDI pitches
