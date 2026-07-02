import Testing
@testable import DuoJazz

struct PitchMatcherTests {
    @Test func confirmsNoteAfterRequiredHoldCount() {
        let matcher = PitchMatcher(expectedMidiNotes: [60, 62])
        matcher.requiredHoldCount = 2

        #expect(matcher.evaluate(60) == .holding(count: 1, required: 2))
        #expect(matcher.evaluate(60) == .correct)
        #expect(matcher.matchedCount == 1)
        #expect(matcher.isComplete == false)
    }

    @Test func reportsTooHighAndTooLow() {
        let matcher = PitchMatcher(expectedMidiNotes: [60])
        matcher.requiredHoldCount = 1

        #expect(matcher.evaluate(62) == .tooHigh)
        #expect(matcher.evaluate(58) == .tooLow)
        #expect(matcher.matchedCount == 0)
    }

    @Test func resetClearsProgress() {
        let matcher = PitchMatcher(expectedMidiNotes: [60])
        matcher.requiredHoldCount = 1
        _ = matcher.evaluate(60)

        matcher.reset()

        #expect(matcher.matchedCount == 0)
        #expect(matcher.progress == 0)
    }
}
