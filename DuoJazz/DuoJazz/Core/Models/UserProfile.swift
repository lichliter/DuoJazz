//
//  UserProfile.swift
//  DuoJazz
//

import SwiftData

@Model
final class UserProfile {
    var instrumentId: String
    var autoRecord: Bool
    var currentStreak: Int
    var lastPracticeDate: Date?

    init(
        instrumentId: String = "piano",
        autoRecord: Bool = false,
        currentStreak: Int = 0,
        lastPracticeDate: Date? = nil
    ) {
        self.instrumentId = instrumentId
        self.autoRecord = autoRecord
        self.currentStreak = currentStreak
        self.lastPracticeDate = lastPracticeDate
    }

    var instrument: Instrument {
        Instrument.preset(for: instrumentId)
    }
}
