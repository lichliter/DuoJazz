//
//  ProfileViewModel.swift
//  DuoJazz
//

import Foundation
import SwiftData

@Observable
class ProfileViewModel {
    var selectedInstrument: Instrument
    private let modelContext: ModelContext

    var masteryBreakdown: [(MasteryState, Int)] {
        let store = MasteryStore(context: modelContext)
        let lickIds = LickCatalog.shared.allLicks.map(\.id)
        return store.masteryBreakdown(lickIds: lickIds)
    }

    var totalLicks: Int { LickCatalog.shared.allLicks.count }

    var masteredCount: Int {
        masteryBreakdown
            .filter { $0.0 == .mastered || $0.0 == .legendary }
            .reduce(0) { $0 + $1.1 }
    }

    var masteryPercentage: Int {
        totalLicks > 0 ? (masteredCount * 100) / totalLicks : 0
    }

    var transpositionDisplay: String {
        KeyOption.allOptions.first { $0.key == selectedInstrument.transposition }?.displayName ?? "C"
    }

    init(instrument: Instrument = .altoSax, modelContext: ModelContext) {
        self.selectedInstrument = instrument
        self.modelContext = modelContext
    }

    func updateInstrument(_ instrument: Instrument, profile: UserProfile) {
        selectedInstrument = instrument
        profile.instrumentId = instrument.id
    }

    func resetAllProgress() {
        MasteryStore(context: modelContext).deleteAll()
        ModuleProgressStore(context: modelContext).deleteAll()
    }
}
