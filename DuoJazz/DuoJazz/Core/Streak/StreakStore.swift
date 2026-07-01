//
//  StreakStore.swift
//  DuoJazz
//

import Foundation
import os.log
import SwiftData

private let logger = Logger(subsystem: "com.brianlichliter.DuoJazz", category: "StreakStore")

struct StreakUpdateResult: Sendable {
    let streak: Int
    let didIncrement: Bool
}

enum StreakLogic {
    static func update(
        currentStreak: Int,
        lastPracticeDate: Date?,
        today: Date,
        calendar: Calendar = .current
    ) -> (streak: Int, lastPractice: Date, didIncrement: Bool) {
        let todayStart = calendar.startOfDay(for: today)

        guard let lastPracticeDate else {
            return (1, todayStart, true)
        }

        let lastStart = calendar.startOfDay(for: lastPracticeDate)

        if lastStart == todayStart {
            return (currentStreak, lastStart, false)
        }

        if let yesterday = calendar.date(byAdding: .day, value: -1, to: todayStart),
           lastStart == yesterday {
            return (currentStreak + 1, todayStart, true)
        }

        return (1, todayStart, true)
    }
}

struct StreakStore {
    let context: ModelContext

    func recordPractice(on date: Date = .now) -> StreakUpdateResult {
        let descriptor = FetchDescriptor<UserProfile>()

        do {
            let profile: UserProfile
            if let existing = try context.fetch(descriptor).first {
                profile = existing
            } else {
                let newProfile = UserProfile()
                context.insert(newProfile)
                profile = newProfile
            }

            let update = StreakLogic.update(
                currentStreak: profile.currentStreak,
                lastPracticeDate: profile.lastPracticeDate,
                today: date
            )

            profile.currentStreak = update.streak
            profile.lastPracticeDate = update.lastPractice
            try context.save()
            StreakSharedData.sync(streak: update.streak)

            return StreakUpdateResult(streak: update.streak, didIncrement: update.didIncrement)
        } catch {
            logger.error("Failed to record practice streak: \(error)")
            return StreakUpdateResult(streak: 0, didIncrement: false)
        }
    }

    func syncToWidget() {
        let descriptor = FetchDescriptor<UserProfile>()
        guard let profile = try? context.fetch(descriptor).first else { return }
        StreakSharedData.sync(streak: profile.currentStreak)
    }
}
