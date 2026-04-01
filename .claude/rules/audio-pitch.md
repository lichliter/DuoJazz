---
description: Audio engine and pitch detection conventions
globs: ["**/Audio/**", "**/Session/**"]
---

# Audio & Pitch Detection

## Audio Stack
- `LickPlayer` — MIDI playback via AVAudioEngine + AVAudioUnitSampler (SoundFont-based)
- `PitchDetector` — wraps AudioKit's `PitchTap` for real-time pitch tracking
- `PitchMatcher` — compares detected pitch to expected lick notes (sequential matching)
- `RecordingSession` — orchestrates record + match flow, tracks progress per note
- `AudioSessionManager` — configures AVAudioSession for `.playAndRecord`
- `Metronome` — click track (minimal implementation)

## Audio Session Config
```swift
AVAudioSession.sharedInstance().setCategory(
    .playAndRecord,
    mode: .measurement,
    options: [.defaultToSpeaker, .allowBluetooth]
)
```

## Pitch Detection Tuning (needs work on real hardware)
- PitchMatcher tolerance: configurable (default 0 semitones)
- Hold count: 2 consecutive callbacks to confirm a note (configurable)
- Silence floor: 0.02 minimum amplitude threshold
- Adaptive threshold: fast attack, 0.99 decay factor for ambient noise
- Amplitude history: 64-sample circular buffer for waveform visualization
- Notes must be played in sequential order
- Octave errors are a known issue (instrument range vs detected octave)

## LickPlayer.play() signature
```swift
func play(
    lick: Lick, in key: Key, clef: Clef,
    octaveOffset: Int = 0, concertMidiOffset: Int = 0,
    tempo: Double = 120, swing: Bool = true, countIn: Bool = false
)
```
- Swing calculator for eighth notes (long/short based on tempo)
- Velocity humanization (±12 variation, +10 accent on downbeats)
- Articulation ratio (legato for long notes, crisp for short)
- Count-in via MIDI note 76 click

## RecordingSession
- State: `.idle`, `.recording`, `.complete(accuracy: Double)`, `.failed(Error)`
- Has `octaveOffset: Int` property — must be synced when user changes octave
- `autoRecord`: if true and accuracy < 1.0, retries after 0.5s
- `rebuildMatcher()` rebuilds PitchMatcher when octave/key changes mid-recording
