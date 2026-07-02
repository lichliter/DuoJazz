//
//  LicktionaryView.swift
//  DuoJazz
//

import SwiftUI

struct LicktionaryView: View {
    @State private var viewModel = LicktionaryViewModel()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.lg) {
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
            .padding(.horizontal, AppSpacing.xl)
            .padding(.vertical, AppSpacing.md)
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
