//
//  LessonDetailView.swift
//  DuoJazz
//

import SwiftUI
import SwiftData

struct LessonDetailView: View {
    let lesson: Lesson
    @Environment(\.modelContext) private var modelContext
    @State private var selectedKey: KeyOption = .default
    @State private var selectedMode: PracticeMode = .lesson
    @State private var sessionStartIndex: SessionStartIndex?
    @State private var hasLoadedPreference = false
    @Query private var masteries: [LickMastery]

    private let catalog = LickCatalog.shared

    init(lesson: Lesson) {
        self.lesson = lesson
        let ids = lesson.lickIds
        _masteries = Query(filter: #Predicate<LickMastery> { ids.contains($0.lickId) })
    }

    private var licks: [Lick] {
        lesson.licks(from: catalog)
    }

    /// `[lickId: [keyRawValue: highestCardType]]` — derived once per render from the @Query
    private var masteryMap: [String: [Int: Int]] {
        var map: [String: [Int: Int]] = [:]
        for m in masteries {
            map[m.lickId, default: [:]][m.keyRawValue] = m.highestCardType
        }
        return map
    }

    var body: some View {
        ScrollView {
            VStack(spacing: AppSpacing.lg) {
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text(lesson.name)
                        .font(.largeTitle.bold())
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Text(lesson.description)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                KeyPillSelector(
                    selectedKey: $selectedKey,
                    lickIds: lesson.lickIds,
                    masteryMap: masteryMap
                )

                ModePickerView(selectedMode: $selectedMode)

                VStack(spacing: AppSpacing.sm) {
                    ForEach(Array(licks.enumerated()), id: \.element.id) { index, lick in
                        LickRowView(
                            lick: lick,
                            keyStatus: keyStatus(for: lick.id, key: selectedKey.key),
                            medal: medal(for: lick.id),
                            onStart: { sessionStartIndex = SessionStartIndex(index: index) }
                        )
                    }
                }
            }
            .padding(.horizontal, AppSpacing.xl)
            .padding(.vertical, AppSpacing.md)
        }
        .background(Color(hex: 0x0F0A1E))
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { loadPreference() }
        .onChange(of: selectedMode) { _, new in
            LessonPreferenceStore(context: modelContext).setMode(new, for: lesson.id)
        }
        .onChange(of: selectedKey) { _, new in
            LessonPreferenceStore(context: modelContext).setKey(new, for: lesson.id)
        }
        .fullScreenCover(item: $sessionStartIndex) { wrapper in
            SessionView(
                lesson: lesson,
                startingLickIndex: wrapper.index,
                key: selectedKey,
                mode: selectedMode,
                onKeyChanged: { key in selectedKey = key }
            )
        }
    }

    private func keyStatus(for lickId: String, key: Key) -> KeyStatus {
        let level = masteryMap[lickId]?[key.rawValue] ?? 0
        if level >= CardLevel.listen.rawValue { return .completed }
        if level > 0 { return .inProgress }
        return .notStarted
    }

    private func medal(for lickId: String) -> Medal {
        let completedCount = (masteryMap[lickId] ?? [:]).values
            .filter { $0 >= CardLevel.listen.rawValue }
            .count
        if completedCount >= 12 { return .gold }
        if completedCount >= 6 { return .silver }
        if completedCount >= 1 { return .bronze }
        return .none
    }

    struct SessionStartIndex: Identifiable {
        let index: Int
        var id: Int { index }
    }

    private func loadPreference() {
        guard !hasLoadedPreference else { return }
        hasLoadedPreference = true
        let pref = LessonPreferenceStore(context: modelContext).preference(for: lesson.id)
        selectedMode = pref.mode
        selectedKey = pref.key
    }
}

// MARK: - Mode Picker

struct ModePickerView: View {
    @Binding var selectedMode: PracticeMode

    var body: some View {
        HStack(spacing: AppSpacing.xs) {
            ForEach(PracticeMode.allCases, id: \.self) { mode in
                Button { selectedMode = mode } label: {
                    Text(mode.displayName)
                        .font(.caption.weight(selectedMode == mode ? .bold : .medium))
                        .foregroundStyle(selectedMode == mode ? .white : .secondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, AppSpacing.xs)
                        .background(selectedMode == mode ? Color(hex: 0x8B5CF6) : Color(hex: 0x1A1030))
                        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
                        .overlay(
                            RoundedRectangle(cornerRadius: AppRadius.md)
                                .stroke(selectedMode == mode ? Color.clear : Color(hex: 0x2D2060), lineWidth: 1)
                        )
                }
            }
        }
    }
}

// MARK: - Key Pill Selector

struct KeyPillSelector: View {
    @Binding var selectedKey: KeyOption
    let lickIds: [String]
    let masteryMap: [String: [Int: Int]]

    /// Chromatic sequence of key options with canonical spellings (flats preferred for beginners)
    private static let pillOptions: [KeyOption] = {
        let order: [(Key, Bool)] = [
            (.c, false), (.cSharp, true), (.d, false), (.dSharp, true),
            (.e, false), (.f, false), (.fSharp, false), (.g, false),
            (.gSharp, true), (.a, false), (.aSharp, true), (.b, false),
        ]
        return order.map { key, flats in
            KeyOption.allOptions.first { $0.key == key && $0.usesFlats == flats }
                ?? KeyOption.allOptions.first { $0.key == key }!
        }
    }()

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                ForEach(Self.pillOptions) { option in
                    let status = statusFor(key: option.key)
                    let isSelected = option.key == selectedKey.key
                    let style = PillStyle.for(status: status, selected: isSelected)

                    Button { selectedKey = option } label: {
                        Text(option.displayName)
                            .font(.caption.weight(isSelected ? .bold : .medium))
                            .foregroundStyle(style.text)
                            .padding(.horizontal, AppSpacing.sm)
                            .padding(.vertical, AppSpacing.xs)
                            .background(style.background)
                            .clipShape(Capsule())
                            .overlay(
                                Capsule().stroke(style.border, lineWidth: isSelected ? 2 : 1)
                            )
                    }
                }
            }
            .padding(.horizontal, AppSpacing.xs)
            .padding(.vertical, AppSpacing.xs)
        }
    }

    /// A key is completed when ALL licks are completed, in-progress when ANY have progress
    private func statusFor(key: Key) -> KeyStatus {
        var anyProgress = false
        var allCompleted = true
        let listenLevel = CardLevel.listen.rawValue
        for lickId in lickIds {
            let level = masteryMap[lickId]?[key.rawValue] ?? 0
            if level < listenLevel { allCompleted = false }
            if level > 0 { anyProgress = true }
            if !allCompleted && anyProgress { break }
        }
        if allCompleted && !lickIds.isEmpty { return .completed }
        if anyProgress { return .inProgress }
        return .notStarted
    }
}

private struct PillStyle {
    let background: Color
    let border: Color
    let text: Color

    static func `for`(status: KeyStatus, selected: Bool) -> PillStyle {
        let base: Color = {
            switch status {
            case .completed: Color(hex: 0x22C55E)
            case .inProgress: Color(hex: 0xF59E0B)
            case .notStarted: Color(hex: 0x8B5CF6)
            }
        }()
        let bgOpacity: Double = {
            switch status {
            case .notStarted: selected ? 0.12 : 0.05
            default: selected ? 0.2 : 0.1
            }
        }()
        return PillStyle(
            background: base.opacity(bgOpacity),
            border: selected ? base : .clear,
            text: status == .notStarted
                ? (selected ? .white : .secondary)
                : base
        )
    }
}
