//
//  ABCConverter.swift
//  DuoJazz
//

import Foundation

/// Converts Lick data to ABC notation strings for rendering with abcjs
enum ABCConverter {

    static func toABC(
        lick: Lick,
        keyOption: KeyOption,
        clef: Clef,
        octaveOffset: Int
    ) -> String {
        let keyName = keyOption.displayName
        let clefStr = abcClef(for: clef)

        var abc = "X:1\nL:1/8\nK:\(keyName) \(clefStr)\n"

        let beatsPerMeasure = Double(lick.timeSignature.beats)
        var currentBeat = 0.0
        var eighthCount = 0  // Track eighth notes for beam grouping
        var tripletCount = 0

        // Build chord map from beat positions (1-based)
        var chordMap: [Double: String] = [:]
        if let progression = lick.chordProgression {
            for symbol in progression.symbols {
                chordMap[symbol.startBeat] = symbol.displayText(in: keyOption)
            }
        }

        for element in lick.elements {
            let beat1Based = currentBeat + 1.0  // Convert to 1-based for chord lookup

            // Barline check
            let measureBefore = Int(currentBeat / beatsPerMeasure)
            let measureAfter = Int((currentBeat + element.durationBeats) / beatsPerMeasure)
            if currentBeat > 0 && measureBefore > Int((currentBeat - 0.01) / beatsPerMeasure) {
                abc += " | "
                eighthCount = 0
            }

            // Beam grouping: space every 4 eighth notes (2 beats)
            let beamGroup = Int(currentBeat.truncatingRemainder(dividingBy: beatsPerMeasure) / 2.0)
            if eighthCount > 0 && element.value == .eighth {
                let prevBeamGroup = Int(((currentBeat - 0.01).truncatingRemainder(dividingBy: beatsPerMeasure)) / 2.0)
                if beamGroup != prevBeamGroup {
                    abc += " "
                }
            }

            // Chord symbol
            if let chordText = chordMap[beat1Based] {
                abc += "\"\(chordText)\""
            }

            // Triplet marker
            if case .triplet = element.value {
                if tripletCount % 3 == 0 {
                    abc += "(3"
                }
                tripletCount += 1
            } else {
                tripletCount = 0
            }

            switch element {
            case .note(let interval, let value):
                let midi = keyOption.key.midiRoot + interval + (octaveOffset * 12)
                abc += abcNoteName(midi: midi, key: keyOption.key, usesFlats: keyOption.usesFlats)
                abc += abcDuration(for: value)
                if value == .eighth { eighthCount += 1 }

            case .rest(let value):
                abc += "z" + abcDuration(for: value)
            }

            currentBeat += element.durationBeats
        }

        abc += " |]\n"
        return abc
    }

    private static func abcNoteName(midi: Int, key: Key, usesFlats: Bool) -> String {
        let pitchClass = ((midi % 12) + 12) % 12
        let octave = (midi / 12) - 1
        let (letter, accidental) = spellForABC(pitchClass: pitchClass, key: key, usesFlats: usesFlats)

        if octave <= 3 {
            return accidental + letter.uppercased() + String(repeating: ",", count: 4 - octave)
        } else if octave == 4 {
            return accidental + letter.uppercased()
        } else if octave == 5 {
            return accidental + letter.lowercased()
        } else {
            return accidental + letter.lowercased() + String(repeating: "'", count: octave - 5)
        }
    }

    private static func spellForABC(pitchClass: Int, key: Key, usesFlats: Bool) -> (letter: String, accidental: String) {
        let keyAcc = key.keySignatureAccidentals(usesFlats: usesFlats)
        switch pitchClass {
        case 0:  return ("C", "")
        case 1:
            if keyAcc.sharps.contains(1) { return ("C", "") }
            if keyAcc.flats.contains(1) { return ("D", "") }
            return usesFlats ? ("D", "_") : ("C", "^")
        case 2:  return ("D", "")
        case 3:
            if keyAcc.sharps.contains(3) { return ("D", "") }
            if keyAcc.flats.contains(3) { return ("E", "") }
            return usesFlats ? ("E", "_") : ("D", "^")
        case 4:  return ("E", "")
        case 5:  return ("F", "")
        case 6:
            if keyAcc.sharps.contains(6) { return ("F", "") }
            if keyAcc.flats.contains(6) { return ("G", "") }
            return usesFlats ? ("G", "_") : ("F", "^")
        case 7:  return ("G", "")
        case 8:
            if keyAcc.sharps.contains(8) { return ("G", "") }
            if keyAcc.flats.contains(8) { return ("A", "") }
            return usesFlats ? ("A", "_") : ("G", "^")
        case 9:  return ("A", "")
        case 10:
            if keyAcc.sharps.contains(10) { return ("A", "") }
            if keyAcc.flats.contains(10) { return ("B", "") }
            return usesFlats ? ("B", "_") : ("A", "^")
        case 11: return ("B", "")
        default: return ("C", "")
        }
    }

    private static func abcDuration(for value: NoteValue) -> String {
        switch value {
        case .whole: return "8"
        case .half: return "4"
        case .quarter: return "2"
        case .eighth: return ""
        case .sixteenth: return "/2"
        case .dotted(let base):
            switch base {
            case .half: return "6"
            case .quarter: return "3"
            case .eighth: return "3/2"
            default: return abcDuration(for: base)
            }
        case .triplet(let base):
            return abcDuration(for: base)
        }
    }

    /// Generate a "chart" version — same measures and chords, but slash marks instead of notes
    static func toChartABC(
        lick: Lick,
        keyOption: KeyOption,
        clef: Clef
    ) -> String {
        let keyName = keyOption.displayName
        let clefStr = abcClef(for: clef)
        let beatsPerMeasure = lick.timeSignature.beats

        var abc = "X:1\nL:1/1\nK:\(keyName) \(clefStr)\n"

        // Build chord map
        var chordMap: [Double: String] = [:]
        if let progression = lick.chordProgression {
            for symbol in progression.symbols {
                chordMap[symbol.startBeat] = symbol.displayText(in: keyOption)
            }
        }

        // Generate empty measures with chord symbols
        let measureCount = lick.measureCount
        for measure in 0..<measureCount {
            let beat1Based = Double(measure * beatsPerMeasure) + 1.0
            if let chordText = chordMap[beat1Based] {
                abc += "\"\(chordText)\""
            }
            abc += "x"  // invisible whole rest
            if measure < measureCount - 1 {
                abc += " | "
            }
        }

        abc += " |]\n"
        return abc
    }

    private static func abcClef(for clef: Clef) -> String {
        switch clef {
        case .treble: "clef=treble"
        case .bass: "clef=bass"
        case .alto: "clef=alto"
        case .tenor: "clef=tenor"
        }
    }
}
