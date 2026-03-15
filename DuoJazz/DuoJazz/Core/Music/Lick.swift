//
//  Lick.swift
//  DuoJazz
//

import Foundation

/// A jazz lick - a short melodic phrase stored as intervals (key-agnostic)
struct Lick: Identifiable, Sendable {
    let id: String
    let name: String
    let tags: [Tag]
    let timeSignature: (beats: Int, noteValue: Int)
    let notes: [LickNote]
    let chordProgression: ChordProgression?

    init(
        id: String,
        name: String,
        tags: [Tag] = [.iiVI],
        timeSignature: (beats: Int, noteValue: Int) = (4, 4),
        notes: [LickNote],
        chordProgression: ChordProgression? = nil
    ) {
        self.id = id
        self.name = name
        self.tags = tags
        self.timeSignature = timeSignature
        self.notes = notes
        self.chordProgression = chordProgression
    }

    /// Total duration of the lick in beats
    var totalBeats: Double {
        guard let lastNote = notes.last else { return 0 }
        return lastNote.startBeat + lastNote.durationBeats
    }

    /// Number of notes in the lick
    var noteCount: Int {
        notes.count
    }

    /// VexFlow time signature string (e.g., "4/4")
    var vexflowTimeSignature: String {
        "\(timeSignature.beats)/\(timeSignature.noteValue)"
    }

    /// Number of measures in this lick
    var measureCount: Int {
        let beatsPerMeasure = Double(timeSignature.beats)
        return Int(ceil(totalBeats / beatsPerMeasure))
    }

    /// Get absolute MIDI pitches for a given key
    func pitches(in key: Key) -> [Int] {
        notes.map { $0.midiPitch(root: key.midiRoot) }
    }

    /// Group notes by measure (0-indexed)
    func notesByMeasure() -> [[LickNote]] {
        let beatsPerMeasure = Double(timeSignature.beats)
        var measures: [[LickNote]] = Array(repeating: [], count: measureCount)

        for note in notes {
            // Measure index is 0-based; startBeat is 1-based
            let measureIndex = Int((note.startBeat - 1) / beatsPerMeasure)
            if measureIndex >= 0 && measureIndex < measures.count {
                measures[measureIndex].append(note)
            }
        }

        return measures
    }
}
