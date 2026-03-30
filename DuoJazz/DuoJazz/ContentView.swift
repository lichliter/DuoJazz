//
//  ContentView.swift
//  DuoJazz
//

import SwiftUI
import SwiftData

struct ContentView: View {
    @Query private var profiles: [UserProfile]

    private var instrument: Instrument {
        profiles.first?.instrument ?? .altoSax
    }

    @State private var selectedTab = "practice"

    var body: some View {
        TabView(selection: $selectedTab) {
            Tab("Licktionary", systemImage: "magnifyingglass", value: "licktionary") {
                NavigationStack {
                    LicktionaryView()
                }
            }

            Tab("Lessons", systemImage: "music.note.list", value: "practice") {
                NavigationStack {
                    DiscoverView()
                }
            }

            Tab("Profile", systemImage: "person.circle", value: "profile") {
                NavigationStack {
                    ProfileView()
                }
            }
        }
        .tint(Color(hex: 0x8B5CF6))
        .preferredColorScheme(.dark)
        .environment(\.instrument, instrument)
    }
}

#Preview {
    ContentView()
}
