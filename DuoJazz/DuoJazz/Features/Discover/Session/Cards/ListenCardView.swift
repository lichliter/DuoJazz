//
//  ListenCardView.swift
//  DuoJazz
//

import SwiftUI
import SwiftData

struct ListenCardView: View {
    let lick: Lick
    let key: KeyOption
    @Binding var autoRecord: Bool
    let onNext: () -> Void
    @Environment(\.instrument) private var instrument
    @Environment(\.modelContext) private var modelContext
    @State private var player = LickPlayer()
    @State private var recording: RecordingSession
    @State private var octaveOffset = 0

    init(lick: Lick, key: KeyOption, autoRecord: Binding<Bool>, onNext: @escaping () -> Void) {
        self.lick = lick
        self.key = key
        self._autoRecord = autoRecord
        self.onNext = onNext
        self._recording = State(initialValue: RecordingSession(lick: lick, key: key.key))
    }

    var body: some View {
        VStack(spacing: AppSpacing.lg) {
            CardBadge.listen

            Text(lick.name)
                .font(.title.bold())
                .foregroundStyle(.white)

            Text("Key of \(key.displayName) • Play by ear")
                .foregroundStyle(.secondary)

            ABCNotationView(
                lick: lick,
                keyOption: key,
                clef: instrument.defaultClef,
                octaveOffset: 0,
                chartMode: true
            )
            .frame(maxHeight: 200)
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))

            HearReferenceButton(style: .listen) { playReference() }

            RecordingProgress(recording: recording)
            RecordingErrorBanner(state: recording.state)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, AppSpacing.lg)
        .onAppear {
            recording.onComplete = onNext
            octaveOffset = LickCardPreferences.octaveOffset(for: lick, in: key.key, instrument: instrument, context: modelContext)
            recording.octaveOffset = octaveOffset
            recording.writtenKey = key.key
            recording.concertMidiOffset = instrument.concertMidiOffset
            recording.autoRecord = autoRecord
            if recording.autoRecord { playReference() }
        }
        .onChange(of: player.isPlaying) {
            if !player.isPlaying {
                if recording.isRecording {
                    recording.pitchDetector.resume()
                } else if autoRecord {
                    Task { await recording.startRecording() }
                }
            }
        }
        CardRecordingControls(recording: recording, autoRecord: $autoRecord) {
            await recording.startRecording()
        }
    }

    private func playReference() {
        if recording.isRecording { recording.pitchDetector.pause() }
        player.play(
            lick: lick, in: key.key, clef: instrument.defaultClef,
            octaveOffset: octaveOffset, concertMidiOffset: instrument.concertMidiOffset
        )
    }
}
