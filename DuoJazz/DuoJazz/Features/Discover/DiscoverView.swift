//
//  DiscoverView.swift
//  DuoJazz
//

import SwiftUI

struct DiscoverView: View {
    @State private var viewModel = DiscoverViewModel()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                if let collection = viewModel.activeCollection {
                    ContinueLearningCard(
                        collection: collection,
                        selectedKey: $viewModel.selectedKey,
                        onContinue: viewModel.continueSession
                    )
                }

                BrowseCollectionsSection(
                    collections: viewModel.allCollections,
                    onStart: viewModel.startSession
                )
            }
            .padding(.horizontal, 40)
            .padding(.vertical, 16)
        }
        .background(Color(hex: 0x0F0A1E))
        .navigationTitle("Discover")
        .fullScreenCover(isPresented: $viewModel.showingSession) {
            if let lesson = viewModel.currentLesson {
                SessionView(
                    lesson: lesson,
                    key: viewModel.selectedKey
                )
            }
        }
    }
}
