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
    let settings: PracticeSettings
    let startingKey: KeyOption
    var currentKey: KeyOption
    var currentCardIndex = 0
    var isSessionComplete = false
    var autoRecord = false
    private(set) var streakDidIncrement = false
    private(set) var currentStreak = 0
    private(set) var lapCount = 1
    private(set) var currentCards: [PracticeCard]
    private var randomRemainingKeys: [KeyOption]

    private let catalog = LickCatalog.shared
    var modelContext: ModelContext?

    init(lesson: Lesson, startingLickIndex: Int, key: KeyOption, settings: PracticeSettings = .default) {
        self.lesson = lesson
        self.currentLickIndex = startingLickIndex
        self.settings = settings
        self.startingKey = key
        self.currentKey = key
        self.randomRemainingKeys = settings.loopEnabled && settings.interval == .random
            ? LoopInterval.shuffledKeys(excluding: key)
            : []
        self.currentCards = PracticeCard.session(
            for: lesson.lickIds[startingLickIndex],
            length: settings.sessionLength
        )
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
        if settings.loopEnabled && lapCount > 1 {
            return "\(currentCardIndex + 1)/\(cardCount) · R\(lapCount)"
        }
        return "\(currentCardIndex + 1)/\(cardCount)"
    }

    var hasNext: Bool {
        if settings.loopEnabled { return true }
        return currentLickIndex + 1 < lesson.lickIds.count
    }

    var nextLabel: String? {
        if settings.loopEnabled {
            return previewNextKey()?.displayName
        }
        guard currentLickIndex + 1 < lesson.lickIds.count else { return nil }
        return catalog.lick(withId: lesson.lickIds[currentLickIndex + 1])?.name
    }

    func nextCard() {
        if let card = currentCard, let context = modelContext {
            MasteryStore(context: context).complete(cardType: card.cardLevel, for: card.lickId, in: currentKey.key)
        }

        if currentCardIndex + 1 < cardCount {
            currentCardIndex += 1
        } else {
            recordStreakIfNeeded()
            isSessionComplete = true
        }
    }

    private func recordStreakIfNeeded() {
        guard let context = modelContext else { return }
        let result = StreakStore(context: context).recordPractice()
        streakDidIncrement = result.didIncrement
        currentStreak = result.streak
    }

    /// Advance to the next mini-session (next lick or next key).
    func advanceNext() {
        if settings.loopEnabled {
            advanceKeyLoop()
        } else {
            guard currentLickIndex + 1 < lesson.lickIds.count else { return }
            currentLickIndex += 1
            regenerateCards()
        }
        resetSessionState()
    }

    private func advanceKeyLoop() {
        if let next = nextKeyInLoop() {
            currentKey = next
        } else {
            lapCount += 1
            currentKey = startingKey
            if settings.interval == .random {
                randomRemainingKeys = LoopInterval.shuffledKeys(excluding: startingKey)
            }
        }
        regenerateCards()
    }

    private func nextKeyInLoop() -> KeyOption? {
        switch settings.interval {
        case .random:
            guard let next = randomRemainingKeys.first else { return nil }
            randomRemainingKeys.removeFirst()
            return next
        case .chromatic, .fourths, .fifths:
            return settings.interval.nextKey(after: currentKey, startingKey: startingKey)
        }
    }

    private func previewNextKey() -> KeyOption? {
        switch settings.interval {
        case .random:
            return randomRemainingKeys.first ?? startingKey
        case .chromatic, .fourths, .fifths:
            return settings.interval.nextKey(after: currentKey, startingKey: startingKey) ?? startingKey
        }
    }

    private func regenerateCards() {
        currentCards = PracticeCard.session(for: currentLickId, length: settings.sessionLength)
    }

    private func resetSessionState() {
        currentCardIndex = 0
        isSessionComplete = false
        streakDidIncrement = false
    }
}
