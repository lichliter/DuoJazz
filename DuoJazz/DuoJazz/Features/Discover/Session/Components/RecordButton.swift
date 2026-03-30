//
//  RecordButton.swift
//  DuoJazz
//

import SwiftUI

struct RecordButton: View {
    let state: RecordingState
    let action: () -> Void

    private var label: String {
        switch state {
        case .idle: "Start Recording"
        case .recording: "Recording..."
        case .complete(let accuracy): accuracy >= 1.0 ? "Continue" : "Try Again"
        case .failed: "Start Recording"
        }
    }

    private var icon: String {
        switch state {
        case .idle, .failed: "mic"
        case .recording: "waveform"
        case .complete(let accuracy): accuracy >= 1.0 ? "arrow.right" : "arrow.counterclockwise"
        }
    }

    private var bgColor: Color {
        switch state {
        case .idle, .failed: Color(hex: 0xEF4444)
        case .recording: Color(hex: 0x52525B)
        case .complete(let accuracy): accuracy >= 1.0 ? Color(hex: 0x22C55E) : Color(hex: 0xF59E0B)
        }
    }

    private var isDisabled: Bool {
        if case .recording = state { return true }
        return false
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.body.weight(.semibold))
                Text(label)
                    .font(.headline)
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .background(bgColor)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .disabled(isDisabled)
        .sensoryFeedback(.impact(flexibility: .solid), trigger: state.isRecording)
    }
}
