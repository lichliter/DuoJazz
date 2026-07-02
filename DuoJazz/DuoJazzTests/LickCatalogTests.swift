//
//  LickCatalogTests.swift
//  DuoJazzTests
//

import Testing
@testable import DuoJazz

@MainActor
@Suite("LickCatalog")
struct LickCatalogTests {

    @Test("Lookup by id returns matching lick")
    func lookupById() {
        let catalog = TestFixtures.sampleCatalog
        #expect(catalog.lick(withId: "alpha")?.name == "Alpha Blues")
        #expect(catalog.lick(withId: "missing") == nil)
    }

    @Test("Filter by tag")
    func filterByTag() {
        let catalog = TestFixtures.sampleCatalog
        let blues = catalog.licks(withTag: .blues)
        #expect(blues.count == 1)
        #expect(blues[0].id == "alpha")

        let bebop = catalog.licks(withTag: .bebop)
        #expect(bebop.count == 1)
        #expect(bebop[0].id == "beta")
    }

    @Test("Search matches name and tags")
    func search() {
        let catalog = TestFixtures.sampleCatalog
        #expect(catalog.search("alpha").count == 1)
        #expect(catalog.search("bebop").count == 1)
        #expect(catalog.search("ii-v-i").count == 1)
        #expect(catalog.search("zzzzz").isEmpty)
    }

    @Test("Shared catalog contains built-in licks")
    func sharedCatalog() {
        let catalog = LickCatalog.shared
        #expect(catalog.allLicks.count >= 26)
        #expect(catalog.lick(withId: "short-ii-v-i") != nil)
        #expect(catalog.allTags.contains(.iiVI))
    }

    @Test("Licks are sorted alphabetically by name")
    func sortedByName() {
        let catalog = TestFixtures.sampleCatalog
        let names = catalog.allLicks.map(\.name)
        #expect(names == names.sorted())
    }
}
