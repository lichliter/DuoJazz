//
//  StaffNotationView.swift
//  DuoJazz
//

import SwiftUI

struct StaffNotationView: View {
    let lick: Lick
    let key: Key

    // Staff layout constants
    private let lineSpacing: CGFloat = 12
    private let noteRadius: CGFloat = 6
    private let stemHeight: CGFloat = 36
    private let leftMargin: CGFloat = 50
    private let beatWidth: CGFloat = 40

    var body: some View {
        Canvas { context, size in
            let staffTop = (size.height - lineSpacing * 4) / 2

            // Draw staff lines
            drawStaffLines(context: context, size: size, staffTop: staffTop)

            // Draw treble clef placeholder
            drawClef(context: context, staffTop: staffTop)

            // Draw notes
            drawNotes(context: context, staffTop: staffTop)
        }
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(.secondary.opacity(0.3), lineWidth: 1)
        )
    }

    private func drawStaffLines(context: GraphicsContext, size: CGSize, staffTop: CGFloat) {
        for i in 0..<5 {
            let y = staffTop + CGFloat(i) * lineSpacing
            var path = Path()
            path.move(to: CGPoint(x: 10, y: y))
            path.addLine(to: CGPoint(x: size.width - 10, y: y))
            context.stroke(path, with: .color(.secondary.opacity(0.5)), lineWidth: 1)
        }
    }

    private func drawClef(context: GraphicsContext, staffTop: CGFloat) {
        // Simple treble clef using SF Symbol
        let clefPoint = CGPoint(x: 25, y: staffTop + lineSpacing * 2)
        context.draw(
            Text("𝄞").font(.system(size: 48)).foregroundColor(.secondary),
            at: clefPoint
        )
    }

    private func drawNotes(context: GraphicsContext, staffTop: CGFloat) {
        let pitches = lick.pitches(in: key)

        for (index, note) in lick.notes.enumerated() {
            let midi = pitches[index]
            let x = leftMargin + (note.startBeat - 1) * beatWidth
            let y = midiToStaffY(midi: midi, staffTop: staffTop)

            // Draw ledger lines if needed
            drawLedgerLines(context: context, midi: midi, x: x, staffTop: staffTop)

            // Draw note head
            let noteRect = CGRect(
                x: x - noteRadius,
                y: y - noteRadius * 0.8,
                width: noteRadius * 2,
                height: noteRadius * 1.6
            )
            context.fill(Ellipse().path(in: noteRect), with: .color(.primary))

            // Draw stem for eighth notes and shorter
            if note.value.beats <= 1.0 {
                let stemUp = midi < 71  // B4 - stem up if below middle of staff
                var stemPath = Path()
                if stemUp {
                    stemPath.move(to: CGPoint(x: x + noteRadius - 1, y: y))
                    stemPath.addLine(to: CGPoint(x: x + noteRadius - 1, y: y - stemHeight))
                } else {
                    stemPath.move(to: CGPoint(x: x - noteRadius + 1, y: y))
                    stemPath.addLine(to: CGPoint(x: x - noteRadius + 1, y: y + stemHeight))
                }
                context.stroke(stemPath, with: .color(.primary), lineWidth: 1.5)

                // Draw flag for eighth notes
                if note.value == .eighth {
                    drawFlag(context: context, x: x, y: y, stemUp: stemUp)
                }
            }
        }
    }

    private func drawLedgerLines(context: GraphicsContext, midi: Int, x: CGFloat, staffTop: CGFloat) {
        let staffBottom = staffTop + lineSpacing * 4

        // Middle C (60) needs one ledger line below
        // Notes below middle C need more ledger lines
        // Notes above G5 (79) need ledger lines above

        // Below staff
        if midi <= 60 {
            let numLines = (61 - midi) / 2
            for i in 0..<numLines {
                let y = staffBottom + lineSpacing * CGFloat(i + 1)
                var path = Path()
                path.move(to: CGPoint(x: x - noteRadius - 4, y: y))
                path.addLine(to: CGPoint(x: x + noteRadius + 4, y: y))
                context.stroke(path, with: .color(.secondary.opacity(0.5)), lineWidth: 1)
            }
        }

        // Above staff
        if midi >= 81 {
            let numLines = (midi - 79) / 2
            for i in 0..<numLines {
                let y = staffTop - lineSpacing * CGFloat(i + 1)
                var path = Path()
                path.move(to: CGPoint(x: x - noteRadius - 4, y: y))
                path.addLine(to: CGPoint(x: x + noteRadius + 4, y: y))
                context.stroke(path, with: .color(.secondary.opacity(0.5)), lineWidth: 1)
            }
        }
    }

    private func drawFlag(context: GraphicsContext, x: CGFloat, y: CGFloat, stemUp: Bool) {
        var path = Path()
        if stemUp {
            let flagTop = y - stemHeight
            path.move(to: CGPoint(x: x + noteRadius - 1, y: flagTop))
            path.addQuadCurve(
                to: CGPoint(x: x + noteRadius + 8, y: flagTop + 16),
                control: CGPoint(x: x + noteRadius + 12, y: flagTop + 4)
            )
        } else {
            let flagBottom = y + stemHeight
            path.move(to: CGPoint(x: x - noteRadius + 1, y: flagBottom))
            path.addQuadCurve(
                to: CGPoint(x: x - noteRadius + 10, y: flagBottom - 16),
                control: CGPoint(x: x - noteRadius + 14, y: flagBottom - 4)
            )
        }
        context.stroke(path, with: .color(.primary), lineWidth: 1.5)
    }

    /// Convert MIDI pitch to Y position on staff
    /// Middle C (60) = first ledger line below staff (below line 5)
    /// Each staff position is a diatonic step, but we simplify for chromatic pitches
    private func midiToStaffY(midi: Int, staffTop: CGFloat) -> CGFloat {
        // Reference: B4 (71) sits on middle line (line 3, index 2)
        // Each semitone moves ~half a line spacing (simplified)
        let b4Position = staffTop + lineSpacing * 2
        let semitonesFromB4 = midi - 71
        // Approximate: 2 semitones per staff position (whole step)
        // This is simplified - real notation uses diatonic spacing
        let staffPositions = CGFloat(semitonesFromB4) / 2.0
        return b4Position - (staffPositions * lineSpacing / 2)
    }
}

#Preview {
    StaffNotationView(lick: BuiltInLicks.shortIIVI, key: .c)
        .frame(height: 150)
        .padding()
}
