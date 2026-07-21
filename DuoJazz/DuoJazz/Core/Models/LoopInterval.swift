//
//  LoopInterval.swift
//  DuoJazz
//

import Foundation

/// How keys advance when loop mode is on.
enum LoopInterval: Int, CaseIterable, Sendable, Codable {
    case chromatic = 1
    case fourths = 2
    case fifths = 3
    case random = 4

    var displayName: String {
        switch self {
        case .chromatic: "Chromatic"
        case .fourths: "4ths"
        case .fifths: "5ths"
        case .random: "Random"
        }
    }

    private var step: Int? {
        switch self {
        case .chromatic: 1
        case .fourths: 5
        case .fifths: 7
        case .random: nil
        }
    }

    /// Returns the next key in the cycle, or nil when the lap would wrap to the starting key.
    func nextKey(after current: KeyOption, startingKey: KeyOption) -> KeyOption? {
        guard let step else { return nil }
        let nextRaw = (current.key.rawValue + step) % 12
        guard nextRaw != startingKey.key.rawValue else { return nil }
        return Self.canonicalKeyOption(for: nextRaw, interval: self)
    }

    /// Unique keys excluding the starting pitch class, in random order.
    static func shuffledKeys(excluding startingKey: KeyOption) -> [KeyOption] {
        var seen = Set<Int>()
        var keys: [KeyOption] = []
        for option in KeyOption.allOptions {
            guard option.key.rawValue != startingKey.key.rawValue else { continue }
            guard seen.insert(option.key.rawValue).inserted else { continue }
            keys.append(option)
        }
        return keys.shuffled()
    }

    private static func canonicalKeyOption(for rawValue: Int, interval: LoopInterval) -> KeyOption {
        let preferFlats: Bool
        switch interval {
        case .chromatic, .fourths, .random: preferFlats = true
        case .fifths: preferFlats = false
        }
        return KeyOption.allOptions.first { $0.key.rawValue == rawValue && $0.usesFlats == preferFlats }
            ?? KeyOption.allOptions.first { $0.key.rawValue == rawValue }
            ?? .default
    }
}
