//
//  LickRowView.swift
//  DuoJazz
//

import SwiftUI

struct LickRowView: View {
    let lick: Lick
    let keyStatus: KeyStatus
    let medal: Medal
    let onStart: () -> Void

    var body: some View {
        Button(action: onStart) {
            HStack(spacing: AppSpacing.sm) {
                ZStack {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 40, height: 40)
                    statusIcon
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(lick.name)
                        .font(.body.weight(.semibold))
                        .foregroundStyle(.white)

                    if let progression = lick.chordProgression {
                        HStack(spacing: AppSpacing.xs) {
                            ForEach(progression.symbols, id: \.startBeat) { symbol in
                                Text(symbol.functionalText)
                                    .font(.custom("Baskerville-SemiBold", size: 14))
                                    .foregroundStyle(.white.opacity(0.5))
                            }
                        }
                    }
                }

                Spacer()

                if medal != .none {
                    Image(systemName: medal.icon)
                        .font(.title3)
                        .foregroundStyle(medal.color)
                }

                Image(systemName: "play.fill")
                    .font(.caption)
                    .foregroundStyle(Color(hex: 0x8B5CF6))
            }
            .padding(AppSpacing.sm)
            .background(keyStatus == .completed
                ? Color(hex: 0x22C55E).opacity(0.06)
                : Color(hex: 0x1A1030))
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
            .overlay(
                RoundedRectangle(cornerRadius: AppRadius.md)
                    .stroke(keyStatus == .completed
                        ? Color(hex: 0x22C55E).opacity(0.3)
                        : Color(hex: 0x2D2060), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var statusColor: Color {
        switch keyStatus {
        case .completed: Color(hex: 0x22C55E)
        case .inProgress: Color(hex: 0xF59E0B)
        case .notStarted: Color(hex: 0x2D2060)
        }
    }

    @ViewBuilder
    private var statusIcon: some View {
        switch keyStatus {
        case .completed:
            Image(systemName: "checkmark")
                .font(.caption.bold())
                .foregroundStyle(.white)
        case .inProgress:
            Image(systemName: "ellipsis")
                .font(.caption.bold())
                .foregroundStyle(.white)
        case .notStarted:
            Image(systemName: "music.note")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}
