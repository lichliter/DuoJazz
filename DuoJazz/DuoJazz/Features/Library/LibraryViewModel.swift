//
//  LibraryViewModel.swift
//  DuoJazz
//

import Foundation

@Observable
class LibraryViewModel {
    var activePaths: [Lesson] = [
        BuiltInLessons.firstJazzPhrases,
        BuiltInLessons.bluesBasics,
    ]

    var availablePaths: [Lesson] {
        let activeIds = Set(activePaths.map(\.id))
        return BuiltInLessons.all.filter { !activeIds.contains($0.id) }
    }

    // Stub progress data — will come from SwiftData in Phase 7
    func progress(for collection: Lesson) -> (completed: Int, total: Int) {
        switch collection.id {
        case "ii-v-i-essentials": (2, collection.lickCount)
        case "blues-basics": (0, collection.lickCount)
        default: (0, collection.lickCount)
        }
    }

    func startPath(_ collection: Lesson) {
        guard !activePaths.contains(where: { $0.id == collection.id }) else { return }
        activePaths.append(collection)
    }
}
