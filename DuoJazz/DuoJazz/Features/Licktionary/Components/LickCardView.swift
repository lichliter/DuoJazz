//
//  LickCardView.swift
//  DuoJazz
//

import SwiftUI

struct LickCardView: View {
    let lick: Lick

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            Text(lick.name)
                .font(.headline)
                .foregroundStyle(.white)

            HStack(spacing: AppSpacing.xs) {
                ForEach(lick.tags.prefix(2), id: \.self) { tag in
                    Text(tag.displayName)
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(Color(hex: 0x9CA3AF))
                        .padding(.horizontal, AppSpacing.xs)
                        .padding(.vertical, AppSpacing.xs)
                        .background(Color(hex: 0x9CA3AF).opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: AppRadius.sm))
                }
                Spacer()
                Text("\(lick.noteCount) notes")
                    .font(.caption2)
                    .foregroundStyle(Color(hex: 0x52525B))
            }
        }
        .padding(AppSpacing.md)
        .background(Color(hex: 0x1A1030))
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))
    }
}
