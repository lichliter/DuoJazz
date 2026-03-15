//
//  ProfileView.swift
//  DuoJazz
//

import SwiftUI

struct ProfileView: View {
    @State private var viewModel = ProfileViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 28) {
                HStack(spacing: 24) {
                    MasteryRing(percentage: viewModel.masteryPercentage)
                    InstrumentCard(
                        instrument: viewModel.instrument,
                        transposition: viewModel.transpositionDisplay
                    )
                }

                MasteryBreakdownRow(breakdown: viewModel.masteryBreakdown)

                StreakCard(count: viewModel.streakCount)
            }
            .padding(.horizontal, 40)
            .padding(.vertical, 16)
        }
        .background(Color(hex: 0x0F0A1E))
        .navigationTitle("Profile")
    }
}
