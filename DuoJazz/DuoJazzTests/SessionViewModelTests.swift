//
//  SessionViewModelTests.swift
//  DuoJazzTests
//

import Testing
@testable import DuoJazz

@Suite("SessionViewModel")
struct SessionViewModelTests {

    private let lesson = BuiltInLessons.all[0]

    @Test("Loop off stops at last lick")
    func linearModeStops() {
        let vm = SessionViewModel(
            lesson: lesson,
            startingLickIndex: lesson.lickIds.count - 1,
            key: .default,
            settings: .default
        )
        #expect(!vm.hasNext)
    }

    @Test("Loop on always has next")
    func loopModeContinues() {
        let settings = PracticeSettings(loopEnabled: true, interval: .chromatic, sessionLength: .full)
        let vm = SessionViewModel(
            lesson: lesson,
            startingLickIndex: 0,
            key: .default,
            settings: settings
        )
        #expect(vm.hasNext)
    }

    @Test("Recall-only sessions have two cards")
    func recallOnlyCardCount() {
        let settings = PracticeSettings(loopEnabled: false, interval: .chromatic, sessionLength: .recallOnly)
        let vm = SessionViewModel(
            lesson: lesson,
            startingLickIndex: 0,
            key: .default,
            settings: settings
        )
        #expect(vm.cardCount == 2)
    }

    @Test("Loop advance increments lap after full key cycle")
    func loopLapIncrement() {
        let settings = PracticeSettings(loopEnabled: true, interval: .chromatic, sessionLength: .full)
        let vm = SessionViewModel(
            lesson: lesson,
            startingLickIndex: 0,
            key: .default,
            settings: settings
        )
        vm.isSessionComplete = true
        for _ in 0..<12 {
            vm.advanceNext()
        }
        #expect(vm.lapCount == 2)
        #expect(vm.currentKey == .default)
    }
}
