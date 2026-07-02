//
//  ProfileView.swift
//  DuoJazz
//

import SwiftUI
import SwiftData

struct ProfileView: View {
    @Environment(\.instrument) private var instrument
    @Environment(\.modelContext) private var modelContext
    @Query private var profiles: [UserProfile]
    @Query(filter: #Predicate<LickMastery> { $0.highestCardType >= 3 })
    private var completedMasteries: [LickMastery]
    @State private var viewModel: ProfileViewModel?
    @State private var showingInstrumentPicker = false

    private var profile: UserProfile {
        if let existing = profiles.first { return existing }
        let new = UserProfile()
        modelContext.insert(new)
        return new
    }

    private var lickMedalSummary: MedalSummary {
        var keyCountByLick: [String: Int] = [:]
        for m in completedMasteries {
            keyCountByLick[m.lickId, default: 0] += 1
        }
        var bronze = 0, silver = 0, gold = 0
        for count in keyCountByLick.values {
            if count >= 12 { gold += 1 }
            else if count >= 6 { silver += 1 }
            else if count >= 1 { bronze += 1 }
        }
        return MedalSummary(bronze: bronze, silver: silver, gold: gold)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: AppSpacing.lg) {
                if let vm = viewModel {
                    InstrumentCard(instrument: vm.selectedInstrument)
                        .onTapGesture { showingInstrumentPicker = true }
                }

                StreakCard(count: profile.currentStreak)

                MedalSummaryCard(summary: lickMedalSummary)
            }
            .padding(.horizontal, AppSpacing.xl)
            .padding(.vertical, AppSpacing.md)
        }
        .background(Color(hex: 0x0F0A1E))
        .navigationTitle("Profile")
        .task {
            if viewModel == nil {
                viewModel = ProfileViewModel(instrument: instrument)
            }
            StreakStore(context: modelContext).syncToWidget()
        }
        .sheet(isPresented: $showingInstrumentPicker) {
            if let vm = viewModel {
                InstrumentPickerView(
                    selected: vm.selectedInstrument,
                    onSelect: { picked in
                        vm.updateInstrument(picked, profile: profile)
                        showingInstrumentPicker = false
                    }
                )
            }
        }
    }
}
