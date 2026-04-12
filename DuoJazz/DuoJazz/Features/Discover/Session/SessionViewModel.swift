//
//  SessionViewModel.swift
//  DuoJazz
//

import Foundation
import SwiftData

@Observable
class SessionViewModel {
    let lesson: Lesson
    var currentLickIndex: Int
    let mode: PracticeMode
    let startingKey: KeyOption
    var currentKey: KeyOption
    var currentCardIndex = 0
    var isSessionComplete = false
    var autoRecord = false
    private(set) var currentCards: [PracticeCard]

    private let catalog = LickCatalog.shared
    var modelContext: ModelContext?

    init(lesson: Lesson, startingLickIndex: Int, key: KeyOption, mode: PracticeMode = .lesson) {
        self.lesson = lesson
        self.currentLickIndex = startingLickIndex
        self.mode = mode
        self.startingKey = key
        self.currentKey = key
        self.currentCards = PracticeCard.session(for: lesson.lickIds[startingLickIndex])
    }

    var currentLickId: String {
        lesson.lickIds[currentLickIndex]
    }

    var currentCard: PracticeCard? {
        guard currentCardIndex < currentCards.count else { return nil }
        return currentCards[currentCardIndex]
    }

    var cardCount: Int { currentCards.count }

    var currentLick: Lick? {
        guard let card = currentCard else { return nil }
        return catalog.lick(withId: card.lickId)
    }

    var lickName: String {
        catalog.lick(withId: currentLickId)?.name ?? "Lick"
    }

    var progress: Double {
        guard cardCount > 0 else { return 0 }
        return Double(currentCardIndex) / Double(cardCount)
    }

    var progressText: String {
        "\(currentCardIndex + 1)/\(cardCount)"
    }

    var hasNext: Bool {
        if mode.iteratesLicks {
            return currentLickIndex + 1 < lesson.lickIds.count
        }
        return mode.nextKey(after: currentKey, startingKey: startingKey) != nil
    }

    var nextLabel: String? {
        if mode.iteratesLicks {
            guard currentLickIndex + 1 < lesson.lickIds.count else { return nil }
            return catalog.lick(withId: lesson.lickIds[currentLickIndex + 1])?.name
        }
        return mode.nextKey(after: currentKey, startingKey: startingKey)?.displayName
    }

    func nextCard() {
        if let card = currentCard, let context = modelContext {
            MasteryStore(context: context).complete(cardType: card.cardLevel, for: card.lickId, in: currentKey.key)
        }

        if currentCardIndex + 1 < cardCount {
            currentCardIndex += 1
        } else {
            isSessionComplete = true
        }
    }

    /// Advance to the next session (next lick in Lesson mode, next key otherwise)
    func advanceNext() {
        if mode.iteratesLicks {
            guard currentLickIndex + 1 < lesson.lickIds.count else { return }
            currentLickIndex += 1
            currentCards = PracticeCard.session(for: currentLickId)
        } else {
            guard let next = mode.nextKey(after: currentKey, startingKey: startingKey) else { return }
            currentKey = next
        }
        currentCardIndex = 0
        isSessionComplete = false
    }
}
