//
//  ABCConverterTests.swift
//  DuoJazzTests
//

import Testing
@testable import DuoJazz

@Suite("ABCConverter")
struct ABCConverterTests {

    @Test("Output includes key signature and treble clef header")
    func keyAndClefHeader() {
        let abc = ABCConverter.toABC(
            lick: TestFixtures.simpleLick,
            keyOption: .default,
            clef: .treble,
            octaveOffset: 0
        )
        #expect(abc.contains("K:C clef=treble"))
        #expect(abc.hasPrefix("X:1\nL:1/8\n"))
        #expect(abc.hasSuffix("|]\n"))
    }

    @Test("Flat key uses correct display name")
    func flatKeySignature() {
        let bb = KeyOption.allOptions.first { $0.displayName == "Bb" }
        let abc = ABCConverter.toABC(
            lick: TestFixtures.simpleLick,
            keyOption: bb ?? .default,
            clef: .treble,
            octaveOffset: 0
        )
        #expect(abc.contains("K:Bb clef=treble"))
    }

    @Test("Bass clef appears in header")
    func bassClef() {
        let abc = ABCConverter.toABC(
            lick: TestFixtures.simpleLick,
            keyOption: .default,
            clef: .bass,
            octaveOffset: 0
        )
        #expect(abc.contains("clef=bass"))
    }

    @Test("Rests render as z with duration")
    func restNotation() {
        let abc = ABCConverter.toABC(
            lick: TestFixtures.restLick,
            keyOption: .default,
            clef: .treble,
            octaveOffset: 0
        )
        #expect(abc.contains("z2"))
    }

    @Test("Octave offset transposes written pitches")
    func octaveOffset() {
        let base = ABCConverter.toABC(
            lick: TestFixtures.simpleLick,
            keyOption: .default,
            clef: .treble,
            octaveOffset: 0
        )
        let shifted = ABCConverter.toABC(
            lick: TestFixtures.simpleLick,
            keyOption: .default,
            clef: .treble,
            octaveOffset: 1
        )
        #expect(base != shifted)
    }

    @Test("Chart ABC produces slash marks per measure")
    func chartOutput() {
        let abc = ABCConverter.toChartABC(
            lick: TestFixtures.simpleLick,
            keyOption: .default,
            clef: .treble
        )
        #expect(abc.contains("L:1/1\n"))
        #expect(abc.contains("x"))
    }
}
