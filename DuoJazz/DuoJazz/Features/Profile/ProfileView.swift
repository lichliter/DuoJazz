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
    @State private var viewModel: ProfileViewModel?
    @State private var showingInstrumentPicker = false
    @State private var showingResetConfirmation = false

    private var profile: UserProfile {
        if let existing = profiles.first { return existing }
        let new = UserProfile()
        modelContext.insert(new)
        return new
    }

    private var medalSummary: MedalSummary {
        let store = ModuleProgressStore(context: modelContext)
        let moduleIds = BuiltInCollections.all.map(\.id)
        return store.medalSummary(moduleIds: moduleIds)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 28) {
                InstrumentCard(instrument: vm.selectedInstrument)
                    .onTapGesture { showingInstrumentPicker = true }

                MasteryBreakdownCard(breakdown: vm.masteryBreakdown, total: vm.totalLicks)

                MedalSummaryCard(summary: medalSummary)

                resetButton
            }
            .padding(.horizontal, 40)
            .padding(.vertical, 16)
        }
        .background(Color(hex: 0x0F0A1E))
        .navigationTitle("Profile")
        .sheet(isPresented: $showingInstrumentPicker) {
            InstrumentPickerView(
                selected: vm.selectedInstrument,
                onSelect: { picked in
                    vm.updateInstrument(picked, profile: profile)
                    showingInstrumentPicker = false
                }
            )
        }
        .alert("Reset All Progress?", isPresented: $showingResetConfirmation) {
            Button("Reset", role: .destructive) { vm.resetAllProgress() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will erase all mastery, lesson progress, and medals. This cannot be undone.")
        }
    }

    private var resetButton: some View {
        Button {
            showingResetConfirmation = true
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "arrow.counterclockwise")
                Text("Reset All Progress")
            }
            .font(.subheadline.weight(.medium))
            .foregroundStyle(.red)
            .frame(maxWidth: .infinity)
            .padding(14)
            .background(Color.red.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private var vm: ProfileViewModel {
        if let viewModel { return viewModel }
        let created = ProfileViewModel(instrument: instrument, modelContext: modelContext)
        Task { @MainActor in viewModel = created }
        return created
    }
}
