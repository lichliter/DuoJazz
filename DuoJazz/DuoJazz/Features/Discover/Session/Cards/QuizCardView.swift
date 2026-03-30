//
//  QuizCardView.swift
//  DuoJazz
//

import SwiftUI

struct QuizCardView: View {
    let tag: Tag
    let key: KeyOption
    let onNext: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            CardBadge.quiz

            Text("Play any \(tag.displayName) lick")
                .font(.title2.bold())
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            Spacer()

            Text("Key of \(key.displayName)")
                .font(.system(size: 56, weight: .bold, design: .rounded))
                .foregroundStyle(Color(hex: 0x8B5CF6))
                .contentTransition(.numericText())

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 24)

        RecordButton(state: .idle, action: onNext)
            .padding(.horizontal, 40)
            .padding(.bottom, 40)
    }
}
