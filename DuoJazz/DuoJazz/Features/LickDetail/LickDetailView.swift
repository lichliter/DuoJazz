//
//  LickDetailView.swift
//  DuoJazz
//

import SwiftUI
import SwiftData

struct LickDetailView: View {
    let lick: Lick
    var initialKey: KeyOption?
    @Environment(\.instrument) private var instrument
    @Environment(\.modelContext) private var modelContext
    @State private var selectedKeyOption: KeyOption = .default
    @State private var octaveOffset: Int = 0
    @State private var player = LickPlayer()
    @State private var hasLoadedPreference = false

    private var parentCollection: Lesson? {
        BuiltInLessons.all.first { $0.lickIds.contains(lick.id) }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Module link + title
            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                if let collection = parentCollection {
                    NavigationLink(destination: LessonDetailView(lesson: collection)) {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: collection.iconName)
                                .font(.subheadline)
                            Text(collection.name)
                                .font(.subheadline.weight(.semibold))
                            Image(systemName: "chevron.right")
                                .font(.caption2)
                        }
                        .foregroundStyle(Color(hex: 0x22C55E))
                        .padding(.horizontal, AppSpacing.sm)
                        .padding(.vertical, AppSpacing.xs)
                        .background(Color(hex: 0x22C55E).opacity(0.1))
                        .clipShape(Capsule())
                    }
                }

                Text(lick.name)
                    .font(.largeTitle.bold())
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, AppSpacing.lg)
            .padding(.top, AppSpacing.xs)

            // Tags
            HStack(spacing: AppSpacing.xs) {
                ForEach(lick.tags, id: \.self) { tag in
                    Text(tag.displayName)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Color(hex: 0x8B5CF6))
                        .padding(.horizontal, AppSpacing.xs)
                        .padding(.vertical, AppSpacing.xs)
                        .background(Color(hex: 0x8B5CF6).opacity(0.12))
                        .clipShape(Capsule())
                }
                Spacer()
                Text("\(lick.noteCount) notes")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, AppSpacing.lg)
            .padding(.top, AppSpacing.sm)

            // Notation
            ABCNotationView(
                lick: lick,
                keyOption: selectedKeyOption,
                clef: instrument.defaultClef,
                octaveOffset: octaveOffset
            )
            .frame(maxHeight: 340)
            .padding(.horizontal, AppSpacing.md)
            .padding(.top, AppSpacing.xs)

            // Controls row
            HStack(spacing: AppSpacing.lg) {
                // Key
                HStack(spacing: AppSpacing.xs) {
                    Text("Key")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Picker("", selection: $selectedKeyOption) {
                        ForEach(KeyOption.allOptions, id: \.key) { option in
                            Text(option.displayName).tag(option)
                        }
                    }
                    .pickerStyle(.menu)
                    .tint(Color(hex: 0x8B5CF6))
                }

                // Octave
                OctaveButtons(offset: $octaveOffset)
            }
            .padding(.horizontal, AppSpacing.lg)
            .padding(.vertical, AppSpacing.sm)

            Spacer()

            // Play button
            PlayButton(
                player: player,
                lick: lick,
                key: selectedKeyOption.key,
                clef: instrument.defaultClef,
                octaveOffset: octaveOffset,
                concertMidiOffset: instrument.concertMidiOffset
            )
            .padding(.bottom, AppSpacing.lg)
        }
        .background(Color(hex: 0x0F0A1E))
        .toolbarTitleDisplayMode(.inline)
        .onAppear {
            guard !hasLoadedPreference else { return }
            hasLoadedPreference = true
            if let initialKey { selectedKeyOption = initialKey }
            let store = LickPreferenceStore(context: modelContext)
            if let saved = store.octaveOffset(for: lick.id) {
                octaveOffset = saved
            } else {
                octaveOffset = instrument.recommendedOctaveOffset(for: lick, in: selectedKeyOption.key)
            }
        }
        .onChange(of: octaveOffset) {
            guard hasLoadedPreference else { return }
            let store = LickPreferenceStore(context: modelContext)
            store.setOctaveOffset(octaveOffset, for: lick.id)
        }
    }
}

#Preview {
    NavigationStack {
        LickDetailView(lick: BuiltInLicks.shortIIVI)
    }
    .modelContainer(for: [LickPreference.self, UserProfile.self])
}
