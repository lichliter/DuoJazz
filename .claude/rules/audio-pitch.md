---
description: Audio engine and pitch detection conventions
globs: ["**/Audio/**", "**/Session/**"]
---

# Audio & Pitch Detection

## Audio Stack
- `LickPlayer` — MIDI playback via AVAudioEngine + AVAudioUnitSampler
- `PitchDetector` — wraps AudioKit's `PitchTap` for real-time pitch tracking
- `PitchMatcher` — compares detected pitch to expected lick notes (sequential matching)
- `RecordingSession` — orchestrates record + match flow, tracks progress per note
- `AudioSessionManager` — configures AVAudioSession for `.playAndRecord`

## Audio Session Config
```swift
AVAudioSession.sharedInstance().setCategory(
    .playAndRecord,
    mode: .measurement,
    options: [.defaultToSpeaker, .allowBluetooth]
)
```

## Pitch Detection Tuning (needs work)
- PitchMatcher tolerance: currently ±1 semitone
- Hold count: currently 2 consecutive callbacks to confirm a note
- Silence threshold: 0.005 amplitude
- Notes must be played in sequential order
- Octave errors are a known issue (instrument range vs detected octave)

## LickPlayer.play() signature
```swift
func play(lick: Lick, in key: Key, clef: Clef, octaveOffset: Int = 0, tempo: Double = 120)
```

## RecordingSession
- Has `octaveOffset: Int` property — must be synced when user changes octave
- Tracks `state`: `.idle`, `.recording`, `.complete(matched, total)`
