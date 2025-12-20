#!/usr/bin/env python3
"""Fix sprite sheet widths by padding them to an exact multiple of frame count.

This script targets sprite sheets for known animations (e.g., ninja_*).
For each entry in the built-in mapping it will check whether the image width
is divisible by the expected frame count. If not, it will pad the image
(transparent pixels) evenly on both sides so (frameWidth * frameCount) == new width.

Usage:
  python fix_spritesheets.py [--backup] [--paths assets/sprites/characters assets/sprites/enemies]

Options:
  --backup   Create a .bak copy of the original file before overwriting
  --dry-run  Don't write any files; just print what would be changed
  --verbose  Print more details

"""
from pathlib import Path
from PIL import Image
import argparse
import shutil
import math
import sys

EXPECTED_FRAMES = {
    'ninja_idle': 4,
    'ninja_walk': 4,
    'ninja_jump': 4,
    'ninja_attack': 4,
    'ninja_shadow_strike': 8,
    'ninja_hurt': 2,
}

DEFAULT_PATHS = [Path('assets/sprites/characters'), Path('assets/sprites/enemies')]


def find_sprite_path(base_paths, name):
    """Search for a file named <name>.png in the provided base paths."""
    for p in base_paths:
        candidate = p / f"{name}.png"
        if candidate.exists():
            return candidate
    return None


def pad_image(img, left_pad, right_pad, fill=(0, 0, 0, 0)):
    w, h = img.size
    new_w = left_pad + w + right_pad
    mode = img.mode
    if mode == 'RGBA' or 'A' in mode:
        bg = Image.new('RGBA', (new_w, h), fill)
    else:
        # For RGB, pad with transparent-like color (black)
        bg = Image.new(mode, (new_w, h), (0, 0, 0))
    bg.paste(img, (left_pad, 0))
    return bg


def process_sheet(path: Path, frame_count: int, backup=False, dry_run=False, verbose=False):
    if verbose:
        print(f"Inspecting {path} (expected frames={frame_count})")
    try:
        img = Image.open(path).convert('RGBA')
    except Exception as e:
        print(f"  [ERR] Failed to open {path}: {e}")
        return False

    w, h = img.size
    if w % frame_count == 0:
        if verbose:
            print(f"  [OK] Width {w} already divisible by {frame_count} (frame width={w//frame_count})")
        return True

    # Compute new frame width (ceil to avoid cropping), target width and padding
    frame_width = math.ceil(w / frame_count)
    target_width = frame_width * frame_count
    pad_total = target_width - w
    pad_left = pad_total // 2
    pad_right = pad_total - pad_left

    print(f"  [WARN] {path.name}: width {w} not divisible by {frame_count}; target frameWidth={frame_width}, pad left={pad_left} right={pad_right} -> new width {target_width}")

    if dry_run:
        return True

    # Backup original if requested
    if backup:
        bak = path.with_suffix(path.suffix + '.bak')
        shutil.copy2(path, bak)
        print(f"    - Backup saved to {bak}")

    # Create padded image and overwrite
    new_img = pad_image(img, pad_left, pad_right)
    try:
        new_img.save(path, optimize=True)
        print(f"    - Wrote fixed image to {path}")
        return True
    except Exception as e:
        print(f"    [ERR] Failed to write fixed image: {e}")
        return False


def main(argv=None):
    parser = argparse.ArgumentParser(description='Fix sprite sheet widths by padding to a multiple of frame count')
    parser.add_argument('--backup', action='store_true', help='Save a .bak copy of original files')
    parser.add_argument('--dry-run', action='store_true', help="Don't write changes, only report")
    parser.add_argument('--verbose', action='store_true', help='Verbose output')
    parser.add_argument('paths', nargs='*', help='Directories to search for sprite files (default: assets/sprites/characters assets/sprites/enemies)')
    args = parser.parse_args(argv)

    base_paths = [Path(p) for p in args.paths] if args.paths else DEFAULT_PATHS

    changed = 0
    total = 0
    for name, frames in EXPECTED_FRAMES.items():
        total += 1
        path = find_sprite_path(base_paths, name)
        if not path:
            print(f"  - Missing sprite for '{name}' (searched: {', '.join(str(p) for p in base_paths)})")
            continue
        ok = process_sheet(path, frames, backup=args.backup, dry_run=args.dry_run, verbose=args.verbose)
        if ok:
            changed += 1

    print(f"Done. Inspected {total} sprites; processed {changed}/{total} (dry_run={args.dry_run}).")


if __name__ == '__main__':
    main()
