//
//  ContentView.swift
//  DuoJazz
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            Tab("Licktionary", systemImage: "magnifyingglass") {
                NavigationStack {
                    LicktionaryView()
                }
            }

            Tab("Discover", systemImage: "safari") {
                NavigationStack {
                    DiscoverView()
                }
            }

            Tab("Library", systemImage: "rectangle.stack") {
                NavigationStack {
                    LibraryHomeView()
                }
            }

            Tab("Profile", systemImage: "person.circle") {
                NavigationStack {
                    ProfileView()
                }
            }
        }
        .tint(Color(hex: 0x8B5CF6))
        .preferredColorScheme(.dark)
    }
}

#Preview {
    ContentView()
}
