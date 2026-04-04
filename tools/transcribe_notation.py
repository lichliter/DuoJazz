#!/usr/bin/env python3
"""
Transcribe sheet music image → DuoJazz LickElement intervals.

Pipeline: image → oemer (OMR) → MusicXML → music21 → intervals from root.

Usage:
    python3 transcribe_notation.py <image_path> [--key KEY] [--root-midi ROOT]

    --key KEY       Key name for interval calculation (default: C)
    --root-midi N   MIDI number of root note (default: 60 = middle C)

Output: JSON with notes, intervals, and suggested Swift LickElement code.
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile


NOTE_VALUES = {
    4.0: ".whole",
    3.0: ".dotted(.half)",
    2.0: ".half",
    1.5: ".dotted(.quarter)",
    1.0: ".quarter",
    0.75: ".dotted(.eighth)",
    0.5: ".eighth",
    0.25: ".sixteenth",
}

KEY_ROOTS = {
    "C": 60, "Db": 61, "D": 62, "Eb": 63, "E": 64, "F": 65,
    "F#": 66, "Gb": 66, "G": 67, "Ab": 68, "A": 69, "Bb": 70, "B": 71,
}


def closest_note_value(quarter_length):
    """Find the closest NoteValue for a given quarterLength."""
    best = min(NOTE_VALUES.keys(), key=lambda v: abs(v - quarter_length))
    return NOTE_VALUES[best]


def run_oemer(image_path, output_dir):
    """Run oemer on an image, return path to MusicXML output."""
    oemer_bin = os.path.expanduser("~/Library/Python/3.9/bin/oemer")
    if not os.path.exists(oemer_bin):
        # Try PATH
        oemer_bin = "oemer"

    cmd = [oemer_bin, "--output-dir", output_dir, image_path]
    print(f"Running: {' '.join(cmd)}", file=sys.stderr)
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

    if result.returncode != 0:
        print(f"oemer stderr: {result.stderr}", file=sys.stderr)
        raise RuntimeError(f"oemer failed with return code {result.returncode}")

    # oemer outputs a .musicxml file in the output dir
    for f in os.listdir(output_dir):
        if f.endswith(".musicxml") or f.endswith(".xml"):
            return os.path.join(output_dir, f)

    raise FileNotFoundError(f"No MusicXML output found in {output_dir}")


def parse_musicxml(xml_path, root_midi):
    """Parse MusicXML with music21, extract notes as intervals from root."""
    from music21 import converter, note, chord

    score = converter.parse(xml_path)
    notes_data = []

    for element in score.flatten().notesAndRests:
        if isinstance(element, note.Rest):
            notes_data.append({
                "type": "rest",
                "value": closest_note_value(element.quarterLength),
                "quarterLength": element.quarterLength,
            })
        elif isinstance(element, note.Note):
            midi = element.pitch.midi
            interval = midi - root_midi
            notes_data.append({
                "type": "note",
                "pitch": str(element.pitch),
                "midi": midi,
                "interval": interval,
                "value": closest_note_value(element.quarterLength),
                "quarterLength": element.quarterLength,
            })
        elif isinstance(element, chord.Chord):
            # Take the top note of chords
            top = element.sortAscending()[-1]
            midi = top.pitch.midi
            interval = midi - root_midi
            notes_data.append({
                "type": "note",
                "pitch": str(top.pitch),
                "midi": midi,
                "interval": interval,
                "value": closest_note_value(element.quarterLength),
                "quarterLength": element.quarterLength,
                "chord": True,
            })

    return notes_data


def format_swift(notes_data):
    """Format notes as DuoJazz Swift LickElement code."""
    lines = []
    for n in notes_data:
        if n["type"] == "rest":
            val = n["value"]
            lines.append(f"R({val}),")
        else:
            interval = n["interval"]
            val = n["value"]
            if val == ".eighth":
                lines.append(f"N({interval}),")
            else:
                lines.append(f"N({interval}, {val}),")
    return lines


def main():
    parser = argparse.ArgumentParser(description="Transcribe notation image to DuoJazz intervals")
    parser.add_argument("image", help="Path to sheet music image")
    parser.add_argument("--key", default="C", help="Key for interval calculation (default: C)")
    parser.add_argument("--root-midi", type=int, default=None,
                        help="MIDI root note (overrides --key)")
    args = parser.parse_args()

    root_midi = args.root_midi or KEY_ROOTS.get(args.key, 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        print(f"Processing {args.image} in key of {args.key} (root MIDI: {root_midi})...",
              file=sys.stderr)

        # Step 1: OMR
        xml_path = run_oemer(args.image, tmpdir)
        print(f"MusicXML output: {xml_path}", file=sys.stderr)

        # Step 2: Parse
        notes_data = parse_musicxml(xml_path, root_midi)

        # Step 3: Format output
        swift_lines = format_swift(notes_data)

        output = {
            "key": args.key,
            "root_midi": root_midi,
            "notes": notes_data,
            "swift_elements": swift_lines,
        }

        print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
