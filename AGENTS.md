# AGENTS.md

Project-specific guidance lives in `CLAUDE.md` (coding rules) and `.claude/skills/` (architecture, build, lick authoring). Read those first.

## Cursor Cloud specific instructions

**This is a native iOS/iPadOS app that CANNOT be built, run, or tested in the Cursor Cloud environment.**

Cursor Cloud VMs are Linux (Ubuntu). DuoJazz is a SwiftUI + Swift 6.2 app targeting iOS 18+ and builds only through Xcode's `xcodebuild` against the iOS Simulator (see the `duojazz-build` skill and `.github/workflows/build.yml`, which runs on `macos-latest`). It depends on Apple-only frameworks — SwiftUI, SwiftData, AVFoundation, WebKit — plus AudioKit/SoundpipeAudioKit/AudioKitEX (SPM). None of these, nor `xcodebuild`/`xcrun`/`simctl`/the iOS Simulator, exist on Linux, and there is no `Package.swift` (only `DuoJazz/DuoJazz.xcodeproj`), so there is no Linux build/test path.

Practical implications for a Cloud agent on this repo:
- Do NOT attempt to install a Swift-for-Linux toolchain to "set up" the build — SwiftUI/SwiftData/AudioKit are unavailable on Linux and the `.xcodeproj` requires macOS/Xcode. Any such setup is misleading.
- You CAN still read, search, and edit source (`.swift`) files, update docs, and reason about the code. You CANNOT compile it or produce runtime/build evidence here.
- Build/test/run must happen on macOS with Xcode (locally or CI). Reference commands are in the `duojazz-build` skill; CI is `.github/workflows/build.yml`.
- The update script is intentionally a no-op: there are no Linux dependencies to install for this project.
