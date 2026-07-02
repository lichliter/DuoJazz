import Testing
@testable import DuoJazz

struct KeyTests {
    @Test func midiRootMatchesPitchClass() {
        #expect(Key.c.midiRoot == 60)
        #expect(Key.g.midiRoot == 67)
        #expect(Key.b.midiRoot == 71)
    }

    @Test func allKeysHaveUniquePitchClasses() {
        let roots = Set(Key.allCases.map(\.midiRoot))
        #expect(roots.count == 12)
    }
}
