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
            LazyVStack(spacing: AppSpacing.md) {
                ForEach(viewModel.allCollections) { collection in
                    NavigationLink(destination: LessonDetailView(lesson: collection)) {
                        ModuleCardContent(collection: collection)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, AppSpacing.xl)
            .padding(.vertical, AppSpacing.md)
        }
        .background(Color(hex: 0x0F0A1E))
        .navigationTitle("Lessons")
    }
}

struct ModuleCardContent: View {
    let collection: Lesson

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
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
        .padding(AppSpacing.md)
        .background(Color(hex: 0x1A1030))
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: AppRadius.lg)
                .stroke(Color(hex: 0x2D2060), lineWidth: 1)
        )
    }
}
