//
//  KeyPicker.swift
//  DuoJazz
//

import SwiftUI

struct KeyPicker: View {
    @Binding var selectedKeyOption: KeyOption

    var body: some View {
        HStack {
            Text("Key")
                .font(.headline)

            Spacer()

            Picker("Key", selection: $selectedKeyOption) {
                ForEach(KeyOption.allOptions) { option in
                    Text(option.displayName).tag(option)
                }
            }
            .pickerStyle(.menu)
            .tint(.blue)
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    KeyPicker(selectedKeyOption: .constant(.default))
        .padding()
}
