//
//  LessonDetailHeader.swift
//  DuoJazz
//

import SwiftUI

struct LessonDetailHeader: View {
    let name: String
    let description: String

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            Text(name)
                .font(.largeTitle.bold())
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, alignment: .leading)

            Text(description)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}
