//
//  ListenCardView.swift
//  DuoJazz
//

import SwiftUI

struct ListenCardView: View {
    let lick: Lick
    let key: KeyOption
    let onNext: () -> Void
    @State private var player = LickPlayer()
    @State private var recording: RecordingSession

    init(lick: Lick, key: KeyOption, onNext: @escaping () -> Void) {
        self.lick = lick
        self.key = key
        self.onNext = onNext
        self._recording = State(initialValue: RecordingSession(lick: lick, key: key.key))
    }

    var body: some View {
        VStack(spacing: 24) {
            CardBadge.listen

            Text(lick.name)
                .font(.title.bold())
                .foregroundStyle(.white)

            Text("Key of \(key.displayName) • Play by ear")
                .foregroundStyle(.secondary)

            Text("???")
                .font(.system(size: 56, weight: .bold))
                .foregroundStyle(Color(hex: 0x52525B))
                .frame(maxWidth: 600, minHeight: 140)
                .background(Color(hex: 0x0C0820))
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color(hex: 0x1E1535), lineWidth: 1)
                )

            Button {
                player.play(lick: lick, in: key.key, clef: .treble)
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "speaker.wave.2")
                    Text("Hear reference")
                }
                .foregroundStyle(Color(hex: 0xF59E0B))
                .padding(.horizontal, 24)
                .padding(.vertical, 14)
                .background(Color(hex: 0xF59E0B).opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color(hex: 0xF59E0B).opacity(0.3), lineWidth: 1)
                )
            }

            RecordingProgress(recording: recording)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 24)

        RecordButton(isRecording: recording.isRecording) {
            if recording.isRecording {
                recording.stopRecording()
            } else if case .complete = recording.state {
                onNext()
            } else {
                Task { await recording.startRecording() }
            }
        }
    }
}
