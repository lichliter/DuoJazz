//
//  LickMastery.swift
//  DuoJazz
//

import Foundation
import os.log
import SwiftData
import SwiftUI

private let logger = Logger(subsystem: "com.brianlichliter.DuoJazz", category: "MasteryStore")

/// Tracks the highest card type a user has completed for a lick in a specific key
@Model
final class LickMastery {
    @Attribute(.unique) var compositeKey: String
    var lickId: String
    var keyRawValue: Int
    /// 0 = not started, 1 = Learn done, 2 = Play done, 3 = Listen done
    var highestCardType: Int

    init(lickId: String, keyRawValue: Int, highestCardType: Int = 0) {
        self.compositeKey = "\(lickId)_\(keyRawValue)"
        self.lickId = lickId
        self.keyRawValue = keyRawValue
        self.highestCardType = highestCardType
    }

    var key: Key? { Key(rawValue: keyRawValue) }
}

/// Card difficulty levels for progression
enum CardLevel: Int, Sendable, Comparable {
    case none = 0
    case learn = 1
    case play = 2
    case listen = 3

    static func < (lhs: CardLevel, rhs: CardLevel) -> Bool {
        lhs.rawValue < rhs.rawValue
    }
}

/// Reads and writes mastery state from SwiftData
struct MasteryStore {
    let context: ModelContext

    func level(for lickId: String, in key: Key) -> CardLevel {
        let keyRaw = key.rawValue
        let predicate = #Predicate<LickMastery> {
            $0.lickId == lickId && $0.keyRawValue == keyRaw
        }
        let descriptor = FetchDescriptor(predicate: predicate)
        guard let mastery = try? context.fetch(descriptor).first else {
            return .none
        }
        return CardLevel(rawValue: mastery.highestCardType) ?? .none
    }

    func complete(cardType: CardLevel, for lickId: String, in key: Key) {
        let keyRaw = key.rawValue
        let predicate = #Predicate<LickMastery> {
            $0.lickId == lickId && $0.keyRawValue == keyRaw
        }
        let descriptor = FetchDescriptor(predicate: predicate)

        do {
            if let existing = try context.fetch(descriptor).first {
                if cardType.rawValue > existing.highestCardType {
                    existing.highestCardType = cardType.rawValue
                }
            } else {
                context.insert(LickMastery(
                    lickId: lickId, keyRawValue: keyRaw,
                    highestCardType: cardType.rawValue
                ))
            }
            try context.save()
        } catch {
            logger.error("Failed to save mastery for \(lickId): \(error)")
        }
    }

    /// How many keys has this lick been completed in (Listen done)?
    func completedKeyCount(for lickId: String) -> Int {
        let listenLevel = CardLevel.listen.rawValue
        let predicate = #Predicate<LickMastery> {
            $0.lickId == lickId && $0.highestCardType >= listenLevel
        }
        let descriptor = FetchDescriptor(predicate: predicate)
        return (try? context.fetch(descriptor).count) ?? 0
    }

    /// Per-lick medal based on how many keys completed
    func medal(for lickId: String) -> Medal {
        let count = completedKeyCount(for: lickId)
        if count >= 12 { return .gold }
        if count >= 6 { return .silver }
        if count >= 1 { return .bronze }
        return .none
    }

    /// Key status for a specific lick in a specific key
    func keyStatus(for lickId: String, key: Key) -> KeyStatus {
        let lvl = level(for: lickId, in: key)
        if lvl >= .listen { return .completed }
        if lvl > .none { return .inProgress }
        return .notStarted
    }
}

/// Medal awarded based on how many keys a lick is completed in
enum Medal: Sendable {
    case none
    case bronze   // 1+ keys
    case silver   // 6+ keys
    case gold     // all 12

    var icon: String {
        self == .none ? "" : "medal.fill"
    }

    var color: Color {
        switch self {
        case .none: .clear
        case .bronze: Color(hex: 0xCD7F32)
        case .silver: Color(hex: 0xC0C0C0)
        case .gold: Color(hex: 0xFFD700)
        }
    }
}

enum KeyStatus {
    case completed, inProgress, notStarted
}

/// Counts of licks at each medal tier
struct MedalSummary: Sendable {
    let bronze: Int
    let silver: Int
    let gold: Int

    var total: Int { bronze + silver + gold }
}
