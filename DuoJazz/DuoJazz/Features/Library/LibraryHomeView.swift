//
//  LibraryHomeView.swift
//  DuoJazz
//

import SwiftUI

struct LibraryHomeView: View {
    @State private var viewModel = LibraryViewModel()
    @State private var discoverVM = DiscoverViewModel()

    private let columns = [
        GridItem(.adaptive(minimum: 280, maximum: 400), spacing: 20)
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                Text("Your active learning paths and progress.")
                    .foregroundStyle(.secondary)

                LazyVGrid(columns: columns, spacing: 20) {
                    ForEach(viewModel.activePaths) { collection in
                        PathCardView(
                            collection: collection,
                            progress: viewModel.progress(for: collection),
                            onContinue: {
                                discoverVM.startSession(for: collection)
                            }
                        )
                    }
                }

                if !viewModel.availablePaths.isEmpty {
                    AddPathSection(
                        available: viewModel.availablePaths,
                        onAdd: viewModel.startPath
                    )
                }
            }
            .padding(.horizontal, 40)
            .padding(.vertical, 16)
        }
        .background(Color(hex: 0x0F0A1E))
        .navigationTitle("Library")
        .fullScreenCover(isPresented: $discoverVM.showingSession) {
            if let lesson = discoverVM.currentLesson {
                SessionView(lesson: lesson, key: discoverVM.selectedKey)
            }
        }
    }
}
