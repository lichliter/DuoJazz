//
//  LickDetailView.swift
//  DuoJazz
//

import SwiftUI

struct LickDetailView: View {
    let lick: Lick
    @State private var selectedKeyOption: KeyOption = .default
    @State private var selectedClef: Clef = .treble
    @State private var octaveOffset: Int = 0
    @State private var player = LickPlayer()

    var body: some View {
        VStack(spacing: 16) {
            // Key picker and Octave controls
            VStack(spacing: 12) {
                KeyPicker(selectedKeyOption: $selectedKeyOption)
                OctaveControl(octaveOffset: $octaveOffset)
            }
            .padding(.horizontal)

            // Clef segmented control
            ClefPicker(selectedClef: $selectedClef)
                .padding(.horizontal)

            // Staff notation (VexFlow)
            VexFlowNotationView(
                lick: lick,
                keyOption: selectedKeyOption,
                clef: selectedClef,
                octaveOffset: octaveOffset,
                timeSignature: lick.vexflowTimeSignature
            )
            .frame(height: 160)
            .padding(.horizontal)

            // Play button
            PlayButton(
                player: player,
                lick: lick,
                key: selectedKeyOption.key,
                clef: selectedClef,
                octaveOffset: octaveOffset
            )

            Spacer()
        }
        .padding(.top)
        .navigationTitle(lick.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationStack {
        LickDetailView(lick: BuiltInLicks.shortIIVI)
    }
}
