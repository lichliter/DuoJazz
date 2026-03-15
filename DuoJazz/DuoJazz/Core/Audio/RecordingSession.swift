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
}

@Observable
@MainActor
class RecordingSession {
    var state: RecordingState = .idle
    var matcher: PitchMatcher?

    let pitchDetector = PitchDetector()
    private let lick: Lick
    private let key: Key
    var octaveOffset: Int = 0

    var isRecording: Bool {
        if case .recording = state { return true }
        return false
    }

    var progress: Double { matcher?.progress ?? 0 }
    var matchedCount: Int { matcher?.matchedCount ?? 0 }
    var totalCount: Int { matcher?.totalCount ?? 0 }

    init(lick: Lick, key: Key, octaveOffset: Int = 0) {
        self.lick = lick
        self.key = key
        self.octaveOffset = octaveOffset
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

        let expectedNotes = lick.pitches(in: key).map { $0 + (octaveOffset * 12) }
        let matcher = PitchMatcher(expectedMidiNotes: expectedNotes)
        self.matcher = matcher

        pitchDetector.onPitchDetected = { [weak self] midi, _ in
            guard let self else { return }
            let result = matcher.evaluate(midi)
            if case .correct = result, matcher.isComplete {
                self.stopRecording()
            }
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
        }
    }

    func reset() {
        pitchDetector.stop()
        matcher?.reset()
        state = .idle
    }
}
