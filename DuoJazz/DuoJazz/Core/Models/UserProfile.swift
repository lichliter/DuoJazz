//
//  UserProfile.swift
//  DuoJazz
//

import SwiftData

@Model
final class UserProfile {
    var instrumentId: String
    var autoRecord: Bool

    init(instrumentId: String = "piano", autoRecord: Bool = false) {
        self.instrumentId = instrumentId
        self.autoRecord = autoRecord
    }

    var instrument: Instrument {
        Instrument.preset(for: instrumentId)
    }
}
