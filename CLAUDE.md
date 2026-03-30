# DuoJazz - Duolingo for Jazz Language

A Duolingo-style iPad app for learning jazz licks. Users complete sessions (stacks of mixed cards) to master licks progressively — from visual learning to notation reading to playing by ear across all 12 keys. Tablet-first design (iPad as music stand).

## Tech Stack

| Layer | Tech |
|-------|------|
| UI | **SwiftUI** (MVVM, `@Observable`) |
| Language | **Swift 6.2**, strict concurrency, iOS 18+ |
| Audio | **AudioKit** (pitch detection), **AVAudioEngine** (MIDI playback) |
| Notation | **VexFlow** via WKWebView |
| Storage | **SwiftData** (`LickPreference`, `UserProfile`) |
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
- `Instrument` struct with presets, injected app-wide via Environment from `ContentView`
- `LickPreferenceStore` persists per-lick octave offset via SwiftData
- `UserProfile` persists instrument selection via SwiftData
- Xcode uses `PBXFileSystemSynchronizedRootGroup` — new .swift files auto-discovered

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

## Progress

**Done:** 4-tab architecture, lick catalog, Learn/Play/Listen/Quiz cards, VexFlow notation, MIDI playback, pitch detection, visual feedback, session flow, Licktionary with search/filter, 12-key transposition, clef selection, Instrument model with auto-octave, SwiftData persistence

**Next:** Tune pitch detection on hardware, mastery state progression, SRS scheduling, expand lick library, background chord changes during play-along (hear the harmony while practicing)

**Future:** CloudKit sync, Sign in with Apple, backing tracks, streak widget
