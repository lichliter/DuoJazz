# DuoJazz

A browser app for learning jazz licks — from visual learning to notation reading to playing by ear across all 12 keys. Built with plain HTML, CSS, and JavaScript, Web Audio, and Verovio notation rendering.

## Run locally

From the repository root, with Node.js 22+ and Python 3 installed:

```bash
npm start
# open http://127.0.0.1:4173/
```

There are no npm dependencies to install and no build step. Alternatively, serve the repository with `python3 -m http.server 4173 --bind 127.0.0.1`.

```bash
npm test
# equivalent: node --test js/*.test.mjs
```

Microphone access needs localhost or HTTPS and a user gesture. Engraved notation loads Verovio from `https://www.verovio.org`; web fonts use `fonts.googleapis.com` and `fonts.gstatic.com`. Those hosts must be reachable for the full experience.

## Project layout

- `index.html`, `css/`, `js/` — application, music engine, practice flow, audio, and pitch detection.
- `js/*.test.mjs` — Node.js test suite, also run by GitHub Actions on Linux.
- `fonts/`, `icons/`, `manifest.webmanifest` — bundled fonts and installable web app assets.
- `sound/` — bundled instrument samples, manifest, and [sample credits](sound/CREDITS.md).
- `gallery.html` — UI gallery; `sound.html` — developer-only backing A/B comparison.
- `DuoJazz.pen`, `images/`, `references/`, `tools/` — design and notation reference material.

See [AGENTS.md](AGENTS.md) for contributor and coding-agent guidance.

## Practice and review links

- `/?screen=home`
- `/?screen=home&demo=path`
- `/?screen=setup&lesson=learn-lick`
- `/?screen=session&lesson=learn-lick&card=play`
- `/?screen=session&lesson=integrate-minor-home&card=play`
- `/?screen=wrapup&lesson=learn-lick&keys=fourths&demo=grades`
- `/?screen=home&demo=medal`
- `/?screen=session&lesson=learn-lick&card=play&mic=denied`

Lessons use New-simple sampled piano, bass, and ride kit for backing, plus the selected instrument for the demo line, with synth fallback. Demo progress links show temporary previews only; they never replace saved progress.

## Music

Source reference: [Essential Jazz Vocabulary Workbook — Bass Clef](references/workbooks/essential-jazz-vocabulary-bass-clef.pdf), supplied by the user. See the [workbook reference notes](references/workbooks/README.md) for attribution and the intended practice structure.

Recognizable **Cry Me a River** minor cell (`9–1–5–♭3–2–1`, one bar) over the **opening eight bars of Autumn Leaves** in concert G minor:

`| Cm7 | F7 | B♭maj7 | E♭maj7 | Am7♭5 | D7 | Gm6 | Gm6 |`

Chart variant: Ultimate Guitar `autumn-leaves-chords-4419731` (jbpicon, key Gm, capo none, Verse 1). Tonic bars are Gm6 as on that chart. This is not the tune’s head, and it is not DuoJazz `iivi-cry-me-enclosure`.

Two ways to use the same cell:

1. **Minor home** — minor-tonic shape on the i6 arrival (bar 7).
2. **Altered dominant** — the same cell a major third down over V7 (bar 6), then a composed resolution into i.

Application copy (shape, target chord, door) is derived from the current concert key. It is not hard-coded to G minor.

## Lesson flow

The library contains thirty modules from Essential Jazz Vocabulary. Each module has a winding path of record-sleeve lesson nodes. Tapping a sleeve starts its lesson using the current settings:

1. **Learn the lick** — play the isolated phrase with notation visible.
2. **Master the lick** — play the phrase from memory across the selected keys; Show notes is available when needed.
3. **Integrate** — practice the lick in a tune over looping backing. These lessons are ungraded.

Practice sleeves now represent harmonic applications, such as **Minor home** or **Altered dominant**. Selecting one opens the matching charts from **My charts**; if none match, the picker suggests available charts. Choose a chart to practice that application at its curated passage. Mixed-use passages are separated so notation and demo playback follow only the selected application.

**My charts**, at the top right of the home screen, shows only your added charts, with removal controls. Its Add chart button opens a separate searchable catalog. The selection is saved locally under `duojazz.myCharts.v1`, independently of existing settings and progress. Matching uses the existing curated placements for all thirty licks, rather than assuming every lick works in every selected chart. The grouping and placement variants live in `js/practice-catalog.js` and are registered in `js/registry.js`; the sheets live in `js/practice-ui.js`.

Settings are global and apply to the next lesson started: instrument, tempo, key selection and cycle, swing, metronome, and guide tones. Learn uses one key, Master cycles through the selected keys, and integration uses the tune's key. Each key has a single Play card, rather than a Learn → Play → Listen → Quiz sequence. Hear it plays a model demonstration; Record starts a graded attempt or the integration backing loop. Auto advances graded practice after a pass and retries after a miss.

Melody octave (−1 / Original / +1) moves only the model line and displayed phrase. The **Instrument** setting (default Piano) sets clef, written transposition, register, and demo samples. Skipping a key is not a pass. Pitch observations reset at the start of every card and every take.

Learn and Master use an ordered microphone note follower (YIN in an AudioWorklet): each target pitch must stay within ±50 cents for about 80 ms. Timing is not graded. A stable wrong pitch held for 120 ms fails the attempt; short transients are ignored. Learn, and Master after Show notes, require the displayed octave. Hidden-note Master accepts one consistent octave shift throughout the phrase. The initial eight-second no-sound timeout starts only when microphone capture is ready.

A key contributes to its module's medal only when Master is passed without revealing notes. Showing notes earns Learn credit instead. Bronze / Silver / Gold require 1 / 6 / 12 mastered keys. Progress and settings use the existing localStorage schemas. If browser storage is blocked or full, practice continues in memory and a warning explains that changes may not survive leaving the page.

## Scope and history

- No accounts, backend, or paid services.
- Real microphone accuracy needs a check on an iPad with a horn. Node tests cover grading and mocked audio lifecycles; `window.__DUOJAZZ__` exposes developer inspection and pitch-track helpers.
- The web app previously lived in `browser-prototype/`; it now runs directly from the repository root. Keep the same origin (including port) to retain browser-local progress and settings. Existing localStorage keys remain unchanged.
- The retired SwiftUI app, widget, native tests, and native-only tooling are preserved in Git history, not maintained alongside the web app. Use `git log --all --oneline -- DuoJazz/` to find the native project and inspect a commit before its removal with `git show <commit>:DuoJazz/DuoJazz/DuoJazzApp.swift`.
