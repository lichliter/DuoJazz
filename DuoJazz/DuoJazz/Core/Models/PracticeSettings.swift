//
//  PracticeSettings.swift
//  DuoJazz
//

import Foundation

/// Loop mode, interval, and session length for a practice run.
struct PracticeSettings: Sendable, Equatable {
    var loopEnabled: Bool
    var interval: LoopInterval
    var sessionLength: SessionLength

    static let `default` = PracticeSettings(
        loopEnabled: false,
        interval: .chromatic,
        sessionLength: .full
    )

    /// Maps legacy `PracticeMode` raw values stored before the loop-first refactor.
    static func from(preference: LessonPreference) -> PracticeSettings {
        let sessionLength = SessionLength(rawValue: preference.sessionLengthRawValue) ?? .full

        guard preference.modeRawValue == 0 else {
            return migrated(fromLegacyModeRawValue: preference.modeRawValue, sessionLength: sessionLength)
        }

        return PracticeSettings(
            loopEnabled: preference.loopEnabled,
            interval: LoopInterval(rawValue: preference.intervalRawValue) ?? .chromatic,
            sessionLength: sessionLength
        )
    }

    private static func migrated(fromLegacyModeRawValue rawValue: Int, sessionLength: SessionLength) -> PracticeSettings {
        switch rawValue {
        case 1:
            return PracticeSettings(loopEnabled: true, interval: .chromatic, sessionLength: sessionLength)
        case 2:
            return PracticeSettings(loopEnabled: true, interval: .fourths, sessionLength: sessionLength)
        case 3:
            return PracticeSettings(loopEnabled: true, interval: .fifths, sessionLength: sessionLength)
        default:
            return PracticeSettings(loopEnabled: false, interval: .chromatic, sessionLength: sessionLength)
        }
    }
}
