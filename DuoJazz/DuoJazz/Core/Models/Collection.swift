//
//  Collection.swift
//  DuoJazz
//

import Foundation

/// A curated group of licks around a jazz concept
struct LickCollection: Identifiable, Sendable, Hashable {
    let id: String
    let name: String
    let description: String
    let tags: [Tag]
    let lickIds: [String]
    let difficulty: Difficulty
    let iconName: String

    var lickCount: Int { lickIds.count }

    /// Resolve lick IDs to actual Lick objects via the catalog
    func licks(from catalog: LickCatalog) -> [Lick] {
        lickIds.compactMap { catalog.lick(withId: $0) }
    }
}
