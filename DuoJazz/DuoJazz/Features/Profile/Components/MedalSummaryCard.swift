//
//  MedalSummaryCard.swift
//  DuoJazz
//

import SwiftUI

struct MedalSummaryCard: View {
    let summary: MedalSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Medals")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)

            HStack(spacing: 0) {
                medalColumn(medal: .bronze, label: "Bronze", count: summary.bronze)
                Spacer()
                medalColumn(medal: .silver, label: "Silver", count: summary.silver)
                Spacer()
                medalColumn(medal: .gold, label: "Gold", count: summary.gold)
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: 0x1A1030))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func medalColumn(medal: Medal, label: String, count: Int) -> some View {
        VStack(spacing: 6) {
            Image(systemName: medal.icon)
                .font(.title2)
                .foregroundStyle(medal.color)
            Text("\(count)")
                .font(.title3.weight(.bold))
                .foregroundStyle(.white)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}
