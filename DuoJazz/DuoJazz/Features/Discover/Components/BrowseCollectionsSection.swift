//
//  BrowseCollectionsSection.swift
//  DuoJazz
//

import SwiftUI

struct BrowseCollectionsSection: View {
    let collections: [LickCollection]
    let onStart: (LickCollection) -> Void

    private let columns = [
        GridItem(.adaptive(minimum: 240, maximum: 320), spacing: 16)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Browse Collections")
                .font(.headline)
                .foregroundStyle(.secondary)

            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(collections) { collection in
                    CollectionCardView(collection: collection) {
                        onStart(collection)
                    }
                }
            }
        }
    }
}
