//
//  Feedback.swift
//  DuoJazz
//

import AVFoundation

/// Short audio cues for non-musical UI feedback
@MainActor
final class Feedback {
    static let shared = Feedback()

    private let engine = AVAudioEngine()
    private let sampler = AVAudioUnitSampler()
    private var isSetup = false

    private init() {}

    private func ensureSetup() {
        guard !isSetup else { return }
        isSetup = true

        engine.attach(sampler)
        engine.connect(sampler, to: engine.mainMixerNode, format: nil)
        engine.mainMixerNode.outputVolume = 1.0

        let soundFontURL = Bundle.main.url(forResource: "Piano", withExtension: "sf2")
            ?? Bundle.main.url(forResource: "JazzPiano", withExtension: "sf2")
        let fallbackURL = URL(fileURLWithPath: "/System/Library/Components/CoreAudio.component/Contents/Resources/gs_instruments.dls")

        // Program 9 = Glockenspiel in General MIDI — bright, celebratory
        try? sampler.loadSoundBankInstrument(
            at: soundFontURL ?? fallbackURL,
            program: 9,
            bankMSB: UInt8(kAUSampler_DefaultMelodicBankMSB),
            bankLSB: UInt8(kAUSampler_DefaultBankLSB)
        )

        try? engine.start()
    }

    /// Short celebratory arpeggio: C major triad up to the octave, played fast
    static func success() {
        Task { @MainActor in
            shared.ensureSetup()
            shared.playArpeggio()
        }
    }

    private func playArpeggio() {
        let notes: [UInt8] = [72, 76, 79, 84] // C5, E5, G5, C6
        let stepMs: UInt64 = 60
        let holdMs: UInt64 = 500

        for (i, midi) in notes.enumerated() {
            Task { @MainActor [weak self] in
                guard let self else { return }
                try? await Task.sleep(for: .milliseconds(Int(stepMs) * i))
                sampler.startNote(midi, withVelocity: 127, onChannel: 0)
                try? await Task.sleep(for: .milliseconds(Int(holdMs)))
                sampler.stopNote(midi, onChannel: 0)
            }
        }
    }
}
