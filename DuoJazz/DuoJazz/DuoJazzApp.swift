//
//  DuoJazzApp.swift
//  DuoJazz
//
//  Created by Brian Lichliter on 1/6/26.
//

import SwiftUI
import SwiftData

@main
struct DuoJazzApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: [LickPreference.self, UserProfile.self, LickMastery.self, LessonPreference.self])
    }
}
