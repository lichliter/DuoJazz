//
//  SessionLengthPicker.swift
//  DuoJazz
//

import SwiftUI

struct SessionLengthPicker: View {
    @Binding var sessionLength: SessionLength

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            Text("Session length")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            HStack(spacing: AppSpacing.xs) {
                ForEach(SessionLength.allCases, id: \.self) { option in
                    Button { sessionLength = option } label: {
                        Text(option.displayName)
                            .font(.caption.weight(sessionLength == option ? .bold : .medium))
                            .foregroundStyle(sessionLength == option ? .white : .secondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, AppSpacing.xs)
                            .background(sessionLength == option ? Color(hex: 0x8B5CF6) : Color(hex: 0x1A1030))
                            .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
                            .overlay(
                                RoundedRectangle(cornerRadius: AppRadius.md)
                                    .stroke(sessionLength == option ? Color.clear : Color(hex: 0x2D2060), lineWidth: 1)
                            )
                    }
                }
            }
        }
    }
}
