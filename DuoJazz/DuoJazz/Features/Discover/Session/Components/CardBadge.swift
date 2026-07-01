//
//  CardBadge.swift
//  DuoJazz
//

import SwiftUI

struct CardBadge: View {
    let type: String
    let color: Color
    let icon: String

    var body: some View {
        HStack(spacing: AppSpacing.xs) {
            Image(systemName: icon)
                .font(AppTypography.labelSmall)
            Text(type)
                .font(AppTypography.cardBadge)
                .tracking(1)
        }
        .foregroundStyle(color)
        .padding(.horizontal, AppSpacing.sm)
        .padding(.vertical, AppSpacing.xs)
        .background(color.opacity(0.15))
        .clipShape(Capsule())
    }

    static let learn = CardBadge(type: "LEARN", color: Color(hex: 0x3B82F6), icon: "lightbulb")
    static let play = CardBadge(type: "PLAY", color: Color(hex: 0x22C55E), icon: "music.note")
    static let listen = CardBadge(type: "LISTEN", color: Color(hex: 0xF59E0B), icon: "ear")
    static let quiz = CardBadge(type: "QUIZ", color: Color(hex: 0xEF4444), icon: "target")
}
