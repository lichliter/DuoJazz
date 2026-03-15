//
//  ProfileViewModel.swift
//  DuoJazz
//

import Foundation

@Observable
class ProfileViewModel {
    var instrument = "Alto Saxophone"
    var transposition: Key = .dSharp // Eb
    var streakCount = 5

    // Stub mastery data — will come from SwiftData in Phase 7
    let masteryBreakdown: [(MasteryState, Int)] = [
        (.legendary, 4),
        (.mastered, 8),
        (.learning, 7),
        (.locked, 81),
    ]

    var totalLicks: Int { masteryBreakdown.reduce(0) { $0 + $1.1 } }
    var masteredCount: Int { masteryBreakdown.filter { $0.0 == .mastered || $0.0 == .legendary }.reduce(0) { $0 + $1.1 } }
    var masteryPercentage: Int { totalLicks > 0 ? (masteredCount * 100) / totalLicks : 0 }

    var transpositionDisplay: String {
        KeyOption.allOptions.first { $0.key == transposition }?.displayName ?? "C"
    }
}
