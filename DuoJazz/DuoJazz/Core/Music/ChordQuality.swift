//
//  ChordQuality.swift
//  DuoJazz
//

import Foundation

/// Quality/type of a chord (minor 7th, dominant 7th, etc.)
enum ChordQuality: String, Sendable, CaseIterable {
    // Triads
    case major
    case minor
    case diminished

    // Seventh chords
    case minor7
    case dominant7
    case major7
    case diminished7
    case halfDiminished7
    case minorMajor7

    /// Display suffix for the chord symbol (uses superscript minus for minor)
    var displaySuffix: String {
        switch self {
        case .major: ""
        case .minor: "⁻"
        case .diminished: "°"
        case .minor7: "⁻⁷"
        case .dominant7: "⁷"
        case .major7: "ᵐᵃʲ⁷"
        case .diminished7: "°⁷"
        case .halfDiminished7: "ø⁷"
        case .minorMajor7: "⁻ᵐᵃʲ⁷"
        }
    }

    /// Alternative ASCII-safe suffix
    var asciiSuffix: String {
        switch self {
        case .major: ""
        case .minor: "m"
        case .diminished: "dim"
        case .minor7: "-7"
        case .dominant7: "7"
        case .major7: "maj7"
        case .diminished7: "dim7"
        case .halfDiminished7: "-7b5"
        case .minorMajor7: "-maj7"
        }
    }
}
