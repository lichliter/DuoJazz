//
//  SessionCompleteView.swift
//  DuoJazz
//

import SwiftUI

struct SessionCompleteView: View {
    let onDone: () -> Void
    @State private var appeared = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(Color(hex: 0x22C55E))
                .symbolEffect(.bounce, value: appeared)

            Text("Session Complete!")
                .font(.largeTitle.bold())
                .foregroundStyle(.white)

            Text("Great work. Keep practicing to build mastery.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Spacer()

            Button(action: onDone) {
                Text("Done")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(Color(hex: 0x8B5CF6))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }
            .padding(.horizontal, 40)
            .padding(.bottom, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .sensoryFeedback(.success, trigger: appeared)
        .onAppear { appeared = true }
    }
}
