//
//  ChordQuality.swift
//  DuoJazz
//

import Foundation

/// Quality/type of a chord (minor 7th, dominant 7th, etc.)
enum ChordQuality: String, Sendable, CaseIterable {
    case minor7
    case dominant7
    case major7
    case diminished7
    case halfDiminished7
    case minorMajor7

    /// Display suffix for the chord symbol (e.g., "-7", "7", "maj7")
    var displaySuffix: String {
        switch self {
        case .minor7: "-7"
        case .dominant7: "7"
        case .major7: "maj7"
        case .diminished7: "dim7"
        case .halfDiminished7: "ø7"
        case .minorMajor7: "-maj7"
        }
    }

    /// Alternative ASCII-safe suffix for environments that don't support special characters
    var asciiSuffix: String {
        switch self {
        case .minor7: "-7"
        case .dominant7: "7"
        case .major7: "maj7"
        case .diminished7: "dim7"
        case .halfDiminished7: "-7b5"
        case .minorMajor7: "-maj7"
        }
    }
}
