//
//  ModuleProgress.swift
//  DuoJazz
//

import Foundation
import SwiftData
import SwiftUI

/// Tracks lesson completion per module per key
@Model
final class ModuleProgress {
    var moduleId: String
    var keyRawValue: Int
    /// 0 = not started, 1-5 = completed through that lesson
    var completedLesson: Int

    init(moduleId: String, keyRawValue: Int, completedLesson: Int = 0) {
        self.moduleId = moduleId
        self.keyRawValue = keyRawValue
        self.completedLesson = completedLesson
    }
}

/// Medal awarded based on how many keys a module is mastered in
enum Medal: Sendable {
    case none
    case bronze   // 1+ keys
    case silver   // 6+ keys
    case gold     // all 12

    var icon: String {
        switch self {
        case .none: ""
        case .bronze: "medal.fill"
        case .silver: "medal.fill"
        case .gold: "medal.fill"
        }
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

/// Reads and writes module progress
struct ModuleProgressStore {
    let context: ModelContext

    func completedLesson(for moduleId: String, in key: Key) -> Int {
        let keyRaw = key.rawValue
        let predicate = #Predicate<ModuleProgress> {
            $0.moduleId == moduleId && $0.keyRawValue == keyRaw
        }
        let descriptor = FetchDescriptor(predicate: predicate)
        return (try? context.fetch(descriptor).first?.completedLesson) ?? 0
    }

    func completeLesson(_ lessonNumber: Int, for moduleId: String, in key: Key) {
        let keyRaw = key.rawValue
        let predicate = #Predicate<ModuleProgress> {
            $0.moduleId == moduleId && $0.keyRawValue == keyRaw
        }
        let descriptor = FetchDescriptor(predicate: predicate)

        if let existing = try? context.fetch(descriptor).first {
            if lessonNumber > existing.completedLesson {
                existing.completedLesson = lessonNumber
            }
        } else {
            context.insert(ModuleProgress(
                moduleId: moduleId, keyRawValue: keyRaw,
                completedLesson: lessonNumber
            ))
        }
        try? context.save()
    }

    /// How many keys have all 5 lessons completed for this module
    func masteredKeyCount(for moduleId: String) -> Int {
        let predicate = #Predicate<ModuleProgress> {
            $0.moduleId == moduleId && $0.completedLesson >= 5
        }
        let descriptor = FetchDescriptor(predicate: predicate)
        return (try? context.fetch(descriptor).count) ?? 0
    }

    func medal(for moduleId: String) -> Medal {
        let count = masteredKeyCount(for: moduleId)
        if count >= 12 { return .gold }
        if count >= 6 { return .silver }
        if count >= 1 { return .bronze }
        return .none
    }

    /// Progress fraction for a module in a specific key (0.0 to 1.0)
    func progress(for moduleId: String, in key: Key) -> Double {
        Double(completedLesson(for: moduleId, in: key)) / 5.0
    }

    /// Count medals across all modules
    func medalSummary(moduleIds: [String]) -> MedalSummary {
        var bronze = 0, silver = 0, gold = 0
        for id in moduleIds {
            switch medal(for: id) {
            case .gold: gold += 1
            case .silver: silver += 1
            case .bronze: bronze += 1
            case .none: break
            }
        }
        return MedalSummary(bronze: bronze, silver: silver, gold: gold)
    }

    /// Status for each key (for the pill selector)
    func keyStatus(for moduleId: String, key: Key) -> KeyStatus {
        let lesson = completedLesson(for: moduleId, in: key)
        if lesson >= 5 { return .completed }
        if lesson > 0 { return .inProgress }
        return .notStarted
    }

    /// Delete all module progress records (for progress reset)
    func deleteAll() {
        let descriptor = FetchDescriptor<ModuleProgress>()
        guard let all = try? context.fetch(descriptor) else { return }
        for record in all { context.delete(record) }
        try? context.save()
    }
}

enum KeyStatus {
    case completed, inProgress, notStarted
}

/// Counts of modules at each medal tier
struct MedalSummary: Sendable {
    let bronze: Int
    let silver: Int
    let gold: Int

    var total: Int { bronze + silver + gold }
}
