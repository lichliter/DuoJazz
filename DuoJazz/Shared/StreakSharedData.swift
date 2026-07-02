//
//  StreakSharedData.swift
//  DuoJazz
//

import Foundation

enum StreakSharedData {
    static let appGroupID = "group.com.brianlichliter.DuoJazz"
    static let streakCountKey = "currentStreak"

    static var currentStreak: Int {
        guard let defaults = UserDefaults(suiteName: appGroupID) else { return 0 }
        return defaults.integer(forKey: streakCountKey)
    }

    static func sync(streak: Int) {
        guard let defaults = UserDefaults(suiteName: appGroupID) else { return }
        defaults.set(streak, forKey: streakCountKey)
    }
}
