//
//  PracticeCardTests.swift
//  DuoJazzTests
//

import Testing
@testable import DuoJazz

@Suite("PracticeCard")
struct PracticeCardTests {

    @Test("Session follows Learn → Play → Listen → Quiz order")
    func sessionCardSequence() {
        let cards = PracticeCard.session(for: "short-ii-v-i")

        #expect(cards.count == 4)

        guard case .learn(let learnId) = cards[0] else {
            Issue.record("First card should be Learn")
            return
        }
        guard case .play(let playId) = cards[1] else {
            Issue.record("Second card should be Play")
            return
        }
        guard case .listen(let listenId) = cards[2] else {
            Issue.record("Third card should be Listen")
            return
        }
        guard case .quiz(let quizId) = cards[3] else {
            Issue.record("Fourth card should be Quiz")
            return
        }

        #expect(learnId == "short-ii-v-i")
        #expect(playId == "short-ii-v-i")
        #expect(listenId == "short-ii-v-i")
        #expect(quizId == "short-ii-v-i")
    }

    @Test("Card levels map to mastery progression")
    func cardLevels() {
        let cards = PracticeCard.session(for: "test-lick")
        #expect(cards[0].cardLevel == .learn)
        #expect(cards[1].cardLevel == .play)
        #expect(cards[2].cardLevel == .listen)
        #expect(cards[3].cardLevel == .listen)
    }

    @Test("Each card has a unique id")
    func uniqueIds() {
        let cards = PracticeCard.session(for: "test-lick")
        let ids = Set(cards.map(\.id))
        #expect(ids.count == 4)
    }
}
