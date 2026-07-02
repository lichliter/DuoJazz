//
//  WaveformView.swift
//  DuoJazz
//

import SwiftUI

struct WaveformView: View {
    let amplitudes: [Float]
    let detectedNote: String

    var body: some View {
        VStack(spacing: AppSpacing.xs) {
            // Waveform bars
            HStack(spacing: 2) {
                ForEach(Array(amplitudes.enumerated()), id: \.offset) { _, amp in
                    RoundedRectangle(cornerRadius: 1.5)
                        .fill(barColor(for: amp))
                        .frame(width: 3, height: max(2, CGFloat(amp) * 80))
                }
            }
            .frame(height: 80)
            .animation(.easeOut(duration: 0.05), value: amplitudes.map { Int($0 * 1000) })

            if !detectedNote.isEmpty {
                Text(detectedNote)
                    .font(.caption.weight(.semibold).monospaced())
                    .foregroundStyle(Color(hex: 0x22C55E))
            }
        }
        .padding(.horizontal, AppSpacing.lg)
        .padding(.vertical, AppSpacing.sm)
        .background(Color(hex: 0x0C0820))
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
    }

    private func barColor(for amplitude: Float) -> Color {
        if amplitude > 0.1 {
            return Color(hex: 0x22C55E)
        } else if amplitude > PitchDetector.floorThreshold {
            return Color(hex: 0x8B5CF6)
        } else {
            return Color(hex: 0x1E1535)
        }
    }
}
