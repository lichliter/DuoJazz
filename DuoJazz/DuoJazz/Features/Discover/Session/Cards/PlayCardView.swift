//
//  PlayCardView.swift
//  DuoJazz
//

import SwiftUI

struct PlayCardView: View {
    let lick: Lick
    let key: KeyOption
    let onNext: () -> Void
    @State private var recording: RecordingSession

    init(lick: Lick, key: KeyOption, onNext: @escaping () -> Void) {
        self.lick = lick
        self.key = key
        self.onNext = onNext
        self._recording = State(initialValue: RecordingSession(lick: lick, key: key.key))
    }

    var body: some View {
        VStack(spacing: 24) {
            CardBadge.play

            Text(lick.name)
                .font(.title.bold())
                .foregroundStyle(.white)

            Text("Key of \(key.displayName) • Play what you see")
                .foregroundStyle(.secondary)

            VexFlowNotationView(
                lick: lick,
                keyOption: key,
                clef: .treble,
                octaveOffset: 0,
                timeSignature: lick.vexflowTimeSignature
            )
            .frame(maxWidth: 600, maxHeight: 200)
            .clipShape(RoundedRectangle(cornerRadius: 12))

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
