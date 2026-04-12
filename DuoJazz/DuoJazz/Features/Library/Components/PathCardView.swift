//
//  PathCardView.swift
//  DuoJazz
//

import SwiftUI

struct PathCardView: View {
    let collection: Lesson
    let progress: (completed: Int, total: Int)
    let onContinue: () -> Void

    private var fraction: Double {
        guard progress.total > 0 else { return 0 }
        return Double(progress.completed) / Double(progress.total)
    }

    private var isStarted: Bool { progress.completed > 0 }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Image(systemName: collection.iconName)
                    .font(.title2)
                    .foregroundStyle(Color(hex: 0x8B5CF6))

                Text(collection.name)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)

                Spacer()

                DifficultyBadge(difficulty: collection.difficulty)
            }

            HStack {
                Text("\(collection.lickCount) licks")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(progress.completed)/\(progress.total)")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }

            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color(hex: 0x1E1535))

                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color(hex: 0x8B5CF6))
                        .frame(width: geo.size.width * fraction)
                }
            }
            .frame(height: 6)

            Button(action: onContinue) {
                HStack {
                    Text(isStarted ? "Continue Path" : "Start Path")
                        .font(.system(size: 14, weight: .semibold))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 12))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Color(hex: 0x8B5CF6))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
        .padding(18)
        .background(Color(hex: 0x1A1030))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color(hex: 0x2D2060), lineWidth: 1)
        )
    }
}
