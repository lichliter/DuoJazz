//
//  AutoRecordToggle.swift
//  DuoJazz
//

import SwiftUI
import SwiftData

struct AutoRecordToggle: View {
    let recording: RecordingSession
    @Binding var autoRecord: Bool
    var onStart: (() async -> Void)?
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        Button {
            autoRecord.toggle()
            recording.autoRecord = autoRecord

            // Persist to UserProfile
            let descriptor = FetchDescriptor<UserProfile>()
            let profile: UserProfile
            if let existing = try? modelContext.fetch(descriptor).first {
                profile = existing
            } else {
                profile = UserProfile()
                modelContext.insert(profile)
            }
            profile.autoRecord = autoRecord
            try? modelContext.save()

            if autoRecord, case .idle = recording.state {
                Task { await onStart?() }
            }
        } label: {
            Image(systemName: autoRecord ? "repeat.circle.fill" : "repeat.circle")
                .font(.body.weight(.semibold))
                .foregroundStyle(.white)
                .frame(width: 56)
                .padding(.vertical, 18)
                .background(autoRecord ? Color(hex: 0x8B5CF6) : Color(hex: 0x2D2060))
                .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .accessibilityLabel(autoRecord ? "Auto-record on" : "Auto-record off")
        .accessibilityHint("Double tap to toggle automatic recording")
    }
}
