//
//  LibraryView.swift
//  DuoJazz
//

import SwiftUI

struct LibraryView: View {
    let licks = BuiltInLicks.all

    var body: some View {
        List(licks) { lick in
            NavigationLink(destination: LickDetailView(lick: lick)) {
                LickRow(lick: lick)
            }
        }
        .navigationTitle("Licktionary")
    }
}

struct LickRow: View {
    let lick: Lick

    var body: some View {
        HStack(spacing: 12) {
            // Icon
            Image(systemName: "music.note.list")
                .font(.title2)
                .foregroundStyle(.blue)
                .frame(width: 40)

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(lick.name)
                    .font(.headline)

                HStack(spacing: 8) {
                    Label(lick.category, systemImage: "tag")
                    Label("All keys", systemImage: "music.note")
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Spacer()

            // Note count badge
            Text("\(lick.noteCount) notes")
                .font(.caption)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(.blue.opacity(0.1))
                .clipShape(Capsule())
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    NavigationStack {
        LibraryView()
    }
}
