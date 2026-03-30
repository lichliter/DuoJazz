//
//  Metronome.swift
//  DuoJazz
//

import AVFoundation
import Observation

@Observable
final class Metronome {
    private(set) var isPlaying = false
    /// Whether the metronome should play when recording starts
    var enabled = false
    var tempo: Double = 120
    var beatsPerMeasure: Int = 4

    private var audioEngine: AVAudioEngine?
    private var sampler: AVAudioUnitSampler?
    private var tickTask: Task<Void, Never>?

    /// High woodblock for downbeat, low for other beats
    private let downbeatNote: UInt8 = 76
    private let beatNote: UInt8 = 77
    private let downbeatVelocity: UInt8 = 100
    private let beatVelocity: UInt8 = 70
    private let clickDuration: Double = 0.03

    init() {
        setupAudio()
    }

    private func setupAudio() {
        audioEngine = AVAudioEngine()
        sampler = AVAudioUnitSampler()

        guard let audioEngine, let sampler else { return }

        audioEngine.attach(sampler)
        audioEngine.connect(sampler, to: audioEngine.mainMixerNode, format: nil)

        let fallbackURL = URL(fileURLWithPath: "/System/Library/Components/CoreAudio.component/Contents/Resources/gs_instruments.dls")

        do {
            // Use percussion bank (channel 10 / bank 128)
            try sampler.loadSoundBankInstrument(
                at: fallbackURL,
                program: 0,
                bankMSB: UInt8(kAUSampler_DefaultPercussionBankMSB),
                bankLSB: UInt8(kAUSampler_DefaultBankLSB)
            )
        } catch {
            // Fall back to melodic bank — still produces a click
            try? sampler.loadSoundBankInstrument(
                at: fallbackURL,
                program: 0,
                bankMSB: UInt8(kAUSampler_DefaultMelodicBankMSB),
                bankLSB: UInt8(kAUSampler_DefaultBankLSB)
            )
        }
    }

    func start() {
        guard !isPlaying else { return }

        do {
            try audioEngine?.start()
        } catch {
            return
        }

        isPlaying = true
        tickTask = Task { @MainActor in
            var beat = 0
            while !Task.isCancelled {
                let isDownbeat = beat % beatsPerMeasure == 0
                let note = isDownbeat ? downbeatNote : beatNote
                let velocity = isDownbeat ? downbeatVelocity : beatVelocity

                sampler?.startNote(note, withVelocity: velocity, onChannel: 9)
                try? await Task.sleep(for: .seconds(clickDuration))
                sampler?.stopNote(note, onChannel: 9)

                let secondsPerBeat = 60.0 / tempo
                try? await Task.sleep(for: .seconds(secondsPerBeat - clickDuration))

                beat += 1
            }
        }
    }

    func stop() {
        tickTask?.cancel()
        tickTask = nil
        sampler?.stopNote(downbeatNote, onChannel: 9)
        sampler?.stopNote(beatNote, onChannel: 9)
        isPlaying = false
    }

    func toggle() {
        if isPlaying { stop() } else { start() }
    }
}
