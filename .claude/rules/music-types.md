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

- `LickElement` — enum: `.note(interval: Int, value: NoteValue)` or `.rest(value: NoteValue)`
- `NoteValue` — rhythm: `.whole`, `.half`, `.quarter`, `.eighth`, `.sixteenth`, `.dotted(base)`, `.triplet(base)`
- `Key` — enum with `rawValue` = semitones from C, `midiRoot` = 60 + rawValue
- `KeyOption` — wraps Key with display name, key signature string, flat/sharp spelling
- `Lick` — id, name, tags, timeSignature, elements: [LickElement], chordProgression
- `LickCollection` — id, name, description, tags, lickIds, difficulty, iconName
- `Lesson` — id, moduleId, lickId, cards: [LessonCard] — always 5 cards for a single lick: Learn → Play → Listen × 3
- `LessonCard` — enum: `.learn(lickId)`, `.play(lickId)`, `.listen(lickId)`
- `Instrument` — transposition, range, defaultClef, `recommendedOctaveOffset(for:in:)`
- `Clef` — treble/bass/alto/tenor with `middleLineMidi`, `octaveOffset`
- `Tag` — 12 jazz categories (iiVI, blues, bebop, turnarounds, modal, etc.)
- `Difficulty` — beginner, intermediate, advanced
- `ChordProgression` — array of ChordSymbol with factory presets
- `ABCConverter` — converts Lick → ABC notation string for abcjs rendering

## Lick Authoring Pattern

```swift
Lick(
    id: "unique-id",
    name: "Display Name",
    tags: [.iiVI, .bebop],
    timeSignature: (4, 4),
    elements: [
        .note(interval: 0, value: .eighth),   // root
        .note(interval: 4, value: .eighth),   // major 3rd
        .rest(value: .quarter),               // quarter rest
        // ...
    ],
    chordProgression: ChordProgression(...)  // optional
)
```

- Intervals can go negative (below root) or above 12 (above octave)
- `pitches(in: .c)` converts intervals to absolute MIDI pitches
- `elementsByMeasure()` groups elements into measures based on time signature
