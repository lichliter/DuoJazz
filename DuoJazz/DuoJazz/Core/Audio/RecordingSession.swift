//
//  RecordingSession.swift
//  DuoJazz
//

import Foundation

enum RecordingState: Sendable {
    case idle
    case recording
    case complete(accuracy: Double)
    case failed(Error)

    var isRecording: Bool {
        if case .recording = self { return true }
        return false
    }
}

@Observable
@MainActor
class RecordingSession {
    var state: RecordingState = .idle
    var matcher: PitchMatcher?
    var tempo: Double = 120
    var autoRecord = false
    var onComplete: (() -> Void)?

    let pitchDetector = PitchDetector()
    private let lick: Lick
    /// Written key (what the player reads in notation)
    var writtenKey: Key
    /// MIDI offset from written to concert pitch (e.g., -2 for Bb, +3 for Eb, 0 for C)
    var concertMidiOffset: Int = 0
    var octaveOffset: Int = 0

    var isRecording: Bool {
        if case .recording = state { return true }
        return false
    }

    var progress: Double { matcher?.progress ?? 0 }
    var matchedCount: Int { matcher?.matchedCount ?? 0 }
    var totalCount: Int { matcher?.totalCount ?? 0 }

    /// Last match result from pitch detection callback
    private(set) var lastMatchResult: MatchResult?

    init(lick: Lick, key: Key, octaveOffset: Int = 0) {
        self.lick = lick
        self.writtenKey = key
        self.octaveOffset = octaveOffset
    }

    /// Expected MIDI notes: written pitches shifted to concert pitch
    private func buildExpectedNotes() -> [Int] {
        lick.pitches(in: writtenKey).map { $0 + concertMidiOffset + (octaveOffset * 12) }
    }

    func startRecording() async {
        let hasAccess = await AudioSessionManager.requestMicrophoneAccess()
        guard hasAccess else {
            state = .failed(PitchDetectorError.microphoneAccessDenied)
            return
        }

        do {
            try AudioSessionManager.configureForPitchDetection()
        } catch {
            state = .failed(error)
            return
        }

        let expectedNotes = buildExpectedNotes()
        let matcher = PitchMatcher(expectedMidiNotes: expectedNotes)
        self.matcher = matcher

        pitchDetector.onPitchDetected = { [weak self] midi, _ in
            self?.handlePitchDetected(midi)
        }

        do {
            try pitchDetector.start()
            state = .recording
        } catch {
            state = .failed(error)
        }
    }

    func stopRecording() {
        pitchDetector.stop()
        if case .recording = state {
            let accuracy = matcher?.progress ?? 0
            state = .complete(accuracy: accuracy)

            if accuracy < 1.0 && autoRecord {
                Task {
                    try? await Task.sleep(for: .seconds(0.5))
                    self.reset()
                    await self.startRecording()
                }
            } else if accuracy >= 1.0 {
                Feedback.success()
                Task {
                    try? await Task.sleep(for: .seconds(1.2))
                    self.onComplete?()
                }
            }
        }
    }

    /// Rebuild the matcher with current key/octave (e.g., after user changes octave mid-recording)
    func rebuildMatcher() {
        guard case .recording = state else { return }
        self.matcher = PitchMatcher(expectedMidiNotes: buildExpectedNotes())
    }

    func reset() {
        pitchDetector.stop()
        matcher?.reset()
        state = .idle
    }

    private func handlePitchDetected(_ midi: Int) {
        guard let matcher else { return }
        let result = matcher.evaluate(midi)
        let expectedNotes = matcher.expectedMidiNotes

        // Don't show "wrong" if they're still holding the previous correct note
        switch result {
        case .correct, .holding:
            lastMatchResult = result
        case .incorrect, .tooHigh, .tooLow:
            let prevIndex = matcher.matchedIndices.count - 1
            if prevIndex >= 0,
               abs(midi - expectedNotes[prevIndex]) <= matcher.tolerance {
                lastMatchResult = .holding(count: 0, required: matcher.requiredHoldCount)
            } else {
                lastMatchResult = result
            }
        }

        if case .correct = result, matcher.isComplete {
            stopRecording()
        }
    }
}
