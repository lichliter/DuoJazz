//
//  LoopModePicker.swift
//  DuoJazz
//

import SwiftUI

struct LoopModePicker: View {
    @Binding var loopEnabled: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            Text("Loop")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            HStack(spacing: AppSpacing.xs) {
                loopButton(title: "Off", isSelected: !loopEnabled) { loopEnabled = false }
                loopButton(title: "On", isSelected: loopEnabled) { loopEnabled = true }
            }
        }
    }

    private func loopButton(title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.caption.weight(isSelected ? .bold : .medium))
                .foregroundStyle(isSelected ? .white : .secondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppSpacing.xs)
                .background(isSelected ? Color(hex: 0x8B5CF6) : Color(hex: 0x1A1030))
                .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: AppRadius.md)
                        .stroke(isSelected ? Color.clear : Color(hex: 0x2D2060), lineWidth: 1)
                )
        }
    }
}
