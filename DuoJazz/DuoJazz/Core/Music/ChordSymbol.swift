//
//  ChordSymbol.swift
//  DuoJazz
//

import Foundation

/// A chord symbol with scale degree, quality, and timing
struct ChordSymbol: Sendable, Hashable {
    /// Scale degree (1-7) - 1=I, 2=ii, 3=iii, 4=IV, 5=V, 6=vi, 7=vii
    let degree: Int

    /// Chord quality (minor7, dominant7, major7, etc.)
    let quality: ChordQuality

    /// Beat where this chord starts (1-indexed)
    let startBeat: Double

    /// Duration in beats
    let durationBeats: Double

    /// Semitone interval from root for each scale degree
    private static let degreeIntervals: [Int: Int] = [
        1: 0,   // I - root
        2: 2,   // ii - major 2nd
        3: 4,   // iii - major 3rd
        4: 5,   // IV - perfect 4th
        5: 7,   // V - perfect 5th
        6: 9,   // vi - major 6th
        7: 11   // vii - major 7th
    ]

    /// Functional harmony display (e.g., "ii-7", "V7", "Imaj7")
    var functionalText: String {
        let numeral: String = switch degree {
        case 1: "I"
        case 2: "ii"
        case 3: "iii"
        case 4: "IV"
        case 5: "V"
        case 6: "vi"
        case 7: "vii"
        default: "\(degree)"
        }
        return numeral + quality.displaySuffix
    }

    /// Get the root note name for this chord in the given key
    /// - Parameter keyOption: The key to transpose to
    /// - Returns: Root note name (e.g., "C", "Bb", "F#")
    func rootName(in keyOption: KeyOption) -> String {
        let interval = Self.degreeIntervals[degree] ?? 0
        let rootMidi = keyOption.key.midiRoot + interval
        let pitchClass = rootMidi % 12

        // Use the key's preference for flats/sharps
        return pitchClassName(pitchClass, usesFlats: keyOption.usesFlats)
    }

    /// Get the full display text for this chord (e.g., "C-7", "F7", "Bbmaj7")
    /// - Parameter keyOption: The key to transpose to
    /// - Returns: Full chord symbol text
    func displayText(in keyOption: KeyOption) -> String {
        rootName(in: keyOption) + quality.displaySuffix
    }

    /// Convert pitch class (0-11) to note name
    private func pitchClassName(_ pitchClass: Int, usesFlats: Bool) -> String {
        let sharpNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
        let flatNames = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

        let normalizedPitch = ((pitchClass % 12) + 12) % 12
        return usesFlats ? flatNames[normalizedPitch] : sharpNames[normalizedPitch]
    }
}
