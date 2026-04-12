//
//  DifficultyBadge.swift
//  DuoJazz
//

import SwiftUI

struct DifficultyBadge: View {
    let difficulty: Difficulty

    var body: some View {
        Text(difficulty.displayName)
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(difficulty.color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(difficulty.color.opacity(0.15))
            .clipShape(Capsule())
    }
}
