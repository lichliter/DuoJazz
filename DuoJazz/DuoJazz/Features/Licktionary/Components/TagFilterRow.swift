//
//  TagFilterRow.swift
//  DuoJazz
//

import SwiftUI

struct TagFilterRow: View {
    let tags: [Tag]
    let selected: Set<Tag>
    let onToggle: (Tag) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                ForEach(tags, id: \.self) { tag in
                    TagPill(tag: tag, isSelected: selected.contains(tag)) {
                        onToggle(tag)
                    }
                }
            }
        }
    }
}

struct TagPill: View {
    let tag: Tag
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(tag.displayName)
                .font(isSelected ? AppTypography.chip : AppTypography.chipMedium)
                .foregroundStyle(isSelected ? .white : Color(hex: 0xA1A1AA))
                .padding(.horizontal, AppSpacing.sm)
                .padding(.vertical, AppSpacing.xs)
                .background(isSelected ? Color(hex: 0x8B5CF6) : Color(hex: 0x1E1535))
                .clipShape(Capsule())
                .overlay {
                    if !isSelected {
                        Capsule().stroke(Color(hex: 0x2D2060), lineWidth: 1)
                    }
                }
        }
    }
}
