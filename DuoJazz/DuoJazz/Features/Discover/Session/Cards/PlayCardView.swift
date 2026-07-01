//
//  PlayCardView.swift
//  DuoJazz
//

import SwiftUI
import SwiftData

struct PlayCardView: View {
    let lick: Lick
    let key: KeyOption
    @Binding var autoRecord: Bool
    let onNext: () -> Void
    @Environment(\.instrument) private var instrument
    @Environment(\.modelContext) private var modelContext
    @State private var recording: RecordingSession
    @State private var octaveOffset = 0
    @State private var hasLoadedPreference = false

    init(lick: Lick, key: KeyOption, autoRecord: Binding<Bool>, onNext: @escaping () -> Void) {
        self.lick = lick
        self.key = key
        self._autoRecord = autoRecord
        self.onNext = onNext
        self._recording = State(initialValue: RecordingSession(lick: lick, key: key.key))
    }

    var body: some View {
        VStack(spacing: AppSpacing.lg) {
            CardBadge.play

            Text(lick.name)
                .font(.title.bold())
                .foregroundStyle(.white)

            HStack(spacing: AppSpacing.md) {
                Text("Key of \(key.displayName)")
                    .foregroundStyle(.secondary)
                OctaveButtons(offset: $octaveOffset)
            }

            ABCNotationView(
                lick: lick,
                keyOption: key,
                clef: instrument.defaultClef,
                octaveOffset: octaveOffset
            )
            .frame(maxHeight: 280)
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))

            RecordingProgress(recording: recording)
            RecordingErrorBanner(state: recording.state)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, AppSpacing.lg)
        .onAppear {
            recording.onComplete = onNext
            loadPreferences()
        }
        .onChange(of: octaveOffset) {
            recording.octaveOffset = octaveOffset
            recording.rebuildMatcher()
            if hasLoadedPreference {
                LickCardPreferences.saveOctaveOffset(octaveOffset, for: lick.id, context: modelContext)
            }
        }
        CardRecordingControls(recording: recording, autoRecord: $autoRecord) {
            await recording.startRecording()
        }
    }

    private func loadPreferences() {
        guard !hasLoadedPreference else { return }
        hasLoadedPreference = true
        recording.writtenKey = key.key
        recording.concertMidiOffset = instrument.concertMidiOffset
        octaveOffset = LickCardPreferences.octaveOffset(for: lick, in: key.key, instrument: instrument, context: modelContext)
        recording.octaveOffset = octaveOffset
        recording.autoRecord = autoRecord
        if recording.autoRecord {
            Task { await recording.startRecording() }
        }
    }
}
