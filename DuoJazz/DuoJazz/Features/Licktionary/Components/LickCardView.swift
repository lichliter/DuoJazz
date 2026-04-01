//
//  LickCardView.swift
//  DuoJazz
//

import SwiftUI

struct LickCardView: View {
    let lick: Lick
    var masteryState: MasteryState = .locked

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(lick.name)
                    .font(.headline)
                    .foregroundStyle(.white)

                Spacer()

                if masteryState != .locked {
                    Image(systemName: masteryState.iconName)
                        .font(.caption)
                        .foregroundStyle(masteryState.color)
                }
            }

            HStack(spacing: 6) {
                ForEach(lick.tags.prefix(2), id: \.self) { tag in
                    Text(tag.displayName)
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(Color(hex: 0x9CA3AF))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color(hex: 0x9CA3AF).opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
                Spacer()
                Text("\(lick.noteCount) notes")
                    .font(.caption2)
                    .foregroundStyle(Color(hex: 0x52525B))
            }
        }
        .padding(16)
        .background(Color(hex: 0x1A1030))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
