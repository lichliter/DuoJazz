//
//  LicktionaryView.swift
//  DuoJazz
//

import SwiftUI

struct LicktionaryView: View {
    @State private var viewModel = LicktionaryViewModel()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                SearchBar(text: $viewModel.searchQuery)

                TagFilterRow(
                    tags: viewModel.availableTags,
                    selected: viewModel.selectedTags,
                    onToggle: viewModel.toggleTag
                )

                if viewModel.hasActiveFilters {
                    ActiveFiltersRow(
                        tags: Array(viewModel.selectedTags),
                        onRemove: viewModel.toggleTag,
                        onClear: viewModel.clearFilters
                    )
                }

                LickGrid(licks: viewModel.searchResults)
            }
            .padding(.horizontal, 36)
            .padding(.vertical, 16)
        }
        .background(Color(hex: 0x0F0A1E))
        .navigationTitle("Licktionary")
    }
}

#Preview {
    NavigationStack {
        LicktionaryView()
    }
}
