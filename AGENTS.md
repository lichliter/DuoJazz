# AGENTS.md

The app in active use is the browser client in `browser-prototype/`. Product behavior, tests, and the local server all live there. `browser-prototype/README.md` is the operating guide. `CLAUDE.md` and `.claude/skills/` describe the inactive SwiftUI iPad project.

## Cursor Cloud specific instructions

Cloud agents run the browser app. `browser-prototype/package.json` has no dependencies, so setup does not install packages. Node.js and Python 3 come from the base image.

- Boot serves the app at http://127.0.0.1:4173/ from `browser-prototype/` with `python3 -m http.server 4173 --bind 127.0.0.1`.
- Tests: `cd browser-prototype && node --test js/*.test.mjs` (or `npm test` from that directory).
- Engraved notation loads Verovio from `https://www.verovio.org`. Fonts load from `fonts.googleapis.com` and `fonts.gstatic.com`. Those hosts need to be reachable for the staff to draw.
- The Xcode project under `DuoJazz/` is inactive. It needs macOS and Xcode, which this Linux VM does not have. Do not install a Swift toolchain for it.
