---
name: verify-app
description: Verify visual, layout, notation, audio, grading, auth, or PWA changes in the live DuoJazz web app using guest mode or mocked Supabase transport, inspect phone and iPad/wide viewports, and capture screenshot or video evidence before merging. Use for UI or interactive app changes; skip for docs-only or non-visible changes.
---

# Verify App

Verify the live DuoJazz web app safely without touching real user accounts or cloud data, and capture evidence of the updated behavior before merging.

## 1. Run automated checks first

1. If you changed any app or static asset, bump the relevant `?v=` query parameter(s) in `index.html` (and any changed versioned module imports in `js/app.js` or `js/pitch.js`) and run `node tools/generate-precache.mjs`.
2. Run `npm test` from the repository root (`js/pwa.test.mjs` also verifies that `precache.js` matches current assets).

## 2. Serve the app locally

Serve the repository root on `127.0.0.1:4173`:

```bash
npm start
# or: python3 -m http.server 4173 --bind 127.0.0.1
```

Stop any temporary server you started once verification finishes.

## 3. Choose the browser capture path

- **Built-in browser / preview tools** (authorized by `AGENTS.md` for verification captures): open `http://127.0.0.1:4173/` (or `target: { kind: "environment-port", port: 4173 }`), resize for phone and iPad/wide checks, take saved screenshots for visual changes, and record video for interactions or motion. Close any preview tab you opened when done.
- **Playwright scripts (`tools/verify-*.mjs`)** when Playwright and Chromium are available (`PLAYWRIGHT_MODULE` + `APP_URL=http://127.0.0.1:4173/`):
  - `tools/verify-guest.mjs`, `tools/verify-review.mjs`, `tools/verify-library.mjs`, `tools/verify-chart-master.mjs`, `tools/verify-account-saving.mjs`, `tools/verify-offline-cache.mjs`, `tools/verify-offline-signout.mjs`, `tools/verify-hardening.mjs`.
  - These scripts block `https://*.supabase.co/**`, stub `js/vendor/supabase-2.119.0.js`, disable the service worker except in `verify-offline-cache.mjs`, and write captures under `artifacts/` (gitignored).
- If neither browser capture path is available in the current environment, report the exact blocker instead of claiming visual verification.

## 4. Handle authentication safely

- Signed-out visits open on `#login-screen`.
- Click **View as guest** for local UI, notation, playback, and practice checks, or use mocked Supabase transport / synthetic sessions for account-sync checks.
- Never sign in to a real account, hit live Supabase user data, or put secrets in browser files.

## 5. Inspect viewports and key states

Check both layouts unless the change is strictly single-viewport:
- **Phone:** `390×844` (portrait)
- **iPad / wide:** `820×1180` (iPad Air portrait) or `1100×950` (wide/tablet landscape)

Verify:
- Zero uncaught `pageerror`s or broken asset requests.
- No horizontal overflow: `document.documentElement.scrollWidth <= innerWidth`.
- Notation SVG renders (`#notation svg .note`) when testing lesson/practice views.
- Use `/?screen=...` review links from `README.md` or `window.__DUOJAZZ__` helpers (`createAndShow`, `jumpToCard`, `jumpToWrapup`, `setMelodyOctave`, `feedPitchTrack`, `gradeNow`, `getMastery`, `setMastery`, `sampleStatus`, `measureNotation`, `transport`) to reach target states deterministically.

## 6. Capture and report

- Save screenshots for visual changes and video for interactions/motion.
- Include the captures (or accessible links) in the completion report, summarizing what changed and what was verified.
- Explicitly distinguish automated/browser verification from real-device microphone or audio-listening checks.
