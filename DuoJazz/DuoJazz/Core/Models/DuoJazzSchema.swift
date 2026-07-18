//
//  DuoJazzSchema.swift
//  DuoJazz
//

import Foundation
import SwiftData

/// Original on-disk shape before `compositeKey` existed.
enum SchemaV1: VersionedSchema {
    static var versionIdentifier = Schema.Version(1, 0, 0)

    static var models: [any PersistentModel.Type] {
        [
            LickPreference.self,
            UserProfile.self,
            SchemaV1.LickMastery.self,
            LessonPreference.self,
        ]
    }

    @Model
    final class LickMastery {
        var lickId: String
        var keyRawValue: Int
        var highestCardType: Int

        init(lickId: String, keyRawValue: Int, highestCardType: Int = 0) {
            self.lickId = lickId
            self.keyRawValue = keyRawValue
            self.highestCardType = highestCardType
        }
    }
}

/// Current schema with unique `compositeKey` on mastery rows.
enum SchemaV2: VersionedSchema {
    static var versionIdentifier = Schema.Version(2, 0, 0)

    static var models: [any PersistentModel.Type] {
        [
            LickPreference.self,
            UserProfile.self,
            LickMastery.self,
            LessonPreference.self,
        ]
    }
}

private struct MasteryMigrationPayload: Codable {
    var lickId: String
    var keyRawValue: Int
    var highestCardType: Int
}

enum DuoJazzMigrationPlan: SchemaMigrationPlan {
    static var schemas: [any VersionedSchema.Type] {
        [SchemaV1.self, SchemaV2.self]
    }

    static var stages: [MigrationStage] {
        [migrateV1toV2]
    }

    private static let backupKey = "duojazz.migration.v1toV2.mastery"

    static let migrateV1toV2 = MigrationStage.custom(
        fromVersion: SchemaV1.self,
        toVersion: SchemaV2.self,
        willMigrate: { context in
            // Remove old rows before the required compositeKey column is added —
            // lightweight migration cannot invent values for a mandatory unique String.
            let existing = try context.fetch(FetchDescriptor<SchemaV1.LickMastery>())
            let payload = existing.map {
                MasteryMigrationPayload(
                    lickId: $0.lickId,
                    keyRawValue: $0.keyRawValue,
                    highestCardType: $0.highestCardType
                )
            }
            UserDefaults.standard.set(try JSONEncoder().encode(payload), forKey: backupKey)
            for item in existing {
                context.delete(item)
            }
            try context.save()
        },
        didMigrate: { context in
            defer { UserDefaults.standard.removeObject(forKey: backupKey) }
            guard let data = UserDefaults.standard.data(forKey: backupKey) else { return }
            let payload = try JSONDecoder().decode([MasteryMigrationPayload].self, from: data)
            for item in payload {
                context.insert(
                    LickMastery(
                        lickId: item.lickId,
                        keyRawValue: item.keyRawValue,
                        highestCardType: item.highestCardType
                    )
                )
            }
            try context.save()
        }
    )
}
