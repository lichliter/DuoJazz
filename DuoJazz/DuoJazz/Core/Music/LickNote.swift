//
//  LickNote.swift
//  DuoJazz
//

import Foundation

/// A single note within a lick, using intervals (semitones from root)
struct LickNote: Hashable, Sendable {
    /// Semitones from root (0=root, 2=2nd, 4=3rd, 5=4th, 7=5th, 9=6th, 11=7th, 12=octave)
    let interval: Int
    let startBeat: Double
    let value: NoteValue

    /// Duration in beats, derived from note value
    var durationBeats: Double {
        value.beats
    }

    /// Convert to absolute MIDI pitch given a root note
    func midiPitch(root: Int) -> Int {
        root + interval
    }
}
