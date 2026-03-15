//
//  RecordButton.swift
//  DuoJazz
//

import SwiftUI

struct RecordButton: View {
    let isRecording: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: isRecording ? "stop.fill" : "mic")
                    .font(.system(size: 18, weight: .semibold))
                Text(isRecording ? "Stop Recording" : "Start Recording")
                    .font(.system(size: 17, weight: .bold))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .background(isRecording ? Color(hex: 0x52525B) : Color(hex: 0xEF4444))
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .padding(.horizontal, 40)
        .padding(.bottom, 40)
    }
}
