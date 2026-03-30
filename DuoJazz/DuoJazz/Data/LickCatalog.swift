//
//  LickCatalog.swift
//  DuoJazz
//

import Foundation

/// Central lookup for all licks in the app
struct LickCatalog: Sendable {
    private let licksById: [String: Lick]
    let allLicks: [Lick]
    let allTags: [Tag]

    static let shared = LickCatalog(licks: BuiltInLicks.all)

    init(licks: [Lick]) {
        self.licksById = Dictionary(uniqueKeysWithValues: licks.map { ($0.id, $0) })
        self.allLicks = licks.sorted { $0.name < $1.name }
        let tagSet = Set(licks.flatMap(\.tags))
        self.allTags = Tag.allCases.filter { tagSet.contains($0) }
    }

    func lick(withId id: String) -> Lick? {
        licksById[id]
    }

    func licks(withTag tag: Tag) -> [Lick] {
        allLicks.filter { $0.tags.contains(tag) }
    }

    func licks(for collection: LickCollection) -> [Lick] {
        collection.lickIds.compactMap { licksById[$0] }
    }

    func search(_ query: String) -> [Lick] {
        let q = query.lowercased()
        return allLicks.filter { lick in
            lick.name.lowercased().contains(q) ||
            lick.tags.contains(where: { $0.displayName.lowercased().contains(q) })
        }
    }
}
