//
//  OctaveButtons.swift
//  DuoJazz
//

import SwiftUI

struct OctaveButtons: View {
    @Binding var offset: Int

    var body: some View {
        HStack(spacing: AppSpacing.xs) {
            Button { if offset > -2 { offset -= 1 } } label: {
                Image(systemName: "minus")
                    .font(.subheadline.bold())
                    .frame(width: 44, height: 44)
                    .foregroundStyle(offset > -2 ? .white : Color(hex: 0x52525B))
                    .background(Color(hex: 0x1A1030))
                    .clipShape(Circle())
            }
            .disabled(offset <= -2)
            .accessibilityLabel("Octave down")

            Text("8va: \(offset)")
                .font(.subheadline.weight(.semibold).monospaced())
                .foregroundStyle(.secondary)
                .frame(width: 56)

            Button { if offset < 2 { offset += 1 } } label: {
                Image(systemName: "plus")
                    .font(.subheadline.bold())
                    .frame(width: 44, height: 44)
                    .foregroundStyle(offset < 2 ? .white : Color(hex: 0x52525B))
                    .background(Color(hex: 0x1A1030))
                    .clipShape(Circle())
            }
            .disabled(offset >= 2)
            .accessibilityLabel("Octave up")
        }
    }
}
