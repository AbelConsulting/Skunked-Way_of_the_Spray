"""
Generate Android launcher icons from the game source icon.

Populates all mipmap-* directories with ic_launcher.png, ic_launcher_round.png,
and ic_launcher_foreground.png (for adaptive icons on API 26+).

Requires: Pillow
    pip install Pillow

Usage:
    python tools/generate_android_icons.py
    python tools/generate_android_icons.py --source assets/icons/icon-source.png
"""

import os
import sys
import argparse

from PIL import Image, ImageDraw

# ── paths ──────────────────────────────────────────────────────────────────────
WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SOURCE = os.path.join(WORKSPACE, 'assets', 'icons', 'icon-source.png')
MIPMAP_BASE = os.path.join(WORKSPACE, 'android', 'app', 'src', 'main', 'res')

# ── size tables ────────────────────────────────────────────────────────────────
# Regular launcher icon sizes (dp @ each density)
LAUNCHER_SIZES = {
    'mipmap-mdpi':    48,
    'mipmap-hdpi':    72,
    'mipmap-xhdpi':   96,
    'mipmap-xxhdpi':  144,
    'mipmap-xxxhdpi': 192,
}

# Adaptive icon foreground layer must be 108dp; foreground content should fit
# inside the inner 72dp safe zone.  We export at the same density multipliers.
FOREGROUND_SIZES = {
    'mipmap-mdpi':    108,
    'mipmap-hdpi':    162,
    'mipmap-xhdpi':   216,
    'mipmap-xxhdpi':  324,
    'mipmap-xxxhdpi': 432,
}

# Background colour for the adaptive-icon background XML (game dark theme)
BG_COLOR_XML  = '#1a1a2e'
# Pillow RGBA equivalent for compositing round icons
BG_COLOR_RGBA = (26, 26, 46, 255)


# ── helpers ────────────────────────────────────────────────────────────────────

def center_crop_square(img: Image.Image) -> Image.Image:
    w, h = img.size
    if w == h:
        return img
    side = min(w, h)
    left = (w - side) // 2
    top  = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def make_launcher(source: Image.Image, size: int) -> Image.Image:
    """Square launcher icon – simple resize."""
    img = center_crop_square(source).resize((size, size), Image.LANCZOS)
    return img


def make_round(source: Image.Image, size: int) -> Image.Image:
    """Circular launcher icon on transparent background."""
    base = center_crop_square(source).resize((size, size), Image.LANCZOS).convert('RGBA')
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    result = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    result.paste(base, mask=mask)
    return result


def make_foreground(source: Image.Image, total: int) -> Image.Image:
    """
    Adaptive icon foreground layer.
    The source image is scaled to the inner 72/108 * total safe zone,
    centred on a transparent canvas of `total` × `total`.
    """
    safe_ratio = 72 / 108          # inner safe zone fraction
    inner = int(total * safe_ratio)
    icon = center_crop_square(source).resize((inner, inner), Image.LANCZOS).convert('RGBA')
    canvas = Image.new('RGBA', (total, total), (0, 0, 0, 0))
    offset = (total - inner) // 2
    canvas.paste(icon, (offset, offset), icon)
    return canvas


def save(img: Image.Image, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'PNG')
    print(f'  ✓ {os.path.relpath(path, WORKSPACE)}')


# ── main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description='Generate Android launcher icons')
    parser.add_argument('--source', default=DEFAULT_SOURCE,
                        help='Path to source PNG (512x512 or larger)')
    args = parser.parse_args()

    if not os.path.exists(args.source):
        print(f'ERROR: source not found: {args.source}')
        sys.exit(1)

    source = Image.open(args.source).convert('RGBA')
    w, h = source.size
    print(f'Source: {args.source}  ({w}×{h})')
    print()

    # Regular + round icons
    for density, size in LAUNCHER_SIZES.items():
        out_dir = os.path.join(MIPMAP_BASE, density)

        save(make_launcher(source, size),
             os.path.join(out_dir, 'ic_launcher.png'))

        save(make_round(source, size),
             os.path.join(out_dir, 'ic_launcher_round.png'))

    print()

    # Adaptive foreground layer
    for density, size in FOREGROUND_SIZES.items():
        out_dir = os.path.join(MIPMAP_BASE, density)
        save(make_foreground(source, size),
             os.path.join(out_dir, 'ic_launcher_foreground.png'))

    print()

    # Update background colour to match game theme
    bg_xml_path = os.path.join(MIPMAP_BASE, 'values', 'ic_launcher_background.xml')
    if os.path.exists(bg_xml_path):
        with open(bg_xml_path, 'w') as f:
            f.write(f'<?xml version="1.0" encoding="utf-8"?>\n'
                    f'<resources>\n'
                    f'    <color name="ic_launcher_background">{BG_COLOR_XML}</color>\n'
                    f'</resources>\n')
        print(f'  ✓ {os.path.relpath(bg_xml_path, WORKSPACE)}  (background → {BG_COLOR_XML})')

    print()
    print('Done. Rebuild the Android project to pick up the new icons:')
    print('  npx cap sync android')
    print('  (then build in Android Studio or via Gradle)')


if __name__ == '__main__':
    main()
