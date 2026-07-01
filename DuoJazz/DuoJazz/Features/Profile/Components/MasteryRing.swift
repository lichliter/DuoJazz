//
//  MasteryRing.swift
//  DuoJazz
//

import SwiftUI

struct MasteryRing: View {
    let percentage: Int

    var body: some View {
        VStack(spacing: AppSpacing.xs) {
            ZStack {
                Circle()
                    .stroke(Color(hex: 0x1E1535), lineWidth: 10)

                Circle()
                    .trim(from: 0, to: Double(percentage) / 100)
                    .stroke(Color(hex: 0x8B5CF6), style: StrokeStyle(lineWidth: 10, lineCap: .round))
                    .rotationEffect(.degrees(-90))

                Text("\(percentage)%")
                    .font(AppTypography.ringValue)
                    .foregroundStyle(.white)
            }
            .frame(width: 120, height: 120)

            Text("Mastery")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(AppSpacing.lg)
        .background(Color(hex: 0x1A1030))
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))
    }
}
