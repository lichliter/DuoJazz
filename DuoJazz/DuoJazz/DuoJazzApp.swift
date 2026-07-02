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
    let container: ModelContainer

    init() {
        do {
            container = try ModelContainer(
                for: LickPreference.self, UserProfile.self, LickMastery.self, LessonPreference.self,
                migrationPlan: DuoJazzMigrationPlan.self
            )
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(container)
    }
}
