//
//  LickPreference.swift
//  DuoJazz
//

import SwiftData

@Model
final class LickPreference {
    @Attribute(.unique) var lickId: String
    var octaveOffset: Int
    var tempo: Int

    init(lickId: String, octaveOffset: Int = 0, tempo: Int = 120) {
        self.lickId = lickId
        self.octaveOffset = octaveOffset
        self.tempo = tempo
    }
}
