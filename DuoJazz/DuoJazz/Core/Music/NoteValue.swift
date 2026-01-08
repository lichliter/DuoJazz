//
//  NoteValue.swift
//  DuoJazz
//

import Foundation

/// Rhythmic value of a note - source of truth for both playback timing and notation rendering
indirect enum NoteValue: Hashable, Sendable {
    case whole
    case half
    case quarter
    case eighth
    case sixteenth
    case dotted(NoteValue)
    case triplet(NoteValue)

    /// Duration in beats (quarter note = 1.0)
    var beats: Double {
        switch self {
        case .whole: 4.0
        case .half: 2.0
        case .quarter: 1.0
        case .eighth: 0.5
        case .sixteenth: 0.25
        case .dotted(let base): base.beats * 1.5
        case .triplet(let base): base.beats * (2.0 / 3.0)
        }
    }

    /// Display string for UI
    var displayString: String {
        switch self {
        case .whole: "whole"
        case .half: "half"
        case .quarter: "quarter"
        case .eighth: "eighth"
        case .sixteenth: "sixteenth"
        case .dotted(let base): "dotted \(base.displayString)"
        case .triplet(let base): "triplet \(base.displayString)"
        }
    }
}
