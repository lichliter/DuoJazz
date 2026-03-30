//
//  DiscoverView.swift
//  DuoJazz
//

import SwiftUI
import SwiftData

struct DiscoverView: View {
    @State private var viewModel = DiscoverViewModel()
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                let store = ModuleProgressStore(context: modelContext)
                ForEach(viewModel.allCollections) { collection in
                    NavigationLink(destination: ModuleDetailView(collection: collection)) {
                        ModuleCardContent(
                            collection: collection,
                            progress: store.progress(for: collection.id, in: viewModel.selectedKey.key),
                            lessonNumber: store.completedLesson(for: collection.id, in: viewModel.selectedKey.key) + 1,
                            medal: store.medal(for: collection.id)
                        )
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
    let collection: LickCollection
    let progress: Double
    let lessonNumber: Int
    let medal: Medal

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: collection.iconName)
                    .font(.title2)
                    .foregroundStyle(Color(hex: 0x8B5CF6))
                Spacer()
                if medal != .none {
                    Image(systemName: medal.icon)
                        .font(.title3)
                        .foregroundStyle(medal.color)
                } else if progress >= 1.0 {
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundStyle(Color(hex: 0x22C55E))
                } else {
                    Text("Lesson \(min(lessonNumber, 5))/5")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
            }

            Text(collection.name)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)

            Text("\(collection.lickCount) licks")
                .font(.caption)
                .foregroundStyle(.secondary)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color(hex: 0x1E1535))
                    RoundedRectangle(cornerRadius: 3)
                        .fill(progress >= 1.0 ? Color(hex: 0x22C55E) : Color(hex: 0x8B5CF6))
                        .frame(width: geo.size.width * progress)
                }
            }
            .frame(height: 4)
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
