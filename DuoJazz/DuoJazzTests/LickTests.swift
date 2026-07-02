import Testing
@testable import DuoJazz

struct LickTests {
    @Test func shortIIVIHasExpectedShape() {
        let lick = BuiltInLicks.shortIIVI

        #expect(lick.noteCount == 9)
        #expect(lick.measureCount == 2)
        #expect(lick.pitches(in: .c) == [62, 64, 65, 67, 69, 72, 71, 69, 67])
    }

    @Test func totalBeatsSumsElementDurations() {
        let lick = Lick(
            id: "test",
            name: "Test",
            elements: [N(0), N(2), N(4, .half)]
        )

        #expect(lick.totalBeats == 3.0)
    }
}
