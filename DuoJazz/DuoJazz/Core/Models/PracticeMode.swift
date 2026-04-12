//
//  PracticeMode.swift
//  DuoJazz
//

import Foundation

/// How a practice session progresses after completing a single lick+key session.
/// `.lesson` iterates licks in the lesson (fixed key); the key modes hold lick
/// fixed and cycle keys by the named interval.
enum PracticeMode: Int, CaseIterable, Sendable, Codable {
    case lesson = 0
    case chromatic = 1
    case fourths = 2
    case fifths = 3

    var displayName: String {
        switch self {
        case .lesson: "Lesson"
        case .chromatic: "Chromatic"
        case .fourths: "4ths"
        case .fifths: "5ths"
        }
    }

    /// Whether this mode iterates licks (Lesson) or keys (everything else)
    var iteratesLicks: Bool { self == .lesson }

    /// Semitone interval to the next key in the cycle (for key-iterating modes)
    private var step: Int? {
        switch self {
        case .lesson: nil
        case .chromatic: 1
        case .fourths: 5
        case .fifths: 7
        }
    }

    /// Returns the next key in the cycle, or nil if mode iterates licks or cycle completes
    func nextKey(after current: KeyOption, startingKey: KeyOption) -> KeyOption? {
        guard let step else { return nil }
        let nextRaw = (current.key.rawValue + step) % 12
        guard nextRaw != startingKey.key.rawValue else { return nil }
        return Self.canonicalKeyOption(for: nextRaw, mode: self)
    }

    private static func canonicalKeyOption(for rawValue: Int, mode: PracticeMode) -> KeyOption {
        let preferFlats: Bool
        switch mode {
        case .chromatic, .fourths: preferFlats = true
        case .fifths, .lesson: preferFlats = false
        }
        return KeyOption.allOptions.first { option in
            option.key.rawValue == rawValue && option.usesFlats == preferFlats
        } ?? KeyOption.allOptions.first { $0.key.rawValue == rawValue } ?? .default
    }
}
