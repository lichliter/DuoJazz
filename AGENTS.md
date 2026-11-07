# AGENTS.md

The app is the web client at the repository root. `README.md` is the operating guide. The retired native app is available only in Git history.

## Development

- Plain HTML, CSS, and JavaScript ES modules; no framework, bundler, or npm dependencies.
- Product behavior lives in `js/`, styling in `css/`, and the main entry point is `index.html`.
- Keep imports and asset URLs relative so the app can run from a static server or a deployment subdirectory.
- Preserve existing localStorage keys and schemas unless a migration is explicitly part of the task.
- Preserve concert/written-pitch handling, instrument transposition, and microphone grading behavior when changing music or audio code.

## Run and test

- Requirements: Node.js 22+ and Python 3. No package installation or build step is needed.
- Serve the repository root at http://127.0.0.1:4173/ with `npm start` or `python3 -m http.server 4173 --bind 127.0.0.1`.
- Tests: `npm test` or `node --test js/*.test.mjs` from the repository root.
- Microphone access requires localhost or HTTPS and a user gesture.
- Notation and fonts are vendored locally for offline use. After app/asset changes, run `node tools/generate-precache.mjs` and commit `precache.js`.
- Do not install Xcode or a Swift toolchain; this repository maintains only the web app.

## Verification and merging

- Before merging, verify the completed changes and run checks appropriate to the work. Capture the actual updated app; use screenshots for visual changes and video for interactions or motion.
- Include the captures or accessible links in the completion report, with a brief explanation of what changed and how it was verified.
- For changes without a visible app effect, provide the relevant diff and verification results and explain why an app capture is not applicable. If capture is blocked, report the blocker rather than claiming visual verification.
- After verifying your own work and passing the relevant checks, merge into `main` and push without requesting separate user approval. Respect branch protections and never force-push `main`. If verification fails or is blocked, resolve or report the issue instead of claiming the work is verified.
