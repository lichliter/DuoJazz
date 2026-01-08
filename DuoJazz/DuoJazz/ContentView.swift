//
//  ContentView.swift
//  DuoJazz
//
//  Created by Brian Lichliter on 1/6/26.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                // App icon
                ZStack {
                    RoundedRectangle(cornerRadius: 24)
                        .fill(
                            LinearGradient(
                                colors: [.purple, .blue],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 120, height: 120)

                    Image(systemName: "music.note.list")
                        .font(.system(size: 50))
                        .foregroundStyle(.white)
                }

                Text("DuoJazz")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Learn jazz language, one lick at a time")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Spacer()

                // Start practice button
                Button {
                    // TODO: Navigate to session
                } label: {
                    Label("Start Practice", systemImage: "play.fill")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.blue)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }

                // Library button
                NavigationLink(destination: LibraryView()) {
                    Label("Licktionary", systemImage: "books.vertical")
                        .font(.headline)
                        .foregroundStyle(.blue)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.blue.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }

                Spacer()
            }
            .padding(.horizontal, 32)
        }
    }
}

#Preview {
    ContentView()
}
