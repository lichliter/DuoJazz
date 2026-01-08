# Project Plan: VexFlow Notation + Clef Selection

## Overview
Replace the custom Canvas-based notation with VexFlow (via WKWebView) for professional-quality rendering, and add clef selection (treble, bass, alto, tenor).

## Why VexFlow?
- Industry-standard notation rendering
- Full clef support built-in
- Proper enharmonic spelling, beaming, accidentals
- Large community, excellent documentation
- ~200-400KB bundle size (acceptable)

## Task Checklist

### Phase 1: VexFlow Integration Foundation
- [x] Create `vexflow.html` template in Resources/
  - Embed VexFlow 5.x via CDN
  - JavaScript function to render notes with parameters
- [x] Create `VexFlowWebView.swift` (UIViewRepresentable)
  - Wrap WKWebView for SwiftUI
  - Implement WKScriptMessageHandler for JS communication
  - Method to call JavaScript render function

### Phase 2: Note Conversion Logic
- [x] Create `Core/Music/NoteSpeller.swift`
  - MIDI pitch -> VexFlow note name (e.g., 60 -> "c/4")
  - Enharmonic spelling based on key (C# vs Db)
- [x] Map NoteValue -> VexFlow duration strings
  - quarter -> "q", eighth -> "8", half -> "h", etc.

### Phase 3: Clef Support
- [x] Create `Core/Music/Clef.swift` enum
  - Cases: treble, bass, alto, tenor
  - VexFlow clef identifiers
  - Reference pitches for each clef
- [x] Create `ClefPicker.swift` component
  - Menu picker matching KeyPicker style

### Phase 4: View Integration
- [x] Replace `StaffNotationView` with `VexFlowNotationView`
  - Accept lick, key, clef parameters
  - Render via WebView
- [x] Update `LickDetailView`
  - Add `@State var selectedClef: Clef = .treble`
  - Add ClefPicker to UI

### Phase 5: Polish
- [x] Dark/light mode support in VexFlow
- [ ] Loading state while WebView initializes
- [ ] Test all 12 keys x 4 clefs

---

## Lick Detail Page Improvements

### Overview
Enhance the lick details page with better audio quality, proper notation beaming, complete measures with rests, and correct accidental handling relative to key signature.

### Improvement 1: Better Audio Generation

**Current State:**
- Uses AVAudioUnitSampler with Piano.sf2 or system DLS fallback
- Simple MIDI note on/off with fixed velocity (100)
- Swing feel implemented but no articulation variety

**Requirements:**
- Higher quality instrument samples
- Better articulation and dynamics
- Optional: count-in metronome for practice

**Tasks:**
- [ ] Research and select a higher-quality jazz piano SoundFont or sample library
  - Consider: FluidR3, Salamander Piano, or commercial alternatives
  - Evaluate file size vs quality tradeoff for app bundle
- [ ] Bundle the chosen sound file in Resources/Audio/
- [ ] Update LickPlayer to load the new sound bank
- [ ] Add velocity variation for more natural playback
  - Slightly randomize velocity (+/- 5-10)
  - Consider beat-weight dynamics (downbeats slightly louder)
- [ ] Add optional count-in feature
  - 1-bar count-in with metronome clicks before lick plays
  - Toggle in UI or settings
- [ ] Test audio quality on device (speaker and headphones)

### Improvement 2: Correct Note Beaming

**Current State:**
- VexFlow creates individual `StaveNote` objects
- No beaming applied - eighth notes render as separate flags
- VexFlow has `Beam.generateBeams()` but it is not being called

**Requirements:**
- Eighth notes should be beamed in pairs (standard notation convention)
- Follow time signature beat groupings (e.g., 4/4 = beam by quarter note beats)
- Handle mixed note values appropriately

**Tasks:**
- [ ] Update vexflow.html to use VexFlow's Beam API
  - Import `Beam` from Vex.Flow
  - After creating StaveNotes, call `Beam.generateBeams()` with appropriate options
  - Apply beams to context after voice formatting
- [ ] Configure beam groups based on time signature
  - 4/4: beam eighths in pairs (by beat)
  - 3/4: beam eighths in pairs
  - 6/8: beam eighths in groups of 3
- [ ] Test beaming with various note value combinations
  - All eighths (current shortIIVI lick)
  - Mixed quarters and eighths
  - Sixteenth notes
- [ ] Handle edge cases
  - Notes that cross beat boundaries
  - Single eighth notes at end of beat

### Improvement 3: Complete Measures with Rests

**Current State:**
- Licks are stored with explicit startBeat values
- notesByMeasure() groups notes but does not fill gaps
- Voice uses setStrict(false) to allow incomplete measures
- No rests are generated for gaps or pickups

**Requirements:**
- Analyze each measure and fill gaps with appropriate rests
- Support pickup measures (lick doesn't start on beat 1)
- Complete final measure to full duration
- Use correct rest values (half, quarter, eighth rests)

**Tasks:**
- [ ] Create a measure completion utility (MeasureCompleter or extension on Lick)
  - Input: array of LickNotes for a measure, time signature, measure number
  - Output: array of notation elements (notes and rests) filling the measure
- [ ] Implement gap detection algorithm
  - Track "current position" through measure
  - For each gap between notes, calculate duration and generate rest(s)
  - Handle pickup measures (first measure may start after beat 1)
- [ ] Add rest representation to VexFlow data
  - Rests in VexFlow: duration string + "r" suffix (e.g., "qr" for quarter rest)
  - Key can be "b/4" (or any pitch - rests auto-position)
- [ ] Update buildMeasureData() in VexFlowNotationView.swift
  - Call measure completion logic before building note dictionaries
  - Include rest elements in the output
- [ ] Test with various lick structures
  - Licks starting on beat 1
  - Pickup licks (e.g., starting on beat 4)
  - Licks with internal gaps
  - Licks ending mid-measure

### Improvement 4: Remove Redundant Accidentals (Key Signature Awareness)

**Current State:**
- NoteSpeller.spell() returns an accidental for every chromatic pitch
- Key signature IS displayed on staff (stave.addKeySignature)
- But accidentals are still added to notes that are IN the key signature
- Example: In key of Bb, every Bb note shows a redundant flat symbol

**Requirements:**
- Only show accidentals for notes OUTSIDE the key signature
- Show courtesy/cautionary accidentals where appropriate (after naturals in same measure)
- Let VexFlow's key signature define the "default" accidentals

**Tasks:**
- [ ] Create a key signature pitch set utility
  - For each key, list which pitch classes have accidentals in the key signature
  - Example: Bb major -> pitch classes 10 (Bb) and 3 (Eb) are flatted
- [ ] Update NoteSpeller to accept "key signature context"
  - New parameter: set of pitch classes covered by key signature
  - Only return accidental if note is NOT covered by key signature
  - Or if note needs a natural to cancel key signature
- [ ] Update VexFlowNotationView.buildMeasureData()
  - Pass key signature context to NoteSpeller
  - Track accidentals used within each measure for courtesy/cautionary logic
- [ ] Handle accidental memory within measures
  - If a note was altered earlier in the measure, subsequent same-pitch notes may need accidental reminder
  - Standard practice: accidental applies for rest of measure
- [ ] Test across all keys
  - Flat keys (F, Bb, Eb, Ab, Db, Gb)
  - Sharp keys (G, D, A, E, B, F#)
  - Notes in key (no accidental shown)
  - Notes outside key (accidental shown)
  - Naturals canceling key signature accidentals

---

## File Structure
```
Features/LickDetail/
  Components/
    VexFlowNotationView.swift  (update for rests, accidentals)
    ClefPicker.swift
Core/
  Music/
    Clef.swift
    NoteSpeller.swift          (update for key-aware accidentals)
    KeySignature.swift         (new - key signature pitch classes)
    MeasureCompleter.swift     (new - gap filling with rests)
  Audio/
    LickPlayer.swift           (update for better audio)
Resources/
  vexflow.html                 (update for beaming)
  Audio/
    [new soundfont file]       (new - better instrument samples)
```

## Clef Reference Pitches
| Clef | Middle Line | MIDI |
|------|-------------|------|
| Treble | B4 | 71 |
| Bass | D3 | 50 |
| Alto | C4 | 60 |
| Tenor | C4 (4th line) | 60 |

## Enharmonic Spelling Strategy
- Flat keys (F, Bb, Eb, Ab, Db, Gb): prefer flats
- Sharp keys (G, D, A, E, B, F#, C#): prefer sharps
- Lookup table: MIDI + Key -> spelled note name

## Key Signature Reference
| Key | Accidentals | Pitch Classes Affected |
|-----|-------------|------------------------|
| C | None | - |
| G | F# | 6 |
| D | F#, C# | 6, 1 |
| A | F#, C#, G# | 6, 1, 8 |
| E | F#, C#, G#, D# | 6, 1, 8, 3 |
| B | F#, C#, G#, D#, A# | 6, 1, 8, 3, 10 |
| F# | F#, C#, G#, D#, A#, E# | 6, 1, 8, 3, 10, 5 |
| F | Bb | 10 |
| Bb | Bb, Eb | 10, 3 |
| Eb | Bb, Eb, Ab | 10, 3, 8 |
| Ab | Bb, Eb, Ab, Db | 10, 3, 8, 1 |
| Db | Bb, Eb, Ab, Db, Gb | 10, 3, 8, 1, 6 |
| Gb | Bb, Eb, Ab, Db, Gb, Cb | 10, 3, 8, 1, 6, 11 |

## Change Log
- [Previous]: Initial VexFlow integration plan
- [2026-01-07]: Added Lick Detail Page Improvements section with 4 improvements: audio generation, note beaming, measure completion with rests, and key-signature-aware accidentals

---

## Chord Symbols Above Notation

### Overview
Add jazz lead sheet-style chord symbols above the staff notation. For ii-V-I licks, display the standard chord progression (ii-7, V7, Imaj7) that transposes automatically with the selected key.

### Requirements
1. **Hardcoded progression for ii-V-I licks:**
   - Beat 1-2: ii-7 (minor 7th chord)
   - Beat 3-4: V7 (dominant 7th chord)
   - Beat 5-8 (measure 2): Imaj7 (major 7th chord)

2. **Transposition:** Chord symbols transpose with the selected key
   - Bb: C-7, F7, Bbmaj7
   - C: D-7, G7, Cmaj7
   - F: G-7, C7, Fmaj7

3. **Display:** Standard jazz lead sheet positioning above the staff

### Task Checklist

#### Phase 1: Swift Data Models
- [ ] Create `Core/Music/ChordQuality.swift` - enum with minor7, dominant7, major7 cases
- [ ] Create `Core/Music/ChordSymbol.swift` - struct with degree, quality, startBeat, durationBeats
- [ ] Create `Core/Music/ChordProgression.swift` - array of symbols + transposition logic
- [ ] Add optional `chordProgression` property to `Lick` struct
- [ ] Update `BuiltInLicks.shortIIVI` with the ii-V-I chord progression

#### Phase 2: VexFlow JavaScript Updates
- [ ] Import `ChordSymbol` from Vex.Flow in vexflow.html
- [ ] Update `renderNotation()` to accept `chords` array in config
- [ ] Create `createChordSymbol(chordData)` helper function
- [ ] Attach chord symbols to appropriate notes based on beat position
- [ ] Style chord symbols for dark/light mode

#### Phase 3: Swift Integration
- [ ] Update `VexFlowNotationView.swift` to build chord data
- [ ] Update `VexFlowWebView` to include chords in render config
- [ ] Pass chord data through to JavaScript render call

#### Phase 4: Testing
- [ ] Test chord transposition across all 12 keys
- [ ] Verify enharmonic spellings match key signature
- [ ] Test dark mode styling

### Transposition Reference
| Degree | Interval | In C | In Bb | In F |
|--------|----------|------|-------|------|
| ii | +2 semitones | D | C | G |
| V | +7 semitones | G | F | C |
| I | +0 semitones | C | Bb | F |

### Chord Quality Display
| Quality | Display |
|---------|---------|
| minor7 | -7 |
| dominant7 | 7 |
| major7 | maj7 |

### Change Log
- [2026-01-07]: Added Chord Symbols feature plan
