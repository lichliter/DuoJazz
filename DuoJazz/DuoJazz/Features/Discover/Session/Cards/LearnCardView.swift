//
//  LearnCardView.swift
//  DuoJazz
//

import SwiftUI
import SwiftData

struct LearnCardView: View {
    let lick: Lick
    let key: KeyOption
    @Binding var autoRecord: Bool
    let onNext: () -> Void
    @Environment(\.instrument) private var instrument
    @Environment(\.modelContext) private var modelContext
    @State private var player = LickPlayer()
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

            ABCNotationView(
                lick: lick,
                keyOption: key,
                clef: instrument.defaultClef,
                octaveOffset: octaveOffset
            )
            .frame(maxHeight: 280)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            Button {
                if recording.isRecording { recording.pitchDetector.pause() }
                player.play(lick: lick, in: key.key, clef: instrument.defaultClef, octaveOffset: octaveOffset, concertMidiOffset: instrument.concertMidiOffset)
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
        .onAppear {
            recording.onComplete = onNext
            loadPreferences()
        }
        .onChange(of: octaveOffset) {
            recording.octaveOffset = octaveOffset
            recording.rebuildMatcher()
            savePreferences()
        }
        .onChange(of: player.isPlaying) {
            if !player.isPlaying && recording.isRecording {
                recording.pitchDetector.resume()
            }
        }
        if case .complete(let acc) = recording.state, acc >= 1.0 {
            // Auto-advancing
        } else {
            HStack(spacing: 8) {
                AutoRecordToggle(recording: recording, autoRecord: $autoRecord) {
                    Task { await recording.startRecording() }
                }

                RecordButton(state: recording.state) {
                    switch recording.state {
                    case .idle, .failed:
                        Task { await recording.startRecording() }
                    case .recording:
                        break
                    case .complete:
                        recording.reset()
                    }
                }
            }
            .padding(.horizontal, 40)
            .padding(.bottom, 40)
        }
    }

    private func loadPreferences() {
        guard !hasLoadedPreference else { return }
        hasLoadedPreference = true
        recording.writtenKey = key.key
        recording.concertMidiOffset = instrument.concertMidiOffset
        let store = LickPreferenceStore(context: modelContext)
        if let saved = store.octaveOffset(for: lick.id) {
            octaveOffset = saved
        } else {
            octaveOffset = instrument.recommendedOctaveOffset(for: lick, in: key.key)
        }
        recording.octaveOffset = octaveOffset

        recording.autoRecord = autoRecord
        if recording.autoRecord {
            Task { await recording.startRecording() }
        }
    }

    private func savePreferences() {
        guard hasLoadedPreference else { return }
        let store = LickPreferenceStore(context: modelContext)
        store.setOctaveOffset(octaveOffset, for: lick.id)
    }
}

struct OctaveButtons: View {
    @Binding var offset: Int

    var body: some View {
        HStack(spacing: 8) {
            Button { if offset > -2 { offset -= 1 } } label: {
                Image(systemName: "minus")
                    .font(.subheadline.bold())
                    .frame(width: 44, height: 44)
                    .foregroundStyle(offset > -2 ? .white : Color(hex: 0x52525B))
                    .background(Color(hex: 0x1A1030))
                    .clipShape(Circle())
            }
            .disabled(offset <= -2)
            .accessibilityLabel("Octave down")

            Text("8va: \(offset)")
                .font(.subheadline.weight(.semibold).monospaced())
                .foregroundStyle(.secondary)
                .frame(width: 56)

            Button { if offset < 2 { offset += 1 } } label: {
                Image(systemName: "plus")
                    .font(.subheadline.bold())
                    .frame(width: 44, height: 44)
                    .foregroundStyle(offset < 2 ? .white : Color(hex: 0x52525B))
                    .background(Color(hex: 0x1A1030))
                    .clipShape(Circle())
            }
            .disabled(offset >= 2)
            .accessibilityLabel("Octave up")
        }
    }
}
