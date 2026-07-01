//
//  AddPathSection.swift
//  DuoJazz
//

import SwiftUI

struct AddPathSection: View {
    let available: [Lesson]
    let onAdd: (Lesson) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("Add a Path")
                .font(.headline)
                .foregroundStyle(.secondary)

            ForEach(available) { collection in
                HStack(spacing: AppSpacing.sm) {
                    Image(systemName: collection.iconName)
                        .foregroundStyle(Color(hex: 0x8B5CF6))
                        .frame(width: 28)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(collection.name)
                            .font(AppTypography.label)
                            .foregroundStyle(.white)
                        Text("\(collection.lickCount) licks")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    DifficultyBadge(difficulty: collection.difficulty)

                    Button {
                        onAdd(collection)
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                            .foregroundStyle(Color(hex: 0x8B5CF6))
                    }
                }
                .padding(AppSpacing.sm)
                .background(Color(hex: 0x1A1030))
                .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
            }
        }
    }
}
