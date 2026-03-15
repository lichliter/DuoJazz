//
//  SearchBar.swift
//  DuoJazz
//

import SwiftUI

struct SearchBar: View {
    @Binding var text: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)

            TextField("Search licks...", text: $text)
                .textFieldStyle(.plain)
                .foregroundStyle(.white)

            if !text.isEmpty {
                Button { text = "" } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(14)
        .background(Color(hex: 0x1A1030))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
