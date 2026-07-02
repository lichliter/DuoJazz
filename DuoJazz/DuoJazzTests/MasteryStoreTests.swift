//
//  MasteryStoreTests.swift
//  DuoJazzTests
//

import Testing
@testable import DuoJazz

@Suite("MasteryStore")
struct MasteryStoreTests {

    @Test("Bronze medal at 1 completed key")
    func bronzeMedal() {
        #expect(Medal.forCompletedKeyCount(1) == .bronze)
        #expect(Medal.forCompletedKeyCount(5) == .bronze)
    }

    @Test("Silver medal at 6 completed keys")
    func silverMedal() {
        #expect(Medal.forCompletedKeyCount(6) == .silver)
        #expect(Medal.forCompletedKeyCount(11) == .silver)
    }

    @Test("Gold medal at 12 completed keys")
    func goldMedal() {
        #expect(Medal.forCompletedKeyCount(12) == .gold)
        #expect(Medal.forCompletedKeyCount(20) == .gold)
    }

    @Test("No medal before first completed key")
    func noMedal() {
        #expect(Medal.forCompletedKeyCount(0) == .none)
    }

    @Test("Card level only advances forward")
    func levelMonotonic() {
        let afterPlay = MasteryProgression.advancedLevel(current: .play, completed: .learn)
        #expect(afterPlay == .play)

        let afterListen = MasteryProgression.advancedLevel(current: .play, completed: .listen)
        #expect(afterListen == .listen)
    }

    @Test("Key status reflects progress")
    func keyStatus() {
        #expect(KeyStatus.from(cardLevel: .none) == .notStarted)
        #expect(KeyStatus.from(cardLevel: .learn) == .inProgress)
        #expect(KeyStatus.from(cardLevel: .play) == .inProgress)
        #expect(KeyStatus.from(cardLevel: .listen) == .completed)
    }
}
