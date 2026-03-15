# Project Plan: DuoJazz Tablet-First Pivot

## Overview
Pivot DuoJazz from a phone-first prototype to a tablet-first (iPad, 1024x1366) jazz learning app. The app will have 4 main tabs (Licktionary, Discover, Library, Profile) and a new data model hierarchy: Lick -> Collection -> Lesson. The designs already exist in the .pen file; this plan covers the Swift implementation work.

## What Already Exists (Keep)
- **Core Music Models**: Key, KeyOption, Pitch, NoteName, LickNote, NoteValue, Clef, ChordSymbol, ChordQuality, ChordProgression, Lick, NoteSpeller
- **Audio**: LickPlayer (AVFoundation with swing/humanization/velocity dynamics), SwingCalculator
- **Notation**: VexFlowNotationView + VexFlowWebView (WKWebView-based), vexflow.html, ClefPicker, KeyPicker, OctaveControl, PlayButton
- **Views**: LickDetailView, LibraryView (basic list), ContentView (splash/nav), StaffNotationView (legacy Canvas-based, to be removed)
- **Data**: BuiltInLicks with 1 lick (shortIIVI)

## What Needs to Change
- ContentView: replace splash screen with TabView-based 4-tab navigation
- LibraryView: repurpose from simple lick list to collection/path management screen
- LickDetailView: adapt layout for tablet-sized screens
- Add Collection and Lesson data models
- Add lesson card stack UI (Learn, Play, Listen, Quiz cards)
- Add 10+ licks across multiple collections
- Add pitch detection for Play/Listen cards
- Add SwiftData persistence for user progress
- Remove StaffNotationView (replaced by VexFlow)

## Requirements Summary
- Target: iPad (1024x1366), iOS 18+, Swift 6.2
- Architecture: MVVM with @Observable, SwiftUI
- 4 tabs: Licktionary (search/browse), Discover (collections/lessons), Library (active paths/progress), Profile (stats/settings)
- Lesson card types: Learn (see notation + hear), Play (see notation, record), Listen (hear only, record), Quiz (free recall)
- Pitch detection via AudioKit for recording features
- All views max 100 lines; extract sub-views to Components/
- SwiftData for persistence; CloudKit deferred to later phase

---

## Task Checklist

### Phase 1: Data Model Layer (Lick -> Collection -> Lesson)
_Foundation that everything else builds on. No UI changes yet._

- [ ] Create `Core/Models/Tag.swift` - enum or struct for lick categorization
  - Cases: iiVI, blues, bebop, turnarounds, modal, chordTones, approachNotes, chromaticRuns, rhythmChanges
  - Conform to Hashable, Sendable, CaseIterable
  - Add displayName and SF Symbol icon for each tag

- [ ] Add `tags: [Tag]` property to Lick struct
  - Replace the existing `category: String` with typed tags
  - Update BuiltInLicks.shortIIVI to use tags
  - Keep backward compatibility during transition (category can derive from first tag)

- [ ] Create `Core/Models/Collection.swift` - a curated group of licks
  - Properties: id (String), name, description, tags ([Tag]), lickIds ([String]), difficulty (beginner/intermediate/advanced), imageName (optional SF Symbol)
  - Computed: lickCount, licks (resolved from catalog)
  - Conform to Identifiable, Sendable

- [ ] Create `Core/Models/Lesson.swift` - a structured learning session from a collection
  - Properties: id, collectionId, cards ([LessonCard])
  - LessonCard enum: learn(lickId), play(lickId), listen(lickId), quiz(lickId)
  - Factory method: generate lesson from a collection (order: learn -> play -> listen for each lick)

- [ ] Create `Core/Models/MasteryState.swift` - mastery tracking enum
  - Cases: locked, learning, mastered, legendary
  - Properties: displayName, color (Color), iconName (SF Symbol)

- [ ] Create `Core/Models/UserProfile.swift` - user settings and stats (non-persisted struct for now)
  - Properties: instrument (String), transposition (Key), currentStreak (Int), totalLicksMastered (Int)
  - Computed: masteryPercentage, masteryBreakdown

- [ ] Expand `Data/Licks/BuiltInLicks.swift` with 10+ licks
  - Add at least 4-5 ii-V-I licks of varying difficulty
  - Add 2-3 Blues licks
  - Add 2-3 Bebop vocabulary licks
  - Each lick needs: unique id, name, tags, notes (intervals), chord progression
  - All licks stored as intervals (key-agnostic, existing pattern)

- [ ] Create `Data/Collections/BuiltInCollections.swift`
  - "ii-V-I Essentials" collection (8-12 licks, intermediate)
  - "Blues Basics" collection (6-8 licks, beginner)
  - "Bebop Essentials" collection (6-8 licks, intermediate)
  - Static catalog with all collections
  - Each collection references lick IDs from BuiltInLicks

- [ ] Create `Data/LickCatalog.swift` - central lick lookup
  - Dictionary-based lookup: id -> Lick
  - Method: licks(for collection) -> [Lick]
  - Method: licks(withTag tag) -> [Lick]
  - Method: search(query) -> [Lick] (name/tag matching)

- [ ] Write tests for data model layer
  - Test Lick tag filtering
  - Test Collection -> Lick resolution
  - Test Lesson card generation from collection
  - Test LickCatalog search and lookup

### Phase 2: Tab Navigation Shell + Licktionary Tab
_Get the tablet layout working with the first tab fully functional._

- [ ] Replace ContentView with TabView-based root navigation
  - 4 tabs: Licktionary, Discover, Library, Profile
  - Use SF Symbols matching design: books.vertical, safari, rectangle.stack, person.circle
  - Each tab wraps its own NavigationStack
  - Tab bar style matching .pen design (bottom tab bar)

- [ ] Create `Features/Licktionary/LicktionaryView.swift` (Licktionary Home)
  - Search bar at top (bound to search query state)
  - Recent searches section (hardcoded initially, persisted later)
  - Favorites section (horizontal scroll of LickCards)
  - Browse by Category grid (Tag-based navigation)
  - ViewModel: LicktionaryViewModel with search, filter, favorites logic

- [ ] Create `Features/Licktionary/LicktionaryViewModel.swift`
  - @Observable class
  - Properties: searchQuery, searchResults, recentSearches, favorites, categories
  - Methods: search(query), addToFavorites(lick), removeFromFavorites(lick)
  - Pulls from LickCatalog

- [ ] Create `Features/Licktionary/LickListView.swift` (filtered lick results)
  - Grid layout of LickCards
  - Sections grouped by mastery state: Learning, Mastered, Legendary, New
  - Section headers with lick count
  - Navigation to LickDetailView on tap

- [ ] Create `Features/Licktionary/Components/LickCardView.swift` (reusable lick card)
  - Notation preview (small VexFlowNotationView or static image)
  - Lick name, tags as pills/badges
  - Mastery indicator (color dot or badge)
  - Sized for grid layout on tablet

- [ ] Create `Features/Licktionary/TagFilterModal.swift` (tag filter sheet)
  - Grid of tag toggles
  - Apply/clear buttons
  - Presented as sheet from LickListView

- [ ] Adapt LickDetailView for tablet layout
  - Move from Features/LickDetail/ to Features/Licktionary/LickDetail/ (or keep and import)
  - Wider notation display taking advantage of tablet width
  - Key picker, clef picker, octave control in a horizontal toolbar row
  - Larger play button
  - Keep existing VexFlowNotationView integration

- [ ] Create placeholder views for remaining 3 tabs
  - DiscoverView: "Coming in Phase 3" placeholder with tab icon
  - LibraryView: "Coming in Phase 4" placeholder (repurpose existing)
  - ProfileView: "Coming in Phase 5" placeholder

### Phase 3: Discover Tab + Lesson Card Stack
_The core learning experience: browsing collections and going through lessons._

- [ ] Create `Features/Discover/DiscoverView.swift` (Discover Home)
  - "Continue Learning" hero card at top (shows current in-progress collection)
  - Key picker on continue card
  - Lesson progress indicator (e.g., "5/12")
  - "Continue Session" button
  - Browse Collections grid below
  - "Explore All Collections" button

- [ ] Create `Features/Discover/DiscoverViewModel.swift`
  - @Observable class
  - Properties: currentCollection, currentLesson, allCollections, lessonProgress
  - Methods: startCollection(collection), continueLesson(), completeCard()

- [ ] Create `Features/Discover/Components/CollectionCardView.swift`
  - Collection name, lick count, difficulty badge
  - Tags as pills
  - Progress bar (if started)
  - "Start" or "Continue" button

- [ ] Create `Features/Discover/Session/SessionView.swift` (card stack container)
  - Manages the card stack flow (progress through LessonCards)
  - Progress bar at top (current card / total cards)
  - Card type badge (LEARN / PLAY / LISTEN / QUIZ)
  - Navigation: next card, complete session
  - Presented modally or as full-screen push from Discover

- [ ] Create `Features/Discover/Session/SessionViewModel.swift`
  - @Observable class
  - Properties: lesson, currentCardIndex, cardResults, isSessionComplete
  - Methods: nextCard(), previousCard(), recordResult(for card), completeSession()
  - Generates Lesson from Collection on session start

- [ ] Create `Features/Discover/Session/Cards/LearnCardView.swift` (LEARN card)
  - Badge: "LEARN" in blue
  - VexFlowNotationView showing the lick notation
  - "Hear Reference" button (plays the lick via LickPlayer)
  - Key picker (which key to learn in)
  - "Got It" / "Next" button to advance
  - Passive learning - no recording

- [ ] Create `Features/Discover/Session/Cards/PlayCardView.swift` (PLAY card)
  - Badge: "PLAY" in green
  - VexFlowNotationView showing notation (user reads and plays along)
  - "Start Recording" button
  - Progress bar showing recording state
  - Visual feedback: notes light up green/red as pitch is detected
  - Dependencies: Phase 6 (Pitch Detection) for full functionality; stub recording UI first

- [ ] Create `Features/Discover/Session/Cards/ListenCardView.swift` (LISTEN card)
  - Badge: "LISTEN" in orange
  - NO notation displayed (blank or "???")
  - "Hear Reference" button (plays the lick once)
  - "Start Recording" button
  - Progress indicator during recording
  - Dependencies: Phase 6 (Pitch Detection) for recording; stub UI first

- [ ] Create `Features/Discover/Session/Cards/QuizCardView.swift` (QUIZ card)
  - Badge: "QUIZ" in purple
  - No notation, no audio reference
  - "Start Recording" button (play from memory)
  - Success/failure feedback after recording
  - Dependencies: Phase 6 (Pitch Detection); stub UI first

- [ ] Create `Features/Discover/Session/Components/CardBadge.swift`
  - Reusable badge component: LEARN (blue), PLAY (green), LISTEN (orange), QUIZ (purple)

- [ ] Create `Features/Discover/Session/Components/RecordButton.swift`
  - Animated recording button (idle -> recording -> processing states)
  - Microphone icon with pulse animation when recording

- [ ] Create session completion view
  - Summary of cards completed
  - Score / accuracy if applicable
  - "Continue" or "Back to Discover" navigation

### Phase 4: Library Tab (Learning Paths + Progress)
_User's personal collection management and progress tracking._

- [ ] Create `Features/Library/LibraryHomeView.swift` (replaces old LibraryView)
  - "Choose Your Path" header
  - Learning path cards in a grid
  - Each card: collection name, lick count, difficulty, progress bar
  - "Continue Path" for in-progress, "Start Path" for new
  - "+ Create Custom Path" button (deferred functionality, show button)

- [ ] Create `Features/Library/LibraryViewModel.swift`
  - @Observable class
  - Properties: activePaths (collections user has started), availablePaths, progressByCollection
  - Methods: startPath(collection), resumePath(collection)

- [ ] Create `Features/Library/Components/PathCardView.swift`
  - Collection name, difficulty badge (beginner/intermediate/advanced)
  - Lick count (e.g., "8 licks")
  - Progress bar with fraction (e.g., "5/8")
  - "Continue Path" / "Start Path" button
  - Color-coded by difficulty

### Phase 5: Profile Tab (Stats + Settings)
_User identity, instrument configuration, and progress overview._

- [ ] Create `Features/Profile/ProfileView.swift` (Profile Home)
  - Mastery percentage (large circular indicator, e.g., "12%")
  - "X of Y licks mastered" subtitle
  - Instrument display (e.g., "Alto Saxophone")
  - Transposition setting (e.g., "Eb")
  - Streak display (e.g., "5 day streak")
  - Mastery breakdown: legendary / mastered / learning / new counts

- [ ] Create `Features/Profile/ProfileViewModel.swift`
  - @Observable class
  - Properties: userProfile, masteryBreakdown, streak
  - Methods: updateInstrument(), updateTransposition()

- [ ] Create `Features/Profile/Components/MasteryRing.swift`
  - Circular progress indicator showing overall mastery %
  - Animated fill

- [ ] Create `Features/Profile/Components/MasteryBreakdown.swift`
  - Horizontal bar or grid showing legendary/mastered/learning/new counts
  - Color-coded by mastery state

### Phase 6: Pitch Detection (AudioKit)
_Enable the recording/play-along features in Play, Listen, and Quiz cards._

- [ ] Add AudioKit and SoundpipeAudioKit as Swift Package Manager dependencies
  - AudioKit 5.6+
  - SoundpipeAudioKit 5.6+

- [ ] Create `Core/Audio/PitchDetector.swift`
  - Wraps AudioKit's PitchTap for real-time pitch tracking
  - Properties: detectedPitch (MIDI number), amplitude, isListening
  - Methods: start(), stop()
  - Callback: onPitchDetected((midi: Int, amplitude: Float) -> Void)
  - Pitch tolerance: +/- 50 cents default (configurable)

- [ ] Create `Core/Audio/AudioSessionManager.swift`
  - Configure AVAudioSession for playAndRecord
  - Handle microphone permission requests
  - Mode: .measurement for accurate pitch detection
  - Options: .defaultToSpeaker, .allowBluetooth

- [ ] Create `Core/Audio/PitchMatcher.swift`
  - Compare detected pitches to expected lick notes
  - Track which notes have been correctly played
  - Properties: expectedNotes, matchedNotes, accuracy (0.0-1.0)
  - Method: evaluate(detectedMidi: Int) -> MatchResult (correct/incorrect/tooHigh/tooLow)

- [ ] Create `Core/Audio/RecordingSession.swift`
  - Manages a recording attempt for a card
  - Starts PitchDetector, collects pitches, compares to expected lick
  - Properties: isRecording, progress (0.0-1.0), result (pass/fail/partial)
  - Coordinates PitchDetector + PitchMatcher

- [ ] Integrate PitchDetector into PlayCardView
  - "Start Recording" begins pitch detection
  - Notes on VexFlowNotationView highlight green (correct) or red (incorrect)
  - Progress bar advances as notes are matched
  - Auto-stop when all notes matched or timeout

- [ ] Integrate PitchDetector into ListenCardView
  - Same recording flow but without notation visible
  - Audio feedback only (correct/incorrect sounds)

- [ ] Integrate PitchDetector into QuizCardView
  - No reference audio, no notation
  - Record and evaluate against expected pitches

- [ ] Write tests for pitch matching logic
  - Test exact pitch match
  - Test within tolerance (e.g., 40 cents sharp)
  - Test outside tolerance
  - Test full lick matching sequence

### Phase 7: SwiftData Persistence
_Save user progress, favorites, and settings locally._

- [ ] Create `Models/LickProgressRecord.swift` (SwiftData @Model)
  - Properties: lickId, keyString, masteryState, lastPracticed, nextReview, correctStreak
  - Relationship to UserRecord

- [ ] Create `Models/CollectionProgressRecord.swift` (SwiftData @Model)
  - Properties: collectionId, startedDate, lastLessonIndex, completedLickIds
  - Computed: progress (fraction complete)

- [ ] Create `Models/UserRecord.swift` (SwiftData @Model)
  - Properties: instrument, transpositionKey, streakCount, lastPracticeDate
  - Relationships: lickProgress, collectionProgress

- [ ] Create `Models/FavoriteRecord.swift` (SwiftData @Model)
  - Properties: lickId, addedDate

- [ ] Configure SwiftData ModelContainer in DuoJazzApp
  - Register all @Model types
  - Pass modelContainer via .modelContainer() modifier on WindowGroup

- [ ] Create `Core/Persistence/ProgressStore.swift`
  - Abstraction over SwiftData queries
  - Methods: getMasteryState(lickId, key), updateMastery(lickId, key, state), getFavorites(), toggleFavorite(lickId)
  - Injected via @Environment into ViewModels

- [ ] Wire persistence into LicktionaryViewModel (favorites, mastery states)
- [ ] Wire persistence into DiscoverViewModel (lesson progress)
- [ ] Wire persistence into LibraryViewModel (path progress)
- [ ] Wire persistence into ProfileViewModel (stats, settings)

### Phase 8: Polish and Remaining VexFlow Improvements
_Carry forward unfinished notation improvements from the previous plan._

- [ ] Implement note beaming in vexflow.html
  - Use VexFlow Beam.generateBeams() for eighth note beaming
  - Configure beam groups based on time signature

- [ ] Implement key-signature-aware accidentals
  - Only show accidentals for notes outside the key signature
  - Handle courtesy/cautionary accidentals

- [ ] Add loading state for VexFlowWebView
  - Show placeholder while WebView initializes

- [ ] Remove StaffNotationView.swift (legacy Canvas-based notation)
  - Fully replaced by VexFlowNotationView

- [ ] Dark mode polish across all tablet views
- [ ] Accessibility: VoiceOver labels for all interactive elements
- [ ] iPad keyboard shortcut support (spacebar to play, arrow keys for navigation)

---

## Project Structure (Target)

```
DuoJazz/
├── DuoJazz/
│   ├── App/
│   │   ├── DuoJazzApp.swift
│   │   └── ContentView.swift              # TabView root (4 tabs)
│   │
│   ├── Features/
│   │   ├── Licktionary/
│   │   │   ├── LicktionaryView.swift       # Search/browse home
│   │   │   ├── LicktionaryViewModel.swift
│   │   │   ├── LickListView.swift          # Filtered grid results
│   │   │   ├── TagFilterModal.swift
│   │   │   ├── LickDetail/
│   │   │   │   ├── LickDetailView.swift    # Adapted for tablet
│   │   │   │   └── Components/
│   │   │   │       ├── VexFlowNotationView.swift
│   │   │   │       ├── ClefPicker.swift
│   │   │   │       ├── KeyPicker.swift
│   │   │   │       ├── OctaveControl.swift
│   │   │   │       └── PlayButton.swift
│   │   │   └── Components/
│   │   │       └── LickCardView.swift
│   │   │
│   │   ├── Discover/
│   │   │   ├── DiscoverView.swift          # Collection browsing
│   │   │   ├── DiscoverViewModel.swift
│   │   │   ├── Components/
│   │   │   │   └── CollectionCardView.swift
│   │   │   └── Session/
│   │   │       ├── SessionView.swift       # Card stack container
│   │   │       ├── SessionViewModel.swift
│   │   │       ├── Cards/
│   │   │       │   ├── LearnCardView.swift
│   │   │       │   ├── PlayCardView.swift
│   │   │       │   ├── ListenCardView.swift
│   │   │       │   └── QuizCardView.swift
│   │   │       └── Components/
│   │   │           ├── CardBadge.swift
│   │   │           └── RecordButton.swift
│   │   │
│   │   ├── Library/
│   │   │   ├── LibraryHomeView.swift
│   │   │   ├── LibraryViewModel.swift
│   │   │   └── Components/
│   │   │       └── PathCardView.swift
│   │   │
│   │   └── Profile/
│   │       ├── ProfileView.swift
│   │       ├── ProfileViewModel.swift
│   │       └── Components/
│   │           ├── MasteryRing.swift
│   │           └── MasteryBreakdown.swift
│   │
│   ├── Core/
│   │   ├── Audio/
│   │   │   ├── LickPlayer.swift            # Existing
│   │   │   ├── SwingCalculator.swift        # Existing
│   │   │   ├── PitchDetector.swift          # New (Phase 6)
│   │   │   ├── AudioSessionManager.swift    # New (Phase 6)
│   │   │   ├── PitchMatcher.swift           # New (Phase 6)
│   │   │   └── RecordingSession.swift       # New (Phase 6)
│   │   │
│   │   ├── Music/
│   │   │   ├── Key.swift                    # Existing
│   │   │   ├── Pitch.swift                  # Existing
│   │   │   ├── Lick.swift                   # Existing (add tags)
│   │   │   ├── LickNote.swift               # Existing
│   │   │   ├── NoteValue.swift              # Existing
│   │   │   ├── NoteSpeller.swift            # Existing
│   │   │   ├── Clef.swift                   # Existing
│   │   │   ├── ChordSymbol.swift            # Existing
│   │   │   ├── ChordQuality.swift           # Existing
│   │   │   └── ChordProgression.swift       # Existing
│   │   │
│   │   ├── Models/
│   │   │   ├── Tag.swift                    # New (Phase 1)
│   │   │   ├── Collection.swift             # New (Phase 1)
│   │   │   ├── Lesson.swift                 # New (Phase 1)
│   │   │   ├── MasteryState.swift           # New (Phase 1)
│   │   │   └── UserProfile.swift            # New (Phase 1)
│   │   │
│   │   └── Persistence/
│   │       └── ProgressStore.swift          # New (Phase 7)
│   │
│   ├── Models/                              # SwiftData @Model (Phase 7)
│   │   ├── LickProgressRecord.swift
│   │   ├── CollectionProgressRecord.swift
│   │   ├── UserRecord.swift
│   │   └── FavoriteRecord.swift
│   │
│   ├── Data/
│   │   ├── Licks/
│   │   │   └── BuiltInLicks.swift           # Existing (expand)
│   │   ├── Collections/
│   │   │   └── BuiltInCollections.swift     # New (Phase 1)
│   │   └── LickCatalog.swift                # New (Phase 1)
│   │
│   └── Resources/
│       ├── vexflow.html                     # Existing
│       └── Assets.xcassets
│
├── DuoJazzTests/
│   ├── DataModelTests.swift                 # Phase 1 tests
│   └── PitchMatcherTests.swift              # Phase 6 tests
│
└── DuoJazz.xcodeproj
```

## Notes and Considerations

### Tablet-First Design Decisions
- All layouts target 1024x1366 (iPad Pro 12.9") as primary, adapting down to 1024x768 (iPad 9th gen)
- Phone support is explicitly deprioritized; the app may work on phone but layouts are not optimized for it
- Take advantage of tablet width: notation can be wider, controls can sit beside content rather than stacked vertically
- Consider iPad as music stand use case (landscape orientation may be important for notation)

### Phase Dependencies
- Phase 1 (Data Models) must complete before Phases 2-5
- Phase 2 (Tab Shell + Licktionary) can start as soon as Phase 1 is done
- Phases 3, 4, 5 can proceed in parallel once Phase 2 establishes the tab structure
- Phase 6 (Pitch Detection) is independent of UI phases but integrates into Phase 3 cards
- Phase 7 (Persistence) can start anytime but integrates last since ViewModels need to exist first
- Phase 8 (Polish) is ongoing and can happen at any point

### Risk Areas
- AudioKit pitch detection accuracy on iPad mic vs external mic - test early on real hardware
- VexFlowWebView performance with many licks displayed in grid (LickCardView) - may need static image snapshots
- WebView initialization time for notation - consider pre-warming or caching strategies
- Lick content creation is time-consuming - start with a minimum viable catalog (10-12 licks) across 2-3 collections

### Carry-Forward from Previous Plan
The previous PLAN.md had notation improvements (beaming, rests, key-signature accidentals) that were partially completed. The rest handling is now implemented in VexFlowNotationView. Remaining items (beaming, accidental refinement) are captured in Phase 8.

## Change Log
- 2026-03-15: Complete rewrite for tablet-first pivot. Replaced VexFlow-focused plan with 8-phase app development plan covering data models, 4-tab UI, lesson card stack, pitch detection, and persistence.
