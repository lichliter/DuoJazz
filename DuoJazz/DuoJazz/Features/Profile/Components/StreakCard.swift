//
//  StreakCard.swift
//  DuoJazz
//

import SwiftUI

struct StreakCard: View {
    let count: Int

    var body: some View {
        HStack(spacing: AppSpacing.sm) {
            Image(systemName: "flame.fill")
                .font(.title)
                .foregroundStyle(Color(hex: 0xF59E0B))

            VStack(alignment: .leading, spacing: 2) {
                Text("\(count) day streak!")
                    .font(AppTypography.stat)
                    .foregroundStyle(.white)
                Text("Practice today to keep it going")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding(AppSpacing.md)
        .background(Color(hex: 0x1A1030))
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))
    }
}
