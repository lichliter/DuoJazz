//
//  TestFixtures.swift
//  DuoJazzTests
//

import Foundation
@testable import DuoJazz

enum TestFixtures {
    static let simpleLick = Lick(
        id: "test-simple",
        name: "Simple C Major",
        tags: [.iiVI],
        timeSignature: (4, 4),
        elements: [N(0), N(4), N(7), N(12, .half)]
    )

    static let restLick = Lick(
        id: "test-rest",
        name: "With Rest",
        tags: [.blues],
        timeSignature: (4, 4),
        elements: [N(0), R(.quarter), N(4, .quarter)]
    )

    static let tripleTimeLick = Lick(
        id: "test-3-4",
        name: "Waltz",
        tags: [.iiVI],
        timeSignature: (3, 4),
        elements: [N(0, .quarter), N(4, .quarter), N(7, .quarter)]
    )

    static let sampleCatalog = LickCatalog(licks: [
        Lick(id: "alpha", name: "Alpha Blues", tags: [.blues], elements: [N(0), N(4)]),
        Lick(id: "beta", name: "Beta Bebop", tags: [.bebop], elements: [N(2), N(4)]),
        Lick(id: "gamma", name: "Gamma ii-V-I", tags: [.iiVI, .chordTones], elements: [N(0), N(7)]),
    ])
}
