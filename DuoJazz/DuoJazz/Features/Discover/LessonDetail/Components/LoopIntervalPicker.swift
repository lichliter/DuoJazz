//
//  LoopIntervalPicker.swift
//  DuoJazz
//

import SwiftUI

struct LoopIntervalPicker: View {
    @Binding var interval: LoopInterval

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            Text("Interval")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            HStack(spacing: AppSpacing.xs) {
                ForEach(LoopInterval.allCases, id: \.self) { option in
                    Button { interval = option } label: {
                        Text(option.displayName)
                            .font(.caption.weight(interval == option ? .bold : .medium))
                            .foregroundStyle(interval == option ? .white : .secondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, AppSpacing.xs)
                            .background(interval == option ? Color(hex: 0x8B5CF6) : Color(hex: 0x1A1030))
                            .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
                            .overlay(
                                RoundedRectangle(cornerRadius: AppRadius.md)
                                    .stroke(interval == option ? Color.clear : Color(hex: 0x2D2060), lineWidth: 1)
                            )
                    }
                }
            }
        }
    }
}
