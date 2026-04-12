//
//  LessonPreference.swift
//  DuoJazz
//

import Foundation
import SwiftData

/// Per-lesson user preferences: selected practice mode and starting key
@Model
final class LessonPreference {
    @Attribute(.unique) var lessonId: String
    var modeRawValue: Int
    var keyRawValue: Int

    init(lessonId: String, modeRawValue: Int = 0, keyRawValue: Int = 0) {
        self.lessonId = lessonId
        self.modeRawValue = modeRawValue
        self.keyRawValue = keyRawValue
    }
}

struct LessonPreferenceStore {
    let context: ModelContext

    func preference(for lessonId: String) -> (mode: PracticeMode, key: KeyOption) {
        let predicate = #Predicate<LessonPreference> { $0.lessonId == lessonId }
        let descriptor = FetchDescriptor(predicate: predicate)
        guard let pref = try? context.fetch(descriptor).first else {
            return (.lesson, .default)
        }
        let mode = PracticeMode(rawValue: pref.modeRawValue) ?? .lesson
        let key = KeyOption.allOptions.first { $0.key.rawValue == pref.keyRawValue } ?? .default
        return (mode, key)
    }

    func setMode(_ mode: PracticeMode, for lessonId: String) {
        upsert(lessonId: lessonId) { pref in
            pref.modeRawValue = mode.rawValue
        }
    }

    func setKey(_ key: KeyOption, for lessonId: String) {
        upsert(lessonId: lessonId) { pref in
            pref.keyRawValue = key.key.rawValue
        }
    }

    private func upsert(lessonId: String, update: (LessonPreference) -> Void) {
        let predicate = #Predicate<LessonPreference> { $0.lessonId == lessonId }
        let descriptor = FetchDescriptor(predicate: predicate)
        if let existing = try? context.fetch(descriptor).first {
            update(existing)
        } else {
            let new = LessonPreference(lessonId: lessonId)
            update(new)
            context.insert(new)
        }
        try? context.save()
    }
}
