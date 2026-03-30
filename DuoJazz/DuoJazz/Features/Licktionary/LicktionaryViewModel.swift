//
//  LicktionaryViewModel.swift
//  DuoJazz
//

import Foundation

@Observable
class LicktionaryViewModel {
    var searchQuery = ""
    var selectedTags: Set<Tag> = []

    private let catalog = LickCatalog.shared

    var searchResults: [Lick] {
        if searchQuery.isEmpty && selectedTags.isEmpty {
            return catalog.allLicks
        }

        var results = searchQuery.isEmpty
            ? catalog.allLicks
            : catalog.search(searchQuery)

        if !selectedTags.isEmpty {
            results = results.filter { lick in
                !selectedTags.isDisjoint(with: lick.tags)
            }
        }

        return results
    }

    var availableTags: [Tag] { catalog.allTags }

    var hasActiveFilters: Bool {
        !searchQuery.isEmpty || !selectedTags.isEmpty
    }

    func toggleTag(_ tag: Tag) {
        if selectedTags.contains(tag) {
            selectedTags.remove(tag)
        } else {
            selectedTags.insert(tag)
        }
    }

    func clearFilters() {
        searchQuery = ""
        selectedTags = []
    }
}
