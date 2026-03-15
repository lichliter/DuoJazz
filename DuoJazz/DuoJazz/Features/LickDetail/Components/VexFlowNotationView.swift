//
//  VexFlowNotationView.swift
//  DuoJazz
//

import SwiftUI
import WebKit

struct VexFlowNotationView: View {
    let lick: Lick
    let keyOption: KeyOption
    let clef: Clef
    let octaveOffset: Int
    let timeSignature: String
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VexFlowWebView(
            measures: buildMeasureData(),
            clef: clef.vexflowId,
            keySignature: keyOption.vexflowSignature,
            timeSignature: timeSignature,
            chords: buildChordData(),
            isDarkMode: false
        )
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(.secondary.opacity(0.3), lineWidth: 1)
        )
    }

    /// Build chord data for VexFlow rendering
    private func buildChordData() -> [[String: Any]] {
        guard let progression = lick.chordProgression else { return [] }
        return progression.chordData(in: keyOption)
    }

    /// Build note data grouped by measure for VexFlow rendering
    private func buildMeasureData() -> [[[String: String]]] {
        let pitches = lick.pitches(in: keyOption.key)
        let notesByMeasure = lick.notesByMeasure()
        let beatsPerMeasure = Double(lick.timeSignature.beats)

        // Track cumulative note index for pitch lookup
        var noteIndex = 0

        return notesByMeasure.enumerated().map { measureIndex, measureNotes in
            var elements: [[String: String]] = []
            let measureStartBeat = Double(measureIndex) * beatsPerMeasure + 1.0
            var currentBeat = measureStartBeat

            for note in measureNotes {
                // Fill gap before this note with rests
                let gap = note.startBeat - currentBeat
                if gap > 0.01 { // Small tolerance for floating point
                    elements.append(contentsOf: restsForDuration(gap))
                }

                // Add the note
                let midi = pitches[noteIndex] + clef.octaveOffset + (octaveOffset * 12)
                let (vexKey, accidental) = NoteSpeller.spell(midi: midi, in: keyOption.key, prefersFlats: keyOption.usesFlats)
                let duration = NoteSpeller.duration(for: note.value)

                noteIndex += 1

                var noteDict: [String: String] = [
                    "key": vexKey,
                    "duration": duration,
                    "beat": String(note.startBeat)
                ]
                if let acc = accidental {
                    noteDict["accidental"] = acc
                }
                elements.append(noteDict)

                currentBeat = note.startBeat + note.durationBeats
            }

            // Fill remaining beats in measure with rests
            let measureEndBeat = measureStartBeat + beatsPerMeasure
            let remainingBeats = measureEndBeat - currentBeat
            if remainingBeats > 0.01 {
                elements.append(contentsOf: restsForDuration(remainingBeats))
            }

            return elements
        }
    }

    /// Generate rest elements for a given duration in beats
    private func restsForDuration(_ beats: Double) -> [[String: String]] {
        var rests: [[String: String]] = []
        var remaining = beats

        // Break down into standard rest values (largest first)
        let restValues: [(beats: Double, duration: String)] = [
            (4.0, "wr"),   // whole rest
            (2.0, "hr"),   // half rest
            (1.0, "qr"),   // quarter rest
            (0.5, "8r"),   // eighth rest
            (0.25, "16r")  // sixteenth rest
        ]

        // Use clef-appropriate rest position (middle of staff)
        let restKey = clef.restPosition

        for (value, duration) in restValues {
            while remaining >= value - 0.01 {
                rests.append([
                    "key": restKey,
                    "duration": duration
                ])
                remaining -= value
            }
        }

        return rests
    }
}

// MARK: - WebView Wrapper

struct VexFlowWebView: UIViewRepresentable {
    let measures: [[[String: String]]]
    let clef: String
    let keySignature: String
    let timeSignature: String
    let chords: [[String: Any]]
    let isDarkMode: Bool

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(context.coordinator, name: "ready")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = true
        webView.backgroundColor = .white
        webView.scrollView.backgroundColor = .white

        // Enable horizontal scrolling for wide notation
        webView.scrollView.isScrollEnabled = true
        webView.scrollView.showsHorizontalScrollIndicator = true
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.scrollView.bounces = true

        webView.navigationDelegate = context.coordinator

        // Load HTML
        if let htmlPath = Bundle.main.path(forResource: "vexflow", ofType: "html") {
            let htmlURL = URL(fileURLWithPath: htmlPath)
            webView.loadFileURL(htmlURL, allowingReadAccessTo: htmlURL.deletingLastPathComponent())
        }

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.pendingRender = buildRenderConfig(size: webView.bounds.size)
        context.coordinator.renderIfReady(webView: webView)
    }

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "ready")
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    private func buildRenderConfig(size: CGSize) -> [String: Any] {
        [
            "measures": measures,
            "clef": clef,
            "keySignature": keySignature,
            "timeSignature": timeSignature,
            "chords": chords,
            // Don't constrain width - let VexFlow calculate based on measures
            // The WebView will scroll horizontally if content is wider than frame
            "height": max(size.height, 150),
            "darkMode": isDarkMode
        ]
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var isReady = false
        var pendingRender: [String: Any]?

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            isReady = true
            renderIfReady(webView: webView)
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "ready" {
                isReady = true
            }
        }

        func renderIfReady(webView: WKWebView) {
            guard isReady, let config = pendingRender else { return }

            if let jsonData = try? JSONSerialization.data(withJSONObject: config),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                let escaped = jsonString.replacingOccurrences(of: "'", with: "\\'")
                webView.evaluateJavaScript("render('\(escaped)')") { _, error in
                    if let error {
                        print("VexFlow render error: \(error)")
                    }
                }
            }
            pendingRender = nil
        }
    }
}

#Preview {
    VexFlowNotationView(
        lick: BuiltInLicks.shortIIVI,
        keyOption: .default,
        clef: .treble,
        octaveOffset: 0,
        timeSignature: "4/4"
    )
    .frame(height: 150)
    .padding()
}
