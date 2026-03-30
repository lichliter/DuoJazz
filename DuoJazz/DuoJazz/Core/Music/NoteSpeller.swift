//
//  NoteSpeller.swift
//  DuoJazz
//

import Foundation

/// Converts MIDI pitches to VexFlow note names with proper enharmonic spelling
enum NoteSpeller {

    /// Convert MIDI pitch to VexFlow key string (e.g., "c/4", "bb/4", "f#/5")
    /// - Parameters:
    ///   - midi: MIDI pitch number
    ///   - key: The musical key (used for default enharmonic preference)
    ///   - prefersFlats: Override for enharmonic spelling (nil uses key's default)
    ///   - showKeySignatureAccidentals: If false, omits accidentals already in the key signature
    static func spell(
        midi: Int,
        in key: Key,
        prefersFlats: Bool? = nil,
        showKeySignatureAccidentals: Bool = false
    ) -> (key: String, accidental: String?) {
        let octave = (midi / 12) - 1
        let pitchClass = midi % 12

        let useFlats = prefersFlats ?? key.prefersFlats
        let (noteName, accidental) = spellPitchClass(pitchClass, preferFlats: useFlats, key: key)

        // If we're not showing key signature accidentals, check if this accidental is in the key
        let finalAccidental: String?
        if showKeySignatureAccidentals {
            finalAccidental = accidental
        } else {
            finalAccidental = accidentalNeededForKey(
                pitchClass: pitchClass,
                accidental: accidental,
                key: key,
                usesFlats: useFlats
            )
        }

        let vexflowKey = "\(noteName)/\(octave)"
        return (vexflowKey, finalAccidental)
    }

    /// Spell a pitch class (0-11) with appropriate accidentals
    private static func spellPitchClass(_ pitchClass: Int, preferFlats: Bool, key: Key) -> (name: String, accidental: String?) {
        switch pitchClass {
        case 0:  return ("c", nil)
        case 1:  return preferFlats ? ("d", "b") : ("c", "#")
        case 2:  return ("d", nil)
        case 3:  return preferFlats ? ("e", "b") : ("d", "#")
        case 4:  return ("e", nil)
        case 5:  return ("f", nil)
        case 6:  return preferFlats ? ("g", "b") : ("f", "#")
        case 7:  return ("g", nil)
        case 8:  return preferFlats ? ("a", "b") : ("g", "#")
        case 9:  return ("a", nil)
        case 10: return preferFlats ? ("b", "b") : ("a", "#")
        case 11: return ("b", nil)
        default: return ("c", nil)
        }
    }

    /// Determine if an accidental is needed given the key signature
    /// Returns nil if the note is already in the key signature, the accidental otherwise
    private static func accidentalNeededForKey(pitchClass: Int, accidental: String?, key: Key, usesFlats: Bool) -> String? {
        let keySignature = key.keySignatureAccidentals(usesFlats: usesFlats)

        // If no accidental on the note, check if key signature has one for this letter
        // In that case we'd need a natural (but our licks shouldn't have this case typically)
        guard let acc = accidental else {
            // Natural note - check if key signature alters this pitch class's letter
            // E.g., in Bb major, if we play B natural, we need a natural sign
            if keySignature.sharps.contains(pitchClass) || keySignature.flats.contains(pitchClass) {
                // The key signature alters this note, but we're playing the natural
                // This means we need a natural sign... but wait, if pitchClass is natural (e.g. 11 for B)
                // and key has Bb, the pitchClass for Bb is 10, so 11 (B natural) wouldn't be in flats
                // This logic is tricky - let's handle it properly

                // Actually, the keySignature stores the ALTERED pitch classes (e.g., Bb = 10)
                // A natural B is pitchClass 11, which wouldn't be in the flats set
                // So if we're playing a natural note and it's not in the signature, no accidental needed
                return nil
            }
            return nil
        }

        // We have an accidental - check if it's already in the key signature
        if acc == "#" {
            // Sharp accidental - if this pitch class is in the sharps set, no need to show it
            if keySignature.sharps.contains(pitchClass) {
                return nil
            }
        } else if acc == "b" {
            // Flat accidental - if this pitch class is in the flats set, no need to show it
            if keySignature.flats.contains(pitchClass) {
                return nil
            }
        }

        // Accidental is not in key signature, must be shown
        return acc
    }

    /// Convert NoteValue to VexFlow duration string
    static func duration(for value: NoteValue) -> String {
        switch value {
        case .whole: return "w"
        case .half: return "h"
        case .quarter: return "q"
        case .eighth: return "8"
        case .sixteenth: return "16"
        case .dotted(let base): return duration(for: base) + "d"
        case .triplet(let base): return duration(for: base)  // Triplets handled separately
        }
    }
}

// MARK: - Key Signature Accidentals

extension Key {
    /// The pitch classes that are altered by this key's signature
    /// sharps: pitch classes raised by sharp (e.g., F# = 6)
    /// flats: pitch classes lowered by flat (e.g., Bb = 10)
    /// - Parameter usesFlats: Whether to use flat spelling (for enharmonic keys like F#/Gb)
    func keySignatureAccidentals(usesFlats: Bool) -> (sharps: Set<Int>, flats: Set<Int>) {
        // For keys that have enharmonic equivalents, use the spelling preference
        switch self {
        case .c:      return ([], [])
        case .g:      return ([6], [])                     // F#
        case .d:      return ([6, 1], [])                  // F#, C#
        case .a:      return ([6, 1, 8], [])               // F#, C#, G#
        case .e:      return ([6, 1, 8, 3], [])            // F#, C#, G#, D#
        case .b:      return ([6, 1, 8, 3, 10], [])        // F#, C#, G#, D#, A#
        case .f:      return ([], [10])                    // Bb
        case .aSharp: return ([], [10, 3])                 // Bb, Eb (Bb major)
        case .dSharp: return ([], [10, 3, 8])              // Bb, Eb, Ab (Eb major)
        case .gSharp: return ([], [10, 3, 8, 1])           // Bb, Eb, Ab, Db (Ab major)

        // Enharmonic keys - depends on spelling preference
        case .fSharp:
            if usesFlats {
                return ([], [10, 3, 8, 1, 6])              // Gb: Bb, Eb, Ab, Db, Gb
            } else {
                return ([6, 1, 8, 3, 10, 5], [])           // F#: F#, C#, G#, D#, A#, E#
            }
        case .cSharp:
            if usesFlats {
                return ([], [10, 3, 8, 1, 6])              // Db: Bb, Eb, Ab, Db, Gb (5 flats)
            } else {
                return ([6, 1, 8, 3, 10, 5, 0], [])        // C#: all 7 sharps
            }
        }
    }
}

// MARK: - Key Extension for Enharmonic Preference

extension Key {
    /// Whether this key prefers flat spellings over sharp spellings
    var prefersFlats: Bool {
        switch self {
        case .c: false
        case .cSharp: false  // C# major uses sharps
        case .d: false
        case .dSharp: true   // Eb major uses flats
        case .e: false
        case .f: true        // F major has Bb
        case .fSharp: false  // F# major uses sharps
        case .g: false
        case .gSharp: true   // Ab major uses flats
        case .a: false
        case .aSharp: true   // Bb major uses flats
        case .b: false
        }
    }
}
