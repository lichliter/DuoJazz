---
name: transcribe-lick
description: Transcribe sheet music from a screenshot into DuoJazz LickElement intervals using Claude's visual music reading
user-invocable: true
---

# Transcribe Lick from Image

Converts a screenshot or photo of sheet music into DuoJazz `LickElement` interval format.

## Step 0: Get and Enhance the Image

### Extract the image path

When the user sends an image inline, the source path appears in the conversation:
```
[Image: source: /Users/user/.claude/image-cache/<uuid>/1.png]
```
Use that path directly. If the user provides a file path instead, use that.

### Crop and enhance the notation

Look at the original image and estimate where the notation staff sits as percentages (top%, bottom%, left%, right%). For social media screenshots, the notation strip is typically a narrow horizontal band.

Run the enhancement tool:
```bash
python3 tools/enhance_notation.py <image_path> --crop <top>,<bottom>,<left>,<right> --scale 4
```

This crops to the notation, converts to grayscale, boosts contrast, scales up 4x, and binarizes. It auto-detects dark backgrounds and inverts them. Output: `/tmp/notation_enhanced.png`

**Read the enhanced image** for all subsequent steps. If the notation is still unclear, adjust the crop region (tighter around the staff) and rerun.

### Crop estimation tips

| Screenshot type | Typical notation region |
|----------------|------------------------|
| Instagram/TikTok (notation overlay on photo) | 60-80% from top, 0-95% width |
| Clean sheet music scan | 5-95% top, 5-95% width |
| iReal Pro / music app export | 10-90% top, 5-95% width |
| Photo of page on music stand | 10-90% top, 5-95% width |

If the first crop misses, look at the output and adjust. Getting the staff centered with some padding is more important than pixel precision.

## Step 1: Read the Context

From the enhanced image, extract:
- **Key** — from key signature (count sharps/flats) or chord symbols
- **Time signature** — if visible (default 4/4)
- **Clef** — treble or bass
- **Chord symbols** — if present, list them left to right

Key signatures: 1#=G, 2#=D, 3#=A, 4#=E, 5#=B, 6#=F# | 1b=F, 2b=Bb, 3b=Eb, 4b=Ab, 5b=Db, 6b=Gb

## Step 2: Read Each Note's Pitch

Go left to right through the staff. For each note or rest, state the note name + octave.

**Treble clef reference:**
```
Above staff:  A5 (1st ledger line), G5 (just above top line)
Lines  (bottom→top): E4, G4, B4, D5, F5
Spaces (bottom→top): F4, A4, C5, E5
Below staff:  D4 (just below), C4 (1st ledger line), B3, A3
```

**Bass clef reference:**
```
Lines  (bottom→top): G2, B2, D3, F3, A3
Spaces (bottom→top): A2, C3, E3, G3
```

**Key signature rules:**
- Key sig accidentals apply to ALL octaves of that note throughout
- An accidental (sharp/flat/natural) before a single note overrides the key sig for the rest of that measure only
- In a new measure, the key sig resets (no carryover of accidentals)

**Reading tips for enhanced images:**
- Notes ON a line: the line passes through the center of the notehead
- Notes IN a space: the notehead sits between two lines
- Count lines/spaces from the bottom — don't estimate positions by eye
- Accidentals sit immediately left of the notehead: # (sharp), b (flat), ♮ (natural)
- If two consecutive notes appear at the same staff position, check for accidentals — one might be altered

Present as a numbered list grouped by measure.

## Step 3: Convert to MIDI Numbers

Formula: `MIDI = (octave + 1) * 12 + pitchClass`

Pitch classes: C=0, C#/Db=1, D=2, D#/Eb=3, E=4, F=5, F#/Gb=6, G=7, Ab/G#=8, A=9, Bb/A#=10, B=11

Quick reference for common notes:
```
C4=60  D4=62  E4=64  F4=65  G4=67  A4=69  B4=71
C5=72  D5=74  E5=76  F5=77  G5=79  A5=81  B5=83
Add 1 for sharp, subtract 1 for flat
```

## Step 4: Compute Intervals from Root

**Root octave rule:** Find the largest `keyPitchClass + 12*n` (starting from MIDI 0) that is **<= the lowest MIDI note** in the lick.

Key pitch classes: C=0, Db=1, D=2, Eb=3, E=4, F=5, F#/Gb=6, G=7, Ab=8, A=9, Bb=10, B=11

Then for each note: `interval = noteMIDI - rootMIDI`

Example (key of D, lowest note D4=62):
- D pitch class = 2 → candidates: ...D3=50, D4=62, D5=74...
- D4(62) <= 62 ✓, D5(74) > 62 → rootMIDI = 62
- D4(62)→0, F#4(66)→4, A4(69)→7, D5(74)→12

## Step 5: Assign Rhythm Values

Identify note duration from the enhanced image:
- **Filled head + beam/flag(s):** eighth (1 flag) or sixteenth (2 flags)
- **Filled head + stem, no flag:** quarter
- **Open head + stem:** half
- **Open head, no stem:** whole
- **Dot after note:** `.dotted(.X)`

**Jazz lick default:** beamed groups of filled noteheads = `.eighth`

DuoJazz shorthand:
- `N(interval)` = eighth note (default)
- `N(interval, .quarter)` = quarter note
- `N(interval, .half)` = half note
- `R(.quarter)` = quarter rest, `R(.half)` = half rest

## Step 6: Verify

1. **Beat count:** Sum all beats. Must equal `beatsPerMeasure * measureCount`.
2. **Chord-tone sense:** Notes under each chord should be chord tones, scale tones, or chromatic approach notes.
3. **Range check:** Intervals typically fall between -5 and 24.

## Output Format

Match `BuiltInLicks.swift` patterns:
```swift
elements: [
    // Description of melodic motion
    N(interval), N(interval), N(interval), N(interval),
    // Next phrase
    N(interval), N(interval), N(interval), N(interval),
    // Resolution
    N(interval, .half),
]
```

## Common Pitfalls

- **Accidentals vs key signature:** A sharp/flat before a single note applies for the rest of that measure. Key signature accidentals apply everywhere unless overridden.
- **Octave errors:** Count lines/spaces from the bottom, don't estimate. Use chord context to disambiguate.
- **Enharmonic spelling:** Bb and A# are the same MIDI pitch. The interval is identical.
- **Courtesy accidentals:** A reminder accidental (e.g., restating a key sig sharp after a bar with a natural) — don't double-count.
- **Natural signs vs sharps:** At low resolution these look similar. Enhancement helps. Context helps: in D major, F♮ and C♮ need natural signs; all other sharps are accidentals on non-key-sig notes.

## Mode B: Python OMR (alternative for clean scans)

For high-quality notation scans already on disk, the OMR tool may work:
```bash
python3 tools/transcribe_notation.py <image_path> --key <KEY> [--root-midi <MIDI>]
```
Always verify OMR output — it struggles with phone photos and social media screenshots.

## Cross-References

- `music-reference` skill — interval table, jazz scale patterns, NoteValue beats
- `.claude/rules/music-types.md` — `LickElement` enum, `Lick` struct, `Key` type
- `BuiltInLicks.swift` — code style reference and existing lick patterns
- `tools/enhance_notation.py` — image preprocessing tool
