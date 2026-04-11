//
//  BuiltInLicks.swift
//  DuoJazz
//

import Foundation

/// Built-in lick library
enum BuiltInLicks {
    static let all: [Lick] = [
        shortIIVI, scaledIIVI, enclosureIIVI, descendingIIVI,
        bluesScale, bluesApproach, bluesEnclosure, bluesTurnback, bluesCallResponse,
        bebopScale, bebopEnclosure, bebopChromatic, bebopApproach, bebopDescending,
        chromaticApproach, chordToneArpeggio, chromaticTargeting,
        thirdsUp, thirdsDown, triadsUp, triadsDown, brokenTriads,
        iiviHoneyBee, iiviDigIt, iiviCryMeEnclosure, iiviLeapFrog, iiviConfirmation,
        smoothIIVI,
        chromaticApproachScale,
        majorScale, naturalMinorScale, majorPentatonic, minorPentatonic, harmonicMinorScale, melodicMinorScale,
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

    /// Blues turnback: b7 down to 3rd via blues scale, classic turnaround phrase
    static let bluesTurnback = Lick(
        id: "blues-turnback", name: "Blues Turnback", tags: [.blues, .turnarounds],
        elements: [
            N(10), N(7), N(6), N(5),     // b7-5-b5-4
            N(3), N(0, .quarter),         // b3-root
            N(-2), N(0, .half),           // b7 below-root resolve
        ]
    )

    /// Blues call & response: short call (b3-4-b5-4), answer resolves (b3-root)
    static let bluesCallResponse = Lick(
        id: "blues-call-response", name: "Blues Call & Response", tags: [.blues],
        elements: [
            N(3), N(5), N(6), N(5, .quarter),     // call: b3-4-b5-4
            R(.quarter),                            // breath
            N(3), N(0, .quarter),                   // answer: b3-root
            N(-2), N(0, .half),                     // b7 below-root resolve
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

    /// Bebop approach: chromatic below into each chord tone (1-3-5-7)
    static let bebopApproach = Lick(
        id: "bebop-approach", name: "Bebop Approach", tags: [.bebop, .approachNotes],
        elements: [
            N(-1), N(0, .quarter),         // approach root
            N(3), N(4, .quarter),          // approach 3rd
            N(6), N(7, .quarter),          // approach 5th
            N(10), N(11, .quarter),        // approach 7th
        ]
    )

    /// Bebop Descending: 1235 digital pattern descending through the dominant scale
    static let bebopDescending = Lick(
        id: "bebop-descending", name: "Bebop Descending", tags: [.bebop, .dominant],
        elements: [
            N(12), N(11), N(9), N(7),      // 8-7-6-5 (digital group from octave)
            N(9), N(7), N(5), N(4),        // 6-5-4-3 (down a step)
            N(0, .half),                    // resolve to root
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

    // MARK: - Intermediate ii-V-I Licks

    /// Honey Bee: dorian climb on ii, dominant resolution on V, land on 3rd of I
    static let iiviHoneyBee = Lick(
        id: "iivi-honey-bee", name: "Honey Bee", tags: [.iiVI],
        elements: [
            // ii-7: dorian run up
            N(0), N(2), N(3), N(5), N(7), N(9), N(10), N(12),
            // V7: descend with bebop passing tone
            N(11), N(10), N(9), N(7), N(5), N(4), N(3), N(2),
            // Imaj7: resolve
            N(0, .half), R(.half),
            R(.whole),
        ],
        chordProgression: .longIIVI
    )

    /// Dig It: arpeggio up ii-7, chromatic approach into V7 chord tones, resolve to root
    static let iiviDigIt = Lick(
        id: "iivi-dig-it", name: "Dig It", tags: [.iiVI, .chordTones],
        elements: [
            // ii-7: arpeggio 1-b3-5-b7
            N(0, .quarter), N(3, .quarter), N(7, .quarter), N(10, .quarter),
            // V7: chromatic into 3rd, down to root
            N(8), N(9), N(11), N(7), N(5), N(4), N(2), N(0),
            // Imaj7: resolve
            N(0, .half), R(.half),
            R(.whole),
        ],
        chordProgression: .longIIVI
    )

    /// Cry Me Enclosure: double enclosure on 3rd, then 7th, resolves down to root
    static let iiviCryMeEnclosure = Lick(
        id: "iivi-cry-me-enclosure", name: "Cry Me Enclosure", tags: [.iiVI, .approachNotes],
        elements: [
            // ii-7: double enclosure targeting 5th
            N(5), N(3), N(9), N(6),
            N(7, .quarter), R(.quarter),
            // V7: enclosure targeting 3rd, descend
            N(5), N(3), N(4, .quarter),
            N(2), N(0), R(.quarter),
            // Imaj7: resolve
            N(0, .half), R(.half),
            R(.whole),
        ],
        chordProgression: .longIIVI
    )

    /// Leap Frog: skips and leaps — 3rds and 4ths outlining ii-7 then V7
    static let iiviLeapFrog = Lick(
        id: "iivi-leap-frog", name: "Leap Frog", tags: [.iiVI, .chordTones],
        elements: [
            // ii-7: ascending in 3rds
            N(0), N(3), N(2), N(5), N(4), N(7), N(5), N(9),
            // V7: descending in 3rds
            N(11), N(7), N(9), N(5), N(7), N(4), N(5), N(2),
            // Imaj7: resolve
            N(0, .half), R(.half),
            R(.whole),
        ],
        chordProgression: .longIIVI
    )

    /// Smooth ii-V-I: Am7 arpeggio down, target 3rd of V7, chromatic resolve to 5th of I
    static let smoothIIVI = Lick(
        id: "smooth-ii-v-i", name: "Smooth ii-V-I", tags: [.iiVI, .chromaticRuns],
        elements: [
            // ii-7: descending Am7 arpeggio (b7-5-b3-root)
            N(12), N(9), N(5), N(2),
            // V7: b13 up to 3rd, chromatic approach
            N(3), N(11), N(9), N(8),
            // Imaj7: resolve to 5th
            N(7, .half), R(.half),
        ],
        chordProgression: .shortIIVI
    )

    /// Confirmation: Parker-style line — chromatic runs connecting chord tones over ii-V-I
    static let iiviConfirmation = Lick(
        id: "iivi-confirmation", name: "Confirmation", tags: [.iiVI, .bebop, .chromaticRuns],
        elements: [
            // ii-7: root up chromatically to 3rd, leap to 5th
            N(0), N(1), N(2), N(3), N(7), N(5), N(3), N(2),
            // V7: 9th down through bebop scale
            N(14), N(12), N(11), N(9), N(7), N(6), N(5), N(4),
            // Imaj7: resolve to root
            N(0, .half), R(.half),
            R(.whole),
        ],
        chordProgression: .longIIVI
    )

    /// Chromatic Targeting: approach each scale degree from a half step below, ascending through the scale
    static let chromaticTargeting = Lick(
        id: "chromatic-targeting", name: "Chromatic Targeting", tags: [.chromaticRuns, .approachNotes],
        elements: [
            // Bar 1: approach root and 2nd from half step below
            N(-1), N(0), N(2), N(4), N(1), N(2), N(4), N(5),
            // Bar 2: approach 3rd and 4th
            N(3), N(4), N(5), N(7), N(4), N(5), N(7), N(9),
            // Bar 3: approach 5th and 6th
            N(6), N(7), N(9), N(11), N(8), N(9), N(11), N(12),
            // Bar 4: approach 7th, arrive at octave, resolve
            N(10), N(11), N(12, .quarter), N(9), N(7), N(0, .quarter),
        ]
    )

    /// Diatonic 3rds with chromatic connections: leap to diatonic 3rd, return, chromatic lead to next scale degree
    static let chromaticApproachScale = Lick(
        id: "chromatic-approach-scale", name: "3rds Chromatic Approach", tags: [.chromaticRuns, .chordTones],
        elements: [
            // D: up a 3rd, return, chromatic lead to E
            N(0), N(4), N(0), N(1),
            // E: up a 3rd, return, chromatic lead to F#
            N(2), N(5), N(2), N(3),
            // F#: up a 3rd, chromatic descent back
            N(4), N(7), N(6), N(4),
            // G: up a 3rd, return, chromatic lead to A
            N(5), N(9), N(5), N(6),
            // A: up a 3rd, return, chromatic lead to B
            N(7), N(11), N(7), N(8),
            // B: up a 3rd, return, chromatic lead to C#
            N(9), N(12), N(9), N(10),
            // C#: up a 3rd, chromatic descent back
            N(11), N(14), N(13), N(11),
            // Resolve to octave
            N(12, .half),
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

    // MARK: - Scale Module Licks

    /// Major scale: up and down. 1-2-3-4-5-6-7-8-7-6-5-4-3-2-1
    static let majorScale = Lick(
        id: "major-scale", name: "Major Scale", tags: [.chordTones],
        elements: [
            N(0), N(2), N(4), N(5),    // 1-2-3-4
            N(7), N(9), N(11), N(12),  // 5-6-7-8
            N(11), N(9), N(7), N(5),   // 7-6-5-4
            N(4), N(2),                // 3-2
            N(0, .half), R(.half),     // 1
        ]
    )

    /// Natural minor scale: 1-b3-4-5-b6-b7-8 up and down
    static let naturalMinorScale = Lick(
        id: "minor-scale", name: "Natural Minor Scale", tags: [.minor, .chordTones],
        elements: [
            N(0), N(2), N(3), N(5),    // 1-2-b3-4
            N(7), N(8), N(10), N(12),  // 5-b6-b7-8
            N(10), N(8), N(7), N(5),   // b7-b6-5-4
            N(3), N(2),                // b3-2
            N(0, .half), R(.half),     // 1
        ]
    )

    /// Major pentatonic: 1-2-3-5-6-8. Triplet quarters so each half-bar fits 3 notes.
    static let majorPentatonic = Lick(
        id: "major-pentatonic", name: "Major Pentatonic", tags: [.pentatonic, .chordTones],
        elements: [
            N(0), N(2), N(4),          // 1-2-3
            N(7), N(9), N(12),         // 5-6-8
            N(9), N(7), N(4),          // 6-5-3
            N(2),                      // 2
            N(0, .half), R(.half),     // 1
        ]
    )

    /// Minor pentatonic: 1-b3-4-5-b7-8. The backbone of blues and rock soloing.
    static let minorPentatonic = Lick(
        id: "minor-pentatonic", name: "Minor Pentatonic", tags: [.pentatonic, .minor],
        elements: [
            N(0), N(3), N(5),          // 1-b3-4
            N(7), N(10), N(12),        // 5-b7-8
            N(10), N(7), N(5),         // b7-5-4
            N(3),                      // b3
            N(0, .half), R(.half),     // 1
        ]
    )

    /// Harmonic minor: 1-2-b3-4-5-b6-7-8. The natural 7 gives it that exotic flavor.
    static let harmonicMinorScale = Lick(
        id: "harmonic-minor", name: "Harmonic Minor", tags: [.minor, .chordTones],
        elements: [
            N(0), N(2), N(3), N(5),    // 1-2-b3-4
            N(7), N(8), N(11), N(12),  // 5-b6-7-8
            N(11), N(8), N(7), N(5),   // 7-b6-5-4
            N(3), N(2),                // b3-2
            N(0, .half), R(.half),     // 1
        ]
    )

    /// Melodic minor (ascending form): 1-2-b3-4-5-6-7-8. Minor 3rd with natural 6 and 7.
    static let melodicMinorScale = Lick(
        id: "melodic-minor", name: "Melodic Minor", tags: [.minor, .chordTones],
        elements: [
            N(0), N(2), N(3), N(5),    // 1-2-b3-4
            N(7), N(9), N(11), N(12),  // 5-6-7-8
            N(11), N(9), N(7), N(5),   // 7-6-5-4
            N(3), N(2),                // b3-2
            N(0, .half), R(.half),     // 1
        ]
    )
}
