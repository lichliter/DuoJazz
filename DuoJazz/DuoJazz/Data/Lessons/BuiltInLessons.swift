//
//  BuiltInLessons.swift
//  DuoJazz
//

import Foundation

/// Built-in lesson catalog
enum BuiltInLessons {
    static let all: [Lesson] = [
        scales, triads, firstJazzPhrases, bluesBasics, bebopEssentials, intermediateIIVI
    ]

    /// Essential Scales: the vocabulary of every jazz solo
    static let scales = Lesson(
        id: "scales",
        name: "Essential Scales",
        description: "Major, minor, pentatonics, harmonic and melodic minor — the vocabulary of every solo.",
        tags: [.chordTones, .modal],
        lickIds: [
            "major-scale",
            "minor-scale",
            "major-pentatonic",
            "minor-pentatonic",
            "harmonic-minor",
            "melodic-minor",
        ],
        difficulty: .beginner,
        iconName: "music.note.list"
    )

    /// Triads: diatonic 3rds, triads, and broken triads
    static let triads = Lesson(
        id: "triads",
        name: "Triads",
        description: "Diatonic 3rds, triads, and broken triads — the building blocks of harmony.",
        tags: [.chordTones],
        lickIds: [
            "thirds-ascending",
            "thirds-descending",
            "triads-ascending",
            "triads-descending",
            "broken-triads",
        ],
        difficulty: .beginner,
        iconName: "tuningfork"
    )

    /// First Jazz Phrases: 5 essential ii-V-I patterns
    static let firstJazzPhrases = Lesson(
        id: "first-jazz-phrases",
        name: "First Jazz Phrases",
        description: "5 essential ii-V-I patterns — arpeggios, scales, enclosures, and classic lines.",
        tags: [.iiVI],
        lickIds: [
            "chord-tone-arpeggio",
            "scaled-ii-v-i",
            "enclosure-ii-v-i",
            "short-ii-v-i",
            "descending-ii-v-i",
        ],
        difficulty: .beginner,
        iconName: "music.note.list"
    )

    /// Blues Basics: essential blues vocabulary
    static let bluesBasics = Lesson(
        id: "blues-basics",
        name: "Blues Basics",
        description: "Build your blues vocabulary with scales, approaches, and enclosures.",
        tags: [.blues],
        lickIds: [
            "blues-scale",
            "blues-approach",
            "blues-enclosure",
            "blues-turnback",
            "blues-call-response",
        ],
        difficulty: .beginner,
        iconName: "guitars"
    )

    /// Bebop Essentials: core bebop language
    static let bebopEssentials = Lesson(
        id: "bebop-essentials",
        name: "Bebop Essentials",
        description: "Classic bebop patterns: scales, enclosures, and chromatic lines.",
        tags: [.bebop],
        lickIds: [
            "bebop-scale",
            "bebop-enclosure",
            "bebop-chromatic",
            "bebop-approach",
            "bebop-descending",
        ],
        difficulty: .intermediate,
        iconName: "bolt"
    )

    /// Intermediate ii-V-I: longer lines with chromatic approaches, enclosures, and leaps
    static let intermediateIIVI = Lesson(
        id: "intermediate-ii-v-i",
        name: "ii-V-I: Next Level",
        description: "Longer lines with chromatic runs, double enclosures, and intervallic leaps over ii-V-I.",
        tags: [.iiVI, .bebop],
        lickIds: [
            "iivi-honey-bee",
            "iivi-dig-it",
            "iivi-cry-me-enclosure",
            "iivi-leap-frog",
            "iivi-confirmation",
        ],
        difficulty: .intermediate,
        iconName: "flame"
    )
}
