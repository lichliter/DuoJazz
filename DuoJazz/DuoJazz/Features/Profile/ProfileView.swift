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

                MedalSummaryCard(summary: medalSummary)
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
    }

    private var vm: ProfileViewModel {
        if let viewModel { return viewModel }
        let created = ProfileViewModel(instrument: instrument)
        Task { @MainActor in viewModel = created }
        return created
    }
}
