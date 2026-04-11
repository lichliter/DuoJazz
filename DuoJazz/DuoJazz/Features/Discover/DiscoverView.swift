//
//  DiscoverView.swift
//  DuoJazz
//

import SwiftUI
import SwiftData

struct DiscoverView: View {
    @State private var viewModel = DiscoverViewModel()

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(viewModel.allCollections) { collection in
                    NavigationLink(destination: LessonDetailView(lesson: collection)) {
                        ModuleCardContent(collection: collection)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 40)
            .padding(.vertical, 16)
        }
        .background(Color(hex: 0x0F0A1E))
        .navigationTitle("Lessons")
    }
}

struct ModuleCardContent: View {
    let collection: Lesson

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: collection.iconName)
                    .font(.title2)
                    .foregroundStyle(Color(hex: 0x8B5CF6))
                Spacer()
            }

            Text(collection.name)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)

            Text("\(collection.lickCount) licks")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(16)
        .background(Color(hex: 0x1A1030))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color(hex: 0x2D2060), lineWidth: 1)
        )
    }
}
