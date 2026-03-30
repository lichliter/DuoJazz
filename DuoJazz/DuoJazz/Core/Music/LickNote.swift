//
//  LickNote.swift
//  DuoJazz
//

import Foundation

/// An element in a lick — either a note or a rest
enum LickElement: Hashable, Sendable {
    /// A pitched note: interval in semitones from root
    case note(interval: Int, value: NoteValue)
    /// A rest
    case rest(value: NoteValue)

    var value: NoteValue {
        switch self {
        case .note(_, let v), .rest(let v): v
        }
    }

    var durationBeats: Double { value.beats }

    var isNote: Bool {
        if case .note = self { return true }
        return false
    }

    var interval: Int? {
        if case .note(let i, _) = self { return i }
        return nil
    }

    /// Convert to absolute MIDI pitch given a root note
    func midiPitch(root: Int) -> Int? {
        guard let interval else { return nil }
        return root + interval
    }
}

// MARK: - Convenience initializers

/// Shorthand for creating notes
func N(_ interval: Int, _ value: NoteValue = .eighth) -> LickElement {
    .note(interval: interval, value: value)
}

/// Shorthand for creating rests
func R(_ value: NoteValue = .quarter) -> LickElement {
    .rest(value: value)
}
