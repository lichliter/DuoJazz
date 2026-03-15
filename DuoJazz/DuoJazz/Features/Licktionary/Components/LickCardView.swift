//
//  LickCardView.swift
//  DuoJazz
//

import SwiftUI

struct LickCardView: View {
    let lick: Lick

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(lick.name)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white)

            HStack(spacing: 4) {
                ForEach(lick.tags.prefix(2), id: \.self) { tag in
                    Text(tag.displayName)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(Color(hex: 0x9CA3AF))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(hex: 0x9CA3AF).opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
                Spacer()
                Text("\(lick.noteCount) notes")
                    .font(.system(size: 10))
                    .foregroundStyle(Color(hex: 0x52525B))
            }
        }
        .padding(12)
        .background(Color(hex: 0x1A1030))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}
