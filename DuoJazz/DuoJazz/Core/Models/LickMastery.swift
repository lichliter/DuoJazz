//
//  LickMastery.swift
//  DuoJazz
//

import Foundation
import SwiftData

/// Tracks the highest card type a user has completed for a lick in a specific key
@Model
final class LickMastery {
    var lickId: String
    var keyRawValue: Int
    /// 0 = not started, 1 = Learn done, 2 = Play done, 3 = Listen done
    var highestCardType: Int
    /// When this mastery level was last updated
    var lastCompletedAt: Date?

    init(lickId: String, keyRawValue: Int, highestCardType: Int = 0, lastCompletedAt: Date? = nil) {
        self.lickId = lickId
        self.keyRawValue = keyRawValue
        self.highestCardType = highestCardType
        self.lastCompletedAt = lastCompletedAt
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

        if let existing = try? context.fetch(descriptor).first {
            if cardType.rawValue > existing.highestCardType {
                existing.highestCardType = cardType.rawValue
            }
            existing.lastCompletedAt = Date()
        } else {
            context.insert(LickMastery(
                lickId: lickId, keyRawValue: keyRaw,
                highestCardType: cardType.rawValue,
                lastCompletedAt: Date()
            ))
        }
        try? context.save()
    }

    /// How many licks in a module are fully mastered (Listen completed) in a given key
    func masteredCount(lickIds: [String], in key: Key) -> Int {
        lickIds.filter { level(for: $0, in: key) >= .listen }.count
    }

    /// Overall module progress: fraction of licks that have completed Listen
    func moduleProgress(lickIds: [String], in key: Key) -> Double {
        guard !lickIds.isEmpty else { return 0 }
        let total = lickIds.count * CardLevel.listen.rawValue
        let achieved = lickIds.reduce(0) { $0 + level(for: $1, in: key).rawValue }
        return Double(achieved) / Double(total)
    }

    /// Best mastery level for a lick across all 12 keys
    func bestLevel(for lickId: String) -> CardLevel {
        let predicate = #Predicate<LickMastery> { $0.lickId == lickId }
        let descriptor = FetchDescriptor(predicate: predicate)
        guard let records = try? context.fetch(descriptor) else { return .none }
        let maxRaw = records.map(\.highestCardType).max() ?? 0
        return CardLevel(rawValue: maxRaw) ?? .none
    }

    /// Mastery breakdown across all catalog licks (best level per lick across keys)
    func masteryBreakdown(lickIds: [String]) -> [(MasteryState, Int)] {
        var counts: [MasteryState: Int] = [:]
        for id in lickIds {
            let state = MasteryState(cardLevel: bestLevel(for: id))
            counts[state, default: 0] += 1
        }
        // Return in progression order, skip zero counts
        return MasteryState.allCases.compactMap { state in
            guard let count = counts[state], count > 0 else { return nil }
            return (state, count)
        }
    }

    /// Delete all mastery records (for progress reset)
    func deleteAll() {
        let descriptor = FetchDescriptor<LickMastery>()
        guard let all = try? context.fetch(descriptor) else { return }
        for record in all { context.delete(record) }
        try? context.save()
    }
}
