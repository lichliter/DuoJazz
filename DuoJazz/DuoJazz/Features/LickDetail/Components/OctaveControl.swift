//
//  OctaveControl.swift
//  DuoJazz
//

import SwiftUI

struct OctaveControl: View {
    @Binding var octaveOffset: Int

    var body: some View {
        HStack {
            Text("Octave")
                .font(.headline)

            Spacer()

            HStack(spacing: 16) {
                Button {
                    if octaveOffset > -2 {
                        octaveOffset -= 1
                    }
                } label: {
                    Image(systemName: "minus.circle.fill")
                        .font(.title2)
                }
                .disabled(octaveOffset <= -2)

                Text(octaveLabel)
                    .font(.headline)
                    .monospacedDigit()
                    .frame(width: 30)

                Button {
                    if octaveOffset < 2 {
                        octaveOffset += 1
                    }
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                }
                .disabled(octaveOffset >= 2)
            }
            .tint(.blue)
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var octaveLabel: String {
        if octaveOffset == 0 {
            return "0"
        } else if octaveOffset > 0 {
            return "+\(octaveOffset)"
        } else {
            return "\(octaveOffset)"
        }
    }
}

#Preview {
    OctaveControl(octaveOffset: .constant(0))
        .padding()
}
