# Project Plan: Lesson System Restructure

GitHub Issue: lichliter/DuoJazz#29

## Overview

Restructure from "mixed 8-card sessions across all licks in a collection" to "focused 5-card sessions for one lick in one key." Medals move from module-level to per-lick (based on keys completed). Users pick a specific lick and key from the module detail screen, then play: Learn → Play → Listen → Listen → Listen.

## Decisions

- **Session**: 5 cards per lick per key — Learn → Play → Listen → Listen → Listen
- **Medals**: Per-lick based on completed keys — Bronze = 1, Silver = 6, Gold = 12
- **No gating**: Any key in any order, replay completed keys anytime
- **Flow**: DiscoverView → ModuleDetailView (key picker at top + lick rows with per-lick medals) → tap lick → SessionView (5 cards for that lick in selected key)
- **Module medals**: deferred — only per-lick medals for now

## Task Checklist

### Phase 1: Model Layer — Medal & Lesson Changes
_Update models so the new medal/session logic compiles. No view changes yet._

- [ ] **1.1** Add `completedKeyCount(for lickId:)` to `MasteryStore` — count keys where `highestCardType >= 3`
- [ ] **1.2** Add `medal(for lickId:)` to `MasteryStore` — Bronze/Silver/Gold from completed key count
- [ ] **1.3** Add `keyStatus(for lickId:, key:)` to `MasteryStore` — completed/inProgress/notStarted
- [ ] ~~**1.4** Module medals~~ — deferred
- [ ] ~~**1.5** Module progress~~ — deferred
- [ ] **1.6** Simplify `Lesson.generate()` — new sig: `generate(for lickId:, in moduleId:)`, always returns 5 fixed cards
- [ ] **1.7** Remove `.quiz` case from `LessonCard` enum
- [ ] **1.8** Move `Medal`, `KeyStatus` from `ModuleProgress.swift` → `LickMastery.swift`
- [ ] **1.9** Tests for new MasteryStore methods + simplified Lesson.generate

### Phase 2: Session Flow
_Wire the new single-lick session through session infrastructure._

- [ ] **2.1** Simplify `SessionViewModel.nextCard()` — remove `ModuleProgressStore` call, keep `MasteryStore.complete()`
- [ ] **2.2** Remove quiz card routing from `SessionView`
- [ ] **2.3** Update `SessionCompleteView` — show lick name, key, medal progress
- [ ] **2.4** Delete `QuizCardView.swift` and remove `.quiz` from `CardBadge`

### Phase 3: ModuleDetailView Rework
_Replace key-picker + 5-lesson-rows with lick rows that each have their own key grid._

- [ ] **3.1** Redesign `ModuleDetailView` — keep key picker at top, replace lesson rows with lick rows showing per-lick medals
- [ ] **3.2** Extract `LickRowView` component — lick name, per-lick medal for selected key, tap to start session
- [ ] **3.3** Keep `KeyPillSelector` at module level — update to use `MasteryStore.keyStatus` per lick (show key as completed when ALL licks completed in that key)
- [ ] **3.4** Remove old internals: `lessonStates`, `LessonSlotState`, `LessonRowContent`, `startLesson()`
- [ ] **3.5** Update session launch — generate `Lesson.generate(for: lickId)` inline, pass selected key

### Phase 4: DiscoverView & ProfileView Updates
_Switch from ModuleProgressStore to MasteryStore everywhere._

- [ ] **4.1** Update `DiscoverView` — remove ModuleProgressStore usage, simplify to just show collection info
- [ ] **4.2** Update `ProfileView` — remove ModuleProgressStore medal summary (defer until module medals added back)

### Phase 5: Deprecate ModuleProgress
_Remove ModuleProgress model now that nothing references it._

- [ ] **5.1** Remove `ModuleProgressStore` struct
- [ ] **5.2** Remove `ModuleProgress` @Model class
- [ ] **5.3** Remove `ModuleProgress.self` from SwiftData model container in `DuoJazzApp.swift`
- [ ] **5.4** Delete `ModuleProgress.swift`

### Phase 6: Docs & Verification
- [ ] **6.1** Update CLAUDE.md — new session flow, card types, medal system, remove ModuleProgress refs
- [ ] **6.2** Update `.claude/rules/music-types.md` — remove `.quiz`, update Lesson description
- [ ] **6.3** Full test suite + build verification on iPad simulator

## Key Design Notes

**No schema migration needed** — `LickMastery.highestCardType == 3` already means "listen completed" = "key completed." Existing data is fully compatible.

**ModuleProgress data orphaned safely** — removing from model container means SwiftData ignores it. Data stays in SQLite but is harmless.

**View file limit** — ModuleDetailView (320 lines) must be decomposed. LickRowView extraction handles this.

**Replay is safe** — `MasteryStore.complete()` only advances, never regresses. Replaying a completed key no-ops on mastery.

## Files Changed

| File | Action |
|------|--------|
| `Core/Models/LickMastery.swift` | Add medal/keyStatus/module methods; receive Medal/KeyStatus types |
| `Core/Models/Lesson.swift` | Simplify generate(), remove .quiz |
| `Core/Models/ModuleProgress.swift` | Delete (after moving types out) |
| `Features/Discover/ModuleDetail/ModuleDetailView.swift` | Complete rework |
| `Features/Discover/ModuleDetail/Components/LickRowView.swift` | New |
| `Features/Discover/Session/SessionView.swift` | Remove quiz routing |
| `Features/Discover/Session/SessionViewModel.swift` | Remove ModuleProgressStore |
| `Features/Discover/Session/SessionCompleteView.swift` | Add lick/key context |
| `Features/Discover/Session/Cards/QuizCardView.swift` | Delete |
| `Features/Discover/DiscoverView.swift` | Switch to MasteryStore |
| `Features/Profile/ProfileView.swift` | Switch to MasteryStore |
| `DuoJazzApp.swift` | Remove ModuleProgress from container |
| `CLAUDE.md` | Update architecture docs |
