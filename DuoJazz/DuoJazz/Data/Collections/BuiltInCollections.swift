//
//  BuiltInCollections.swift
//  DuoJazz
//

import Foundation

/// Built-in collection catalog
enum BuiltInCollections {
    static let all: [LickCollection] = [
        iiVIEssentials, bluesBasics, bebopEssentials
    ]

    /// ii-V-I Essentials: core ii-V-I vocabulary
    static let iiVIEssentials = LickCollection(
        id: "ii-v-i-essentials",
        name: "ii-V-I Essentials",
        description: "Master the most common jazz progression with 4 essential licks.",
        tags: [.iiVI],
        lickIds: [
            "short-ii-v-i",
            "scaled-ii-v-i",
            "enclosure-ii-v-i",
            "descending-ii-v-i",
        ],
        difficulty: .intermediate,
        iconName: "arrow.triangle.2.circlepath"
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
