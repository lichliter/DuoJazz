/**
 * MEI generator for Verovio. Same musical input as music.js ABC, different drawing language.
 * Lesson data, spots, and audio are unchanged.
 */

import {
  BEATS_PER_BAR,
  DEFAULT_APPLICATION_ID,
  DEFAULT_CLEF,
  DEFAULT_MELODY_REGISTER,
  applicationKeyQuality,
  chordSymbolName,
  chordAtEventBeat,
  chorusChords,
  concertMidiToWritten,
  cueCaption,
  displayKey,
  eventMelodyMidi,
  formForApplication,
  keySignatureCount,
  learnBeatsFor,
  learnChords,
  modelSolo,
  newBarState,
  octaveForApplication,
  phraseMeasureCount,
  phraseTimeline,
  restBeatsForSpan,
  spellShownMidi,
  usesFlatsForChord,
  withSpotOctaves,
} from "./music.js";

function almost(a, b, eps = 1e-6) {
  return Math.abs(a - b) < eps;
}

function beatInBar(beat) {
  return ((beat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function meiKeysig(shownKey) {
  const n = keySignatureCount(shownKey);
  if (!n) return "0";
  return n > 0 ? `${n}s` : `${-n}f`;
}

function meiClef(clef) {
  return clef === "bass"
    ? { shape: "F", line: "4" }
    : { shape: "G", line: "2" };
}

function meiDur(beats) {
  const table = [
    [4, "1", 0],
    [3, "2", 1],
    [2, "2", 0],
    [1.5, "4", 1],
    [1, "4", 0],
    [0.75, "8", 1],
    [0.5, "8", 0],
    [0.25, "16", 0],
  ];
  for (const [value, dur, dots] of table) {
    if (almost(beats, value)) return { dur, dots };
  }
  if (almost(beats, 0.5 / 3) || almost(beats, 1 / 6)) return { dur: "16", dots: 0 };
  if (almost(beats, 1 / 3) || almost(beats, 0.5)) return { dur: "8", dots: 0 };
  const nearest = table.reduce((best, row) => (
    Math.abs(row[0] - beats) < Math.abs(best[0] - beats) ? row : best
  ));
  return { dur: nearest[1], dots: nearest[2] };
}

function durAttrs(beats) {
  const { dur, dots } = meiDur(beats);
  return dots ? `dur="${dur}" dots="${dots}"` : `dur="${dur}"`;
}

function formContext(concertKey, displayMode, applicationId, melodyRegister, clef = DEFAULT_CLEF) {
  const quality = applicationKeyQuality(applicationId);
  const shownKey = displayKey(concertKey, displayMode, quality);
  return {
    concertKey,
    displayMode,
    applicationId,
    melodyRegister,
    clef,
    octaveBase: octaveForApplication(applicationId, concertKey.pc, displayMode),
    quality,
    shownKey,
    barState: newBarState(shownKey),
    ids: { n: 0, h: 0, d: 0, t: 0 },
  };
}

function nextId(ctx, prefix) {
  ctx.ids[prefix] = (ctx.ids[prefix] ?? 0) + 1;
  return `${prefix}${ctx.ids[prefix]}`;
}

function notesForMode(applicationId, mode, isolated = false) {
  if (mode === "model") return modelSolo(applicationId).map((note) => ({ ...note, type: "note" }));
  const items = phraseTimeline(applicationId, isolated || mode === "phrase");
  if (mode === "landing" && !isolated) return items.filter((item) => item.type === "note");
  return items;
}

function pitchedItems(applicationId, mode, isolated, concertTonicPc, displayMode) {
  return withSpotOctaves(notesForMode(applicationId, mode, isolated), applicationId, concertTonicPc, displayMode);
}

function notePitchAttrs(item, ctx) {
  const concertMidi = eventMelodyMidi(ctx.concertKey, item, ctx.melodyRegister, ctx.octaveBase);
  const shownMidi = concertMidiToWritten(concertMidi, ctx.displayMode);
  const chord = chordAtEventBeat(ctx.chords, item.beat);
  const flats = usesFlatsForChord(ctx.shownKey, chord);
  const spelled = spellShownMidi(shownMidi, ctx.shownKey, flats);
  const letter = spelled.letter;
  const acc = spelled.acc;
  const oct = spelled.octave;
  const sig = ctx.barState.sig?.[letter] ?? 0;
  const current = ctx.barState.written.has(letter) ? ctx.barState.written.get(letter) : sig;
  let accid = "";
  if (acc !== current) {
    accid = acc === 2 ? "ss" : acc === 1 ? "s" : acc === -1 ? "f" : acc === -2 ? "ff" : "n";
    ctx.barState.written.set(letter, acc);
  }
  return {
    pname: letter.toLowerCase(),
    oct,
    accid,
    shownMidi,
  };
}

function articAttr(item) {
  if (item.articulation === "staccato") return "stacc";
  if (item.articulation === "tenuto") return "ten";
  return "";
}

function noteXml(item, ctx, beats, tie = "") {
  const id = nextId(ctx, "n");
  const pitch = notePitchAttrs(item, ctx);
  const artic = articAttr(item);
  const accid = pitch.accid ? ` accid="${pitch.accid}"` : "";
  const tieAttr = tie ? ` tie="${tie}"` : "";
  const inner = artic ? `<artic artic="${artic}"/>` : "";
  return {
    id,
    beats,
    beamable: almost(beats, 0.5) && item.tuplet !== 3,
    tuplet: item.tuplet === 3,
    xml: `<note xml:id="${id}" pname="${pitch.pname}" oct="${pitch.oct}" ${durAttrs(beats)}${accid}${tieAttr}>${inner}</note>`,
  };
}

function restXml(beats) {
  return {
    beats,
    beamable: false,
    tuplet: false,
    xml: `<rest ${durAttrs(beats)}/>`,
  };
}

function mRestXml() {
  return { beats: 4, beamable: false, tuplet: false, mRest: true, xml: "<mRest/>" };
}

function slashXml(ctx, beats = 1) {
  const id = nextId(ctx, "n");
  const pitch = ctx.clef === "treble" ? 'pname="b" oct="4"' : 'pname="d" oct="3"';
  return {
    id,
    beats,
    beamable: false,
    slash: true,
    xml: `<note xml:id="${id}" type="slash" ${pitch} ${durAttrs(beats)} loc="0" head.shape="slash" stem.visible="false"/>`,
  };
}

function restTokens(startBeat, durationBeats, slash, ctx) {
  if (slash) {
    const n = Math.max(1, Math.round(durationBeats));
    return Array.from({ length: n }, () => slashXml(ctx, durationBeats / n));
  }
  const chunks = restBeatsForSpan(startBeat, durationBeats);
  if (chunks.length === 1 && almost(chunks[0], 4) && almost(beatInBar(startBeat), 0)) {
    return [mRestXml()];
  }
  return chunks.map((beats) => restXml(beats));
}

function coveringItems(items, start, end) {
  return items
    .filter((item) => item.beat < end - 1e-6 && item.beat + item.beats > start + 1e-6)
    .sort((a, b) => a.beat - b.beat);
}

function sliceTokens(items, start, end, ctx, slashRests) {
  const covering = coveringItems(items, start, end);
  const tokens = [];
  let cursor = start;
  let i = 0;
  while (i < covering.length) {
    const item = covering[i];
    const iStart = Math.max(item.beat, start);
    if (iStart > cursor + 1e-6) {
      tokens.push(...restTokens(cursor, iStart - cursor, slashRests, ctx));
      cursor = iStart;
    }
    if (item.tuplet === 3) {
      const group = [];
      while (i < covering.length && covering[i].tuplet === 3 && group.length < 3) {
        group.push(covering[i]);
        i += 1;
      }
      tokens.push({
        type: "tuplet",
        beats: group.reduce((sum, note) => sum + note.beats, 0),
        notes: group.map((note) => noteXml(note, ctx, almost(note.beats, 0.5 / 3) || almost(note.beats, 1 / 6) ? 0.25 : 0.5)),
      });
      cursor = group[group.length - 1].beat + group[group.length - 1].beats;
      continue;
    }
    const iEnd = Math.min(item.beat + item.beats, end);
    const dur = iEnd - iStart;
    const tieOut = item.type === "note" && item.beat + item.beats > end + 1e-6;
    const tieIn = item.type === "note" && item.beat < start - 1e-6;
    const tie = tieIn && tieOut ? "m" : tieOut ? "i" : tieIn ? "t" : "";
    if (item.type === "rest") tokens.push(...restTokens(iStart, dur, slashRests, ctx));
    else tokens.push(noteXml(item, ctx, dur, tie));
    cursor = iEnd;
    i += 1;
  }
  if (end > cursor + 1e-6) {
    tokens.push(...restTokens(cursor, end - cursor, slashRests, ctx));
  }
  return tokens;
}

function halfBarOf(cursor) {
  return cursor < 2 - 1e-6 ? 0 : 1;
}

function emitLayer(tokens) {
  const out = [];
  let i = 0;
  let cursor = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.type === "tuplet") {
      const inner = token.notes.map((note) => note.xml).join("");
      out.push(`<tuplet num="3" numbase="2" bracket.visible="false"><beam>${inner}</beam></tuplet>`);
      cursor += token.beats;
      i += 1;
      continue;
    }
    if (token.beamable) {
      const group = [];
      const side = halfBarOf(cursor);
      while (i < tokens.length && tokens[i].beamable && halfBarOf(cursor + group.reduce((s, n) => s + n.beats, 0)) === side) {
        group.push(tokens[i]);
        i += 1;
        if (group.reduce((s, n) => s + n.beats, 0) >= 2 - 1e-6) break;
      }
      if (group.length >= 2) {
        out.push(`<beam>${group.map((note) => note.xml).join("")}</beam>`);
      } else {
        out.push(group[0].xml);
      }
      cursor += group.reduce((s, n) => s + n.beats, 0);
      continue;
    }
    out.push(token.xml);
    cursor += token.beats;
    i += 1;
  }
  return out.join("");
}

function meiChordText(name) {
  return String(name)
    .replace(/[\s\u00A0\u2000-\u200B\u202F\u205F\u3000]+/g, "")
    .replaceAll("♭", "b")
    .replaceAll("♯", "#")
    .replaceAll("°", "o")
    .replaceAll("ø", "h")
    .replaceAll("Δ", "M");
}

function literalRend(text) {
  const name = meiChordText(text);
  return `<rend fontfam="sans-serif" fontname="Noto Sans" fontweight="bold">${esc(name)}</rend>`;
}

export function wrapCueLines(text, width = 16) {
  const value = String(text).trim();
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 2 || value.length <= width) return esc(value);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.map(esc).join("<lb/>");
}

function harmXml(ctx, chord, tstamp) {
  const id = nextId(ctx, "h");
  const name = chordSymbolName(
    ctx.concertKey,
    chord.intervalFromTonic,
    chord.quality,
    ctx.displayMode,
    ctx.quality,
    chord.slashIntervalFromTonic,
    chord.usesFlats,
    chord.spellFrom,
  );
  return `<harm xml:id="${id}" place="above" staff="1" tstamp="${tstamp}">${literalRend(name)}</harm>`;
}

function dirXml(ctx, text, tstamp) {
  const id = nextId(ctx, "d");
  return `<dir xml:id="${id}" type="cue" place="below" staff="1" tstamp="${tstamp}" vgrp="1">${wrapCueLines(text)}</dir>`;
}

function sectionXml(ctx, label) {
  if (!label) return "";
  const id = nextId(ctx, "d");
  return `<dir xml:id="${id}" type="section" place="above" staff="1" tstamp="1">${wrapCueLines(label)}</dir>`;
}

function beatGridLayer() {
  return `<layer n="2">${'<space dur="4"/>'.repeat(BEATS_PER_BAR)}</layer>`;
}

function tstampAt(beat, barStart) {
  const at = beat - barStart + 1;
  return Number.isInteger(at) || almost(at, Math.round(at)) ? String(Math.round(at)) : String(Math.round(at * 100) / 100);
}

function measureXml({
  n,
  ctx,
  tokens,
  chords,
  barStart,
  cue,
  section,
  metcon = true,
  rightBar = "single",
}) {
  const layer = emitLayer(tokens);
  const harms = chords.map((chord) => harmXml(ctx, chord, tstampAt(chord.startBeat, barStart)));
  const dirs = [];
  if (section) dirs.push(sectionXml(ctx, section));
  if (cue) dirs.push(dirXml(ctx, cue, "1"));
  const right = rightBar === "end" ? ' right="end"' : "";
  const meter = metcon ? "" : ' metcon="false"';
  const grid = metcon ? beatGridLayer() : "";
  return `<measure n="${n}"${meter}${right}><staff n="1"><layer n="1">${layer}</layer>${grid}</staff>${harms.join("")}${dirs.join("")}</measure>`;
}

function staffDefXml(ctx) {
  const clef = meiClef(ctx.clef);
  return `<staffDef n="1" lines="5" clef.shape="${clef.shape}" clef.line="${clef.line}" keysig="${meiKeysig(ctx.shownKey)}" meter.count="4" meter.unit="4"/>`;
}

function wrapScore(ctx, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="5.0">
  <meiHead><fileDesc><titleStmt><title>DuoJazz</title></titleStmt><pubStmt/></fileDesc></meiHead>
  <music><body><mdiv><score>
    <scoreDef>
      <staffGrp>${staffDefXml(ctx)}</staffGrp>
    </scoreDef>
    <section>${body}</section>
  </score></mdiv></body></music>
</mei>
`;
}

function barAdvanceBreak(bar, barCount, barsPerLine) {
  if (bar === barCount - 1) return false;
  return (bar + 1) % barsPerLine === 0;
}

function sectionLabel(form, barNumber) {
  return form.sections?.find((section) => section.startBar === barNumber)?.label ?? "";
}

function renderFormMei({
  concertKey,
  displayMode,
  applicationId = DEFAULT_APPLICATION_ID,
  clef = DEFAULT_CLEF,
  melodyRegister = DEFAULT_MELODY_REGISTER,
  mode = "model",
  showCues = false,
  barsPerLine = 4,
  isolated = false,
}) {
  const ctx = formContext(concertKey, displayMode, applicationId, melodyRegister, clef);
  const form = formForApplication(applicationId);
  const isolatedCell = isolated && (mode === "phrase" || mode === "chords");
  const chords = isolatedCell
    ? learnChords(concertKey, displayMode, applicationId)
    : chorusChords(concertKey, displayMode, applicationId);
  ctx.chords = chords;
  const barCount = isolatedCell
    ? Math.max(1, Math.ceil(learnBeatsFor(applicationId) / BEATS_PER_BAR))
    : form.bars.length;
  const items = pitchedItems(
    applicationId,
    mode === "phrase" || mode === "chords" ? "landing" : mode,
    isolated || mode === "phrase" || mode === "chords",
    concertKey.pc,
    displayMode,
  );
  const slashRests = mode === "landing" || mode === "slash";
  const slashAll = mode === "slash";
  const measures = [];

  const pickupNotes = mode === "chords"
    ? []
    : items.filter((item) => item.type === "note" && item.beat < -1e-6);
  if (pickupNotes.length) {
    ctx.barState = newBarState(ctx.shownKey);
    const start = pickupNotes[0].beat;
    const tokens = slashAll
      ? restTokens(start, -start, true, ctx)
      : sliceTokens(items, start, 0, ctx, slashRests);
    measures.push(measureXml({
      n: 0,
      ctx,
      tokens,
      chords: [],
      barStart: start,
      metcon: false,
    }));
  }

  const useNotes = mode === "model" || mode === "phrase" || mode === "landing";
  for (let bar = 0; bar < barCount; bar += 1) {
    ctx.barState = newBarState(ctx.shownKey);
    const barStart = bar * BEATS_PER_BAR;
    const barEnd = isolatedCell
      ? Math.min(learnBeatsFor(applicationId), barStart + BEATS_PER_BAR)
      : barStart + BEATS_PER_BAR;
    const barChords = chords.filter((chord) => (
      chord.startBeat < barEnd - 1e-6 && chord.startBeat + chord.durationBeats > barStart + 1e-6
    ));
    let tokens;
    if (mode === "chords") {
      tokens = [{ beats: barEnd - barStart, beamable: false, xml: `<space ${durAttrs(barEnd - barStart)}/>` }];
    } else if (slashAll) {
      tokens = restTokens(barStart, barEnd - barStart, true, ctx);
    } else if (useNotes) {
      tokens = sliceTokens(items, barStart, barEnd, ctx, slashRests);
    } else {
      tokens = restTokens(barStart, barEnd - barStart, true, ctx);
    }
    const cue = showCues ? cueCaption(bar + 1, applicationId) : "";
    const last = bar === barCount - 1;
    measures.push(measureXml({
      n: bar + 1,
      ctx,
      tokens,
      chords: barChords,
      barStart,
      cue,
      section: isolated ? "" : sectionLabel(form, bar + 1),
      metcon: almost(barEnd - barStart, 4),
      rightBar: last ? "end" : "single",
    }));
    if (barAdvanceBreak(bar, barCount, barsPerLine)) measures.push("<sb/>");
  }
  return wrapScore(ctx, measures.join(""));
}

export function phraseMEI(
  concertKey,
  displayMode,
  applicationId = DEFAULT_APPLICATION_ID,
  clef = DEFAULT_CLEF,
  melodyRegister = DEFAULT_MELODY_REGISTER,
  options = {},
) {
  const barCount = phraseMeasureCount(applicationId);
  const barsPerLine = options.barsPerLine ?? Math.min(5, Math.max(2, barCount));
  return renderFormMei({
    concertKey,
    displayMode,
    applicationId,
    clef,
    melodyRegister,
    mode: "phrase",
    showCues: false,
    barsPerLine,
    isolated: true,
  });
}

export function modelMEI(
  concertKey,
  displayMode,
  applicationId = DEFAULT_APPLICATION_ID,
  clef = DEFAULT_CLEF,
  melodyRegister = DEFAULT_MELODY_REGISTER,
  options = {},
) {
  return renderFormMei({
    concertKey,
    displayMode,
    applicationId,
    clef,
    melodyRegister,
    mode: "model",
    showCues: Boolean(options.showCues),
    barsPerLine: options.barsPerLine ?? 4,
  });
}

export function slashMEI(
  concertKey,
  displayMode,
  applicationId = DEFAULT_APPLICATION_ID,
  clef = DEFAULT_CLEF,
  options = {},
) {
  return renderFormMei({
    concertKey,
    displayMode,
    applicationId,
    clef,
    melodyRegister: DEFAULT_MELODY_REGISTER,
    mode: "slash",
    showCues: Boolean(options.showCues),
    barsPerLine: options.barsPerLine ?? 4,
  });
}

export function landingMEI(
  concertKey,
  displayMode,
  applicationId = DEFAULT_APPLICATION_ID,
  clef = DEFAULT_CLEF,
  melodyRegister = DEFAULT_MELODY_REGISTER,
  options = {},
) {
  return renderFormMei({
    concertKey,
    displayMode,
    applicationId,
    clef,
    melodyRegister,
    mode: "landing",
    showCues: Boolean(options.showCues),
    barsPerLine: options.barsPerLine ?? 4,
  });
}

export function chordsOnlyMEI(
  concertKey,
  displayMode,
  applicationId = DEFAULT_APPLICATION_ID,
  clef = DEFAULT_CLEF,
  options = {},
) {
  const isolated = Boolean(options.isolated);
  const barCount = isolated
    ? Math.max(1, Math.ceil(learnBeatsFor(applicationId) / BEATS_PER_BAR))
    : undefined;
  return renderFormMei({
    concertKey,
    displayMode,
    applicationId,
    clef,
    melodyRegister: DEFAULT_MELODY_REGISTER,
    mode: "chords",
    showCues: false,
    barsPerLine: options.barsPerLine ?? (isolated ? Math.min(5, Math.max(2, barCount ?? 2)) : 4),
    isolated,
  });
}

export function chorusStaffMEI({
  concertKey,
  displayMode,
  applicationId = DEFAULT_APPLICATION_ID,
  clef = DEFAULT_CLEF,
  melodyRegister = DEFAULT_MELODY_REGISTER,
  mode = "model",
  showCues = false,
  barsPerLine = 4,
  isolated = false,
}) {
  if (mode === "chords") {
    return chordsOnlyMEI(concertKey, displayMode, applicationId, clef, { barsPerLine, isolated });
  }
  if (mode === "slash") {
    return slashMEI(concertKey, displayMode, applicationId, clef, { showCues, barsPerLine });
  }
  if (mode === "landing") {
    return landingMEI(concertKey, displayMode, applicationId, clef, melodyRegister, { showCues, barsPerLine });
  }
  return modelMEI(concertKey, displayMode, applicationId, clef, melodyRegister, { showCues, barsPerLine });
}

export function meiHasBowing(mei) {
  return /artic="(?:upbow|dnbow|bow)"/.test(String(mei));
}

export function meiBeamGroupsCrossBeat3(mei) {
  const beams = String(mei).matchAll(/<beam>([\s\S]*?)<\/beam>/g);
  for (const match of beams) {
    const durs = [...match[1].matchAll(/\bdur="(\d+)"/g)].map((item) => Number(item[1]));
    // Eighths only; 4 eighths = 2 beats. A beam that starts in the first
    // half-bar and contains more than 2 beats would cross beat 3.
    const eighths = durs.filter((dur) => dur === 8).length;
    if (eighths > 4) return true;
  }
  return false;
}

export function countSystemBreaks(mei) {
  return (String(mei).match(/<sb\/>/g) ?? []).length;
}

export function countMeasures(mei) {
  return (String(mei).match(/<measure\b/g) ?? []).length;
}
