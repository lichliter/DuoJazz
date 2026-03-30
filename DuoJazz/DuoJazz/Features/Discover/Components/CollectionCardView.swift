//
//  CollectionCardView.swift
//  DuoJazz
//

import SwiftUI

struct CollectionCardView: View {
    let collection: LickCollection
    let onStart: () -> Void

    var body: some View {
        Button(action: onStart) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: collection.iconName)
                        .font(.title2)
                        .foregroundStyle(Color(hex: 0x8B5CF6))
                    Spacer()
                    DifficultyBadge(difficulty: collection.difficulty)
                }

                Text(collection.name)
                    .font(.system(size: 16, weight: .semibold))
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
        .buttonStyle(.plain)
    }
}

struct DifficultyBadge: View {
    let difficulty: Difficulty

    var body: some View {
        Text(difficulty.displayName)
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(difficulty.color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(difficulty.color.opacity(0.15))
            .clipShape(Capsule())
    }
}
