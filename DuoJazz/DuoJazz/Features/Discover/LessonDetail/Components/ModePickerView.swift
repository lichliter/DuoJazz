//
//  ModePickerView.swift
//  DuoJazz
//

import SwiftUI

struct ModePickerView: View {
    @Binding var selectedMode: PracticeMode

    var body: some View {
        HStack(spacing: AppSpacing.xs) {
            ForEach(PracticeMode.allCases, id: \.self) { mode in
                Button { selectedMode = mode } label: {
                    Text(mode.displayName)
                        .font(.caption.weight(selectedMode == mode ? .bold : .medium))
                        .foregroundStyle(selectedMode == mode ? .white : .secondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, AppSpacing.xs)
                        .background(selectedMode == mode ? Color(hex: 0x8B5CF6) : Color(hex: 0x1A1030))
                        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
                        .overlay(
                            RoundedRectangle(cornerRadius: AppRadius.md)
                                .stroke(selectedMode == mode ? Color.clear : Color(hex: 0x2D2060), lineWidth: 1)
                        )
                }
            }
        }
    }
}
