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
    let elements: [LickElement]
    let chordProgression: ChordProgression?

    init(
        id: String,
        name: String,
        tags: [Tag] = [.iiVI],
        timeSignature: (beats: Int, noteValue: Int) = (4, 4),
        elements: [LickElement],
        chordProgression: ChordProgression? = nil
    ) {
        self.id = id
        self.name = name
        self.tags = tags
        self.timeSignature = timeSignature
        self.elements = elements
        self.chordProgression = chordProgression
    }

    /// Total duration of the lick in beats
    var totalBeats: Double {
        elements.reduce(0) { $0 + $1.durationBeats }
    }

    /// Number of pitched notes (excluding rests)
    var noteCount: Int {
        elements.filter(\.isNote).count
    }

    /// Time signature string (e.g., "4/4")
    var timeSignatureString: String {
        "\(timeSignature.beats)/\(timeSignature.noteValue)"
    }

    /// Number of measures
    var measureCount: Int {
        let beatsPerMeasure = Double(timeSignature.beats)
        return max(1, Int(ceil(totalBeats / beatsPerMeasure)))
    }

    /// Get absolute MIDI pitches for pitched notes only
    func pitches(in key: Key) -> [Int] {
        elements.compactMap { $0.midiPitch(root: key.midiRoot) }
    }

    /// Group elements by measure (0-indexed)
    func elementsByMeasure() -> [[LickElement]] {
        let beatsPerMeasure = Double(timeSignature.beats)
        var measures: [[LickElement]] = []
        var currentMeasure: [LickElement] = []
        var currentBeat = 0.0

        for element in elements {
            let measureIndex = Int(currentBeat / beatsPerMeasure)
            while measures.count < measureIndex {
                measures.append([])
            }
            if measures.count == measureIndex {
                if !currentMeasure.isEmpty {
                    measures.append(currentMeasure)
                    currentMeasure = []
                }
            }

            currentMeasure.append(element)
            currentBeat += element.durationBeats

            // Check if we crossed a measure boundary
            let newMeasureIndex = Int(currentBeat / beatsPerMeasure)
            if newMeasureIndex > measureIndex && currentBeat.truncatingRemainder(dividingBy: beatsPerMeasure) < 0.01 {
                measures.append(currentMeasure)
                currentMeasure = []
            }
        }

        if !currentMeasure.isEmpty {
            measures.append(currentMeasure)
        }

        return measures
    }
}
