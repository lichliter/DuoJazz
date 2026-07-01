//
//  MedalSummaryCard.swift
//  DuoJazz
//

import SwiftUI

struct MedalSummaryCard: View {
    let summary: MedalSummary

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
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
        .padding(AppSpacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: 0x1A1030))
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))
    }

    private func medalColumn(medal: Medal, label: String, count: Int) -> some View {
        VStack(spacing: AppSpacing.xs) {
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
