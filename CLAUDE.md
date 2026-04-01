# DuoJazz - Duolingo for Jazz Language

A Duolingo-style iPad app for learning jazz licks. Users complete sessions (stacks of mixed cards) to master licks progressively — from visual learning to notation reading to playing by ear across all 12 keys. Tablet-first design (iPad as music stand).

## Tech Stack

| Layer | Tech |
|-------|------|
| UI | **SwiftUI** (MVVM, `@Observable`) |
| Language | **Swift 6.2**, strict concurrency, iOS 18+ |
| Audio | **AudioKit** (pitch detection), **AVAudioEngine** (MIDI playback) |
| Notation | **abcjs 6.5.2** via WKWebView (`ABCNotationView` + `ABCConverter`) |
| Storage | **SwiftData** (`LickPreference`, `UserProfile`, `LickMastery`, `ModuleProgress`) |
| Deps | AudioKit 5.6+, SoundpipeAudioKit 5.7+ (SPM) |

## Swift 6 Rules (IMPORTANT)

1. **Use `@Observable`**, NOT `ObservableObject`/`@Published`
2. **Use Swift Testing** (`@Test`, `#expect`), NOT XCTest
3. **Swift 6 strict concurrency** — no `@MainActor` leaks
4. **No force unwraps** (`!`)
5. **Typed throws** — `throws(SomeError)` where possible
6. **View file limit: 100 lines max** — extract to `Components/` folder
7. **Instrument via `@Environment(\.instrument)`** — never hardcode clef/transposition

## Key Architecture Patterns

- Licks are **interval-based** (semitones from root), not absolute pitches — key-agnostic
- `LickElement` enum: `.note(interval:value:)` or `.rest(value:)` — licks use `elements: [LickElement]`, not `notes`
- `ABCConverter` converts `Lick` → ABC notation strings; `ABCNotationView` renders via WKWebView + abcjs
- `Instrument` struct with 10 presets, injected app-wide via `@Environment(\.instrument)` from `ContentView`
- `LickPreferenceStore` persists per-lick octave offset and tempo via SwiftData
- `UserProfile` persists instrument selection and autoRecord preference via SwiftData
- `LickMastery` + `MasteryStore` tracks card progression per lick per key
- `ModuleProgress` + `ModuleProgressStore` tracks lesson completion with medal system (bronze/silver/gold)
- `LickCatalog.shared` — central lick lookup (by ID, tag, collection, or search)
- `Lesson.generate(from:catalog:mastery:)` — builds 8-card sessions based on current mastery state
- Xcode uses `PBXFileSystemSynchronizedRootGroup` — new .swift files auto-discovered

## 4-Tab Architecture

| Tab | View | Purpose |
|-----|------|---------|
| Licktionary | `LicktionaryView` | Search/filter all licks by name and tag |
| Lessons | `DiscoverView` | Browse collections, select key, start sessions |
| Library | `LibraryHomeView` | User's active learning paths with progress |
| Profile | `ProfileView` | Instrument selection, mastery stats, medals |

### Session Flow
`DiscoverView` → `ModuleDetailView` (collection + key picker) → `SessionView` (card stack) → `SessionCompleteView`

Card types in progression order: **Learn** (see + hear) → **Play** (see + record) → **Listen** (hear + record)

## Build & Test (CLI)

```bash
# Build
xcodebuild -project DuoJazz/DuoJazz.xcodeproj -scheme DuoJazz \
  -destination 'platform=iOS Simulator,name=iPad Air 11-inch (M3)' build

# Test
xcodebuild test -project DuoJazz/DuoJazz.xcodeproj -scheme DuoJazz \
  -destination 'platform=iOS Simulator,name=iPad Air 11-inch (M3)'

# Launch on sim
xcrun simctl install booted <path-to-DuoJazz.app>
xcrun simctl launch booted com.brianlichliter.DuoJazz

# Screenshot sim (for visual debugging)
xcrun simctl io booted screenshot /tmp/debug.png

# Deploy to iPad
xcodebuild -project DuoJazz/DuoJazz.xcodeproj -scheme DuoJazz \
  -destination generic/platform=iOS -allowProvisioningUpdates build
xcrun devicectl device install app --device <DEVICE_ID> <path-to-DuoJazz.app>
# Find device ID: xcrun devicectl list devices
```

## Content

- **26 licks** across 5 categories (ii-V-I, blues, bebop, technique, triads)
- **5 collections**: Triads, First Jazz Phrases, Blues Basics, Bebop Essentials, ii-V-I: Next Level
- **10 instrument presets**: alto sax, tenor sax, trumpet, trombone, flute, clarinet, piano, guitar, English horn, alto flute

## Progress

**Done:** 4-tab architecture, lick catalog (26 licks, 5 collections), Learn/Play/Listen cards, abcjs notation with ABC converter, MIDI playback (swing, humanization, velocity, count-in), pitch detection (AudioKit PitchTap), sequential note matching, waveform visualization, session flow with card progression, session completion, Licktionary with search/filter by tag, 12-key transposition, clef selection, instrument model with auto-octave and transposition, SwiftData persistence (preferences, mastery, module progress, user profile), medal system (bronze/silver/gold per module), auto-record mode

**Next:** Tune pitch detection on hardware, expand lick library, background chord changes during play-along (hear the harmony while practicing)

**Future:** CloudKit sync, Sign in with Apple, backing tracks, streak tracking (currently stub), streak widget
