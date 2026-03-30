//
//  InstrumentPickerView.swift
//  DuoJazz
//

import SwiftUI

struct InstrumentPickerView: View {
    let selected: Instrument
    let onSelect: (Instrument) -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    ForEach(Instrument.allPresets) { instrument in
                        let isSelected = instrument == selected
                        let keyName = KeyOption.allOptions.first { $0.key == instrument.transposition }?.displayName ?? "C"

                        Button { onSelect(instrument) } label: {
                            HStack {
                                Text("\(instrument.name)")
                                    .font(.body.weight(.medium))
                                    .foregroundStyle(isSelected ? Color(hex: 0x8B5CF6) : .white)

                                Text("(\(keyName))")
                                    .font(.body)
                                    .foregroundStyle(isSelected ? Color(hex: 0x8B5CF6).opacity(0.7) : .secondary)

                                Spacer()

                                if isSelected {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(Color(hex: 0x8B5CF6))
                                }
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                        }

                        if instrument != Instrument.allPresets.last {
                            Divider()
                                .overlay(Color(hex: 0x2D2060).opacity(0.4))
                                .padding(.leading, 20)
                        }
                    }
                }
                .background(Color(hex: 0x1A1030))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal, 24)
                .padding(.top, 8)
            }
            .background(Color(hex: 0x0F0A1E))
            .navigationTitle("Choose Instrument")
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.large])
    }
}
