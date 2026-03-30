//
//  Pitch.swift
//  DuoJazz
//

import Foundation

/// Represents a musical pitch using MIDI note numbers (0-127, where 60 = middle C)
struct Pitch: Hashable, Sendable {
    let midi: Int

    var noteName: NoteName {
        NoteName(rawValue: midi % 12) ?? .c
    }

    var octave: Int {
        (midi / 12) - 1
    }

    /// Display string like "C4", "Eb4", "F#5"
    var displayName: String {
        "\(noteName.displayString)\(octave)"
    }

    func transposed(by semitones: Int) -> Pitch {
        Pitch(midi: midi + semitones)
    }
}

/// Note names within an octave
enum NoteName: Int, CaseIterable, Sendable {
    case c = 0
    case cSharp = 1
    case d = 2
    case dSharp = 3
    case e = 4
    case f = 5
    case fSharp = 6
    case g = 7
    case gSharp = 8
    case a = 9
    case aSharp = 10
    case b = 11

    var displayString: String {
        switch self {
        case .c: "C"
        case .cSharp: "C#"
        case .d: "D"
        case .dSharp: "Eb"
        case .e: "E"
        case .f: "F"
        case .fSharp: "F#"
        case .g: "G"
        case .gSharp: "G#"
        case .a: "A"
        case .aSharp: "Bb"
        case .b: "B"
        }
    }
}
