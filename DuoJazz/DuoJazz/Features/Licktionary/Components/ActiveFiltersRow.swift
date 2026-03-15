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
        HStack(spacing: 8) {
            ForEach(tags, id: \.self) { tag in
                HStack(spacing: 4) {
                    Text(tag.displayName)
                        .font(.system(size: 12, weight: .semibold))
                    Image(systemName: "xmark")
                        .font(.system(size: 9, weight: .bold))
                }
                .foregroundStyle(Color(hex: 0x8B5CF6))
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(Color(hex: 0x8B5CF6).opacity(0.15))
                .clipShape(Capsule())
                .onTapGesture { onRemove(tag) }
            }

            Button("Clear all") { onClear() }
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
        }
    }
}
