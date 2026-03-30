//
//  BuiltInCollections.swift
//  DuoJazz
//

import Foundation

/// Built-in module catalog
enum BuiltInCollections {
    static let all: [LickCollection] = [
        triads, firstJazzPhrases, bluesBasics, bebopEssentials
    ]

    /// Triads: diatonic 3rds, triads, and broken triads
    static let triads = LickCollection(
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
    static let firstJazzPhrases = LickCollection(
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
    static let bluesBasics = LickCollection(
        id: "blues-basics",
        name: "Blues Basics",
        description: "Build your blues vocabulary with scales, approaches, and enclosures.",
        tags: [.blues],
        lickIds: [
            "blues-scale",
            "blues-approach",
            "blues-enclosure",
        ],
        difficulty: .beginner,
        iconName: "guitars"
    )

    /// Bebop Essentials: core bebop language
    static let bebopEssentials = LickCollection(
        id: "bebop-essentials",
        name: "Bebop Essentials",
        description: "Classic bebop patterns: scales, enclosures, and chromatic lines.",
        tags: [.bebop],
        lickIds: [
            "bebop-scale",
            "bebop-enclosure",
            "bebop-chromatic",
        ],
        difficulty: .intermediate,
        iconName: "bolt"
    )
}
