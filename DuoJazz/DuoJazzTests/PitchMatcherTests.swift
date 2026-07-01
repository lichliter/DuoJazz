//
//  PitchMatcherTests.swift
//  DuoJazzTests
//

import Testing
@testable import DuoJazz

@Suite("PitchMatcher")
struct PitchMatcherTests {

    @Test("Exact match requires consecutive hold count")
    func holdCountRequired() {
        let matcher = PitchMatcher(expectedMidiNotes: [60, 64])
        matcher.requiredHoldCount = 2

        let first = matcher.evaluate(60)
        guard case .holding(count: 1, required: 2) = first else {
            Issue.record("Expected holding after first match")
            return
        }

        let second = matcher.evaluate(60)
        guard case .correct = second else {
            Issue.record("Expected correct after hold count met")
            return
        }

        #expect(matcher.matchedCount == 1)
        #expect(matcher.progress == 0.5)
    }

    @Test("Tolerance allows nearby pitches")
    func tolerance() {
        let matcher = PitchMatcher(expectedMidiNotes: [60])
        matcher.tolerance = 1
        matcher.requiredHoldCount = 1

        let result = matcher.evaluate(61)
        guard case .correct = result else {
            Issue.record("Expected tolerance match for +1 semitone")
            return
        }
        #expect(matcher.isComplete)
    }

    @Test("Wrong pitch reports too high or too low")
    func directionFeedback() {
        let matcher = PitchMatcher(expectedMidiNotes: [60])
        matcher.requiredHoldCount = 1

        let high = matcher.evaluate(65)
        guard case .tooHigh = high else {
            Issue.record("Expected tooHigh")
            return
        }

        let low = matcher.evaluate(55)
        guard case .tooLow = low else {
            Issue.record("Expected tooLow")
            return
        }
    }

    @Test("Sequential matching advances through expected notes")
    func sequentialMatching() {
        let matcher = PitchMatcher(expectedMidiNotes: [60, 64, 67])
        matcher.requiredHoldCount = 1

        _ = matcher.evaluate(60)
        _ = matcher.evaluate(64)
        _ = matcher.evaluate(67)

        #expect(matcher.isComplete)
        #expect(matcher.matchedCount == 3)
        #expect(matcher.progress == 1.0)
    }

    @Test("Reset clears progress")
    func reset() {
        let matcher = PitchMatcher(expectedMidiNotes: [60, 64])
        matcher.requiredHoldCount = 1
        _ = matcher.evaluate(60)

        matcher.reset()

        #expect(matcher.matchedCount == 0)
        #expect(matcher.progress == 0.0)
        #expect(matcher.isComplete == false)

        _ = matcher.evaluate(60)
        #expect(matcher.matchedCount == 1)
    }

    @Test("Wrong note resets consecutive hold count")
    func holdCountResetsOnMiss() {
        let matcher = PitchMatcher(expectedMidiNotes: [60])
        matcher.requiredHoldCount = 2

        _ = matcher.evaluate(60)
        _ = matcher.evaluate(65)

        let retry = matcher.evaluate(60)
        guard case .holding(count: 1, required: 2) = retry else {
            Issue.record("Hold count should restart after miss")
            return
        }
    }
}
