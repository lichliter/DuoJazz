//
//  HearReferenceButton.swift
//  DuoJazz
//

import SwiftUI

struct HearReferenceButton: View {
    enum Style {
        case learn, listen, quiz

        var icon: String {
            switch self {
            case .learn: "play.fill"
            case .listen, .quiz: "speaker.wave.2"
            }
        }

        var accent: Color {
            switch self {
            case .learn: Color(hex: 0x8B5CF6)
            case .listen: Color(hex: 0xF59E0B)
            case .quiz: Color(hex: 0xEF4444)
            }
        }

        var usesFilledBackground: Bool {
            self == .learn
        }
    }

    let style: Style
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.xs) {
                Image(systemName: style.icon)
                Text("Hear reference")
            }
            .foregroundStyle(style.accent)
            .padding(.horizontal, AppSpacing.lg)
            .padding(.vertical, AppSpacing.sm)
            .background(style.usesFilledBackground ? Color(hex: 0x1A1030) : style.accent.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
            .overlay(
                RoundedRectangle(cornerRadius: AppRadius.md)
                    .stroke(
                        style.usesFilledBackground ? Color(hex: 0x2D2060) : style.accent.opacity(0.3),
                        lineWidth: 1
                    )
            )
        }
    }
}
