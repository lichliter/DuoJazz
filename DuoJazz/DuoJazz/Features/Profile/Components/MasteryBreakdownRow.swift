//
//  MasteryBreakdownRow.swift
//  DuoJazz
//

import SwiftUI

struct MasteryBreakdownRow: View {
    let breakdown: [(MasteryState, Int)]

    var body: some View {
        HStack(spacing: 12) {
            ForEach(breakdown, id: \.0) { state, count in
                VStack(spacing: 8) {
                    Image(systemName: state.iconName)
                        .font(.title2)
                        .foregroundStyle(state.color)

                    Text("\(count)")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(.white)

                    Text(state.displayName)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color(hex: 0x1A1030))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }
}
