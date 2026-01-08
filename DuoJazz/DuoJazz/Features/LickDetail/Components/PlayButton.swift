//
//  PlayButton.swift
//  DuoJazz
//

import SwiftUI

struct PlayButton: View {
    let player: LickPlayer
    let lick: Lick
    let key: Key
    let clef: Clef
    var octaveOffset: Int = 0
    var tempo: Double = 120

    var body: some View {
        Button {
            if player.isPlaying {
                player.stop()
            } else {
                player.play(lick: lick, in: key, clef: clef, octaveOffset: octaveOffset, tempo: tempo)
            }
        } label: {
            HStack {
                Image(systemName: player.isPlaying ? "stop.fill" : "play.fill")
                Text(player.isPlaying ? "Stop" : "Play")
            }
            .font(.headline)
            .foregroundStyle(.white)
            .frame(width: 140)
            .padding()
            .background(player.isPlaying ? .red : .blue)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .animation(.easeInOut(duration: 0.15), value: player.isPlaying)
    }
}

#Preview {
    PlayButton(
        player: LickPlayer(),
        lick: BuiltInLicks.shortIIVI,
        key: .c,
        clef: .treble,
        octaveOffset: 0
    )
}
