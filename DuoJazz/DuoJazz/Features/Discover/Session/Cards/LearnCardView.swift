//
//  LearnCardView.swift
//  DuoJazz
//

import SwiftUI

struct LearnCardView: View {
    let lick: Lick
    let key: KeyOption
    let onNext: () -> Void
    @State private var player = LickPlayer()
    @State private var recording: RecordingSession
    @State private var octaveOffset = 0

    init(lick: Lick, key: KeyOption, onNext: @escaping () -> Void) {
        self.lick = lick
        self.key = key
        self.onNext = onNext
        self._recording = State(initialValue: RecordingSession(lick: lick, key: key.key))
    }

    var body: some View {
        VStack(spacing: 24) {
            CardBadge.learn

            Text(lick.name)
                .font(.title.bold())
                .foregroundStyle(.white)

            HStack(spacing: 16) {
                Text("Key of \(key.displayName)")
                    .foregroundStyle(.secondary)

                OctaveButtons(offset: $octaveOffset)
            }

            VexFlowNotationView(
                lick: lick,
                keyOption: key,
                clef: .treble,
                octaveOffset: octaveOffset,
                timeSignature: lick.vexflowTimeSignature
            )
            .frame(maxWidth: 600, maxHeight: 200)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            Button {
                player.play(lick: lick, in: key.key, clef: .treble, octaveOffset: octaveOffset)
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "play.fill")
                    Text("Hear reference")
                }
                .foregroundStyle(Color(hex: 0x8B5CF6))
                .padding(.horizontal, 24)
                .padding(.vertical, 14)
                .background(Color(hex: 0x1A1030))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color(hex: 0x2D2060), lineWidth: 1)
                )
            }

            RecordingProgress(recording: recording)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 24)
        .onChange(of: octaveOffset) {
            recording.octaveOffset = octaveOffset
        }

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

struct OctaveButtons: View {
    @Binding var offset: Int

    var body: some View {
        HStack(spacing: 4) {
            Button { if offset > -2 { offset -= 1 } } label: {
                Image(systemName: "minus")
                    .font(.system(size: 12, weight: .bold))
                    .frame(width: 28, height: 28)
                    .foregroundStyle(offset > -2 ? .white : Color(hex: 0x52525B))
                    .background(Color(hex: 0x1A1030))
                    .clipShape(Circle())
            }
            .disabled(offset <= -2)

            Text("8va: \(offset)")
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .foregroundStyle(.secondary)
                .frame(width: 50)

            Button { if offset < 2 { offset += 1 } } label: {
                Image(systemName: "plus")
                    .font(.system(size: 12, weight: .bold))
                    .frame(width: 28, height: 28)
                    .foregroundStyle(offset < 2 ? .white : Color(hex: 0x52525B))
                    .background(Color(hex: 0x1A1030))
                    .clipShape(Circle())
            }
            .disabled(offset >= 2)
        }
    }
}
