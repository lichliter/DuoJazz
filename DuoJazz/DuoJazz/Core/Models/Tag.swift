//
//  Tag.swift
//  DuoJazz
//

import Foundation

/// Categorization tags for licks
enum Tag: String, Hashable, Sendable, CaseIterable, Codable {
    case iiVI = "ii-V-I"
    case blues = "Blues"
    case bebop = "Bebop"
    case turnarounds = "Turnarounds"
    case modal = "Modal"
    case chordTones = "Chord Tones"
    case approachNotes = "Approach Notes"
    case chromaticRuns = "Chromatic"
    case rhythmChanges = "Rhythm Changes"
    case pentatonic = "Pentatonic"
    case dominant = "Dominant"
    case minor = "Minor"

    var displayName: String { rawValue }

    var iconName: String {
        switch self {
        case .iiVI: "arrow.triangle.2.circlepath"
        case .blues: "guitars"
        case .bebop: "bolt"
        case .turnarounds: "arrow.uturn.right"
        case .modal: "square.stack.3d.up"
        case .chordTones: "tuningfork"
        case .approachNotes: "arrow.right.to.line"
        case .chromaticRuns: "stairs"
        case .rhythmChanges: "metronome"
        case .pentatonic: "pentagon"
        case .dominant: "crown"
        case .minor: "moon"
        }
    }
}
