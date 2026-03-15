//
//  InstrumentCard.swift
//  DuoJazz
//

import SwiftUI

struct InstrumentCard: View {
    let instrument: String
    let transposition: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SettingsRow(label: "Instrument", value: instrument, icon: "guitars")
            Divider().overlay(Color(hex: 0x2D2060))
            SettingsRow(label: "Transposition", value: transposition, icon: "tuningfork")
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: 0x1A1030))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct SettingsRow: View {
    let label: String
    let value: String
    let icon: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(Color(hex: 0x8B5CF6))
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(value)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(.white)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}
