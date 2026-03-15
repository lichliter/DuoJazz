//
//  SessionView.swift
//  DuoJazz
//

import SwiftUI

struct SessionView: View {
    @State private var viewModel: SessionViewModel
    @Environment(\.dismiss) private var dismiss

    init(lesson: Lesson, key: KeyOption) {
        _viewModel = State(initialValue: SessionViewModel(lesson: lesson, key: key))
    }

    var body: some View {
        VStack(spacing: 0) {
            SessionTopBar(
                progress: viewModel.progress,
                progressText: viewModel.progressText,
                onClose: { dismiss() }
            )

            if viewModel.isSessionComplete {
                SessionCompleteView(onDone: { dismiss() })
            } else if let card = viewModel.currentCard {
                cardContent(for: card)
            }
        }
        .background(Color(hex: 0x0F0A1E))
    }

    @ViewBuilder
    private func cardContent(for card: LessonCard) -> some View {
        switch card {
        case .learn:
            if let lick = viewModel.currentLick {
                LearnCardView(lick: lick, key: viewModel.key, onNext: viewModel.nextCard)
            }
        case .play:
            if let lick = viewModel.currentLick {
                PlayCardView(lick: lick, key: viewModel.key, onNext: viewModel.nextCard)
            }
        case .listen:
            if let lick = viewModel.currentLick {
                ListenCardView(lick: lick, key: viewModel.key, onNext: viewModel.nextCard)
            }
        case .quiz(let tag):
            QuizCardView(tag: tag, key: viewModel.key, onNext: viewModel.nextCard)
        }
    }
}
