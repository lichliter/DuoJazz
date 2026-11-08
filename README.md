# DuoJazz

A browser app for learning jazz licks — from visual learning to notation reading to playing by ear across all 12 keys. Built with plain HTML, CSS, and JavaScript, Web Audio, and Verovio notation rendering.

## Run locally

From the repository root, with Node.js 22+ and Python 3 installed:

```bash
npm start
# open http://127.0.0.1:4173/
```

There are no npm dependencies to install and no build step. The Supabase browser SDK is vendored at version 2.119.0 in `js/vendor/`, with its license. Alternatively, serve the repository with `python3 -m http.server 4173 --bind 127.0.0.1`.

```bash
npm test
# equivalent: node --test js/*.test.mjs
```

Microphone access needs localhost or HTTPS and a user gesture. Notation (Verovio 6.3.0), fonts, and instrument samples are served locally. After the first online visit finishes installing the service worker, the app can reopen and practice offline, including under a deployment subdirectory. Returning users can access their saved account’s local progress even if its access token has expired; sign-in and cloud sync require connectivity. Offline sign-out removes the local session. Progress sync retries on reconnect. Browser storage eviction or clearing site data requires another online visit.

The PWA manifest supports installation from the browser. Service-worker releases install atomically and activate after old app tabs close, avoiding mixed versions during practice. After any app/asset change, run `node tools/generate-precache.mjs` and commit `precache.js`; its content hash versions each release. The worker caches only the listed static assets, never account API responses.

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

Lessons use New-simple sampled piano, bass, and ride kit for backing, plus the selected instrument for the demo line, with synth fallback. Horn and guitar demos use recorded acoustic samples; piano and guitar retain short natural release tails. Source credits and conversion details are in `sound/CREDITS.md`. Demo progress links show temporary previews only; they never replace saved progress.

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

Practice sleeves represent harmonic applications, such as **Minor home** or **Altered dominant**. Selecting one opens matching **Favorite charts**, with other matching charts listed under **Suggested charts**. The favorites section offers **Manage** in its header, including when empty. Use **Version** for different starting degrees or forms of the cell. Choose a chart to practice that version at a matching passage. **Practice workbook example** is also available, including when no chart fits. Notation and demo playback use only the selected application and version.

The avatar opens Profile, where a **Charts** card shows your favorite-chart count. **Manage** opens the **Favorite charts** drawer over Profile, showing your added charts with removal controls; closing it returns to Profile. Its Add chart button sits above the saved charts and opens a separate searchable catalog. The selection is saved locally under `duojazz.myCharts.v1`, independently of existing settings and progress. Both pages of all thirty workbook licks are mapped in `js/workbook-applications.js`: 117 application contexts and 204 selectable versions, with the [page-by-page audit](references/workbooks/application-mappings.md) recording the source and interpretation. Versions keep different starting degrees and required note changes within an application. Chart matching checks root movement, chord quality, and the whole sounding phrase, including held notes and half-bar entrances. Every version also has a workbook application example; missing chart matches are never replaced with a guessed tune. The matcher lives in `js/practice-catalog.js`, registration in `js/registry.js`, and the sheets in `js/practice-ui.js`.

Open Profile from the avatar to see your account details and practice settings. Settings are global and apply to the next lesson started: instrument, tempo, key selection and cycle, swing, and metronome. “Cycle through selected keys” defaults off (all keys); turn it on to choose a subset. Learn uses one key, Master cycles through the selected keys, and integration uses the tune's key. Each key has a single Play card, rather than a Learn → Play → Listen → Quiz sequence. Hear it plays a model demonstration; Record starts a graded attempt or the integration backing loop. Auto advances graded practice after a pass and retries after a miss.

Melody octave (−1 / Original / +1) moves only the model line and displayed phrase. The **Instrument** setting (default Piano) sets clef, written transposition, register, and demo samples. Skipping a key is not a pass. Pitch observations reset at the start of every card and every take.

Learn and Master use an ordered microphone note follower (YIN in an AudioWorklet): each target pitch must stay within ±50 cents for about 80 ms. Timing is not graded. A stable wrong pitch held for 120 ms fails the attempt; short transients are ignored. Learn, and Master after Show notes, require the displayed octave. Hidden-note Master accepts one consistent octave shift throughout the phrase. The initial eight-second no-sound timeout starts only when microphone capture is ready.

A key contributes to its module's medal only when Master is passed without revealing notes. Showing notes earns Learn credit instead. Bronze / Silver / Gold require 1 / 6 / 12 mastered keys. Progress and settings use the existing localStorage schemas. If browser storage is blocked or full, practice continues in memory and a warning explains that changes may not survive leaving the page.

## Accounts, settings, and cloud progress

Supabase project: [DuoJazz](https://supabase.com/dashboard/project/ogttqddpizpnocrtvixi), in Brian's Org, US West.

Signed-out visitors see a dedicated email/password login screen with account creation. Account creation has its own screen for email and password, followed by a confirmation-email screen with resend and change-email controls. Sign-in uses the email address, which also provides the avatar initials. Password visibility and password reset are available. After sign-in, an initials-only avatar at the top right opens Profile, with account details, practice settings, and Sign out in one drawer. Signed-in accounts sync Learn and Master passes and recompute medals. Progress merges by earned key instead of replacing another device's progress. Settings and My charts sync to the signed-in account through `user_preferences`. Each changed preference is saved separately; cached defaults never overwrite values fetched from another device. Offline edits are retained in an account-specific queue and retried on reconnect, focus, and temporary failures. Existing local settings and favorites are imported into the first account on that browser only where the account has no saved value. Signing out or switching accounts clears the displayed preferences and selects the new account’s cache. Existing guest progress automatically migrates to the first signed-in account on that browser. An ownership marker prevents importing it into a second account; the original guest record remains intact for recovery. Signing out returns to the login screen and preserves the guest record; each account has a separate local cache. Local caches remain on the device after sign-out, so use a private browser session on shared devices.

`js/supabase-config.js` contains only the public URL and publishable key. Never add service-role keys, OAuth secrets, or database credentials to browser files. `supabase/migrations/` records the deployed schema. `practice_progress` uses insert-only records, row-level security, and owner-only SELECT/INSERT grants. `user_preferences` uses owner-only SELECT/INSERT/UPDATE policies and a `(user_id, name)` primary key. Anonymous database access is denied. Sync runs automatically after changes, on reconnect and focus, and retries failures with a capped backoff. Successful sync is silent; persistent failures appear in Profile.

### Finish production authentication

The database is provisioned. The repository’s production homepage is https://duojazz-browser-prototype.vercel.app/. `vercel.json` configures static hosting with no build step.

In [Supabase URL Configuration](https://supabase.com/dashboard/project/ogttqddpizpnocrtvixi/auth/url-configuration), set **Site URL** to `https://duojazz-browser-prototype.vercel.app/` and allow that exact URL plus `http://127.0.0.1:4173/` for local testing. Avoid wildcard production redirects. These settings cannot be changed through the connected Supabase tools used here.

Signup, resend, and password-reset requests explicitly redirect to the current app URL without query parameters or fragments. That URL must be allowed in Supabase; otherwise the service can fall back to its Site URL. Keep email confirmation enabled. Verify an actual signup, email confirmation, and sign-in after configuring redirects. Supabase's default email service restricts recipients and is intended for testing; configure [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) for public signups. Real email delivery and production sign-in have not been tested in this environment.

Google sign-in is deferred and hidden (`GOOGLE_SIGN_IN_ENABLED = false`). To enable later, create a Google OAuth web client with callback `https://ogttqddpizpnocrtvixi.supabase.co/auth/v1/callback`, enter its ID and secret only in [Supabase providers](https://supabase.com/dashboard/project/ogttqddpizpnocrtvixi/auth/providers), configure the exact app redirect above, then enable the flag. The code requests only `openid email profile`, with no extra Google API scopes or offline-access request. See [Supabase's Google guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

## Scope and history

- Supabase accounts and practice-progress sync; the web app opens with a login screen when signed out.
- Real microphone accuracy needs a check on an iPad with a horn. Node tests cover grading and mocked audio lifecycles; `window.__DUOJAZZ__` exposes developer inspection and pitch-track helpers.
- The web app previously lived in `browser-prototype/`; it now runs directly from the repository root. Keep the same origin (including port) to retain browser-local progress and settings. Existing localStorage keys remain unchanged.
- The retired SwiftUI app, widget, native tests, and native-only tooling are preserved in Git history, not maintained alongside the web app. Use `git log --all --oneline -- DuoJazz/` to find the native project and inspect a commit before its removal with `git show <commit>:DuoJazz/DuoJazz/DuoJazzApp.swift`.
