#!/usr/bin/env python3
"""
Crop and enhance notation from a screenshot for visual reading.

Usage:
    python3 tools/enhance_notation.py <image_path> --crop top,bottom,left,right

    --crop: percentage-based region (e.g., 72,85,0,95 = top 72% to 85%, left 0% to 95%)
    --scale: enlargement factor (default: 3)
    --output: output path (default: /tmp/notation_enhanced.png)

Example:
    python3 tools/enhance_notation.py /path/to/screenshot.png --crop 72,85,0,95
"""

import argparse
import sys

try:
    from PIL import Image, ImageEnhance, ImageFilter
except ImportError:
    print("Error: Pillow required. Install with: pip3 install Pillow", file=sys.stderr)
    sys.exit(1)


def enhance(image_path, crop, scale=3, output="/tmp/notation_enhanced.png"):
    img = Image.open(image_path)
    w, h = img.size
    print(f"Original: {w}x{h}", file=sys.stderr)

    # Crop to notation region (percentages)
    t, b, l, r = [float(x) / 100 for x in crop.split(",")]
    img = img.crop((int(l * w), int(t * h), int(r * w), int(b * h)))
    print(f"Cropped: {img.size[0]}x{img.size[1]}", file=sys.stderr)

    # Grayscale
    gray = img.convert("L")

    # Detect if background is dark (notation on dark photo)
    avg_brightness = sum(gray.getdata()) / (gray.width * gray.height)
    is_dark = avg_brightness < 128
    print(f"Avg brightness: {avg_brightness:.0f} ({'dark' if is_dark else 'light'} bg)",
          file=sys.stderr)

    if is_dark:
        # Dark background: invert so notation becomes black-on-white
        from PIL import ImageOps
        gray = ImageOps.invert(gray)

    # Boost contrast and sharpness
    gray = ImageEnhance.Contrast(gray).enhance(2.5)
    gray = ImageEnhance.Sharpness(gray).enhance(2.0)

    # Scale up
    gray = gray.resize((gray.width * scale, gray.height * scale), Image.LANCZOS)

    # Adaptive binarize — use mean as threshold for cleaner results
    pixels = list(gray.getdata())
    threshold = sum(pixels) // len(pixels)
    gray = gray.point(lambda x: 255 if x > threshold else 0)

    gray.save(output)
    print(f"Saved: {output} ({gray.size[0]}x{gray.size[1]})")
    return output


def main():
    parser = argparse.ArgumentParser(description="Enhance notation from screenshot")
    parser.add_argument("image", help="Path to screenshot")
    parser.add_argument("--crop", required=True,
                        help="Crop as top%%,bottom%%,left%%,right%% (e.g., 72,85,0,95)")
    parser.add_argument("--scale", type=int, default=3, help="Scale factor (default: 3)")
    parser.add_argument("--output", default="/tmp/notation_enhanced.png")
    args = parser.parse_args()

    enhance(args.image, args.crop, args.scale, args.output)


if __name__ == "__main__":
    main()
