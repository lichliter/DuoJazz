//
//  BuiltInLicks.swift
//  DuoJazz
//

import Foundation

/// Built-in lick library
enum BuiltInLicks {
    /// All available licks
    static let all: [Lick] = [
        shortIIVI
    ]

    /// Short ii-V-I lick
    /// Intervals: 2nd, 3rd, 4th, 5th, 6th, 8th, 7th, 6th, 5th
    /// All eighth notes
    static let shortIIVI = Lick(
        id: "short-ii-v-i",
        name: "Short ii-V-I",
        category: "ii-V-I",
        timeSignature: (beats: 4, noteValue: 4),
        notes: [
            LickNote(interval: 2, startBeat: 1.0, value: .eighth),   // 2nd
            LickNote(interval: 4, startBeat: 1.5, value: .eighth),   // 3rd
            LickNote(interval: 5, startBeat: 2.0, value: .eighth),   // 4th
            LickNote(interval: 7, startBeat: 2.5, value: .eighth),   // 5th
            LickNote(interval: 9, startBeat: 3.0, value: .eighth),   // 6th
            LickNote(interval: 12, startBeat: 3.5, value: .eighth),  // 8th (octave)
            LickNote(interval: 11, startBeat: 4.0, value: .eighth),  // 7th
            LickNote(interval: 9, startBeat: 4.5, value: .eighth),   // 6th
            LickNote(interval: 7, startBeat: 5.0, value: .half),     // 5th (half note)
        ],
        chordProgression: .shortIIVI
    )
}
