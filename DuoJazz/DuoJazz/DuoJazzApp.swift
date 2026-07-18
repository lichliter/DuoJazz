//
//  DuoJazzApp.swift
//  DuoJazz
//
//  Created by Brian Lichliter on 1/6/26.
//

import SwiftUI
import SwiftData
import os.log

private let logger = Logger(subsystem: "com.brianlichliter.DuoJazz", category: "App")

@main
struct DuoJazzApp: App {
    let container: ModelContainer

    init() {
        container = Self.makeContainer()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(container)
    }

    private static func makeContainer() -> ModelContainer {
        do {
            return try ModelContainer(
                for: LickPreference.self, UserProfile.self, LickMastery.self, LessonPreference.self,
                migrationPlan: DuoJazzMigrationPlan.self
            )
        } catch {
            logger.error("ModelContainer migration failed, resetting store: \(error)")
            deleteSwiftDataStores()
            do {
                return try ModelContainer(
                    for: LickPreference.self, UserProfile.self, LickMastery.self, LessonPreference.self,
                    migrationPlan: DuoJazzMigrationPlan.self
                )
            } catch {
                fatalError("Could not create ModelContainer after reset: \(error)")
            }
        }
    }

    private static func deleteSwiftDataStores() {
        let fm = FileManager.default
        var directories: [URL] = []

        if let appSupport = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask).first {
            directories.append(appSupport)
        }
        if let groupURL = fm.containerURL(
            forSecurityApplicationGroupIdentifier: StreakSharedData.appGroupID
        ) {
            directories.append(groupURL.appendingPathComponent("Library/Application Support"))
        }

        for directory in directories {
            guard let files = try? fm.contentsOfDirectory(
                at: directory,
                includingPropertiesForKeys: nil
            ) else { continue }

            for file in files where file.lastPathComponent.hasPrefix("default.store") {
                try? fm.removeItem(at: file)
            }
        }
    }
}
