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
    @State private var settings: PracticeSettings = .default
    @State private var sessionStartIndex: SessionStartIndex?
    @State private var hasLoadedPreference = false
    @Query private var masteries: [LickMastery]

    private let catalog = LickCatalog.shared

    init(lesson: Lesson) {
        self.lesson = lesson
        let ids = lesson.lickIds
        _masteries = Query(filter: #Predicate<LickMastery> { ids.contains($0.lickId) })
    }

    private var licks: [Lick] { lesson.licks(from: catalog) }

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
                LessonDetailHeader(name: lesson.name, description: lesson.description)

                KeyPillSelector(
                    selectedKey: $selectedKey,
                    lickIds: lesson.lickIds,
                    masteryMap: masteryMap
                )

                LoopModePicker(loopEnabled: $settings.loopEnabled)

                if settings.loopEnabled {
                    LoopIntervalPicker(interval: $settings.interval)
                        .transition(.opacity.combined(with: .move(edge: .top)))
                }

                SessionLengthPicker(sessionLength: $settings.sessionLength)

                VStack(spacing: AppSpacing.sm) {
                    ForEach(Array(licks.enumerated()), id: \.element.id) { index, lick in
                        LickRowView(
                            lick: lick,
                            keyStatus: LessonMasteryHelpers.keyStatus(for: lick.id, key: selectedKey.key, masteryMap: masteryMap),
                            medal: LessonMasteryHelpers.medal(for: lick.id, masteryMap: masteryMap),
                            onStart: { sessionStartIndex = SessionStartIndex(index: index) }
                        )
                    }
                }
            }
            .padding(.horizontal, AppSpacing.xl)
            .padding(.vertical, AppSpacing.md)
            .animation(.easeInOut(duration: 0.2), value: settings.loopEnabled)
        }
        .background(Color(hex: 0x0F0A1E))
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { loadPreference() }
        .onChange(of: settings) { _, new in
            LessonPreferenceStore(context: modelContext).setSettings(new, for: lesson.id)
        }
        .onChange(of: selectedKey) { _, new in
            LessonPreferenceStore(context: modelContext).setKey(new, for: lesson.id)
        }
        .fullScreenCover(item: $sessionStartIndex) { wrapper in
            SessionView(
                lesson: lesson,
                startingLickIndex: wrapper.index,
                key: selectedKey,
                settings: settings,
                onKeyChanged: { key in selectedKey = key }
            )
        }
    }

    private func loadPreference() {
        guard !hasLoadedPreference else { return }
        hasLoadedPreference = true
        let pref = LessonPreferenceStore(context: modelContext).preference(for: lesson.id)
        settings = pref.settings
        selectedKey = pref.key
    }
}

struct SessionStartIndex: Identifiable {
    let index: Int
    var id: Int { index }
}
