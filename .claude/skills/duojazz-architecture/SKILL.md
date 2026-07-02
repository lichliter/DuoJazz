---
name: duojazz-architecture
description: DuoJazz app architecture — navigation, session flow, data model, medals, and key type relationships
user-invocable: true
---

# DuoJazz Architecture

Use when working on navigation, session flow, progress tracking, or understanding how app pieces connect.

## Tech Stack

| Layer | Tech |
|-------|------|
| UI | SwiftUI (MVVM, `@Observable`) |
| Language | Swift 6.2, strict concurrency, iOS 18+ |
| Audio | AudioKit (pitch detection), AVAudioEngine (MIDI playback) |
| Notation | abcjs 6.5.2 via WKWebView (`ABCNotationView` + `ABCConverter`) |
| Storage | SwiftData (`LickPreference`, `UserProfile`, `LickMastery`, `ModuleProgress`) |
| Deps | AudioKit 5.6+, SoundpipeAudioKit 5.7+ (SPM) |

## Core Patterns

- Licks are **interval-based** (semitones from root), not absolute pitches — key-agnostic
- `LickElement`: `.note(interval:value:)` or `.rest(value:)` — licks use `elements: [LickElement]`, not `notes`
- `ABCConverter` converts `Lick` → ABC notation; `ABCNotationView` renders via WKWebView + abcjs
- `Instrument` struct with 10 presets, injected via `@Environment(\.instrument)` from `ContentView`
- `LickPreferenceStore` — per-lick octave offset and tempo (SwiftData)
- `UserProfile` — instrument selection and autoRecord preference (SwiftData)
- `LickMastery` + `MasteryStore` — card progression per lick per key; medals from completed key count
- `Medal` (bronze/silver/gold) + `KeyStatus` live in `LickMastery.swift`
- `LickCatalog.shared` — lick lookup by ID, tag, collection, or search
- `Lesson.generate(for:in:)` — fixed 5-card session: Learn → Play → Listen → Listen → Listen
- Xcode `PBXFileSystemSynchronizedRootGroup` — new .swift files auto-discovered

## 4-Tab Navigation

| Tab | View | Purpose |
|-----|------|---------|
| Licktionary | `LicktionaryView` | Search/filter licks by name and tag |
| Lessons | `DiscoverView` | Browse collections, select key, start sessions |
| Library | `LibraryHomeView` | Active learning paths with progress |
| Profile | `ProfileView` | Instrument, mastery stats, medals |

## Session Flow

`DiscoverView` → `ModuleDetailView` (key picker + lick rows w/ medals) → tap lick → `SessionView` (5 cards) → `SessionCompleteView`

Card sequence: **Learn** (see + hear) → **Play** (see + record) → **Listen** × 3 (hear + record)

## Medals

Per-lick, based on keys completed: Bronze (1), Silver (6), Gold (12). Module-level medals deferred.

## Related

- `.claude/rules/music-types.md` — type definitions (auto-applies to Swift files)
- `.claude/rules/audio-pitch.md` — audio engine (auto-applies to Audio/Session paths)
- `write-lick` skill — authoring new licks
