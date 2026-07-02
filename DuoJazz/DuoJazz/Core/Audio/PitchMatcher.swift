//
//  PitchMatcher.swift
//  DuoJazz
//

import Foundation

enum MatchResult: Sendable, Equatable {
    case correct
    case holding(count: Int, required: Int)
    case incorrect
    case tooHigh
    case tooLow
}

@Observable
class PitchMatcher {
    let expectedMidiNotes: [Int]
    private(set) var matchedIndices: Set<Int> = []
    private var currentIndex = 0

    /// Tolerance in semitones (0 = exact match only)
    var tolerance: Int = 0

    /// How many consecutive matching callbacks required to confirm a note
    var requiredHoldCount: Int = 2

    /// Current consecutive match count for the active note
    private var consecutiveMatchCount = 0

    var progress: Double {
        guard !expectedMidiNotes.isEmpty else { return 1.0 }
        return Double(matchedIndices.count) / Double(expectedMidiNotes.count)
    }

    var isComplete: Bool { matchedIndices.count == expectedMidiNotes.count }

    var matchedCount: Int { matchedIndices.count }
    var totalCount: Int { expectedMidiNotes.count }

    init(expectedMidiNotes: [Int]) {
        self.expectedMidiNotes = expectedMidiNotes
    }

    /// Evaluate a detected MIDI pitch against the current expected note.
    /// Requires `requiredHoldCount` consecutive matches to confirm.
    func evaluate(_ detectedMidi: Int) -> MatchResult {
        guard currentIndex < expectedMidiNotes.count else { return .incorrect }

        let expected = expectedMidiNotes[currentIndex]
        let diff = detectedMidi - expected

        if abs(diff) <= tolerance {
            consecutiveMatchCount += 1

            if consecutiveMatchCount >= requiredHoldCount {
                matchedIndices.insert(currentIndex)
                currentIndex += 1
                consecutiveMatchCount = 0
                return .correct
            }
            return .holding(count: consecutiveMatchCount, required: requiredHoldCount)
        } else {
            consecutiveMatchCount = 0
            if diff > 0 {
                return .tooHigh
            } else {
                return .tooLow
            }
        }
    }

    func reset() {
        matchedIndices = []
        currentIndex = 0
        consecutiveMatchCount = 0
    }
}
