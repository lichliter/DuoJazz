# AGENTS.md

The app is the web client at the repository root. `README.md` is the operating guide. The retired native app is available only in Git history.

Skills in `.agents/skills/`:
- [Lick Builder](.agents/skills/lick-builder/SKILL.md) — new licks, dictated musical ideas, and lick corrections or integrations. Keep the user's confirmed adaptation distinct from any original recording.
- [Verify App](.agents/skills/verify-app/SKILL.md) — browser verification, mocked auth / guest mode, viewport checks, and screenshot/video captures.

## Development

- Plain HTML, CSS, and JavaScript ES modules; no framework, bundler, or npm dependencies.
- Product behavior lives in `js/`, styling in `css/`, and the main entry point is `index.html`.
- Keep imports and asset URLs relative so the app can run from a static server or a deployment subdirectory.
- Preserve existing localStorage keys and schemas unless a migration is explicitly part of the task.
- Preserve concert/written-pitch handling, instrument transposition, and microphone grading behavior when changing music or audio code.
- Signed-out visits land on the login screen. Use **View as guest** or mocked Supabase transport for automated checks; never sign in to real accounts or add service-role keys/secrets to browser files.

## Run and test

- Requirements: Node.js 22+ and Python 3. No package installation or build step is needed.
- Serve the repository root at http://127.0.0.1:4173/ with `npm start` or `python3 -m http.server 4173 --bind 127.0.0.1`.
- Tests: `npm test` or `node --test js/*.test.mjs` from the repository root.
- Developer inspection hooks: `window.__DUOJAZZ__`, `/?screen=...` review links (see `README.md`), and `tools/verify-*.mjs`.
- Microphone access requires localhost or HTTPS and a user gesture.
- Notation and fonts are vendored locally for offline use. After app/asset changes, bump the relevant `?v=` query parameter(s) in `index.html` (and any versioned module imports you changed, such as in `js/app.js` or `js/pitch.js`), run `node tools/generate-precache.mjs`, and commit `precache.js` (checked by `js/pwa.test.mjs`).
- Do not install Xcode or a Swift toolchain; this repository maintains only the web app.

## Verification and merging

- Before merging, verify the completed changes and run checks appropriate to the work. For visual or interactive changes, follow [Verify App](.agents/skills/verify-app/SKILL.md) to capture the actual updated app (screenshots for visual changes, video for interactions or motion) on phone (`390×844`) and iPad/wide (`820×1180` or `1100×950`) views. Using built-in browser/preview tools (or Playwright via `tools/verify-*.mjs` when available) is authorized for verification captures.
- Include the captures or accessible links in the completion report, with a brief explanation of what changed and how it was verified.
- For changes without a visible app effect, provide the relevant diff and verification results and explain why an app capture is not applicable. If capture is blocked, report the blocker rather than claiming visual verification.
- After verifying your own work and passing the relevant checks, merge into `main` (or commit directly to `main` for small self-contained changes when working on `main`) and push without requesting separate user approval. Respect branch protections and never force-push `main`. If verification fails or is blocked, resolve or report the issue instead of claiming the work is verified.
