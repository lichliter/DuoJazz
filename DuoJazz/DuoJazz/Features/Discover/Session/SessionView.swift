//
//  SessionView.swift
//  DuoJazz
//

import SwiftUI
import SwiftData

struct SessionView: View {
    @State private var viewModel: SessionViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

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
                    .transition(.push(from: .trailing))
            } else if let card = viewModel.currentCard {
                cardContent(for: card)
                    .id(viewModel.currentCardIndex)
                    .transition(.push(from: .trailing))
            }
        }
        .background(Color(hex: 0x0F0A1E))
        .onAppear {
            viewModel.modelContext = modelContext
            let descriptor = FetchDescriptor<UserProfile>()
            if let profile = try? modelContext.fetch(descriptor).first {
                viewModel.autoRecord = profile.autoRecord
            }
        }
    }

    @ViewBuilder
    private func cardContent(for card: LessonCard) -> some View {
        switch card {
        case .learn:
            if let lick = viewModel.currentLick {
                LearnCardView(lick: lick, key: viewModel.key, autoRecord: $viewModel.autoRecord, onNext: viewModel.nextCard)
            }
        case .play:
            if let lick = viewModel.currentLick {
                PlayCardView(lick: lick, key: viewModel.key, autoRecord: $viewModel.autoRecord, onNext: viewModel.nextCard)
            }
        case .listen:
            if let lick = viewModel.currentLick {
                ListenCardView(lick: lick, key: viewModel.key, autoRecord: $viewModel.autoRecord, onNext: viewModel.nextCard)
            }
        case .quiz(let tag):
            QuizCardView(tag: tag, key: viewModel.key, onNext: viewModel.nextCard)
        }
    }
}
