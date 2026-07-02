//
//  LickCardPreferences.swift
//  DuoJazz
//

import SwiftData

enum LickCardPreferences {
    static func octaveOffset(
        for lick: Lick,
        in key: Key,
        instrument: Instrument,
        context: ModelContext
    ) -> Int {
        let store = LickPreferenceStore(context: context)
        if let saved = store.octaveOffset(for: lick.id) {
            return saved
        }
        return instrument.recommendedOctaveOffset(for: lick, in: key)
    }

    static func saveOctaveOffset(_ offset: Int, for lickId: String, context: ModelContext) {
        LickPreferenceStore(context: context).setOctaveOffset(offset, for: lickId)
    }
}
