//
//  LickPreferenceStore.swift
//  DuoJazz
//

import Foundation
import os.log
import SwiftData

private let logger = Logger(subsystem: "com.brianlichliter.DuoJazz", category: "LickPreferenceStore")

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
        do {
            try context.save()
        } catch {
            logger.error("Failed to save octave offset for \(lickId): \(error)")
        }
    }

    func tempo(for lickId: String) -> Int? {
        let predicate = #Predicate<LickPreference> { $0.lickId == lickId }
        let descriptor = FetchDescriptor(predicate: predicate)
        guard let pref = try? context.fetch(descriptor).first else { return nil }
        return pref.tempo == 120 ? nil : pref.tempo
    }

    func setTempo(_ tempo: Int, for lickId: String) {
        let pref = preferenceOrCreate(for: lickId)
        pref.tempo = tempo
        do {
            try context.save()
        } catch {
            logger.error("Failed to save tempo for \(lickId): \(error)")
        }
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
