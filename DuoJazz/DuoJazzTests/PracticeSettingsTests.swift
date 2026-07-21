//
//  PracticeSettingsTests.swift
//  DuoJazzTests
//

import Testing
@testable import DuoJazz

@Suite("PracticeSettings")
struct PracticeSettingsTests {

    @Test("Migrates legacy chromatic mode to loop on")
    func legacyChromatic() {
        let pref = LessonPreference(lessonId: "test", modeRawValue: 1)
        let settings = PracticeSettings.from(preference: pref)
        #expect(settings.loopEnabled)
        #expect(settings.interval == .chromatic)
    }

    @Test("Migrates legacy lesson mode to loop off")
    func legacyLesson() {
        let pref = LessonPreference(lessonId: "test", modeRawValue: 0, loopEnabled: false)
        let settings = PracticeSettings.from(preference: pref)
        #expect(!settings.loopEnabled)
    }

    @Test("Reads new loop-first preferences")
    func newPreferences() {
        let pref = LessonPreference(
            lessonId: "test",
            loopEnabled: true,
            intervalRawValue: LoopInterval.fifths.rawValue,
            sessionLengthRawValue: SessionLength.recallOnly.rawValue
        )
        let settings = PracticeSettings.from(preference: pref)
        #expect(settings.loopEnabled)
        #expect(settings.interval == .fifths)
        #expect(settings.sessionLength == .recallOnly)
    }
}
