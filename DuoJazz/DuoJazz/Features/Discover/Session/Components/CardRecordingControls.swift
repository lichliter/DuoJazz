//
//  CardRecordingControls.swift
//  DuoJazz
//

import SwiftUI

struct CardRecordingControls: View {
    let recording: RecordingSession
    @Binding var autoRecord: Bool
    let onStartRecording: () async -> Void

    var body: some View {
        if case .complete(let acc) = recording.state, acc >= 1.0 {
            EmptyView()
        } else {
            HStack(spacing: AppSpacing.xs) {
                AutoRecordToggle(recording: recording, autoRecord: $autoRecord) {
                    await onStartRecording()
                }

                RecordButton(state: recording.state) {
                    switch recording.state {
                    case .idle, .failed:
                        Task { await onStartRecording() }
                    case .recording:
                        break
                    case .complete:
                        recording.reset()
                    }
                }
            }
            .padding(.horizontal, AppSpacing.xl)
            .padding(.bottom, AppSpacing.xl)
        }
    }
}
