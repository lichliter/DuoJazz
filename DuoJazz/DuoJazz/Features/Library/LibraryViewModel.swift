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

    func startPath(_ lesson: Lesson) {
        guard !activePaths.contains(where: { $0.id == lesson.id }) else { return }
        activePaths.append(lesson)
    }
}
