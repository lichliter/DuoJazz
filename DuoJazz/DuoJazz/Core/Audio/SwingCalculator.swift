//
//  SwingCalculator.swift
//  DuoJazz
//

import Foundation

/// Calculates authentic jazz swing ratios based on tempo
/// Based on research by Friberg & Sundstrom showing swing ratio varies with tempo
enum SwingCalculator {

    /// Calculate the swing ratio for a given tempo
    /// Returns the proportion of a beat taken by the "long" eighth note (0.5 = straight, 0.67 = triplet feel)
    /// - Parameter tempo: Beats per minute
    /// - Returns: Ratio from 0.5 (straight) to ~0.75 (wide swing)
    static func swingRatio(forTempo tempo: Double) -> Double {
        // Research shows:
        // - At slow tempos (~60 BPM): ratio ~3:1, so long note = 0.75
        // - At medium tempos (~120 BPM): ratio ~2:1 (triplet), so long note = 0.67
        // - At fast tempos (~200+ BPM): ratio approaches 1:1, so long note = 0.55
        //
        // Using a logarithmic interpolation for natural feel

        let minTempo = 50.0
        let maxTempo = 280.0
        let clampedTempo = min(max(tempo, minTempo), maxTempo)

        // Swing ratio ranges from 0.75 (slow) to 0.52 (fast)
        // Using inverse relationship with tempo
        let slowRatio = 0.72   // Wide swing at slow tempos
        let fastRatio = 0.54   // Nearly straight at fast tempos

        // Logarithmic interpolation feels more natural
        let t = log(clampedTempo / minTempo) / log(maxTempo / minTempo)
        let ratio = slowRatio - (slowRatio - fastRatio) * t

        return ratio
    }

    /// Calculate duration for "on-beat" (long) eighth note
    /// - Parameters:
    ///   - baseDuration: Duration of a straight eighth note in seconds
    ///   - tempo: Current tempo in BPM
    /// - Returns: Duration in seconds for the long eighth
    static func longEighthDuration(baseDuration: Double, tempo: Double) -> Double {
        let ratio = swingRatio(forTempo: tempo)
        // Long eighth takes `ratio` of a quarter note, which is 2x an eighth
        return baseDuration * ratio * 2
    }

    /// Calculate duration for "off-beat" (short) eighth note
    /// - Parameters:
    ///   - baseDuration: Duration of a straight eighth note in seconds
    ///   - tempo: Current tempo in BPM
    /// - Returns: Duration in seconds for the short eighth
    static func shortEighthDuration(baseDuration: Double, tempo: Double) -> Double {
        let ratio = swingRatio(forTempo: tempo)
        // Short eighth takes the remainder of a quarter note
        return baseDuration * (1.0 - ratio) * 2
    }

    /// Minimum duration for the short eighth note (research suggests ~100ms floor)
    static let minimumShortEighthDuration: Double = 0.08
}
