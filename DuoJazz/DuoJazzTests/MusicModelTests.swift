//
//  MusicModelTests.swift
//  DuoJazzTests
//

import Testing
@testable import DuoJazz

@MainActor
@Suite("Music Model")
struct MusicModelTests {

    @Test("Key midiRoot spans 12 semitones from C")
    func keyMidiRoot() {
        #expect(Key.c.midiRoot == 60)
        #expect(Key.g.midiRoot == 67)
        #expect(Key.b.midiRoot == 71)
    }

    @Test("Lick pitches transpose correctly in every key")
    func lickTranspositionAllKeys() {
        let lick = TestFixtures.simpleLick
        for key in Key.allCases {
            let pitches = lick.pitches(in: key)
            #expect(pitches == [
                key.midiRoot,
                key.midiRoot + 4,
                key.midiRoot + 7,
                key.midiRoot + 12,
            ])
        }
    }

    @Test("LickElement maps interval to absolute MIDI pitch")
    func lickElementMidiPitch() {
        let note = N(5, .quarter)
        #expect(note.midiPitch(root: 60) == 65)
        #expect(note.isNote == true)
        #expect(note.interval == 5)

        let rest = R(.quarter)
        #expect(rest.midiPitch(root: 60) == nil)
        #expect(rest.isNote == false)
    }

    @Test("Lick duration and measure count")
    func lickDurationAndMeasures() {
        let lick = TestFixtures.simpleLick
        #expect(lick.noteCount == 4)
        #expect(lick.totalBeats == 3.0)
        #expect(lick.measureCount == 1)
        #expect(lick.timeSignatureString == "4/4")
    }

    @Test("NoteValue beats are correct")
    func noteValueBeats() {
        #expect(NoteValue.whole.beats == 4.0)
        #expect(NoteValue.quarter.beats == 1.0)
        #expect(NoteValue.eighth.beats == 0.5)
        #expect(NoteValue.dotted(.quarter).beats == 1.5)
        #expect(NoteValue.triplet(.quarter).beats == 2.0 / 3.0)
    }

    @Test("KeyOption provides enharmonic spellings")
    func keyOptionEnharmonics() {
        let bb = KeyOption.allOptions.first { $0.displayName == "Bb" }
        #expect(bb?.key == .aSharp)
        #expect(bb?.usesFlats == true)

        let fSharp = KeyOption.allOptions.first { $0.displayName == "F#" }
        #expect(fSharp?.key == .fSharp)
        #expect(fSharp?.usesFlats == false)
    }
}
