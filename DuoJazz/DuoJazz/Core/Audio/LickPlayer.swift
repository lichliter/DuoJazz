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
        concertMidiOffset: Int = 0,
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
        let beatsPerMeasure = lick.timeSignature.beats
        let totalOffset = concertMidiOffset + (octaveOffset * 12)

        playbackTask = Task { @MainActor in
            if countIn {
                await playCountIn(beats: beatsPerMeasure, secondsPerBeat: secondsPerBeat)
            }

            var currentBeat = 0.0
            var eighthIndex = 0  // Track position for swing

            for element in lick.elements {
                guard !Task.isCancelled else { break }

                let duration = element.durationBeats * secondsPerBeat

                switch element {
                case .note(let interval, let value):
                    let midi = UInt8(clamping: key.midiRoot + interval + totalOffset)
                    var noteDuration = duration

                    // Apply swing to eighth notes
                    if swing && value == .eighth {
                        let isOnBeat = eighthIndex % 2 == 0
                        if isOnBeat {
                            noteDuration = SwingCalculator.longEighthDuration(baseDuration: eighthNoteDuration, tempo: tempo)
                        } else {
                            noteDuration = max(
                                SwingCalculator.shortEighthDuration(baseDuration: eighthNoteDuration, tempo: tempo),
                                SwingCalculator.minimumShortEighthDuration
                            )
                        }
                        eighthIndex += 1
                    } else {
                        eighthIndex = 0
                    }

                    let velocity = calculateVelocity(currentBeat: currentBeat, beatsPerMeasure: beatsPerMeasure)
                    let legatoRatio = articulationRatio(for: value)

                    sampler?.startNote(midi, withVelocity: velocity, onChannel: 0)
                    try? await Task.sleep(for: .seconds(noteDuration * legatoRatio))
                    sampler?.stopNote(midi, onChannel: 0)

                    let gap = noteDuration * (1.0 - legatoRatio)
                    if gap > 0.01 {
                        try? await Task.sleep(for: .seconds(gap))
                    }

                case .rest:
                    try? await Task.sleep(for: .seconds(duration))
                }

                currentBeat += element.durationBeats
            }

            isPlaying = false
        }
    }

    /// Calculate velocity with humanization and beat-weight dynamics
    private func calculateVelocity(currentBeat: Double, beatsPerMeasure: Int) -> UInt8 {
        var velocity = Int(baseVelocity)
        let variation = Int.random(in: -Int(velocityVariation)...Int(velocityVariation))
        velocity += variation

        let beatInMeasure = Int(currentBeat.truncatingRemainder(dividingBy: Double(beatsPerMeasure)))
        if beatInMeasure == 0 {
            velocity += Int(downbeatAccent)
        } else if beatsPerMeasure == 4 && beatInMeasure == 2 {
            velocity += Int(downbeatAccent / 2)
        }

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
