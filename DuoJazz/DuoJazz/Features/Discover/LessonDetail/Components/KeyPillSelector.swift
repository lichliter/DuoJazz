//
//  KeyPillSelector.swift
//  DuoJazz
//

import SwiftUI

struct KeyPillSelector: View {
    @Binding var selectedKey: KeyOption
    let lickIds: [String]
    let masteryMap: [String: [Int: Int]]

    /// Chromatic sequence of key options with canonical spellings (flats preferred for beginners)
    private static let pillOptions: [KeyOption] = {
        let order: [(Key, Bool)] = [
            (.c, false), (.cSharp, true), (.d, false), (.dSharp, true),
            (.e, false), (.f, false), (.fSharp, false), (.g, false),
            (.gSharp, true), (.a, false), (.aSharp, true), (.b, false),
        ]
        return order.map { key, flats in
            KeyOption.preferredOption(for: key, preferFlats: flats)
        }
    }()

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                ForEach(Self.pillOptions) { option in
                    let status = statusFor(key: option.key)
                    let isSelected = option.key == selectedKey.key
                    let style = PillStyle.for(status: status, selected: isSelected)

                    Button { selectedKey = option } label: {
                        Text(option.displayName)
                            .font(.caption.weight(isSelected ? .bold : .medium))
                            .foregroundStyle(style.text)
                            .padding(.horizontal, AppSpacing.sm)
                            .padding(.vertical, AppSpacing.xs)
                            .background(style.background)
                            .clipShape(Capsule())
                            .overlay(
                                Capsule().stroke(style.border, lineWidth: isSelected ? 2 : 1)
                            )
                    }
                }
            }
            .padding(.horizontal, AppSpacing.xs)
            .padding(.vertical, AppSpacing.xs)
        }
    }

    /// A key is completed when ALL licks are completed, in-progress when ANY have progress
    private func statusFor(key: Key) -> KeyStatus {
        var anyProgress = false
        var allCompleted = true
        let listenLevel = CardLevel.listen.rawValue
        for lickId in lickIds {
            let level = masteryMap[lickId]?[key.rawValue] ?? 0
            if level < listenLevel { allCompleted = false }
            if level > 0 { anyProgress = true }
            if !allCompleted && anyProgress { break }
        }
        if allCompleted && !lickIds.isEmpty { return .completed }
        if anyProgress { return .inProgress }
        return .notStarted
    }
}

private struct PillStyle {
    let background: Color
    let border: Color
    let text: Color

    static func `for`(status: KeyStatus, selected: Bool) -> PillStyle {
        let base: Color = {
            switch status {
            case .completed: Color(hex: 0x22C55E)
            case .inProgress: Color(hex: 0xF59E0B)
            case .notStarted: Color(hex: 0x8B5CF6)
            }
        }()
        let bgOpacity: Double = {
            switch status {
            case .notStarted: selected ? 0.12 : 0.05
            default: selected ? 0.2 : 0.1
            }
        }()
        return PillStyle(
            background: base.opacity(bgOpacity),
            border: selected ? base : .clear,
            text: status == .notStarted
                ? (selected ? .white : .secondary)
                : base
        )
    }
}
