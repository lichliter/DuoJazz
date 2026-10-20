# DuoJazz integration prototype (browser only)

This folder is a **separate, playable browser experiment**. It is not a port of the native SwiftUI iPad app.

```bash
cd browser-prototype
python3 -m http.server 4173 --bind 127.0.0.1
# open http://127.0.0.1:4173/
node --test js/music.test.mjs js/lesson.test.mjs
```

## Lesson

One focus phrase: DuoJazz lick `short-ii-v-i` (Short ii–V–I).

1. **Hear** — listen to the phrase. Listening is not mastery.
2. **Echo** — play it back. The app is not listening.
3. **Setup** — hear two bars of the eight-bar form.
4. **Enter** — improvise, take a cued entrance on bars 3–4, resolve, keep going.
5. **Solo** — same chorus with entrance labels, target styling, phrase notation, and default model playback removed.
6. **Check-in** — optional self-assessment after playing. Recall stays separate from application.

Tempo stays in the transport. Key, B♭ written names, swing, metronome, and guide tones live in Settings.

## What it is not

- Not native iPad / Xcode / simulator verification
- No accounts, backend, microphone, or paid services
- Key coverage is optional and is **not** a gate
