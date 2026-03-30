//
//  LickGrid.swift
//  DuoJazz
//

import SwiftUI

struct LickGrid: View {
    let licks: [Lick]

    private let columns = [
        GridItem(.adaptive(minimum: 280, maximum: 400), spacing: 20)
    ]

    var body: some View {
        if licks.isEmpty {
            ContentUnavailableView(
                "No licks found",
                systemImage: "music.note",
                description: Text("Try adjusting your search or filters")
            )
        } else {
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(licks) { lick in
                    NavigationLink(destination: LickDetailView(lick: lick)) {
                        LickCardView(lick: lick)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}
