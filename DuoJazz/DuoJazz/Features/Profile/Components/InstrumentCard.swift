//
//  InstrumentCard.swift
//  DuoJazz
//

import SwiftUI

struct InstrumentCard: View {
    let instrument: Instrument

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: "guitars")
                .font(.title2)
                .foregroundStyle(Color(hex: 0x8B5CF6))
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(instrument.name)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)

                let keyName = KeyOption.allOptions.first { $0.key == instrument.transposition }?.displayName ?? "C"
                Text("\(keyName) transposition · \(instrument.defaultClef.displayName) clef")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: 0x1A1030))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .accessibilityElement(children: .combine)
        .accessibilityHint("Double tap to change instrument")
    }
}
