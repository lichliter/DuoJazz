//
//  Lesson.swift
//  DuoJazz
//

import Foundation

/// A single card activity within a lesson
enum LessonCard: Sendable, Identifiable {
    case learn(lickId: String)
    case play(lickId: String)
    case listen(lickId: String)
    case quiz(tag: Tag)

    var id: String {
        switch self {
        case .learn(let lickId): "learn-\(lickId)"
        case .play(let lickId): "play-\(lickId)"
        case .listen(let lickId): "listen-\(lickId)"
        case .quiz(let tag): "quiz-\(tag.rawValue)"
        }
    }

    var lickId: String? {
        switch self {
        case .learn(let id), .play(let id), .listen(let id): id
        case .quiz: nil
        }
    }

    var typeName: String {
        switch self {
        case .learn: "LEARN"
        case .play: "PLAY"
        case .listen: "LISTEN"
        case .quiz: "QUIZ"
        }
    }
}

/// A structured learning session built from a collection's licks
struct Lesson: Identifiable, Sendable {
    let id: String
    let collectionId: String
    let cards: [LessonCard]

    var cardCount: Int { cards.count }

    /// Generate a lesson from a collection.
    /// Progression per lick: learn → play → listen, then a quiz at the end.
    static func generate(from collection: LickCollection, catalog: LickCatalog) -> Lesson {
        var cards: [LessonCard] = []
        let licks = collection.licks(from: catalog)

        for lick in licks {
            cards.append(.learn(lickId: lick.id))
            cards.append(.play(lickId: lick.id))
            cards.append(.listen(lickId: lick.id))
        }

        // End with a quiz card for the collection's primary tag
        if let primaryTag = collection.tags.first {
            cards.append(.quiz(tag: primaryTag))
        }

        return Lesson(
            id: "lesson-\(collection.id)-\(UUID().uuidString.prefix(8))",
            collectionId: collection.id,
            cards: cards
        )
    }
}
