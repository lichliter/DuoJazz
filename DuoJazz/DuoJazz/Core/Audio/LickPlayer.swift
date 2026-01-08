//
//  LickPlayer.swift
//  DuoJazz
//

import AVFoundation
import Observation

@Observable
final class LickPlayer {
    private(set) var isPlaying = false
    private var audioEngine: AVAudioEngine?
    private var sampler: AVAudioUnitSampler?
    private var playbackTask: Task<Void, Never>?

    /// Base velocity for notes (MIDI 0-127)
    private let baseVelocity: UInt8 = 90

    /// Velocity variation range (+/- this amount)
    private let velocityVariation: UInt8 = 12

    /// Extra velocity for downbeats (beat 1 and 3 in 4/4)
    private let downbeatAccent: UInt8 = 10

    init() {
        setupAudio()
    }

    private func setupAudio() {
        audioEngine = AVAudioEngine()
        sampler = AVAudioUnitSampler()

        guard let audioEngine, let sampler else { return }

        audioEngine.attach(sampler)
        audioEngine.connect(sampler, to: audioEngine.mainMixerNode, format: nil)

        // Load sound bank - prefer bundled SoundFont, fall back to system
        loadSoundBank()
    }

    private func loadSoundBank() {
        guard let sampler else { return }

        // Try to load bundled SoundFont first (higher quality)
        let soundFontURL = Bundle.main.url(forResource: "Piano", withExtension: "sf2")
            ?? Bundle.main.url(forResource: "JazzPiano", withExtension: "sf2")

        let fallbackURL = URL(fileURLWithPath: "/System/Library/Components/CoreAudio.component/Contents/Resources/gs_instruments.dls")

        do {
            try sampler.loadSoundBankInstrument(
                at: soundFontURL ?? fallbackURL,
                program: 0,  // Piano
                bankMSB: UInt8(kAUSampler_DefaultMelodicBankMSB),
                bankLSB: UInt8(kAUSampler_DefaultBankLSB)
            )
        } catch {
            print("Failed to load sound bank: \(error)")
        }
    }

    func play(
        lick: Lick,
        in key: Key,
        clef: Clef,
        octaveOffset: Int = 0,
        tempo: Double = 120,
        swing: Bool = true,
        countIn: Bool = false
    ) {
        guard !isPlaying else { return }

        playbackTask?.cancel()
        isPlaying = true

        // Start audio engine
        do {
            try audioEngine?.start()
        } catch {
            print("Failed to start audio engine: \(error)")
            isPlaying = false
            return
        }

        let secondsPerBeat = 60.0 / tempo
        let eighthNoteDuration = secondsPerBeat / 2.0
        let pitches = lick.pitches(in: key)
        let beatsPerMeasure = lick.timeSignature.beats

        playbackTask = Task { @MainActor in
            // Optional count-in (one measure of clicks)
            if countIn {
                await playCountIn(beats: beatsPerMeasure, secondsPerBeat: secondsPerBeat)
            }

            for (index, note) in lick.notes.enumerated() {
                guard !Task.isCancelled else { break }

                // Apply clef octave offset + user octave offset so audio matches notation
                let totalOffset = clef.octaveOffset + (octaveOffset * 12)
                let midi = UInt8(clamping: pitches[index] + totalOffset)
                var duration = note.durationBeats * secondsPerBeat

                // Apply swing to eighth notes
                if swing && note.value == .eighth {
                    let beatFraction = note.startBeat.truncatingRemainder(dividingBy: 0.5)
                    let isOnBeat = beatFraction < 0.125 || beatFraction > 0.375

                    if isOnBeat {
                        duration = SwingCalculator.longEighthDuration(baseDuration: eighthNoteDuration, tempo: tempo)
                    } else {
                        duration = max(
                            SwingCalculator.shortEighthDuration(baseDuration: eighthNoteDuration, tempo: tempo),
                            SwingCalculator.minimumShortEighthDuration
                        )
                    }
                }

                // Calculate velocity with variation and beat-weight dynamics
                let velocity = calculateVelocity(for: note, beatsPerMeasure: beatsPerMeasure)

                // Articulation: longer notes get more legato, shorter notes more staccato
                let legatoRatio = articulationRatio(for: note.value)

                // Note on
                sampler?.startNote(midi, withVelocity: velocity, onChannel: 0)

                // Wait for note duration (with articulation-based legato/staccato)
                try? await Task.sleep(for: .seconds(duration * legatoRatio))

                // Note off
                sampler?.stopNote(midi, onChannel: 0)

                // Gap between notes (inverse of legato ratio)
                let gapDuration = duration * (1.0 - legatoRatio)
                if gapDuration > 0.01 {
                    try? await Task.sleep(for: .seconds(gapDuration))
                }
            }

            isPlaying = false
        }
    }

    /// Calculate velocity with humanization and beat-weight dynamics
    private func calculateVelocity(for note: LickNote, beatsPerMeasure: Int) -> UInt8 {
        var velocity = Int(baseVelocity)

        // Add random variation for humanization
        let variation = Int.random(in: -Int(velocityVariation)...Int(velocityVariation))
        velocity += variation

        // Accent downbeats (beat 1 gets strongest accent, beat 3 gets slight accent in 4/4)
        let beatInMeasure = Int((note.startBeat - 1).truncatingRemainder(dividingBy: Double(beatsPerMeasure))) + 1

        if beatInMeasure == 1 {
            // Strong beat - full accent
            velocity += Int(downbeatAccent)
        } else if beatsPerMeasure == 4 && beatInMeasure == 3 {
            // Secondary strong beat in 4/4
            velocity += Int(downbeatAccent / 2)
        }

        // Clamp to valid MIDI range
        return UInt8(clamping: max(40, min(127, velocity)))
    }

    /// Get articulation ratio (how much of the note duration to sustain)
    private func articulationRatio(for value: NoteValue) -> Double {
        switch value {
        case .whole, .half:
            return 0.95  // Very legato for long notes
        case .quarter:
            return 0.88  // Slightly detached
        case .eighth:
            return 0.85  // Jazz eighth note articulation
        case .sixteenth:
            return 0.80  // Shorter, crisper
        case .dotted(let base):
            return articulationRatio(for: base)
        case .triplet(let base):
            return articulationRatio(for: base) * 0.95  // Triplets slightly more connected
        }
    }

    /// Play a count-in before the lick
    private func playCountIn(beats: Int, secondsPerBeat: Double) async {
        // Use a high woodblock-like sound for count-in clicks
        // MIDI note 76 is a high-pitched click sound on most GM sound banks
        let clickNote: UInt8 = 76
        let clickVelocity: UInt8 = 70

        for beat in 1...beats {
            guard !Task.isCancelled else { return }

            // Accent beat 1
            let velocity = beat == 1 ? clickVelocity + 20 : clickVelocity

            sampler?.startNote(clickNote, withVelocity: velocity, onChannel: 0)
            try? await Task.sleep(for: .seconds(0.05))
            sampler?.stopNote(clickNote, onChannel: 0)

            // Wait for rest of beat
            try? await Task.sleep(for: .seconds(secondsPerBeat - 0.05))
        }
    }

    func stop() {
        playbackTask?.cancel()
        // Stop all notes on channel 0
        for note: UInt8 in 0...127 {
            sampler?.stopNote(note, onChannel: 0)
        }
        isPlaying = false
    }
}
