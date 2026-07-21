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

    let onKeyChanged: ((KeyOption) -> Void)?

    init(
        lesson: Lesson,
        startingLickIndex: Int,
        key: KeyOption,
        settings: PracticeSettings = .default,
        onKeyChanged: ((KeyOption) -> Void)? = nil
    ) {
        _viewModel = State(initialValue: SessionViewModel(
            lesson: lesson,
            startingLickIndex: startingLickIndex,
            key: key,
            settings: settings
        ))
        self.onKeyChanged = onKeyChanged
    }

    var body: some View {
        VStack(spacing: 0) {
            SessionTopBar(
                progress: viewModel.progress,
                progressText: viewModel.progressText,
                keyName: viewModel.currentKey.displayName,
                onClose: { dismiss() }
            )

            if viewModel.isSessionComplete {
                SessionCompleteView(
                    lickName: viewModel.lickName,
                    keyName: viewModel.currentKey.displayName,
                    nextKeyName: viewModel.nextLabel,
                    lapCount: viewModel.lapCount,
                    streakDidIncrement: viewModel.streakDidIncrement,
                    onDone: { dismiss() },
                    onContinue: viewModel.hasNext ? {
                        viewModel.advanceNext()
                        onKeyChanged?(viewModel.currentKey)
                    } : nil
                )
                    .transition(.push(from: .trailing))
            } else if let card = viewModel.currentCard {
                cardContent(for: card)
                    .id("\(viewModel.currentLickId)-\(viewModel.currentKey.id)-\(viewModel.currentCardIndex)")
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
        .onDisappear {
            if viewModel.currentKey != viewModel.startingKey {
                onKeyChanged?(viewModel.currentKey)
            }
        }
    }

    @ViewBuilder
    private func cardContent(for card: PracticeCard) -> some View {
        switch card {
        case .learn:
            if let lick = viewModel.currentLick {
                LearnCardView(lick: lick, key: viewModel.currentKey, autoRecord: $viewModel.autoRecord, onNext: viewModel.nextCard)
            }
        case .play:
            if let lick = viewModel.currentLick {
                PlayCardView(lick: lick, key: viewModel.currentKey, autoRecord: $viewModel.autoRecord, onNext: viewModel.nextCard)
            }
        case .listen:
            if let lick = viewModel.currentLick {
                ListenCardView(lick: lick, key: viewModel.currentKey, autoRecord: $viewModel.autoRecord, onNext: viewModel.nextCard)
            }
        case .quiz:
            if let lick = viewModel.currentLick {
                QuizCardView(lick: lick, key: viewModel.currentKey, autoRecord: $viewModel.autoRecord, onNext: viewModel.nextCard)
            }
        }
    }
}
