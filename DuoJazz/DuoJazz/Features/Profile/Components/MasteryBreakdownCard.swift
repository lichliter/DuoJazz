//
//  MasteryBreakdownCard.swift
//  DuoJazz
//

import SwiftUI

struct MasteryBreakdownCard: View {
    let breakdown: [(MasteryState, Int)]
    let total: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Lick Mastery")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)

            if breakdown.isEmpty {
                Text("Complete lessons to track your mastery")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(breakdown, id: \.0) { state, count in
                    HStack(spacing: 10) {
                        Image(systemName: state.iconName)
                            .font(.caption)
                            .foregroundStyle(state.color)
                            .frame(width: 20)

                        Text(state.displayName)
                            .font(.subheadline)
                            .foregroundStyle(.white)

                        Spacer()

                        Text("\(count)")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(state.color)
                    }
                }

                progressBar
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: 0x1A1030))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var progressBar: some View {
        GeometryReader { geo in
            HStack(spacing: 2) {
                ForEach(breakdown, id: \.0) { state, count in
                    let fraction = CGFloat(count) / CGFloat(max(total, 1))
                    RoundedRectangle(cornerRadius: 3)
                        .fill(state.color)
                        .frame(width: max(fraction * geo.size.width - 2, 0))
                }
            }
        }
        .frame(height: 6)
        .padding(.top, 4)
    }
}
