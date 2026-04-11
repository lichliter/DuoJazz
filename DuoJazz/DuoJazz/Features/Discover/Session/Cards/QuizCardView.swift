//
//  QuizCardView.swift
//  DuoJazz
//

import SwiftUI
import SwiftData

struct QuizCardView: View {
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
        VStack(spacing: 24) {
            CardBadge.quiz

            Text(lick.name)
                .font(.title.bold())
                .foregroundStyle(.white)

            Text("Key of \(key.displayName) • From memory")
                .foregroundStyle(.secondary)

            Spacer(minLength: 24)

            Text("🎯")
                .font(.system(size: 80))

            Spacer(minLength: 24)

            Button {
                if recording.isRecording { recording.pitchDetector.pause() }
                player.play(lick: lick, in: key.key, clef: instrument.defaultClef, octaveOffset: octaveOffset, concertMidiOffset: instrument.concertMidiOffset)
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "speaker.wave.2")
                    Text("Hear reference")
                }
                .foregroundStyle(Color(hex: 0xEF4444))
                .padding(.horizontal, 24)
                .padding(.vertical, 14)
                .background(Color(hex: 0xEF4444).opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color(hex: 0xEF4444).opacity(0.3), lineWidth: 1)
                )
            }

            RecordingProgress(recording: recording)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 24)
        .onAppear {
            recording.onComplete = onNext
            let store = LickPreferenceStore(context: modelContext)
            if let saved = store.octaveOffset(for: lick.id) {
                octaveOffset = saved
            } else {
                octaveOffset = instrument.recommendedOctaveOffset(for: lick, in: key.key)
            }
            recording.octaveOffset = octaveOffset
            recording.writtenKey = key.key
            recording.concertMidiOffset = instrument.concertMidiOffset

            recording.autoRecord = autoRecord
            // Quiz mode: start recording immediately, no reference playback
            if recording.autoRecord {
                Task { await recording.startRecording() }
            }
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
}
