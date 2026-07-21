//
//  LoopIntervalTests.swift
//  DuoJazzTests
//

import Testing
@testable import DuoJazz

@Suite("LoopInterval")
struct LoopIntervalTests {

    @Test("Chromatic advances by semitone")
    func chromaticStep() {
        let c = KeyOption.default
        let next = LoopInterval.chromatic.nextKey(after: c, startingKey: c)
        #expect(next?.key == .cSharp)
    }

    @Test("Chromatic cycle completes after 11 steps from C")
    func chromaticCycleLength() {
        let start = KeyOption.default
        var current = start
        var steps = 0
        while let next = LoopInterval.chromatic.nextKey(after: current, startingKey: start) {
            current = next
            steps += 1
        }
        #expect(steps == 11)
    }

    @Test("Random lap excludes starting pitch class")
    func randomExcludesStart() {
        let start = KeyOption.default
        let keys = LoopInterval.shuffledKeys(excluding: start)
        #expect(keys.count == 11)
        #expect(keys.allSatisfy { $0.key.rawValue != start.key.rawValue })
    }
}
