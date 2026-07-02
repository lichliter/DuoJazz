//
//  ActiveFiltersRow.swift
//  DuoJazz
//

import SwiftUI

struct ActiveFiltersRow: View {
    let tags: [Tag]
    let onRemove: (Tag) -> Void
    let onClear: () -> Void

    var body: some View {
        HStack(spacing: AppSpacing.xs) {
            ForEach(tags, id: \.self) { tag in
                HStack(spacing: AppSpacing.xs) {
                    Text(tag.displayName)
                        .font(AppTypography.filterChip)
                    Image(systemName: "xmark")
                        .font(AppTypography.filterDismiss)
                }
                .foregroundStyle(Color(hex: 0x8B5CF6))
                .padding(.horizontal, AppSpacing.xs)
                .padding(.vertical, AppSpacing.xs)
                .background(Color(hex: 0x8B5CF6).opacity(0.15))
                .clipShape(Capsule())
                .onTapGesture { onRemove(tag) }
            }

            Button("Clear all") { onClear() }
                .font(AppTypography.labelSmall)
                .foregroundStyle(.secondary)
        }
    }
}
