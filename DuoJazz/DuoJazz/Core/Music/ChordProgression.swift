//
//  ChordProgression.swift
//  DuoJazz
//

import Foundation

/// A sequence of chord symbols for a lick
struct ChordProgression: Sendable, Hashable {
    let symbols: [ChordSymbol]

    /// Get chord data formatted for VexFlow rendering
    /// - Parameter keyOption: The key to transpose to
    /// - Returns: Array of dictionaries with text and beat info
    func chordData(in keyOption: KeyOption) -> [[String: Any]] {
        symbols.map { symbol in
            [
                "text": symbol.displayText(in: keyOption),
                "beat": symbol.startBeat
            ] as [String: Any]
        }
    }

    // MARK: - Factory Methods for Common Progressions

    /// Short ii-V-I progression (2 bars)
    /// - Beat 1-2: ii-7
    /// - Beat 3-4: V7
    /// - Beat 5-8: Imaj7
    static let shortIIVI = ChordProgression(symbols: [
        ChordSymbol(degree: 2, quality: .minor7, startBeat: 1.0, durationBeats: 2.0),
        ChordSymbol(degree: 5, quality: .dominant7, startBeat: 3.0, durationBeats: 2.0),
        ChordSymbol(degree: 1, quality: .major7, startBeat: 5.0, durationBeats: 4.0)
    ])

    /// Long ii-V-I progression (4 bars)
    /// - Bar 1: ii-7
    /// - Bar 2: V7
    /// - Bar 3-4: Imaj7
    static let longIIVI = ChordProgression(symbols: [
        ChordSymbol(degree: 2, quality: .minor7, startBeat: 1.0, durationBeats: 4.0),
        ChordSymbol(degree: 5, quality: .dominant7, startBeat: 5.0, durationBeats: 4.0),
        ChordSymbol(degree: 1, quality: .major7, startBeat: 9.0, durationBeats: 8.0)
    ])

    /// I-vi-ii-V turnaround (2 bars)
    static let turnaround = ChordProgression(symbols: [
        ChordSymbol(degree: 1, quality: .major7, startBeat: 1.0, durationBeats: 2.0),
        ChordSymbol(degree: 6, quality: .minor7, startBeat: 3.0, durationBeats: 2.0),
        ChordSymbol(degree: 2, quality: .minor7, startBeat: 5.0, durationBeats: 2.0),
        ChordSymbol(degree: 5, quality: .dominant7, startBeat: 7.0, durationBeats: 2.0)
    ])
}
