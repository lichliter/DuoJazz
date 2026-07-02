# DuoJazz

Duolingo-style iPad app for learning jazz licks across all 12 keys. SwiftUI + Swift 6.2, iOS 18+, tablet-first.

## Coding Rules

1. **Use `@Observable`**, NOT `ObservableObject`/`@Published`
2. **Use Swift Testing** (`@Test`, `#expect`), NOT XCTest
3. **Swift 6 strict concurrency** — no `@MainActor` leaks
4. **No force unwraps** (`!`)
5. **Typed throws** — `throws(SomeError)` where possible
6. **View file limit: 100 lines max** — extract to `Components/` folder
7. **Instrument via `@Environment(\.instrument)`** — never hardcode clef/transposition

## Skills

| Skill | Use when |
|-------|----------|
| `duojazz-architecture` | Navigation, session flow, data model |
| `duojazz-build` | xcodebuild, simulator, device deploy |
| `write-lick` / `transcribe-lick` / `music-reference` | Lick authoring |
| `mobile-ios-design` | SwiftUI/HIG patterns |

Scoped rules in `.claude/rules/` auto-apply for music types and audio code.
