//
//  PracticeCard.swift
//  DuoJazz
//

import Foundation

/// A single card activity within a practice session
enum PracticeCard: Sendable, Identifiable {
    case learn(lickId: String)
    case play(lickId: String)
    case listen(lickId: String)
    case quiz(lickId: String)

    var id: String {
        switch self {
        case .learn(let lickId): "learn-\(lickId)"
        case .play(let lickId): "play-\(lickId)"
        case .listen(let lickId): "listen-\(lickId)"
        case .quiz(let lickId): "quiz-\(lickId)"
        }
    }

    var lickId: String {
        switch self {
        case .learn(let id), .play(let id), .listen(let id), .quiz(let id): id
        }
    }

    var cardLevel: CardLevel {
        switch self {
        case .learn: .learn
        case .play: .play
        case .listen, .quiz: .listen
        }
    }

    /// Generate the standard 4-card session for a lick: Learn → Play → Listen → Quiz
    static func session(for lickId: String) -> [PracticeCard] {
        [
            .learn(lickId: lickId),
            .play(lickId: lickId),
            .listen(lickId: lickId),
            .quiz(lickId: lickId),
        ]
    }
}
