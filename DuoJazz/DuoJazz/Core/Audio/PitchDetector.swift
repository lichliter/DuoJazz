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
    /// Absolute minimum — never go below this even with adaptive gain
    private let floorThreshold: Float = 0.02

    /// Tracked peak of recent playing amplitude (fast attack, slow decay)
    private var recentPeak: Float = 0

    /// Peak decays slowly (~1% per tick) so it recovers from loud spikes
    private let peakDecay: Float = 0.99

    /// Threshold sits at this fraction of the recent peak
    private let thresholdRatio: Float = 0.10

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

    func pause() {
        tracker?.stop()
        isListening = false
    }

    func resume() {
        tracker?.start()
        isListening = true
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

        // Adaptive threshold: fast attack, very slow decay
        if amp > recentPeak {
            recentPeak = amp
        } else {
            recentPeak *= peakDecay
        }
        let threshold = max(floorThreshold, recentPeak * thresholdRatio)

        guard amp > threshold else {
            self.detectedMidi = 0
            self.detectedFrequency = 0
            return
        }
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
