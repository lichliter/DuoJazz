//
//  ABCNotationView.swift
//  DuoJazz
//

import SwiftUI
import WebKit

struct ABCNotationView: View {
    let lick: Lick
    let keyOption: KeyOption
    let clef: Clef
    let octaveOffset: Int
    var chartMode: Bool = false

    @State private var isLoaded = false

    var body: some View {
        ZStack {
            ABCWebView(
                abc: chartMode
                    ? ABCConverter.toChartABC(lick: lick, keyOption: keyOption, clef: clef)
                    : ABCConverter.toABC(lick: lick, keyOption: keyOption, clef: clef, octaveOffset: octaveOffset),
                onLoad: { isLoaded = true }
            )

            if !isLoaded {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(hex: 0x1E1535))
                    .overlay {
                        ProgressView()
                            .tint(.secondary)
                    }
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct ABCWebView: UIViewRepresentable {
    let abc: String
    var onLoad: (() -> Void)?

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(context.coordinator, name: "ready")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = true
        webView.backgroundColor = UIColor(red: 1.0, green: 0.996, blue: 0.96, alpha: 1.0)
        webView.scrollView.backgroundColor = webView.backgroundColor
        webView.scrollView.isScrollEnabled = true
        webView.scrollView.showsHorizontalScrollIndicator = true
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.scrollView.bounces = true
        webView.navigationDelegate = context.coordinator

        if let htmlPath = Bundle.main.path(forResource: "abcjs", ofType: "html") {
            let htmlURL = URL(fileURLWithPath: htmlPath)
            webView.loadFileURL(htmlURL, allowingReadAccessTo: htmlURL.deletingLastPathComponent())
        }

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.pendingABC = abc
        context.coordinator.renderIfReady(webView: webView)
    }

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "ready")
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onLoad: onLoad)
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var isReady = false
        var pendingABC: String?
        let onLoad: (() -> Void)?

        init(onLoad: (() -> Void)? = nil) {
            self.onLoad = onLoad
        }

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
            guard isReady, let abc = pendingABC else { return }

            print("[ABCNotation] ABC string:\n\(abc)")

            let config: [String: Any] = [
                "abc": abc,
                "width": Int(max(webView.bounds.width - 20, 600))
            ]

            if let jsonData = try? JSONSerialization.data(withJSONObject: config),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                let escaped = jsonString
                    .replacingOccurrences(of: "\\", with: "\\\\")
                    .replacingOccurrences(of: "'", with: "\\'")
                    .replacingOccurrences(of: "\n", with: "\\n")
                webView.evaluateJavaScript("render('\(escaped)')") { [weak self] result, error in
                    if let error {
                        print("[ABCNotation] JS error: \(error)")
                    } else {
                        DispatchQueue.main.async { self?.onLoad?() }
                    }
                }
            }
            pendingABC = nil
        }
    }
}

#Preview {
    ABCNotationView(
        lick: BuiltInLicks.shortIIVI,
        keyOption: .default,
        clef: .treble,
        octaveOffset: 0
    )
    .frame(height: 150)
    .padding()
}
