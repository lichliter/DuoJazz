//
//  MasteryStoreTests.swift
//  DuoJazzTests
//

import SwiftData
import Testing
@testable import DuoJazz

@Suite("MasteryStore")
struct MasteryStoreTests {

    private func makeStore() throws -> MasteryStore {
        let schema = Schema([LickMastery.self])
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        let container = try ModelContainer(for: schema, configurations: config)
        return MasteryStore(context: container.mainContext)
    }

    @Test("Bronze medal at 1 completed key")
    func bronzeMedal() throws {
        let store = try makeStore()
        store.complete(cardType: .listen, for: "lick-1", in: .c)
        #expect(store.medal(for: "lick-1") == .bronze)
        #expect(store.completedKeyCount(for: "lick-1") == 1)
    }

    @Test("Silver medal at 6 completed keys")
    func silverMedal() throws {
        let store = try makeStore()
        let keys: [Key] = [.c, .f, .aSharp, .dSharp, .gSharp, .cSharp]
        for key in keys {
            store.complete(cardType: .listen, for: "lick-1", in: key)
        }
        #expect(store.medal(for: "lick-1") == .silver)
        #expect(store.completedKeyCount(for: "lick-1") == 6)
    }

    @Test("Gold medal at 12 completed keys")
    func goldMedal() throws {
        let store = try makeStore()
        for key in Key.allCases {
            store.complete(cardType: .listen, for: "lick-1", in: key)
        }
        #expect(store.medal(for: "lick-1") == .gold)
        #expect(store.completedKeyCount(for: "lick-1") == 12)
    }

    @Test("Card level only advances forward")
    func levelMonotonic() throws {
        let store = try makeStore()
        store.complete(cardType: .play, for: "lick-1", in: .d)
        store.complete(cardType: .learn, for: "lick-1", in: .d)
        #expect(store.level(for: "lick-1", in: .d) == .play)
    }

    @Test("Key status reflects progress")
    func keyStatus() throws {
        let store = try makeStore()
        #expect(store.keyStatus(for: "lick-1", key: .g) == .notStarted)

        store.complete(cardType: .learn, for: "lick-1", in: .g)
        #expect(store.keyStatus(for: "lick-1", key: .g) == .inProgress)

        store.complete(cardType: .listen, for: "lick-1", in: .g)
        #expect(store.keyStatus(for: "lick-1", key: .g) == .completed)
    }
}
