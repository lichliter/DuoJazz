//
//  LibraryViewModel.swift
//  DuoJazz
//

import Foundation

@Observable
class LibraryViewModel {
    var activePaths: [LickCollection] = [
        BuiltInCollections.firstJazzPhrases,
        BuiltInCollections.bluesBasics,
    ]

    var availablePaths: [LickCollection] {
        let activeIds = Set(activePaths.map(\.id))
        return BuiltInCollections.all.filter { !activeIds.contains($0.id) }
    }

    // Stub progress data — will come from SwiftData in Phase 7
    func progress(for collection: LickCollection) -> (completed: Int, total: Int) {
        switch collection.id {
        case "ii-v-i-essentials": (2, collection.lickCount)
        case "blues-basics": (0, collection.lickCount)
        default: (0, collection.lickCount)
        }
    }

    func startPath(_ collection: LickCollection) {
        guard !activePaths.contains(where: { $0.id == collection.id }) else { return }
        activePaths.append(collection)
    }
}
