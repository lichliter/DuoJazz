//
//  ModuleDetailView.swift
//  DuoJazz
//

import SwiftUI
import SwiftData

struct ModuleDetailView: View {
    let collection: LickCollection
    @Environment(\.modelContext) private var modelContext
    @State private var selectedKey: KeyOption = .default
    @State private var sessionLesson: Lesson?
    @State private var lessonStates: [LessonSlotState] = [.current, .locked, .locked, .locked, .locked]
    @State private var progress: Double = 0
    @State private var medal: Medal = .none

    private let catalog = LickCatalog.shared

    private var licks: [Lick] {
        collection.licks(from: catalog)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text(collection.name)
                    .font(.largeTitle.bold())
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, alignment: .leading)

                // Medal + description
                HStack {
                    Text(collection.description)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                    if medal != .none {
                        Image(systemName: medal.icon)
                            .font(.title2)
                            .foregroundStyle(medal.color)
                            .symbolEffect(.bounce, value: medal)
                    }
                }

                // Key selector pills
                KeyPillSelector(
                    selectedKey: $selectedKey,
                    moduleId: collection.id,
                    context: modelContext
                )

                // Progress bar for selected key
                HStack(spacing: 12) {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color(hex: 0x1E1535))
                            RoundedRectangle(cornerRadius: 4)
                                .fill(progress >= 1.0 ? Color(hex: 0x22C55E) : Color(hex: 0x8B5CF6))
                                .frame(width: geo.size.width * progress)
                        }
                    }
                    .frame(height: 6)

                    Text("\(Int(progress * 100))%")
                        .font(.caption.weight(.semibold).monospaced())
                        .foregroundStyle(.secondary)
                        .frame(width: 40)
                }

                // Lesson list
                VStack(spacing: 12) {
                    ForEach(0..<5) { index in
                        Button { startLesson() } label: {
                            LessonRowContent(
                                number: index + 1,
                                state: lessonStates[index]
                            )
                        }
                        .disabled(lessonStates[index] == .locked)
                    }
                }

                // Licks in this module
                VStack(alignment: .leading, spacing: 12) {
                    Text("Licks in this module")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.secondary)

                    ForEach(licks) { lick in
                        NavigationLink(destination: LickDetailView(lick: lick, initialKey: selectedKey)) {
                            HStack(spacing: 14) {
                                Image(systemName: "music.note")
                                    .font(.subheadline)
                                    .foregroundStyle(Color(hex: 0x8B5CF6))
                                    .frame(width: 24)

                                Text(lick.name)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(.white)

                                Spacer()

                                if let progression = lick.chordProgression {
                                    HStack(spacing: 8) {
                                        ForEach(progression.symbols, id: \.startBeat) { symbol in
                                            Text(symbol.functionalText)
                                                .font(.custom("Baskerville-SemiBold", size: 16))
                                                .foregroundStyle(.white.opacity(0.7))
                                        }
                                    }
                                }

                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                            }
                            .padding(14)
                            .background(Color(hex: 0x1A1030))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, 40)
            .padding(.vertical, 16)
        }
        .background(Color(hex: 0x0F0A1E))
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { refreshState() }
        .onChange(of: selectedKey.key) { refreshState() }
        .fullScreenCover(item: $sessionLesson, onDismiss: { refreshState() }) { lesson in
            SessionView(lesson: lesson, key: selectedKey)
        }
    }

    private func refreshState() {
        let store = ModuleProgressStore(context: modelContext)
        let completed = store.completedLesson(for: collection.id, in: selectedKey.key)
        progress = Double(completed) / 5.0
        medal = store.medal(for: collection.id)

        lessonStates = (0..<5).map { index in
            let lessonNum = index + 1
            if lessonNum <= completed { return .completed }
            if lessonNum == completed + 1 { return .current }
            return .locked
        }
    }

    private func startLesson() {
        let store = MasteryStore(context: modelContext)
        let key = selectedKey.key
        sessionLesson = Lesson.generate(from: collection, catalog: catalog) { lickId in
            store.level(for: lickId, in: key)
        }
    }
}

// MARK: - Key Pill Selector

struct KeyPillSelector: View {
    @Binding var selectedKey: KeyOption
    let moduleId: String
    let context: ModelContext

    private struct PillKey: Identifiable {
        let key: Key
        let label: String
        let option: KeyOption
        var id: Int { key.rawValue }
    }

    private var pillKeys: [PillKey] {
        let pills: [(Key, String, Bool)] = [
            (.c, "C", false), (.cSharp, "Db", true), (.d, "D", false), (.dSharp, "Eb", true),
            (.e, "E", false), (.f, "F", true), (.fSharp, "F#", false), (.g, "G", false),
            (.gSharp, "Ab", true), (.a, "A", false), (.aSharp, "Bb", true), (.b, "B", false),
        ]
        return pills.map { key, label, usesFlats in
            let option = KeyOption(key: key, displayName: label, vexflowSignature: label, usesFlats: usesFlats)
            return PillKey(key: key, label: label, option: option)
        }
    }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(pillKeys) { item in
                    let status = ModuleProgressStore(context: context)
                        .keyStatus(for: moduleId, key: item.key)
                    let isSelected = item.key == selectedKey.key

                    Button { selectedKey = item.option } label: {
                        Text(item.label)
                            .font(.caption.weight(isSelected ? .bold : .medium))
                            .foregroundStyle(pillTextColor(status: status, selected: isSelected))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(pillBackground(status: status, selected: isSelected))
                            .clipShape(Capsule())
                            .overlay(
                                Capsule()
                                    .stroke(pillBorderColor(status: status, selected: isSelected), lineWidth: isSelected ? 2 : 1)
                            )
                    }
                }
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 4)
        }
    }

    private func pillBackground(status: KeyStatus, selected: Bool) -> Color {
        switch status {
        case .completed: return Color(hex: 0x22C55E).opacity(selected ? 0.2 : 0.1)
        case .inProgress: return Color(hex: 0xF59E0B).opacity(selected ? 0.2 : 0.1)
        case .notStarted: return Color(hex: 0x8B5CF6).opacity(selected ? 0.12 : 0.05)
        }
    }

    private func pillBorderColor(status: KeyStatus, selected: Bool) -> Color {
        if !selected { return .clear }
        switch status {
        case .completed: return Color(hex: 0x22C55E)
        case .inProgress: return Color(hex: 0xF59E0B)
        case .notStarted: return Color(hex: 0x8B5CF6)
        }
    }

    private func pillTextColor(status: KeyStatus, selected: Bool) -> Color {
        switch status {
        case .completed: return Color(hex: 0x22C55E)
        case .inProgress: return Color(hex: 0xF59E0B)
        case .notStarted: return selected ? .white : .secondary
        }
    }
}

// MARK: - Lesson Row

enum LessonSlotState {
    case completed, current, locked
}

struct LessonRowContent: View {
    let number: Int
    let state: LessonSlotState

    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(circleColor)
                    .frame(width: 48, height: 48)
                if state == .completed {
                    Image(systemName: "checkmark")
                        .font(.body.bold())
                        .foregroundStyle(.white)
                } else {
                    Text("\(number)")
                        .font(.title3.bold())
                        .foregroundStyle(.white)
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("Lesson \(number)")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(state == .locked ? Color(hex: 0x52525B) : .white)

                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if state == .current {
                Image(systemName: "play.fill")
                    .font(.subheadline)
                    .foregroundStyle(Color(hex: 0x8B5CF6))
            } else if state == .completed {
                Image(systemName: "arrow.counterclockwise")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                Image(systemName: "lock.fill")
                    .font(.caption)
                    .foregroundStyle(Color(hex: 0x52525B))
            }
        }
        .padding(16)
        .background(state == .current ? Color(hex: 0x8B5CF6).opacity(0.08) : Color(hex: 0x1A1030))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(state == .current ? Color(hex: 0x8B5CF6).opacity(0.4) : Color(hex: 0x2D2060), lineWidth: state == .current ? 2 : 1)
        )
        .opacity(state == .locked ? 0.5 : 1.0)
    }

    private var subtitle: String {
        switch state {
        case .completed: "Completed"
        case .current: "Ready to play"
        case .locked: "Complete previous lesson"
        }
    }

    private var circleColor: Color {
        switch state {
        case .completed: Color(hex: 0x22C55E)
        case .current: Color(hex: 0x8B5CF6)
        case .locked: Color(hex: 0x2D2060)
        }
    }
}
