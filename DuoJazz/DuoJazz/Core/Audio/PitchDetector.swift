//
//  PitchDetector.swift
//  DuoJazz
//

import AudioKit
import AudioKitEX
import SoundpipeAudioKit
import Foundation

@Observable
@MainActor
class PitchDetector {
    var detectedMidi: Int = 0
    var detectedFrequency: Float = 0
    var amplitude: Float = 0
    var isListening = false

    /// Rolling amplitude history for waveform visualization
    var amplitudeHistory: [Float] = Array(repeating: 0, count: 64)
    private var historyWriteIndex = 0

    private var engine: AudioEngine?
    private var tracker: PitchTap?
    private var silence: Fader?
    private var silenceThreshold: Float = 0.005

    var onPitchDetected: ((Int, Float) -> Void)?

    func start() throws {
        let engine = AudioEngine()
        guard let input = engine.input else {
            throw PitchDetectorError.noInputAvailable
        }

        // Route input through a silent fader so engine has an output
        let silence = Fader(input, gain: 0)
        engine.output = silence

        let tracker = PitchTap(input, handler: { [weak self] pitch, amp in
            Task { @MainActor in
                self?.handlePitch(pitch: pitch, amplitude: amp)
            }
        })

        self.engine = engine
        self.tracker = tracker
        self.silence = silence

        try engine.start()
        tracker.start()
        isListening = true
        print("[PitchDetector] Started listening, engine running")
    }

    func stop() {
        tracker?.stop()
        engine?.stop()
        tracker = nil
        silence = nil
        engine = nil
        isListening = false
        amplitudeHistory = Array(repeating: 0, count: 64)
        print("[PitchDetector] Stopped")
    }

    private func handlePitch(pitch: [Float], amplitude: [Float]) {
        guard let freq = pitch.first, let amp = amplitude.first else { return }

        // Update amplitude for waveform (circular buffer, O(1))
        self.amplitude = amp
        amplitudeHistory[historyWriteIndex] = amp
        historyWriteIndex = (historyWriteIndex + 1) % amplitudeHistory.count

        guard amp > silenceThreshold else { return }
        guard freq > 20 && freq < 5000 else { return }

        let midi = Int(round(69 + 12 * log2(Double(freq) / 440.0)))
        guard midi >= 21 && midi <= 108 else { return }

        self.detectedMidi = midi
        self.detectedFrequency = freq
        onPitchDetected?(midi, amp)
    }
}

enum PitchDetectorError: Error {
    case noInputAvailable
    case microphoneAccessDenied
}
