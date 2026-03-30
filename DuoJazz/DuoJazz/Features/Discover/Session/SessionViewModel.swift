//
//  SessionViewModel.swift
//  DuoJazz
//

import Foundation
import SwiftData

@Observable
class SessionViewModel {
    let lesson: Lesson
    let key: KeyOption
    var currentCardIndex = 0
    var isSessionComplete = false
    var autoRecord = false

    private let catalog = LickCatalog.shared
    var modelContext: ModelContext?

    init(lesson: Lesson, key: KeyOption) {
        self.lesson = lesson
        self.key = key
    }

    var currentCard: LessonCard? {
        guard currentCardIndex < lesson.cards.count else { return nil }
        return lesson.cards[currentCardIndex]
    }

    var currentLick: Lick? {
        guard let lickId = currentCard?.lickId else { return nil }
        return catalog.lick(withId: lickId)
    }

    var progress: Double {
        guard lesson.cardCount > 0 else { return 0 }
        return Double(currentCardIndex) / Double(lesson.cardCount)
    }

    var progressText: String {
        "\(currentCardIndex + 1)/\(lesson.cardCount)"
    }

    func nextCard() {
        // Record per-lick mastery (for Licktionary display)
        if let card = currentCard, let context = modelContext {
            let store = MasteryStore(context: context)
            if let lickId = card.lickId {
                store.complete(cardType: card.cardLevel, for: lickId, in: key.key)
            }
        }

        if currentCardIndex + 1 < lesson.cardCount {
            currentCardIndex += 1
        } else {
            // Lesson complete — update module progress
            if let context = modelContext {
                let progressStore = ModuleProgressStore(context: context)
                let current = progressStore.completedLesson(for: lesson.moduleId, in: key.key)
                progressStore.completeLesson(current + 1, for: lesson.moduleId, in: key.key)
            }
            isSessionComplete = true
        }
    }
}
