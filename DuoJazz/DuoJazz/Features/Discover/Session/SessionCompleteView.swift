//
//  SessionCompleteView.swift
//  DuoJazz
//

import SwiftUI

struct SessionCompleteView: View {
    let lickName: String
    let keyName: String
    let nextKeyName: String?
    let streakDidIncrement: Bool
    let onDone: () -> Void
    let onContinue: (() -> Void)?
    @State private var appeared = false
    @State private var autoAdvanceFill: CGFloat = 0
    @State private var autoAdvanceTask: Task<Void, Never>?

    private static let autoAdvanceDuration: Double = 5

    var body: some View {
        VStack(spacing: AppSpacing.lg) {
            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .font(AppTypography.celebration)
                .foregroundStyle(Color(hex: 0x22C55E))
                .symbolEffect(.bounce, value: appeared)

            Text("Session Complete!")
                .font(.largeTitle.bold())
                .foregroundStyle(.white)

            Text("\(lickName) — Key of \(keyName)")
                .font(.headline)
                .foregroundStyle(.white.opacity(0.8))

            if streakDidIncrement {
                Label("Streak saved!", systemImage: "flame.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color(hex: 0xF59E0B))
            }

            Text("Great work. Keep practicing to build mastery.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Spacer()

            if let nextKeyName, let onContinue {
                continueButton(label: nextKeyName, action: onContinue)
                    .padding(.horizontal, AppSpacing.xl)

                Button {
                    autoAdvanceTask?.cancel()
                    onDone()
                } label: {
                    Text("Done")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.secondary)
                }
                .padding(.bottom, AppSpacing.xl)
            } else {
                Button(action: onDone) {
                    Text("Done")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, AppSpacing.md)
                        .background(Color(hex: 0x8B5CF6))
                        .clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))
                }
                .padding(.horizontal, AppSpacing.xl)
                .padding(.bottom, AppSpacing.xl)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .sensoryFeedback(.success, trigger: appeared)
        .onAppear {
            appeared = true
            if onContinue != nil {
                startAutoAdvance()
            }
        }
        .onDisappear {
            autoAdvanceTask?.cancel()
        }
    }

    private func continueButton(label: String, action: @escaping () -> Void) -> some View {
        Button {
            autoAdvanceTask?.cancel()
            action()
        } label: {
            HStack(spacing: AppSpacing.xs) {
                Text("Continue to \(label)")
                Image(systemName: "arrow.right")
            }
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, AppSpacing.md)
            .background {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Color(hex: 0x8B5CF6).opacity(0.35)
                        Color(hex: 0x8B5CF6)
                            .frame(width: geo.size.width * autoAdvanceFill)
                    }
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))
        }
    }

    private func startAutoAdvance() {
        withAnimation(.linear(duration: Self.autoAdvanceDuration)) {
            autoAdvanceFill = 1
        }
        autoAdvanceTask = Task {
            try? await Task.sleep(for: .seconds(Self.autoAdvanceDuration))
            if !Task.isCancelled {
                onContinue?()
            }
        }
    }
}
