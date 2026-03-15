//
//  BuiltInLicks.swift
//  DuoJazz
//

import Foundation

/// Built-in lick library
enum BuiltInLicks {
    /// All available licks
    static let all: [Lick] = [
        shortIIVI, scaledIIVI, enclosureIIVI, descendingIIVI,
        bluesScale, bluesApproach, bluesEnclosure,
        bebopScale, bebopEnclosure, bebopChromatic,
        chromaticApproach, chordToneArpeggio
    ]

    // MARK: - ii-V-I Licks

    /// Short ii-V-I: scale up from 2nd to octave, descend 7-6-5
    static let shortIIVI = Lick(
        id: "short-ii-v-i",
        name: "Short ii-V-I",
        tags: [.iiVI],
        notes: [
            LickNote(interval: 2, startBeat: 1.0, value: .eighth),
            LickNote(interval: 4, startBeat: 1.5, value: .eighth),
            LickNote(interval: 5, startBeat: 2.0, value: .eighth),
            LickNote(interval: 7, startBeat: 2.5, value: .eighth),
            LickNote(interval: 9, startBeat: 3.0, value: .eighth),
            LickNote(interval: 12, startBeat: 3.5, value: .eighth),
            LickNote(interval: 11, startBeat: 4.0, value: .eighth),
            LickNote(interval: 9, startBeat: 4.5, value: .eighth),
            LickNote(interval: 7, startBeat: 5.0, value: .half),
        ],
        chordProgression: .shortIIVI
    )

    /// Scaled ii-V-I: stepwise motion through chord tones
    static let scaledIIVI = Lick(
        id: "scaled-ii-v-i",
        name: "Scaled ii-V-I",
        tags: [.iiVI, .chordTones],
        notes: [
            LickNote(interval: 0, startBeat: 1.0, value: .eighth),
            LickNote(interval: 2, startBeat: 1.5, value: .eighth),
            LickNote(interval: 4, startBeat: 2.0, value: .eighth),
            LickNote(interval: 5, startBeat: 2.5, value: .eighth),
            LickNote(interval: 7, startBeat: 3.0, value: .eighth),
            LickNote(interval: 9, startBeat: 3.5, value: .eighth),
            LickNote(interval: 11, startBeat: 4.0, value: .eighth),
            LickNote(interval: 12, startBeat: 4.5, value: .eighth),
        ],
        chordProgression: .shortIIVI
    )

    /// Enclosure ii-V-I: chromatic enclosure into chord tones
    static let enclosureIIVI = Lick(
        id: "enclosure-ii-v-i",
        name: "Enclosure ii-V-I",
        tags: [.iiVI, .approachNotes],
        notes: [
            LickNote(interval: 3, startBeat: 1.0, value: .eighth),
            LickNote(interval: 5, startBeat: 1.5, value: .eighth),
            LickNote(interval: 4, startBeat: 2.0, value: .quarter),
            LickNote(interval: 6, startBeat: 3.0, value: .eighth),
            LickNote(interval: 8, startBeat: 3.5, value: .eighth),
            LickNote(interval: 7, startBeat: 4.0, value: .quarter),
            LickNote(interval: 12, startBeat: 5.0, value: .half),
        ],
        chordProgression: .shortIIVI
    )

    /// Descending ii-V-I: starts high and resolves downward
    static let descendingIIVI = Lick(
        id: "descending-ii-v-i",
        name: "Descending ii-V-I",
        tags: [.iiVI],
        notes: [
            LickNote(interval: 14, startBeat: 1.0, value: .eighth),
            LickNote(interval: 12, startBeat: 1.5, value: .eighth),
            LickNote(interval: 11, startBeat: 2.0, value: .eighth),
            LickNote(interval: 9, startBeat: 2.5, value: .eighth),
            LickNote(interval: 7, startBeat: 3.0, value: .eighth),
            LickNote(interval: 5, startBeat: 3.5, value: .eighth),
            LickNote(interval: 4, startBeat: 4.0, value: .eighth),
            LickNote(interval: 2, startBeat: 4.5, value: .eighth),
            LickNote(interval: 0, startBeat: 5.0, value: .half),
        ],
        chordProgression: .shortIIVI
    )

    // MARK: - Blues Licks

    /// Blues scale run: classic blues scale ascending
    static let bluesScale = Lick(
        id: "blues-scale",
        name: "Blues Scale Run",
        tags: [.blues],
        notes: [
            LickNote(interval: 0, startBeat: 1.0, value: .eighth),
            LickNote(interval: 3, startBeat: 1.5, value: .eighth),
            LickNote(interval: 5, startBeat: 2.0, value: .eighth),
            LickNote(interval: 6, startBeat: 2.5, value: .eighth),
            LickNote(interval: 7, startBeat: 3.0, value: .eighth),
            LickNote(interval: 10, startBeat: 3.5, value: .eighth),
            LickNote(interval: 12, startBeat: 4.0, value: .half),
        ]
    )

    /// Blues approach: chromatic approach to chord tones over blues
    static let bluesApproach = Lick(
        id: "blues-approach",
        name: "Blues Approach",
        tags: [.blues, .approachNotes],
        notes: [
            LickNote(interval: 3, startBeat: 1.0, value: .eighth),
            LickNote(interval: 4, startBeat: 1.5, value: .quarter),
            LickNote(interval: 6, startBeat: 2.5, value: .eighth),
            LickNote(interval: 7, startBeat: 3.0, value: .quarter),
            LickNote(interval: 9, startBeat: 4.0, value: .eighth),
            LickNote(interval: 10, startBeat: 4.5, value: .eighth),
            LickNote(interval: 12, startBeat: 5.0, value: .half),
        ]
    )

    /// Blues enclosure: enclosure pattern in blues context
    static let bluesEnclosure = Lick(
        id: "blues-enclosure",
        name: "Blues Enclosure",
        tags: [.blues, .bebop],
        notes: [
            LickNote(interval: 6, startBeat: 1.0, value: .eighth),
            LickNote(interval: 8, startBeat: 1.5, value: .eighth),
            LickNote(interval: 7, startBeat: 2.0, value: .quarter),
            LickNote(interval: 3, startBeat: 3.0, value: .eighth),
            LickNote(interval: 5, startBeat: 3.5, value: .eighth),
            LickNote(interval: 4, startBeat: 4.0, value: .quarter),
            LickNote(interval: 0, startBeat: 5.0, value: .half),
        ]
    )

    // MARK: - Bebop Licks

    /// Bebop scale: descending bebop dominant scale
    static let bebopScale = Lick(
        id: "bebop-scale",
        name: "Bebop Scale",
        tags: [.bebop, .dominant],
        notes: [
            LickNote(interval: 12, startBeat: 1.0, value: .eighth),
            LickNote(interval: 11, startBeat: 1.5, value: .eighth),
            LickNote(interval: 10, startBeat: 2.0, value: .eighth),
            LickNote(interval: 9, startBeat: 2.5, value: .eighth),
            LickNote(interval: 7, startBeat: 3.0, value: .eighth),
            LickNote(interval: 5, startBeat: 3.5, value: .eighth),
            LickNote(interval: 4, startBeat: 4.0, value: .eighth),
            LickNote(interval: 2, startBeat: 4.5, value: .eighth),
            LickNote(interval: 0, startBeat: 5.0, value: .half),
        ]
    )

    /// Bebop enclosure: classic bebop enclosure pattern
    static let bebopEnclosure = Lick(
        id: "bebop-enclosure",
        name: "Bebop Enclosure",
        tags: [.bebop, .approachNotes],
        notes: [
            LickNote(interval: 8, startBeat: 1.0, value: .eighth),
            LickNote(interval: 6, startBeat: 1.5, value: .eighth),
            LickNote(interval: 7, startBeat: 2.0, value: .quarter),
            LickNote(interval: 11, startBeat: 3.0, value: .eighth),
            LickNote(interval: 9, startBeat: 3.5, value: .eighth),
            LickNote(interval: 10, startBeat: 4.0, value: .eighth),
            LickNote(interval: 12, startBeat: 4.5, value: .eighth),
            LickNote(interval: 7, startBeat: 5.0, value: .half),
        ]
    )

    /// Bebop chromatic: chromatic passing tones in bebop style
    static let bebopChromatic = Lick(
        id: "bebop-chromatic",
        name: "Bebop Chromatic",
        tags: [.bebop, .chromaticRuns],
        notes: [
            LickNote(interval: 7, startBeat: 1.0, value: .eighth),
            LickNote(interval: 8, startBeat: 1.5, value: .eighth),
            LickNote(interval: 9, startBeat: 2.0, value: .eighth),
            LickNote(interval: 10, startBeat: 2.5, value: .eighth),
            LickNote(interval: 11, startBeat: 3.0, value: .eighth),
            LickNote(interval: 12, startBeat: 3.5, value: .eighth),
            LickNote(interval: 11, startBeat: 4.0, value: .eighth),
            LickNote(interval: 7, startBeat: 4.5, value: .eighth),
            LickNote(interval: 4, startBeat: 5.0, value: .half),
        ]
    )

    // MARK: - Technique Licks

    /// Chromatic approach: chromatic approach from below to target notes
    static let chromaticApproach = Lick(
        id: "chromatic-approach",
        name: "Chromatic Approach",
        tags: [.chromaticRuns, .approachNotes],
        notes: [
            LickNote(interval: -1, startBeat: 1.0, value: .eighth),
            LickNote(interval: 0, startBeat: 1.5, value: .quarter),
            LickNote(interval: 3, startBeat: 2.5, value: .eighth),
            LickNote(interval: 4, startBeat: 3.0, value: .quarter),
            LickNote(interval: 6, startBeat: 4.0, value: .eighth),
            LickNote(interval: 7, startBeat: 4.5, value: .eighth),
            LickNote(interval: 12, startBeat: 5.0, value: .half),
        ]
    )

    /// Chord tone arpeggio: major 7 arpeggio up and down
    static let chordToneArpeggio = Lick(
        id: "chord-tone-arpeggio",
        name: "Chord Tone Arpeggio",
        tags: [.chordTones],
        notes: [
            LickNote(interval: 0, startBeat: 1.0, value: .eighth),
            LickNote(interval: 4, startBeat: 1.5, value: .eighth),
            LickNote(interval: 7, startBeat: 2.0, value: .eighth),
            LickNote(interval: 11, startBeat: 2.5, value: .eighth),
            LickNote(interval: 12, startBeat: 3.0, value: .eighth),
            LickNote(interval: 11, startBeat: 3.5, value: .eighth),
            LickNote(interval: 7, startBeat: 4.0, value: .eighth),
            LickNote(interval: 4, startBeat: 4.5, value: .eighth),
            LickNote(interval: 0, startBeat: 5.0, value: .half),
        ]
    )
}
