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

    var cardLevel: CardLevel {
        switch self {
        case .learn: .learn
        case .play: .play
        case .listen: .listen
        case .quiz: .listen
        }
    }
}

/// A structured learning session built from a module's licks and mastery state
struct Lesson: Identifiable, Sendable {
    let id: String
    let moduleId: String
    let cards: [LessonCard]

    var cardCount: Int { cards.count }

    /// Generate a mastery-aware lesson from a collection.
    /// Cards are chosen based on each lick's current mastery level.
    static func generate(
        from collection: LickCollection,
        catalog: LickCatalog,
        mastery: @Sendable (String) -> CardLevel = { _ in .none }
    ) -> Lesson {
        let licks = collection.licks(from: catalog)
        var cards: [LessonCard] = []
        let targetCards = 8

        // Sort licks by mastery: least mastered first (they need more work)
        let sorted = licks.sorted { mastery($0.id).rawValue < mastery($1.id).rawValue }

        // First pass: give each lick its next card type
        for lick in sorted {
            let level = mastery(lick.id)
            let nextCard: LessonCard = switch level {
            case .none, .learn:
                // Hasn't done Learn yet, or only Learn — show Learn
                .learn(lickId: lick.id)
            case .play:
                // Done Play — ready for Listen
                .listen(lickId: lick.id)
            case .listen:
                // Fully mastered — review with Listen
                .listen(lickId: lick.id)
            }
            cards.append(nextCard)
        }

        // Second pass: fill remaining slots with reinforcement
        // Re-test licks at their current level for spaced repetition
        var reinforcement: [LessonCard] = []
        for lick in sorted {
            guard cards.count + reinforcement.count < targetCards else { break }
            let level = mastery(lick.id)
            let card: LessonCard = switch level {
            case .none:
                // Just did Learn above, now try Play
                .play(lickId: lick.id)
            case .learn:
                // Reinforce with Play
                .play(lickId: lick.id)
            case .play:
                // Mix in a Play review alongside the new Listen
                .play(lickId: lick.id)
            case .listen:
                // Fully mastered — Listen review
                .listen(lickId: lick.id)
            }
            reinforcement.append(card)
        }
        cards.append(contentsOf: reinforcement)

        // Fill any remaining slots by cycling through licks at their next level
        var fillIndex = 0
        while cards.count < targetCards && !licks.isEmpty {
            let lick = sorted[fillIndex % sorted.count]
            let level = mastery(lick.id)
            if level < .listen {
                cards.append(.play(lickId: lick.id))
            } else {
                cards.append(.listen(lickId: lick.id))
            }
            fillIndex += 1
        }

        // Trim to target
        cards = Array(cards.prefix(targetCards))

        return Lesson(
            id: "lesson-\(collection.id)-\(UUID().uuidString.prefix(8))",
            moduleId: collection.id,
            cards: cards
        )
    }
}
