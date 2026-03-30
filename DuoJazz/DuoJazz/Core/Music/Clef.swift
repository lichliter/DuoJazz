//
//  Clef.swift
//  DuoJazz
//

import Foundation

/// Musical clef for notation display
enum Clef: String, CaseIterable, Sendable, Codable {
    case treble
    case bass
    case alto
    case tenor

    /// VexFlow clef identifier
    var vexflowId: String {
        rawValue
    }

    /// Display name for UI
    var displayName: String {
        switch self {
        case .treble: "Treble"
        case .bass: "Bass"
        case .alto: "Alto"
        case .tenor: "Tenor"
        }
    }

    /// Octave offset from treble clef (in semitones)
    /// Bass instruments play lower, so we transpose down
    var octaveOffset: Int {
        switch self {
        case .treble: 0
        case .bass: -12    // 1 octave down
        case .alto: -12    // 1 octave down
        case .tenor: -12   // 1 octave down
        }
    }

    /// Reference MIDI pitch for middle line of staff
    var middleLineMidi: Int {
        switch self {
        case .treble: 71  // B4
        case .bass: 50    // D3
        case .alto: 60    // C4 (middle C)
        case .tenor: 57   // A3 (middle line), C4 on 4th line
        }
    }

    /// VexFlow key for rest positioning (middle of staff)
    var restPosition: String {
        switch self {
        case .treble: "b/4"  // B4 - middle line of treble
        case .bass: "d/3"    // D3 - middle line of bass
        case .alto: "c/4"    // C4 - middle line of alto
        case .tenor: "a/3"   // A3 - middle line of tenor
        }
    }
}
