# DuoJazz backing-sound samples

Compressed AAC/M4A (44.1 kHz mono for recorded melody instruments; 22.05 kHz for piano, bass and drums) for live app backing, selected-instrument demo lines, and the dev-only `sound.html` A/B page.
Originals were truncated and transcoded; this is not a redistributable sample library.

All sources allow commercial use. Attribution below.

## Piano — Salamander Grand Piano

- Author: Alexander Holm
- License: [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)
- Original: [Salamander Grand Piano V3](https://archive.org/details/SalamanderGrandPianoV3)
- MP3s used here: [Tone.js audio / salamander](https://github.com/Tonejs/audio) (`tonejs.github.io/audio/salamander`)
- Notes kept: A2 C3 D♯3 F♯3 A3 C4 D♯4 F♯4 A4 C5, pitched in the browser for in-between keys

## Bass — Fluid R3 GM acoustic bass

- Author: Frank Wen (Fluid R3)
- License: MIT
- Packaged as MP3 soundfont by [Michael Gleitz / midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) (`FluidR3_GM/acoustic_bass-mp3`)
- Notes kept: E1 F1 G1 A1 C2 E2 G2 A2 C3 E3

## Recorded guitar, trumpet, saxophone and trombone

- Sample preparation and library: Nicholas Brosowsky, [tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments), revision `622c2f1c32c8cfce4158ddc3eb26e518ddef37e5`
- License: [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)
- Original recordings, as credited by the library: University of Iowa (acoustic guitar), Versilian Studios VSCO 2 (trumpet/trombone), Karoryfer (saxophone).
- Both sax options use this shared recorded saxophone set mapped to their respective concert registers; their notation and transposition remain distinct.
- Changes: leading silence trimmed, resampled to the app's existing pitch slots, limited to 3 seconds, short edge fades, compressed to 44.1 kHz mono AAC at 96 kbps. Natural attacks and breath/pick noise are retained.
- Exact source file, target pitch, trim, measured tuning and early RMS for every sample: [recording-sources.json](recording-sources.json).
- `python3 tools/import-recorded-samples.py` reproduces the audio conversion (requires numpy, Node.js, curl and ffmpeg). After conversion, regenerate the manifest, early-RMS gain table and offline precache if source parameters change.
- Verify every converted pitch and its loudness calibration with `node tools/verify-recorded-samples.mjs` (requires ffmpeg).
- Demo lines lazy-load only the selected instrument; piano/bass backing stays as above.

## Drums — Salamander Drumkit

- Author: Alexander Holm
- License: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
- Original: [Salamander Drumkit](https://archive.org/details/SalamanderDrumkit) (OH close-mic WAVs)
- Pieces: kick (soft), ghost snare, foot hi-hat, closed hat, ride, ride bell
- Share-alike: these compressed kit pieces remain CC BY-SA 3.0. Produced music that *uses* them can be licensed at will (per the original kit notes).

## Brushes option

There is no separate brush library in this pack. The **Brushes** toggle plays highpassed Salamander ride + ghost snare so the kit reads softer. Same CC BY-SA 3.0 attribution as the drum kit.

## File sizes

See `manifest.json`. Pack total is about **1.3 MB**, well under the ~10 MB budget. The live session still downloads backing plus one instrument at a time.
