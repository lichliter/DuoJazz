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

struct StreakWidgetView: View {
    let streak: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "flame.fill")
                    .font(.title2)
                    .foregroundStyle(Color(red: 0.96, green: 0.62, blue: 0.04))
                Text("DuoJazz")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.7))
            }

            Spacer(minLength: 0)

            Text("\(streak)")
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.5)

            Text("day streak")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding()
        .containerBackground(for: .widget) {
            Color(red: 0.10, green: 0.06, blue: 0.19)
        }
    }
}

struct StreakWidget: Widget {
    let kind = "StreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StreakProvider()) { entry in
            StreakWidgetView(streak: entry.streak)
        }
        .configurationDisplayName("Practice Streak")
        .description("See your daily practice streak at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemSmall) {
    StreakWidget()
} timeline: {
    StreakEntry(date: .now, streak: 7)
}
