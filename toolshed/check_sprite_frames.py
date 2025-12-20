#!/usr/bin/env python3
"""Check sprite sheets for expected frame counts and detect padding/stride.

Usage: python check_sprite_frames.py
Exits with non-zero when any sprite cannot be parsed into integer frames or detected padding.
"""
from pathlib import Path
from PIL import Image
import sys

EXPECTED = {
    'ninja_idle': 4,
    'ninja_walk': 4,
    'ninja_jump': 4,
    'ninja_attack': 4,
    'ninja_shadow_strike': 8,
    'ninja_hurt': 2,
}

BASE = Path(__file__).resolve().parents[1]
SEARCH_PATHS = [BASE / 'assets' / 'sprites' / 'characters', BASE / 'assets' / 'sprites' / 'enemies']

errors = 0
for name, frames in EXPECTED.items():
    found = None
    for p in SEARCH_PATHS:
        cand = p / f"{name}.png"
        if cand.exists():
            found = cand
            break
    if not found:
        print(f"MISSING: {name} (searched {', '.join(str(p) for p in SEARCH_PATHS)})")
        errors += 1
        continue

    try:
        img = Image.open(found)
        w, h = img.size
    except Exception as e:
        print(f"ERR opening {found}: {e}")
        errors += 1
        continue

    # If width divisible by frames, that's fine
    if w % frames == 0:
        fw = w // frames
        print(f"OK: {name} -> width={w}, frames={frames}, frameWidth={fw} (divisible)")
        continue

    # Try detect padding 1..8
    detected = False
    for pad in range(1, 9):
        adjusted = w - pad * (frames - 1)
        if adjusted > 0 and (adjusted % frames) == 0:
            fw = adjusted // frames
            stride = fw + pad
            print(f"DETECTED: {name} -> width={w}, frames={frames}, pad={pad}, frameWidth={fw}, stride={stride}")
            detected = True
            break

    if not detected:
        print(f"WARN: {name} width {w} not divisible by {frames} and no uniform pad 1..8 detected (frame width approx {w/frames:.2f})")
        errors += 1

if errors:
    print(f"\nCompleted with {errors} problems found.")
    sys.exit(2)
else:
    print("\nAll sprite frames validated.")
    sys.exit(0)
