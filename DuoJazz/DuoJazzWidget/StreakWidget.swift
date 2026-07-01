//
//  StreakWidget.swift
//  DuoJazzWidget
//

import WidgetKit
import SwiftUI

struct StreakEntry: TimelineEntry {
    let date: Date
    let streak: Int
}

struct StreakProvider: TimelineProvider {
    func placeholder(in context: Context) -> StreakEntry {
        StreakEntry(date: .now, streak: 3)
    }

    func getSnapshot(in context: Context, completion: @escaping (StreakEntry) -> Void) {
        completion(StreakEntry(date: .now, streak: StreakSharedData.currentStreak))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StreakEntry>) -> Void) {
        let entry = StreakEntry(date: .now, streak: StreakSharedData.currentStreak)
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: .now) ?? .now
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

struct StreakWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let streak: Int

    var body: some View {
        switch family {
        case .accessoryCircular:
            StreakCircularView(streak: streak)
        case .accessoryRectangular:
            StreakRectangularView(streak: streak)
        case .accessoryInline:
            StreakInlineView(streak: streak)
        default:
            StreakCircularView(streak: streak)
        }
    }
}

private struct StreakCircularView: View {
    let streak: Int

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 2) {
                Image(systemName: "flame.fill")
                    .font(.caption)
                Text("\(streak)")
                    .font(.title3.bold())
            }
        }
    }
}

private struct StreakRectangularView: View {
    let streak: Int

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "flame.fill")
                .font(.title3)
            VStack(alignment: .leading, spacing: 1) {
                Text("\(streak) day streak")
                    .font(.headline)
                Text("DuoJazz")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
    }
}

private struct StreakInlineView: View {
    let streak: Int

    var body: some View {
        Label("\(streak) day streak", systemImage: "flame.fill")
    }
}

struct StreakWidget: Widget {
    let kind = "StreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StreakProvider()) { entry in
            StreakWidgetEntryView(streak: entry.streak)
        }
        .configurationDisplayName("Practice Streak")
        .description("See your daily practice streak on the Lock Screen.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

#Preview(as: .accessoryCircular) {
    StreakWidget()
} timeline: {
    StreakEntry(date: .now, streak: 7)
}

#Preview(as: .accessoryRectangular) {
    StreakWidget()
} timeline: {
    StreakEntry(date: .now, streak: 7)
}
