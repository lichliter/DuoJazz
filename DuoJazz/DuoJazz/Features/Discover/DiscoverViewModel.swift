//
//  DiscoverViewModel.swift
//  DuoJazz
//

import Foundation

@Observable
class DiscoverViewModel {
    var allCollections: [LickCollection] = BuiltInCollections.all
    var activeCollectionId: String? = BuiltInCollections.iiVIEssentials.id
    var selectedKey: KeyOption = KeyOption.allOptions[0]
    var showingSession = false
    var currentLesson: Lesson?

    private let catalog = LickCatalog.shared

    var activeCollection: LickCollection? {
        allCollections.first { $0.id == activeCollectionId }
    }

    func startSession(for collection: LickCollection) {
        currentLesson = Lesson.generate(from: collection, catalog: catalog)
        showingSession = true
    }

    func continueSession() {
        guard let collection = activeCollection else { return }
        startSession(for: collection)
    }
}
