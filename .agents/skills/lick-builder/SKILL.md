---
name: lick-builder
description: Build or revise a DuoJazz lick from dictated notes, rhythm, notation, or a recording, then add musically justified integrations and verify notation, playback, transposition, and grading. Use for new lick ideas and corrections in the DuoJazz environment. A general theory question alone does not request a library change.
---

# Lick Builder

Turn a musical idea into a playable DuoJazz lesson while preserving the musician's intended phrase.

## Establish the phrase

1. Read the workspace and repository `AGENTS.md`, `README.md`, and the current registry and practice catalog. Use the actual checkout layout; do not assume an old `browser-prototype/` directory. Preserve existing edits. Follow the current product guidance and release authorization rather than adding an approval process here.
2. Distinguish an original phrase, a simplified adaptation, and an exact transcription. Record the source title, artist, approximate timestamp, and uncertainty when supplied. A source recording provides context; it does not override a user-approved adaptation. Never claim to have listened to or verified audio from metadata, a screenshot, or a playback schedule.
3. Establish the ordered pitches, octave contour, durations in quarter-note beats, entrance position, rests, and ties. Ask only about material missing information. “On the and” needs a beat number. A note held across a beat is one sounding event, even if engraving splits it into tied notes.
4. Count the durations before choosing barlines. Separate the phrase length, starting offset, and remaining rests from the source recording's meter. For example, seven sounding beats beginning on & of 1 fit two 4/4 bars with an eighth rest at each end. That arithmetic does not establish the source's time signature.
5. When verbal rhythm is uncertain, make a short click-backed demo with a count-in, stated tempo, and explicit straight/swing feel. Use the user's correction as evidence; do not keep requesting confirmation after the notes and rhythm are settled. Apply corrections to the reference data, app, examples, tests, and any demo still linked as current.

## Establish the harmonic applications

1. Identify the intended tonal center before assigning chord functions. Starting or ending on a pitch does not make it the tonic. Map every note to a degree, preserving register and contour. A partial lick can belong to several scales; distinguish a stated scale from one uniquely implied by its pitches.
2. Check musical claims against reliable teaching or source material. Use the user's verified chart, or corroborated chart sources, for actual changes. Never generate a tune's changes from memory or treat an automatic chord transcription as definitive. Existing repository charts may be reused without rewriting their harmony.
3. Select a small set of useful applications. Explain what the notes do over each chord and where the phrase lands. Check duration, chord transitions, held notes, conflicting sevenths, altered fifths, and extensions across the whole phrase. A broad “minor” or “dominant” family match can be too permissive.
4. Give each application an accurately attributed practice vamp or cadence even when no chart fits. Match only genuine compatible passages in the current chart library. Do not force a long phrase into short changes or invent a familiar chart to populate the picker.
5. Keep proposed reharmonizations separate from the approved home sound. Adding integrations does not authorize altering the user's melody. Make a distinct, labelled version if an application needs changed notes or rhythm.

## Implement in the existing app

- In `js/registry.js`, register the lick, isolated form, learn application, and module. Use stable unique IDs and preserve existing module ordering and progress keys. Master lessons are generated from Learn; avoid duplicating that mechanism.
- Store intervals relative to the musical tonic, with explicit rests and the correct negative intervals for notes below it. Keep `pickupBeats` at zero for an entrance inside bar 1; use a rest for & of 1. Use `pickupBeats` only for a true pre-bar pickup, and mark each pickup note with `pickup: true` (e.g., `N(-1, 0.5, { diatonicStep: -1, pickup: true })`).
- Use the existing instrument register, spelling, transposition, and octave helpers. Do not hard-code one instrument's written pitches or overwrite global playback preferences.
- When a scale degree needs a particular letter after transposition, add `diatonicStep` to the note, measured in letter steps from its local tonic (leading tone below = −1). Check names and both MEI and ABC engraving, not only MIDI: F♯ → G expresses a leading tone; G♭ → G obscures it.
- Register integrations through `additionalDefinitions` in the practice catalog. Each variant specifies the complete chord-root/family/duration pattern and the phrase elements. Optional pattern `qualities` restrict acceptable chart qualities; optional `quality` selects the example's backing chord. Choose an example quality that satisfies its own restriction.
- Let the catalog produce the application choices, examples, and chart placements. Give user-derived examples their own `source` and `exampleTitle`; do not label them workbook material. Keep copy meaningful after transposition.
- Document the accepted musical contract and provenance under `references/lick-drafts/` or the existing owning reference. Update its status when implemented. Keep private uploads and generated media outside versioned app assets unless explicitly requested.

## Verify and finish

1. Check the user-approved pitches, contour, starts, and durations through both `phraseNotes` and scheduled melody events. Verify trailing rests and the intended loop length. Test all 12 keys, concert bass clef, B-flat transposition, and lead-only octave changes.
2. Exercise Learn and Master grading with correct and incorrect synthetic tracks. Confirm integration playback includes the model only for demonstration and does not earn mastery.
3. Test real matching chart placements and rejection cases: insufficient duration, wrong root movement, incompatible qualities, and a chord change during the final held note. Verify example chords and labels as well as chart lessons.
4. Run the repository's required checks and follow [Verify App](../verify-app/SKILL.md). Open the actual app via guest mode or an isolated browser profile with mocked authentication. Walk picker → Learn → Master → each integration → matching chart. Check playback, cancellation, key changes, and return navigation. Inspect phone (`390×844`) and iPad/wide (`820×1180` or `1100×950`) views; capture evidence from the changed app.
5. Bump the changed `?v=` asset query parameter(s) in `index.html` (and any versioned imports touched in `js/app.js`), then run `node tools/generate-precache.mjs` after app/asset changes. Review the final diff and verify `precache.js` is current.
6. Follow the repository's authorized release workflow, reporting the actual commit/PR/deployment status. Summarize the lick and integrations, link the useful result and evidence, and distinguish automated/browser checks from real-device microphone or listening verification. This skill grants no additional permissions.

## Worked reference

`references/lick-drafts/lotus-inspired.json` records a simplified phrase inspired by Shaun Martin's *Lotus*. Brian confirmed the rhythm, corrected the final note to C, and identified F harmonic minor as the intended sound. Its F-relative intervals are `-1, 0, 2, 3, 2, 0, -1, 2, 0, -5`; the opening E and final C are below F. Preserve that approved adaptation without claiming it transcribes the original recording's meter. This is an example, not a universal rhythm, key, or integration template.
