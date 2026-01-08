# DuoJazz - Duolingo for Jazz Language

## Product Vision
A Duolingo-style iOS app for learning jazz licks and patterns. Users complete **sessions** (stacks of 5-10 mixed cards) to master licks progressively - from visual learning to notation reading to playing by ear across all 12 keys.

**Platform:** iOS (iPhone + iPad)

---

## Core Concepts

### The Card Stack Architecture
A **Session** = 5-10 mixed cards based on licks from the user's learning queue + SRS review.

| Card Type | UI | Interaction | Goal |
|-----------|-----|-------------|------|
| **Learn Card** | Voice leading diagram, chord voicings | Passive - read, listen, tap "Got it" | Cognitive understanding |
| **Notation Card** | Lick on staff notation | Horn-in-hand - play the notes, pitch detection | Visual-to-Motor connection |
| **Ear Card** | Blank staff or "???" | Listen to playback, play it back | Ear-to-Motor connection |

### The Licktionary (Lick Library)
Each lick has a **mastery state**:

| State | Color | Meaning |
|-------|-------|---------|
| **Locked** | Grey | Haven't started |
| **Learning** | Blue | Seen Learn card, working on Notation/Ear |
| **Mastered** | Gold | Can play by ear in original key |
| **Legendary** | Purple | Can play in all 12 keys |

### Spaced Repetition System (SRS)
- Tracks last practice date per lick per key
- Inserts review cards into daily sessions
- SM-2 algorithm (or simplified variant)

---

## Tech Stack

### Core
| Layer | Tech | Why |
|-------|------|-----|
| UI Framework | **SwiftUI** | Native iOS, declarative, great for cards |
| Language | **Swift 6.2** | Modern concurrency, strict data isolation |
| Min iOS | **iOS 18+** | Latest SwiftUI features, SwiftData |
| Architecture | **MVVM** | Clean separation, testable |

### Audio & Pitch Detection
| Need | Tech | Why |
|------|------|-----|
| Audio Engine | **AVFoundation** | Native, reliable playback |
| Pitch Detection | **AudioKit** | Mature Swift library, real-time pitch tracking |
| MIDI (optional) | **CoreMIDI** | Connect external MIDI instruments |

### Data & Sync
| Need | Tech | Why |
|------|------|-----|
| Local Storage | **SwiftData** | Native, Swift-first ORM |
| Cloud Sync | **CloudKit** | Free with Apple ID, seamless sync |
| Auth | **Sign in with Apple** | Native, privacy-focused |

### Notation Rendering
| Option | Notes |
|--------|-------|
| **Custom SwiftUI** | Draw staff/notes with Canvas - full control |
| **MusicKit** | Apple's music notation (limited) |
| **WebView + VexFlow** | Fallback if custom is too complex |

---

## Project Structure

```
DuoJazz/
├── DuoJazz.xcodeproj
├── DuoJazz/
│   ├── App/
│   │   ├── DuoJazzApp.swift         # App entry point
│   │   └── ContentView.swift        # Root navigation
│   │
│   ├── Features/
│   │   ├── Session/                 # Practice session
│   │   │   ├── SessionView.swift
│   │   │   ├── SessionViewModel.swift
│   │   │   └── Cards/
│   │   │       ├── LearnCardView.swift
│   │   │       ├── NotationCardView.swift
│   │   │       ├── EarCardView.swift
│   │   │       └── CardContainerView.swift
│   │   │
│   │   ├── Library/                 # Licktionary
│   │   │   ├── LibraryView.swift
│   │   │   ├── LickDetailView.swift
│   │   │   └── MasteryBadge.swift
│   │   │
│   │   ├── Progress/                # User stats
│   │   │   └── ProgressView.swift
│   │   │
│   │   └── Settings/
│   │       └── SettingsView.swift
│   │
│   ├── Core/
│   │   ├── Audio/
│   │   │   ├── AudioEngine.swift    # Playback manager
│   │   │   ├── PitchDetector.swift  # Mic input → pitch
│   │   │   └── AudioSession.swift   # AVAudioSession config
│   │   │
│   │   ├── Music/
│   │   │   ├── Note.swift           # Note, Pitch types
│   │   │   ├── Key.swift            # Key enum, transposition
│   │   │   ├── Lick.swift           # Lick model
│   │   │   └── Transpose.swift      # Transposition logic
│   │   │
│   │   ├── SRS/
│   │   │   ├── SRSEngine.swift      # Spaced repetition logic
│   │   │   └── SessionGenerator.swift
│   │   │
│   │   └── Notation/
│   │       ├── StaffView.swift      # Staff rendering
│   │       ├── NoteView.swift       # Individual note
│   │       └── NotationRenderer.swift
│   │
│   ├── Models/                      # SwiftData models
│   │   ├── User.swift
│   │   ├── LickProgress.swift
│   │   └── SessionRecord.swift
│   │
│   ├── Data/
│   │   └── Licks/                   # Lick definitions
│   │       ├── LickCatalog.swift
│   │       └── BuiltInLicks.swift
│   │
│   ├── Resources/
│   │   ├── Audio/                   # Lick audio files
│   │   ├── Assets.xcassets
│   │   └── Localizable.strings
│   │
│   └── Utilities/
│       ├── Extensions/
│       └── Helpers/
│
├── DuoJazzTests/
├── DuoJazzUITests/
└── README.md
```

---

## Swift Code Conventions

### Swift 6 Rules (IMPORTANT)
These rules prevent Claude from using outdated patterns:

1. **Use `@Observable`, NOT `ObservableObject`** - The old `@Published` pattern is deprecated
2. **Use Swift Testing (`@Test`, `#expect`)**, NOT XCTest - Modern test framework
3. **Swift 6 strict concurrency** - No `@MainActor` leaks, proper isolation
4. **No force unwraps (`!`)** - Except `@ViewBuilder` or `IBOutlet` (which we won't use)
5. **Typed throws** - Use `throws(SomeError)` where possible

### Architecture
- **MVVM**: Views observe ViewModels via `@Observable`
- **Dependency Injection**: Pass dependencies explicitly, use Environment for globals
- **No singletons**: Except for AudioEngine (requires single AVAudioSession)

### SwiftUI
```swift
// CORRECT: Use @Observable (Swift 5.9+)
@Observable
class SessionViewModel {
    var currentCardIndex = 0
    var cards: [Card] = []
}

// WRONG: Don't use ObservableObject/@Published
// class SessionViewModel: ObservableObject {
//     @Published var currentCardIndex = 0  // OLD PATTERN
// }

// Use @State for view-local state
// Use @Environment for shared dependencies
```

**View Size Limit: 100 lines max per View file.** If a SwiftUI View exceeds 100 lines, extract sub-views into `Components/` folder. This prevents token bloat and keeps views maintainable.

### Testing (Swift Testing)
```swift
import Testing

@Test func transposeLickToNewKey() {
    let lick = Lick.parkerLeadIn
    let transposed = lick.transposed(to: .g)

    #expect(transposed.originalKey == .g)
    #expect(transposed.notes[0].pitch.midi == 71)  // B4 instead of E4
}

@Test func pitchDetectionWithinTolerance() async {
    let detector = PitchDetector()
    // ...
}
```

### Naming
- Types: `PascalCase` (Note, LickProgress)
- Properties/methods: `camelCase`
- Constants: `camelCase` (not SCREAMING_CASE)
- Protocols: noun or `-able` suffix (Transposable, PitchReceiver)

### Error Handling
- Use `Result` or typed `throws` - no force unwraps
- Custom error types per domain: `AudioError`, `PitchError`
```swift
enum AudioError: Error {
    case microphoneAccessDenied
    case engineStartFailed(underlying: Error)
}

func startRecording() throws(AudioError) { ... }
```

### Music Types

Licks are stored as **intervals (semitones from root)**, not absolute pitches. This makes them key-agnostic - pick any key when practicing.

**Interval reference:**
| Degree | Semitones | Name |
|--------|-----------|------|
| 1 (root) | 0 | Unison |
| 2 | 2 | Major 2nd |
| 3 | 4 | Major 3rd |
| 4 | 5 | Perfect 4th |
| 5 | 7 | Perfect 5th |
| 6 | 9 | Major 6th |
| 7 | 11 | Major 7th |
| 8 | 12 | Octave |

```swift
// MARK: - Rhythm (NoteValue as source of truth)

indirect enum NoteValue: Hashable, Sendable {
    case whole, half, quarter, eighth, sixteenth
    case dotted(NoteValue)
    case triplet(NoteValue)

    var beats: Double {
        switch self {
        case .whole: 4.0
        case .half: 2.0
        case .quarter: 1.0
        case .eighth: 0.5
        case .sixteenth: 0.25
        case .dotted(let base): base.beats * 1.5
        case .triplet(let base): base.beats * (2.0 / 3.0)
        }
    }
}

// MARK: - Lick Note (interval-based)

struct LickNote: Hashable, Sendable {
    let interval: Int       // Semitones from root (0=root, 2=2nd, 4=3rd, 5=4th, 7=5th, 9=6th, 11=7th, 12=octave)
    let startBeat: Double
    let value: NoteValue

    var durationBeats: Double { value.beats }

    /// Convert to absolute MIDI pitch given a root
    func midiPitch(root: Int) -> Int {
        root + interval
    }
}

// MARK: - Key (for selecting practice key)

enum Key: Int, CaseIterable, Sendable {
    case c = 0, cSharp, d, dSharp, e, f, fSharp, g, gSharp, a, aSharp, b

    /// MIDI note number for this key in octave 4 (middle octave)
    var midiRoot: Int { 60 + rawValue }

    var displayString: String {
        switch self {
        case .c: "C"
        case .cSharp: "Db"
        case .d: "D"
        case .dSharp: "Eb"
        case .e: "E"
        case .f: "F"
        case .fSharp: "Gb"
        case .g: "G"
        case .gSharp: "Ab"
        case .a: "A"
        case .aSharp: "Bb"
        case .b: "B"
        }
    }
}

// MARK: - Lick (key-agnostic)

struct Lick: Identifiable, Sendable {
    let id: String
    let name: String
    let category: String
    let timeSignature: (beats: Int, noteValue: Int)
    let notes: [LickNote]

    var noteCount: Int { notes.count }

    /// Get absolute MIDI pitches for a given key
    func pitches(in key: Key) -> [Int] {
        notes.map { $0.midiPitch(root: key.midiRoot) }
    }
}
```

**Example lick definition:**
```swift
// Short ii-V-I: 2nd, 3rd, 4th, 5th, 6th, 8th, 7th, 6th, 5th (all eighths)
let shortIIVI = Lick(
    id: "short-ii-v-i",
    name: "Short ii-V-I",
    category: "ii-V-I",
    timeSignature: (4, 4),
    notes: [
        LickNote(interval: 2, startBeat: 1.0, value: .eighth),   // 2nd
        LickNote(interval: 4, startBeat: 1.5, value: .eighth),   // 3rd
        LickNote(interval: 5, startBeat: 2.0, value: .eighth),   // 4th
        LickNote(interval: 7, startBeat: 2.5, value: .eighth),   // 5th
        LickNote(interval: 9, startBeat: 3.0, value: .eighth),   // 6th
        LickNote(interval: 12, startBeat: 3.5, value: .eighth),  // 8th (octave)
        LickNote(interval: 11, startBeat: 4.0, value: .eighth),  // 7th
        LickNote(interval: 9, startBeat: 4.5, value: .eighth),   // 6th
        LickNote(interval: 7, startBeat: 5.0, value: .eighth),   // 5th
    ]
)

// Play in Bb: lick.pitches(in: .aSharp) → [72, 74, 75, 77, 79, 82, 81, 79, 77]
// Play in C:  lick.pitches(in: .c) → [62, 64, 65, 67, 69, 72, 71, 69, 67]
```

**Usage example:**
```swift
// For PLAYBACK: calculate timing in any key
let lick = BuiltInLicks.shortIIVI
let key = Key.aSharp  // Bb
let tempo: Double = 120  // BPM
let secondsPerBeat = 60.0 / tempo

for note in lick.notes {
    let midi = note.midiPitch(root: key.midiRoot)
    let startTime = note.startBeat * secondsPerBeat
    let duration = note.durationBeats * secondsPerBeat
    playMIDI(note: midi, at: startTime, for: duration)
}

// For NOTATION: interval determines staff position, value determines glyph
for note in lick.notes {
    let glyph = notationGlyph(for: note.value)  // .eighth → "♪"
    let staffPosition = staffY(for: note.interval, in: key)
    drawNote(glyph, at: (note.startBeat * beatWidth, staffPosition))
}
```

---

## Audio & Pitch Detection

### AudioKit Setup
```swift
// Use AudioKit for pitch tracking
import AudioKit

class PitchDetector {
    private var engine: AudioEngine
    private var mic: AudioEngine.InputNode
    private var tracker: PitchTap

    var onPitchDetected: ((Pitch, Float) -> Void)?  // pitch, amplitude

    func start() { ... }
    func stop() { ... }
}
```

### Pitch Tolerance
- Default: ±50 cents (half semitone)
- Configurable in settings for beginners vs advanced

### Audio Session
```swift
// Configure for playback + recording
try AVAudioSession.sharedInstance().setCategory(
    .playAndRecord,
    mode: .measurement,
    options: [.defaultToSpeaker, .allowBluetooth]
)
```

---

## Data Models (SwiftData)

```swift
@Model
class LickProgress {
    var lickId: String
    var key: String  // Which key this progress is for
    var masteryState: MasteryState
    var lastPracticed: Date?
    var nextReview: Date?
    var correctStreak: Int

    @Relationship var user: User?
}

enum MasteryState: String, Codable {
    case locked, learning, mastered, legendary
}
```

---

## MVP Scope (Phase 1)

### Must Have
- [ ] Xcode project setup with SwiftUI
- [ ] 1 hardcoded lick (Parker Lead-in)
- [ ] LearnCard with static diagram
- [ ] NotationCard with staff rendering
- [ ] Audio playback of lick
- [ ] Basic pitch detection (mic → note name)
- [ ] Visual feedback (notes highlight green)
- [ ] Simple 5-card session flow
- [ ] Local progress (SwiftData)

### Phase 2
- [ ] EarCard implementation
- [ ] Licktionary with 10+ licks
- [ ] Mastery state progression
- [ ] Transposition to all 12 keys
- [ ] iPad layout optimization

### Phase 3
- [ ] Full SRS algorithm
- [ ] CloudKit sync
- [ ] Sign in with Apple
- [ ] Backing tracks
- [ ] Widget for daily streak

---

## Development Setup

### Requirements
- Xcode 16+
- iOS 18+ Simulator or device
- Physical device recommended (mic testing)
- Swift 6.2 language mode enabled

### Dependencies (Swift Package Manager)
```swift
// Package.swift dependencies
.package(url: "https://github.com/AudioKit/AudioKit", from: "5.6.0"),
.package(url: "https://github.com/AudioKit/SoundpipeAudioKit", from: "5.6.0"),
```

### Build & Run (Xcode)
1. Open `DuoJazz.xcodeproj` in Xcode
2. Select target device/simulator
3. ⌘R to build and run
4. Grant microphone permission when prompted

### Build & Test (CLI for Claude)
Claude can build and test without Xcode GUI using these commands:

```bash
# Find the project (if unsure of path)
ls -R | grep xcodeproj

# Build for simulator
xcodebuild -project DuoJazz.xcodeproj -scheme DuoJazz \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  build

# Run tests
xcodebuild test -project DuoJazz.xcodeproj -scheme DuoJazz \
  -destination 'platform=iOS Simulator,name=iPhone 16'

# Clean build
xcodebuild clean -project DuoJazz.xcodeproj -scheme DuoJazz
```

---

## Assets & SF Symbols

Claude cannot see inside `Assets.xcassets`. Keep a reference list here:

### SF Symbols Used
| Symbol | Usage |
|--------|-------|
| `music.note.list` | App icon placeholder, library |
| `play.fill` | Start practice, play lick |
| `mic.fill` | Recording/pitch detection active |
| `checkmark.circle.fill` | Correct note played |
| `xmark.circle.fill` | Incorrect note |
| `ear` | Ear training card |
| `doc.text` | Notation card |
| `lightbulb` | Learn card |
| `star.fill` | Mastery indicator |
| `crown.fill` | Legendary status |
| `books.vertical` | Licktionary |

### Color Palette
| Name | Hex | Usage |
|------|-----|-------|
| `AccentColor` | System Blue | Primary actions |
| `MasteryGold` | `#FFD700` | Mastered state |
| `LegendaryPurple` | `#8B5CF6` | Legendary state |
| `LearningBlue` | `#3B82F6` | Learning state |
| `LockedGray` | `#9CA3AF` | Locked state |
| `CorrectGreen` | `#22C55E` | Correct note feedback |
| `IncorrectRed` | `#EF4444` | Wrong note feedback |

---

## Notes
- Start with ONE lick working end-to-end
- Test pitch detection on real device early (simulator mic is limited)
- Design mobile-first (horn players holding phone)
- Consider iPad as music stand use case
- Accessibility: VoiceOver support for visually impaired musicians
- **View file limit**: Keep SwiftUI views under 100 lines
