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
    var concertMidiOffset: Int = 0
    var tempo: Double = 120

    var body: some View {
        Button {
            if player.isPlaying {
                player.stop()
            } else {
                player.play(lick: lick, in: key, clef: clef, octaveOffset: octaveOffset, concertMidiOffset: concertMidiOffset, tempo: tempo)
            }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: player.isPlaying ? "stop.fill" : "play.fill")
                    .contentTransition(.symbolEffect(.replace))
                Text(player.isPlaying ? "Stop" : "Play")
            }
            .font(.headline)
            .foregroundStyle(.white)
            .frame(width: 160)
            .padding(.vertical, 16)
            .background(player.isPlaying ? Color(hex: 0xEF4444) : Color(hex: 0x8B5CF6))
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .sensoryFeedback(.impact(flexibility: .soft), trigger: player.isPlaying)
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
