//
//  MasteryState.swift
//  DuoJazz
//

import SwiftUI

/// Mastery progression for a lick
enum MasteryState: String, Sendable, Codable, CaseIterable {
    case locked
    case learning
    case mastered
    case legendary

    var displayName: String {
        switch self {
        case .locked: "Locked"
        case .learning: "Learning"
        case .mastered: "Mastered"
        case .legendary: "Legendary"
        }
    }

    var color: Color {
        switch self {
        case .locked: Color(hex: 0x9CA3AF)
        case .learning: Color(hex: 0x3B82F6)
        case .mastered: Color(hex: 0xF59E0B)
        case .legendary: Color(hex: 0x8B5CF6)
        }
    }

    var iconName: String {
        switch self {
        case .locked: "lock"
        case .learning: "book"
        case .mastered: "star.fill"
        case .legendary: "crown.fill"
        }
    }
}

extension Color {
    init(hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: alpha
        )
    }
}
