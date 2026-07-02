//
//  DifficultyBadge.swift
//  DuoJazz
//

import SwiftUI

struct DifficultyBadge: View {
    let difficulty: Difficulty

    var body: some View {
        Text(difficulty.displayName)
            .font(AppTypography.badge)
            .foregroundStyle(difficulty.color)
            .padding(.horizontal, AppSpacing.xs)
            .padding(.vertical, AppSpacing.xs)
            .background(difficulty.color.opacity(0.15))
            .clipShape(Capsule())
    }
}
