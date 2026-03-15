//
//  SessionViewModel.swift
//  DuoJazz
//

import Foundation

@Observable
class SessionViewModel {
    let lesson: Lesson
    let key: KeyOption
    var currentCardIndex = 0
    var isSessionComplete = false

    private let catalog = LickCatalog.shared

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
        if currentCardIndex + 1 < lesson.cardCount {
            currentCardIndex += 1
        } else {
            isSessionComplete = true
        }
    }
}
