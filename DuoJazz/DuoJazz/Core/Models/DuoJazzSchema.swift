//
//  DuoJazzSchema.swift
//  DuoJazz
//

import SwiftData

enum SchemaV1: VersionedSchema {
    static var versionIdentifier = Schema.Version(1, 0, 0)

    static var models: [any PersistentModel.Type] {
        [
            LickPreference.self,
            UserProfile.self,
            LickMastery.self,
            LessonPreference.self,
        ]
    }
}

enum DuoJazzMigrationPlan: SchemaMigrationPlan {
    static var schemas: [any VersionedSchema.Type] {
        [SchemaV1.self]
    }

    static var stages: [MigrationStage] {
        []
    }
}
