---
name: write-lick
description: Author new licks for DuoJazz — covers the interval-based LickElement format, N()/R() helpers, file layout, and how to register new licks in collections
user-invocable: true
---

# Write a Lick

Use this skill when authoring new licks, scales, or collections for DuoJazz. Everything is **interval-based** (semitones from root), so licks are key-agnostic.

## Core Principle

Licks store intervals (semitones from root), not absolute pitches. A major scale is always `0, 2, 4, 5, 7, 9, 11, 12` regardless of key. The app transposes at playback.

## The Type System

```swift
// LickElement: a note or a rest
enum LickElement {
    case note(interval: Int, value: NoteValue)
    case rest(value: NoteValue)
}

// Lick: a full lick definition
struct Lick {
    let id: String            // unique, kebab-case
    let name: String          // display name
    let tags: [Tag]
    let timeSignature: (Int, Int) = (4, 4)
    let elements: [LickElement]
    let chordProgression: ChordProgression? = nil
}
```

## Shorthand Helpers

Always use the `N()` and `R()` helpers defined in `LickNote.swift`:

```swift
N(interval)             // eighth note by default
N(interval, .quarter)   // specific value
N(5, .triplet(.quarter))
R(.half)                // rest
```

## Interval Cheat Sheet

| Degree | Semitones | Common Use |
|--------|-----------|-----------|
| 1 | 0 | root |
| b2 | 1 | |
| 2 | 2 | major 2nd |
| b3 | 3 | minor 3rd |
| 3 | 4 | major 3rd |
| 4 | 5 | perfect 4th |
| b5/#4 | 6 | tritone |
| 5 | 7 | perfect 5th |
| b6 | 8 | minor 6th |
| 6 | 9 | major 6th |
| b7 | 10 | minor 7th |
| 7 | 11 | major 7th |
| 8 | 12 | octave |

Negative intervals go below the root. Values above 12 go above the octave.

## Common Scales as Intervals

| Scale | Intervals |
|-------|-----------|
| Major | `0, 2, 4, 5, 7, 9, 11, 12` |
| Natural minor | `0, 2, 3, 5, 7, 8, 10, 12` |
| Harmonic minor | `0, 2, 3, 5, 7, 8, 11, 12` |
| Melodic minor (asc) | `0, 2, 3, 5, 7, 9, 11, 12` |
| Dorian | `0, 2, 3, 5, 7, 9, 10, 12` |
| Phrygian | `0, 1, 3, 5, 7, 8, 10, 12` |
| Lydian | `0, 2, 4, 6, 7, 9, 11, 12` |
| Mixolydian | `0, 2, 4, 5, 7, 9, 10, 12` |
| Locrian | `0, 1, 3, 5, 6, 8, 10, 12` |
| Major pentatonic | `0, 2, 4, 7, 9, 12` |
| Minor pentatonic | `0, 3, 5, 7, 10, 12` |
| Blues | `0, 3, 5, 6, 7, 10, 12` |
| Bebop dominant | `0, 2, 4, 5, 7, 9, 10, 11, 12` |
| Bebop major | `0, 2, 4, 5, 7, 8, 9, 11, 12` |

## NoteValue Options

| Value | Beats | Code |
|-------|-------|------|
| Whole | 4 | `.whole` |
| Half | 2 | `.half` |
| Quarter | 1 | `.quarter` |
| Eighth | 0.5 | `.eighth` |
| Sixteenth | 0.25 | `.sixteenth` |
| Dotted X | 1.5× base | `.dotted(.quarter)` |
| Triplet X | 2/3× base | `.triplet(.eighth)` |

## Tags

From `Tag.swift`:
- `.iiVI`, `.blues`, `.bebop`, `.turnarounds`, `.modal`
- `.chordTones`, `.approachNotes`, `.chromaticRuns`, `.rhythmChanges`
- `.pentatonic`, `.dominant`, `.minor`

If your lick needs a tag that doesn't exist, add it to `Tag.swift` first (include a `displayName` via the raw value and an SF Symbol `iconName`).

## Authoring Pattern

### Step 1: Write the lick

Add to `DuoJazz/DuoJazz/Data/Licks/BuiltInLicks.swift` under an appropriate `// MARK: -` section:

```swift
// MARK: - Scales

static let majorScale = Lick(
    id: "major-scale",
    name: "Major Scale",
    tags: [.chordTones],
    elements: [
        N(0), N(2), N(4), N(5),   // 1-2-3-4
        N(7), N(9), N(11), N(12), // 5-6-7-8
        N(11), N(9), N(7), N(5),  // 7-6-5-4
        N(4), N(2), N(0, .half),  // 3-2-1
        R(.half),
    ],
    chordProgression: nil
)
```

### Step 2: Register it in `BuiltInLicks.all`

Add the new lick to the `all: [Lick]` array at the top of `BuiltInLicks.swift`.

### Step 3: Add to a collection (if part of a module)

In `DuoJazz/DuoJazz/Data/Collections/BuiltInCollections.swift`, either:
- Add the lick ID to an existing collection's `lickIds`, or
- Create a new `LickCollection` and add it to `BuiltInCollections.all`

```swift
static let scales = LickCollection(
    id: "scales",
    name: "Essential Scales",
    description: "Major, minor, pentatonic, and harmonic minor — the vocabulary of every solo.",
    tags: [.chordTones, .modal],
    lickIds: ["major-scale", "minor-scale", "major-pentatonic", "minor-pentatonic", "harmonic-minor"],
    difficulty: .beginner,
    iconName: "music.note.list"
)
```

### Step 4: Build and verify

```bash
xcodebuild -project DuoJazz/DuoJazz.xcodeproj -scheme DuoJazz \
  -destination 'platform=iOS Simulator,name=iPad Air 11-inch (M3)' build
```

Launch and visually verify in the simulator:

```bash
xcrun simctl launch booted com.brianlichliter.DuoJazz
xcrun simctl io booted screenshot /tmp/debug.png
```

## Rhythm Tips

- **Default is `.eighth`** — just write `N(5)` for an eighth note
- **Stable final notes**: end with `N(0, .half)` + `R(.half)` so the lick breathes
- **Triplets fill a beat**: `N(x, .triplet(.quarter))` × 3 = one beat (half-note feel in triplets)
- **Swing is applied at playback** — write straight eighths, the player swings them
- **Measures auto-group** based on time signature via `elementsByMeasure()`

## Authoring Checklist

- [ ] Unique `id` in kebab-case
- [ ] Descriptive `name` (display name)
- [ ] Relevant `tags`
- [ ] `elements` use `N()` and `R()` helpers, not raw enum cases
- [ ] Rhythm values add up to whole beats per measure (4 beats in 4/4)
- [ ] Added to `BuiltInLicks.all` array
- [ ] Added to a collection's `lickIds` if part of a module
- [ ] Clean build passes
- [ ] Visually verified in simulator — notation renders correctly
- [ ] Optional: `chordProgression` if the lick implies harmony

## Chord Progressions

Common factory presets in `ChordProgression`:
- `.shortIIVI` — 2 bars of ii-V-I in major
- `.longIIVI` — 4 bars of ii-V-I
- `.diatonicTriads` — one bar per triad
- `.diatonicTriadsLong` — longer triad progression
- `.blues12Bar` — standard blues
- `.bluesShort` — condensed blues
- `.rhythmChanges` — I Got Rhythm

Check `ChordProgression+Presets.swift` for the full list, or pass `nil` if the lick doesn't imply specific harmony (scales, technique exercises).
