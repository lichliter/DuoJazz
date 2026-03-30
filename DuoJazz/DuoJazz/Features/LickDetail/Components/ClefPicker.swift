//
//  ClefPicker.swift
//  DuoJazz
//

import SwiftUI

struct ClefPicker: View {
    @Binding var selectedClef: Clef

    /// Common clefs shown in segmented control
    private static let commonClefs: [Clef] = [.treble, .bass]

    var body: some View {
        Picker("Clef", selection: $selectedClef) {
            ForEach(Self.commonClefs, id: \.self) { clef in
                Text(clef.displayName).tag(clef)
            }
        }
        .pickerStyle(.segmented)
    }
}

#Preview {
    ClefPicker(selectedClef: .constant(.treble))
        .padding()
}
