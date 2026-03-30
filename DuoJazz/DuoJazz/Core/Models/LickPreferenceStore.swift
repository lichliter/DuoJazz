//
//  LickPreferenceStore.swift
//  DuoJazz
//

import Foundation
import SwiftData

struct LickPreferenceStore {
    let context: ModelContext

    func octaveOffset(for lickId: String) -> Int? {
        let predicate = #Predicate<LickPreference> { $0.lickId == lickId }
        let descriptor = FetchDescriptor(predicate: predicate)
        return try? context.fetch(descriptor).first?.octaveOffset
    }

    func setOctaveOffset(_ offset: Int, for lickId: String) {
        let pref = preferenceOrCreate(for: lickId)
        pref.octaveOffset = offset
        try? context.save()
    }

    func tempo(for lickId: String) -> Int? {
        let predicate = #Predicate<LickPreference> { $0.lickId == lickId }
        let descriptor = FetchDescriptor(predicate: predicate)
        guard let pref = try? context.fetch(descriptor).first else { return nil }
        return pref.tempo == 120 ? nil : pref.tempo // nil means "use default"
    }

    func setTempo(_ tempo: Int, for lickId: String) {
        let pref = preferenceOrCreate(for: lickId)
        pref.tempo = tempo
        try? context.save()
    }

    private func preferenceOrCreate(for lickId: String) -> LickPreference {
        let predicate = #Predicate<LickPreference> { $0.lickId == lickId }
        let descriptor = FetchDescriptor(predicate: predicate)
        if let existing = try? context.fetch(descriptor).first {
            return existing
        }
        let new = LickPreference(lickId: lickId)
        context.insert(new)
        return new
    }
}
