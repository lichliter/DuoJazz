//
//  RecordingProgress.swift
//  DuoJazz
//

import SwiftUI

struct RecordingProgress: View {
    let recording: RecordingSession

    private var hearingColor: Color {
        guard let result = recording.lastMatchResult else { return Color(hex: 0x8B5CF6) }
        switch result {
        case .correct: return Color(hex: 0x22C55E)
        case .holding: return Color(hex: 0x22C55E)
        case .incorrect, .tooHigh, .tooLow: return Color(hex: 0xEF4444)
        }
    }

    private var noteName: String {
        let midi = recording.pitchDetector.detectedMidi
        guard midi > 0 else { return "" }
        let names = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
        let octave = (midi / 12) - 1
        return "\(names[midi % 12])\(octave)"
    }

    var body: some View {
        switch recording.state {
        case .idle:
            EmptyView()

        case .recording:
            VStack(spacing: AppSpacing.sm) {
                WaveformView(
                    amplitudes: recording.pitchDetector.amplitudeHistory,
                    detectedNote: ""
                )
                .frame(maxWidth: 400)

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: AppRadius.xs)
                            .fill(Color(hex: 0x1E1535))
                        RoundedRectangle(cornerRadius: AppRadius.xs)
                            .fill(Color(hex: 0x22C55E))
                            .frame(width: geo.size.width * recording.progress)
                            .animation(.easeInOut(duration: 0.2), value: recording.progress)
                    }
                }
                .frame(height: 6)
                .frame(maxWidth: 400)

                Text("\(recording.matchedCount) of \(recording.totalCount) notes correct")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color(hex: 0x22C55E))

                Text(noteName.isEmpty ? " " : "Hearing: \(noteName)")
                    .font(.caption.weight(.medium).monospaced())
                    .foregroundStyle(hearingColor)
            }

        case .complete(let accuracy):
            VStack(spacing: AppSpacing.xs) {
                Image(systemName: accuracy > 0.5 ? "checkmark.circle.fill" : "arrow.counterclockwise")
                    .font(.title)
                    .foregroundStyle(accuracy > 0.5 ? Color(hex: 0x22C55E) : Color(hex: 0xF59E0B))
                    .symbolEffect(.bounce, value: accuracy > 0.5)

                Text(accuracy > 0.5 ? "Nice!" : "Try again")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)

                Text("\(recording.matchedCount)/\(recording.totalCount) notes matched")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .sensoryFeedback(accuracy > 0.5 ? .success : .warning, trigger: accuracy)

        case .failed:
            HStack(spacing: AppSpacing.xs) {
                Image(systemName: "mic.slash")
                    .foregroundStyle(.red)
                Text("Microphone access needed")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}
