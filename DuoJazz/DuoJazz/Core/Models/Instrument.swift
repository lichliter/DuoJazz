//
//  Instrument.swift
//  DuoJazz
//

import SwiftUI

struct Instrument: Identifiable, Hashable, Sendable, Codable {
    let id: String
    let name: String
    let transposition: Key
    let rangeLow: Int       // Lowest comfortable MIDI note (concert pitch)
    let rangeHigh: Int      // Highest comfortable MIDI note (concert pitch)
    let defaultClef: Clef

    var rangeMidpoint: Int { (rangeLow + rangeHigh) / 2 }

    /// Compute the best octave offset so the lick sits in the instrument's comfortable range
    func recommendedOctaveOffset(for lick: Lick, in key: Key) -> Int {
        let pitches = lick.pitches(in: key)
        guard let low = pitches.min(), let high = pitches.max() else { return 0 }
        let lickMid = (low + high) / 2
        let rawOffset = Double(rangeMidpoint - lickMid) / 12.0
        return Int(rawOffset.rounded())
    }

    /// Convert written key (what the player reads) to concert key (what sounds)
    /// Alto sax (Eb): written C → concert Eb
    func concertKey(from writtenKey: Key) -> Key {
        Key(rawValue: (writtenKey.rawValue + transposition.rawValue) % 12) ?? writtenKey
    }

    /// Convert concert key to written key (what the player reads)
    /// Alto sax (Eb): concert C → written A
    func writtenKey(from concertKey: Key) -> Key {
        Key(rawValue: (concertKey.rawValue - transposition.rawValue + 12) % 12) ?? concertKey
    }

    /// MIDI pitch offset from written to concert pitch.
    /// Bb instruments (transposition > 6) sound LOWER than written.
    /// Eb instruments (transposition <= 6) sound HIGHER than written.
    /// Examples: Bb trumpet = -2, Eb alto sax = +3, C piano = 0
    var concertMidiOffset: Int {
        transposition.rawValue > 6 ? transposition.rawValue - 12 : transposition.rawValue
    }

    /// Check if a lick (with offset) falls within playable range
    func isInRange(lick: Lick, in key: Key, octaveOffset: Int) -> Bool {
        let pitches = lick.pitches(in: key).map { $0 + (octaveOffset * 12) }
        guard let low = pitches.min(), let high = pitches.max() else { return true }
        return low >= rangeLow && high <= rangeHigh
    }
}

// MARK: - Built-in Presets

extension Instrument {
    static let altoSax = Instrument(
        id: "alto-sax", name: "Alto Saxophone",
        transposition: .dSharp, rangeLow: 49, rangeHigh: 80, defaultClef: .treble
    )
    static let tenorSax = Instrument(
        id: "tenor-sax", name: "Tenor Saxophone",
        transposition: .aSharp, rangeLow: 44, rangeHigh: 76, defaultClef: .treble
    )
    static let trumpet = Instrument(
        id: "trumpet", name: "Trumpet",
        transposition: .aSharp, rangeLow: 52, rangeHigh: 84, defaultClef: .treble
    )
    static let trombone = Instrument(
        id: "trombone", name: "Trombone",
        transposition: .c, rangeLow: 40, rangeHigh: 72, defaultClef: .bass
    )
    static let flute = Instrument(
        id: "flute", name: "Flute",
        transposition: .c, rangeLow: 60, rangeHigh: 96, defaultClef: .treble
    )
    static let clarinet = Instrument(
        id: "clarinet", name: "Clarinet",
        transposition: .aSharp, rangeLow: 50, rangeHigh: 91, defaultClef: .treble
    )
    static let piano = Instrument(
        id: "piano", name: "Piano",
        transposition: .c, rangeLow: 21, rangeHigh: 108, defaultClef: .treble
    )
    static let guitar = Instrument(
        id: "guitar", name: "Guitar",
        transposition: .c, rangeLow: 40, rangeHigh: 76, defaultClef: .treble
    )
    static let englishHorn = Instrument(
        id: "english-horn", name: "English Horn",
        transposition: .f, rangeLow: 52, rangeHigh: 81, defaultClef: .treble
    )
    static let altoFlute = Instrument(
        id: "alto-flute", name: "Alto Flute",
        transposition: .g, rangeLow: 55, rangeHigh: 91, defaultClef: .treble
    )

    static let allPresets: [Instrument] = [
        .altoSax, .tenorSax, .trumpet, .trombone, .flute, .altoFlute, .clarinet, .englishHorn, .piano, .guitar
    ]

    static func preset(for id: String) -> Instrument {
        allPresets.first { $0.id == id } ?? .piano
    }
}

// MARK: - Environment Key

private struct InstrumentKey: EnvironmentKey {
    static let defaultValue: Instrument = .piano
}

extension EnvironmentValues {
    var instrument: Instrument {
        get { self[InstrumentKey.self] }
        set { self[InstrumentKey.self] = newValue }
    }
}
