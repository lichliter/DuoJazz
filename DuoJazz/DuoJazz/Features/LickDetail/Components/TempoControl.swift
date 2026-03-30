//
//  TempoControl.swift
//  DuoJazz
//

import SwiftUI

/// Full-width tempo control for LickDetailView (matches OctaveControl style)
struct TempoControl: View {
    @Binding var tempo: Int

    var body: some View {
        HStack {
            Text("Tempo")
                .font(.headline)

            Spacer()

            HStack(spacing: 16) {
                Button {
                    if tempo > 40 { tempo -= 5 }
                } label: {
                    Image(systemName: "minus.circle.fill")
                        .font(.title2)
                }
                .disabled(tempo <= 40)

                Text("\(tempo)")
                    .font(.headline)
                    .monospacedDigit()
                    .frame(width: 36)

                Button {
                    if tempo < 300 { tempo += 5 }
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                }
                .disabled(tempo >= 300)
            }
            .tint(.blue)
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

/// Compact tempo buttons for session cards (matches OctaveButtons style)
struct TempoButtons: View {
    @Binding var tempo: Int

    var body: some View {
        HStack(spacing: 4) {
            Button { if tempo > 40 { tempo -= 5 } } label: {
                Image(systemName: "minus")
                    .font(.caption.bold())
                    .frame(width: 36, height: 36)
                    .foregroundStyle(tempo > 40 ? .white : Color(hex: 0x52525B))
                    .background(Color(hex: 0x1A1030))
                    .clipShape(Circle())
                    .contentShape(Circle().size(width: 44, height: 44))
            }
            .disabled(tempo <= 40)
            .accessibilityLabel("Decrease tempo")

            Text("\(tempo)")
                .font(.caption.weight(.semibold).monospaced())
                .foregroundStyle(.secondary)
                .frame(width: 32)

            Button { if tempo < 300 { tempo += 5 } } label: {
                Image(systemName: "plus")
                    .font(.caption.bold())
                    .frame(width: 36, height: 36)
                    .foregroundStyle(tempo < 300 ? .white : Color(hex: 0x52525B))
                    .background(Color(hex: 0x1A1030))
                    .clipShape(Circle())
                    .contentShape(Circle().size(width: 44, height: 44))
            }
            .disabled(tempo >= 300)
            .accessibilityLabel("Increase tempo")
        }
    }
}
