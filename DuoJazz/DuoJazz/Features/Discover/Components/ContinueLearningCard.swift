//
//  ContinueLearningCard.swift
//  DuoJazz
//

import SwiftUI

struct ContinueLearningCard: View {
    let collection: LickCollection
    @Binding var selectedKey: KeyOption
    let onContinue: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Continue Learning")
                .font(.headline)
                .foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 16) {
                Text(collection.name)
                    .font(.title2.bold())
                    .foregroundStyle(.white)

                HStack {
                    Picker("Key", selection: $selectedKey) {
                        ForEach(KeyOption.allOptions) { option in
                            Text(option.displayName).tag(option)
                        }
                    }
                    .pickerStyle(.menu)
                    .tint(Color(hex: 0x8B5CF6))

                    Spacer()

                    Text("\(collection.lickCount) licks")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Button(action: onContinue) {
                    Text("Continue Session")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color(hex: 0x8B5CF6))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding(20)
            .background(Color(hex: 0x1A1030))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color(hex: 0x2D2060), lineWidth: 1)
            )
        }
    }
}
