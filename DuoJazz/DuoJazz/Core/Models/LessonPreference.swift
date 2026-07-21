//
//  LessonPreference.swift
//  DuoJazz
//

import Foundation
import os.log
import SwiftData

private let logger = Logger(subsystem: "com.brianlichliter.DuoJazz", category: "LessonPreferenceStore")

/// Per-lesson user preferences: loop settings and starting key
@Model
final class LessonPreference {
    @Attribute(.unique) var lessonId: String
    /// Legacy practice mode; 0 after migration to loop-first settings.
    var modeRawValue: Int
    var keyRawValue: Int
    var loopEnabled: Bool
    var intervalRawValue: Int
    var sessionLengthRawValue: Int

    init(
        lessonId: String,
        modeRawValue: Int = 0,
        keyRawValue: Int = 0,
        loopEnabled: Bool = false,
        intervalRawValue: Int = LoopInterval.chromatic.rawValue,
        sessionLengthRawValue: Int = SessionLength.full.rawValue
    ) {
        self.lessonId = lessonId
        self.modeRawValue = modeRawValue
        self.keyRawValue = keyRawValue
        self.loopEnabled = loopEnabled
        self.intervalRawValue = intervalRawValue
        self.sessionLengthRawValue = sessionLengthRawValue
    }
}

struct LessonPreferenceStore {
    let context: ModelContext

    func preference(for lessonId: String) -> (settings: PracticeSettings, key: KeyOption) {
        let predicate = #Predicate<LessonPreference> { $0.lessonId == lessonId }
        let descriptor = FetchDescriptor(predicate: predicate)
        guard let pref = try? context.fetch(descriptor).first else {
            return (.default, .default)
        }
        let key = KeyOption.allOptions.first { $0.key.rawValue == pref.keyRawValue } ?? .default
        return (PracticeSettings.from(preference: pref), key)
    }

    func setSettings(_ settings: PracticeSettings, for lessonId: String) {
        upsert(lessonId: lessonId) { pref in
            pref.modeRawValue = 0
            pref.loopEnabled = settings.loopEnabled
            pref.intervalRawValue = settings.interval.rawValue
            pref.sessionLengthRawValue = settings.sessionLength.rawValue
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
        do {
            if let existing = try context.fetch(descriptor).first {
                update(existing)
            } else {
                let new = LessonPreference(lessonId: lessonId)
                update(new)
                context.insert(new)
            }
            try context.save()
        } catch {
            logger.error("Failed to save lesson preference for \(lessonId): \(error)")
        }
    }
}
