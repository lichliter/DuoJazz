//
//  BuiltInLicks.swift
//  DuoJazz
//

import Foundation

/// Built-in lick library
enum BuiltInLicks {
    static let all: [Lick] = [
        shortIIVI, scaledIIVI, enclosureIIVI, descendingIIVI,
        bluesScale, bluesApproach, bluesEnclosure,
        bebopScale, bebopEnclosure, bebopChromatic,
        chromaticApproach, chordToneArpeggio,
        thirdsUp, thirdsDown, triadsUp, triadsDown, brokenTriads
    ]

    // MARK: - ii-V-I Licks

    static let shortIIVI = Lick(
        id: "short-ii-v-i", name: "Short ii-V-I", tags: [.iiVI],
        elements: [
            N(2), N(4), N(5), N(7),  // scale up
            N(9), N(12), N(11), N(9),  // up to octave, descend
            N(7, .half),  // resolve
        ],
        chordProgression: .shortIIVI
    )

    static let scaledIIVI = Lick(
        id: "scaled-ii-v-i", name: "Scaled ii-V-I", tags: [.iiVI, .chordTones],
        elements: [
            N(0), N(2), N(4), N(5), N(7), N(9), N(11), N(12),
        ],
        chordProgression: .shortIIVI
    )

    /// Enclosure ii-V-I: diatonic above, chromatic below, target chord tone
    static let enclosureIIVI = Lick(
        id: "enclosure-ii-v-i", name: "Enclosure ii-V-I", tags: [.iiVI, .approachNotes],
        elements: [
            N(5), N(3),           // diatonic above, chromatic below 3rd
            N(4, .quarter),       // 3rd (target)
            N(9), N(6),           // diatonic above, chromatic below 5th
            N(7, .quarter),       // 5th (target)
            N(0, .half),          // resolve to root
        ],
        chordProgression: .shortIIVI
    )

    static let descendingIIVI = Lick(
        id: "descending-ii-v-i", name: "Descending ii-V-I", tags: [.iiVI],
        elements: [
            N(14), N(12), N(11), N(9), N(7), N(5), N(4), N(2),
            N(0, .half),
        ],
        chordProgression: .shortIIVI
    )

    // MARK: - Blues Licks

    static let bluesScale = Lick(
        id: "blues-scale", name: "Blues Scale Run", tags: [.blues],
        elements: [
            N(0), N(3), N(5), N(6), N(7), N(10), N(12, .half),
        ]
    )

    static let bluesApproach = Lick(
        id: "blues-approach", name: "Blues Approach", tags: [.blues, .approachNotes],
        elements: [
            N(3), N(4, .quarter), N(6), N(7, .quarter),
            N(9), N(10), N(12, .half),
        ]
    )

    /// Blues enclosure: diatonic above, chromatic below
    static let bluesEnclosure = Lick(
        id: "blues-enclosure", name: "Blues Enclosure", tags: [.blues, .bebop],
        elements: [
            N(9), N(6),           // diatonic above, chromatic below 5th
            N(7, .quarter),       // 5th
            N(5), N(3),           // diatonic above, chromatic below 3rd
            N(4, .quarter),       // 3rd
            N(0, .half),          // root
        ]
    )

    // MARK: - Bebop Licks

    static let bebopScale = Lick(
        id: "bebop-scale", name: "Bebop Scale", tags: [.bebop, .dominant],
        elements: [
            N(12), N(11), N(10), N(9), N(7), N(5), N(4), N(2),
            N(0, .half),
        ]
    )

    /// Bebop enclosure: diatonic above, chromatic below
    static let bebopEnclosure = Lick(
        id: "bebop-enclosure", name: "Bebop Enclosure", tags: [.bebop, .approachNotes],
        elements: [
            N(9), N(6),            // enclose 5th
            N(7, .quarter),        // 5th
            N(14), N(11),          // enclose octave
            N(12, .quarter),       // octave
            N(7, .half),           // resolve to 5th
        ]
    )

    static let bebopChromatic = Lick(
        id: "bebop-chromatic", name: "Bebop Chromatic", tags: [.bebop, .chromaticRuns],
        elements: [
            N(7), N(8), N(9), N(10), N(11), N(12), N(11), N(7),
            N(4, .half),
        ]
    )

    // MARK: - Technique Licks

    static let chromaticApproach = Lick(
        id: "chromatic-approach", name: "Chromatic Approach", tags: [.chromaticRuns, .approachNotes],
        elements: [
            N(-1), N(0, .quarter),
            N(3), N(4, .quarter),
            N(6), N(7),
            N(12, .half),
        ]
    )

    static let chordToneArpeggio = Lick(
        id: "chord-tone-arpeggio", name: "Chord Tone Arpeggio", tags: [.chordTones],
        elements: [
            N(0), N(4), N(7), N(11), N(12), N(11), N(7), N(4),
            N(0, .half),
        ]
    )

    // MARK: - Triad Module Licks

    static let thirdsUp = Lick(
        id: "thirds-ascending", name: "3rds Ascending", tags: [.chordTones],
        elements: [
            N(0), N(4),   // 1-3
            N(2), N(5),   // 2-4
            N(4), N(7),   // 3-5
            N(5), N(9),   // 4-6
            N(7), N(11),  // 5-7
            N(9), N(12),  // 6-8
            N(11), N(14), // 7-9
            N(12, .half), R(.half), // 8
        ],
        chordProgression: .diatonicTriads
    )

    static let thirdsDown = Lick(
        id: "thirds-descending", name: "3rds Descending", tags: [.chordTones],
        elements: [
            N(12), N(9),  // 8-6
            N(11), N(7),  // 7-5
            N(9), N(5),   // 6-4
            N(7), N(4),   // 5-3
            N(5), N(2),   // 4-2
            N(4), N(0),   // 3-1
            N(2), N(-1),  // 2-7below
            N(0, .half), R(.half), // 1
        ],
        chordProgression: .diatonicTriads
    )

    // Triplet quarters: each triad spans 2 beats

    static let triadsUp = Lick(
        id: "triads-ascending", name: "Triads Ascending", tags: [.chordTones],
        elements: [
            N(0, .triplet(.quarter)), N(4, .triplet(.quarter)), N(7, .triplet(.quarter)),     // I
            N(2, .triplet(.quarter)), N(5, .triplet(.quarter)), N(9, .triplet(.quarter)),     // ii
            N(4, .triplet(.quarter)), N(7, .triplet(.quarter)), N(11, .triplet(.quarter)),    // iii
            N(5, .triplet(.quarter)), N(9, .triplet(.quarter)), N(12, .triplet(.quarter)),    // IV
            N(12, .half), R(.half),
        ],
        chordProgression: .diatonicTriadsLong
    )

    static let triadsDown = Lick(
        id: "triads-descending", name: "Triads Descending", tags: [.chordTones],
        elements: [
            N(12, .triplet(.quarter)), N(9, .triplet(.quarter)), N(5, .triplet(.quarter)),    // high
            N(11, .triplet(.quarter)), N(7, .triplet(.quarter)), N(4, .triplet(.quarter)),    // 7-5-3
            N(9, .triplet(.quarter)), N(5, .triplet(.quarter)), N(2, .triplet(.quarter)),     // 6-4-2
            N(7, .triplet(.quarter)), N(4, .triplet(.quarter)), N(0, .triplet(.quarter)),     // 5-3-1
            N(0, .half), R(.half),
        ],
        chordProgression: .diatonicTriadsLong
    )

    static let brokenTriads = Lick(
        id: "broken-triads", name: "Broken Triads", tags: [.chordTones],
        elements: [
            N(0), N(7), N(4),     // 1-5-3
            N(2), N(9), N(5),     // 2-6-4
            N(4), N(11), N(7),    // 3-7-5
            N(5), N(12), N(9),    // 4-8-6
            N(7), N(14),          // 5-9
            N(11),                // 7
            N(12, .half), R(.half), // 8
        ],
        chordProgression: .diatonicTriadsLong
    )
}
