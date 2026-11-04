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
- Engraved notation loads Verovio from `https://www.verovio.org`. Fonts load from `fonts.googleapis.com` and `fonts.gstatic.com`. Those hosts need to be reachable for the staff to draw.
- Do not install Xcode or a Swift toolchain; this repository maintains only the web app.

## Visual review and merge approval

- Before requesting merge approval, provide screenshots or a short video showing the completed changes. Capture the actual updated app; use screenshots for visual changes and video for interactions or motion.
- Include the captures or accessible links in the review handoff, with a brief explanation of what changed and how it was verified.
- For changes without a visible app effect, provide the relevant diff and verification results and explain why an app capture is not applicable. If capture is blocked, report the blocker rather than claiming visual verification.
- Wait for the user's explicit merge approval after presenting the completed changes and review evidence. Do not merge automatically.
