//
//  StreakCard.swift
//  DuoJazz
//

import SwiftUI

struct StreakCard: View {
    let count: Int

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: "flame.fill")
                .font(.title)
                .foregroundStyle(Color(hex: 0xF59E0B))

            VStack(alignment: .leading, spacing: 2) {
                Text("\(count) day streak!")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                Text("Practice today to keep it going")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding(18)
        .background(Color(hex: 0x1A1030))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}
