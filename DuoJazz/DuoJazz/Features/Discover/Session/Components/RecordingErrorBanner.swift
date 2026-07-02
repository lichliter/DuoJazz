//
//  RecordingErrorBanner.swift
//  DuoJazz
//

import SwiftUI

struct RecordingErrorBanner: View {
    let state: RecordingState

    private var errorMessage: String? {
        guard case .failed(let error) = state else { return nil }
        if let pitchError = error as? PitchDetectorError {
            switch pitchError {
            case .microphoneAccessDenied:
                return "Microphone access needed — open Settings to enable"
            case .noInputAvailable:
                return "No microphone found"
            }
        }
        return "Recording failed: \(error.localizedDescription)"
    }

    var body: some View {
        if let message = errorMessage {
            HStack(spacing: AppSpacing.xs) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(Color(hex: 0xEF4444))
                Text(message)
                    .font(.caption)
                    .foregroundStyle(.white)
                Spacer()
                if case .failed(let error) = state,
                   error is PitchDetectorError,
                   case .microphoneAccessDenied = error as! PitchDetectorError {
                    Button("Settings") {
                        if let url = URL(string: UIApplication.openSettingsURLString) {
                            UIApplication.shared.open(url)
                        }
                    }
                    .font(.caption.bold())
                    .foregroundStyle(Color(hex: 0x8B5CF6))
                }
            }
            .padding(AppSpacing.sm)
            .background(Color(hex: 0xEF4444).opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
            .padding(.horizontal, AppSpacing.lg)
        }
    }
}
