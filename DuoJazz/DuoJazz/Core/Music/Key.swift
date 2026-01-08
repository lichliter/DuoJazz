//
//  Key.swift
//  DuoJazz
//

import Foundation

/// Musical key for selecting practice key
enum Key: Int, CaseIterable, Sendable {
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

    /// MIDI note number for this key in octave 4 (middle octave)
    var midiRoot: Int {
        60 + rawValue
    }
}

/// A key with its display spelling (handles enharmonic equivalents)
struct KeyOption: Identifiable, Hashable, Sendable {
    let key: Key
    let displayName: String
    let vexflowSignature: String
    let usesFlats: Bool

    var id: String { displayName }

    /// All key options in circle of 4ths order, with enharmonic choices
    static let allOptions: [KeyOption] = [
        // Flat keys (circle of 4ths)
        KeyOption(key: .c, displayName: "C", vexflowSignature: "C", usesFlats: false),
        KeyOption(key: .f, displayName: "F", vexflowSignature: "F", usesFlats: true),
        KeyOption(key: .aSharp, displayName: "Bb", vexflowSignature: "Bb", usesFlats: true),
        KeyOption(key: .dSharp, displayName: "Eb", vexflowSignature: "Eb", usesFlats: true),
        KeyOption(key: .gSharp, displayName: "Ab", vexflowSignature: "Ab", usesFlats: true),
        KeyOption(key: .cSharp, displayName: "Db", vexflowSignature: "Db", usesFlats: true),
        KeyOption(key: .fSharp, displayName: "Gb", vexflowSignature: "Gb", usesFlats: true),
        // Sharp keys (circle of 5ths)
        KeyOption(key: .fSharp, displayName: "F#", vexflowSignature: "F#", usesFlats: false),
        KeyOption(key: .cSharp, displayName: "C#", vexflowSignature: "C#", usesFlats: false),
        KeyOption(key: .b, displayName: "B", vexflowSignature: "B", usesFlats: false),
        KeyOption(key: .e, displayName: "E", vexflowSignature: "E", usesFlats: false),
        KeyOption(key: .a, displayName: "A", vexflowSignature: "A", usesFlats: false),
        KeyOption(key: .d, displayName: "D", vexflowSignature: "D", usesFlats: false),
        KeyOption(key: .g, displayName: "G", vexflowSignature: "G", usesFlats: false),
    ]

    static let `default` = allOptions[0] // C
}
