//
//  SessionTopBar.swift
//  DuoJazz
//

import SwiftUI

struct SessionTopBar: View {
    let progress: Double
    let progressText: String
    let onClose: () -> Void

    var body: some View {
        HStack(spacing: 16) {
            Button(action: onClose) {
                Image(systemName: "xmark")
                    .font(.body)
                    .foregroundStyle(Color(hex: 0xA1A1AA))
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Close session")

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(hex: 0x1E1535))
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(hex: 0x8B5CF6))
                        .frame(width: geo.size.width * progress, height: 8)
                        .animation(.easeInOut(duration: 0.3), value: progress)
                }
            }
            .frame(height: 8)

            Text(progressText)
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color(hex: 0xA1A1AA))
                .monospacedDigit()
        }
        .padding(.horizontal, 36)
        .padding(.vertical, 16)
    }
}
