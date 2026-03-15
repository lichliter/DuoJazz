//
//  Difficulty.swift
//  DuoJazz
//

import SwiftUI

/// Difficulty level for a collection
enum Difficulty: String, Sendable, Codable, CaseIterable {
    case beginner
    case intermediate
    case advanced

    var displayName: String {
        switch self {
        case .beginner: "Beginner"
        case .intermediate: "Intermediate"
        case .advanced: "Advanced"
        }
    }

    var color: Color {
        switch self {
        case .beginner: Color(hex: 0x22C55E)
        case .intermediate: Color(hex: 0xF59E0B)
        case .advanced: Color(hex: 0xEF4444)
        }
    }
}
