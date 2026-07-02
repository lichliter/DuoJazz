//
//  LessonMasteryHelpers.swift
//  DuoJazz
//

import Foundation

enum LessonMasteryHelpers {
    static func keyStatus(for lickId: String, key: Key, masteryMap: [String: [Int: Int]]) -> KeyStatus {
        let level = masteryMap[lickId]?[key.rawValue] ?? 0
        if level >= CardLevel.listen.rawValue { return .completed }
        if level > 0 { return .inProgress }
        return .notStarted
    }

    static func medal(for lickId: String, masteryMap: [String: [Int: Int]]) -> Medal {
        let completedCount = (masteryMap[lickId] ?? [:]).values
            .filter { $0 >= CardLevel.listen.rawValue }
            .count
        if completedCount >= 12 { return .gold }
        if completedCount >= 6 { return .silver }
        if completedCount >= 1 { return .bronze }
        return .none
    }
}
