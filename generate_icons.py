"""
Generate PWA app icons from the source SVG.

Requires: Pillow, cairosvg (or just Pillow if source is PNG)
    pip install Pillow cairosvg

Usage:
    python generate_icons.py
    python generate_icons.py --source path/to/your-logo.png

If no --source is given, converts assets/icons/icon-source.svg to PNG first,
then resizes to all required PWA/Play Store sizes.
"""

import os
import sys
import argparse

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
ICON_DIR = os.path.join(os.path.dirname(__file__), 'assets', 'icons')


def svg_to_png(svg_path, png_path, size=512):
    """Convert SVG to PNG using cairosvg."""
    try:
        import cairosvg
        cairosvg.svg2png(
            url=svg_path,
            write_to=png_path,
            output_width=size,
            output_height=size,
        )
        return True
    except ImportError:
        print('cairosvg not installed — trying Pillow SVG fallback…')
        return False


def center_crop_square(img):
    """Center-crop a rectangular image to a square using the shorter side."""
    w, h = img.size
    if w == h:
        return img
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def resize_png(source_path, output_path, size):
    """Resize a PNG to the given square size (auto-crops to square first)."""
    from PIL import Image
    img = Image.open(source_path).convert('RGBA')
    img = center_crop_square(img)
    resized = img.resize((size, size), Image.LANCZOS)
    resized.save(output_path, 'PNG')


def create_maskable(source_path, output_path, size=512):
    """
    Create a maskable icon: the 'safe zone' is the inner 80% circle.
    We add 10% padding on each side with the background color.
    """
    from PIL import Image, ImageDraw
    bg_color = (26, 26, 46, 255)  # #1a1a2e
    canvas = Image.new('RGBA', (size, size), bg_color)
    img = Image.open(source_path).convert('RGBA')
    img = center_crop_square(img)

    # Scale source to 80% of target size (safe zone)
    inner = int(size * 0.80)
    img = img.resize((inner, inner), Image.LANCZOS)
    offset = (size - inner) // 2
    canvas.paste(img, (offset, offset), img)
    canvas.save(output_path, 'PNG')


def main():
    parser = argparse.ArgumentParser(description='Generate PWA icons')
    parser.add_argument('--source', default=None, help='Path to source PNG (512x512+)')
    args = parser.parse_args()

    os.makedirs(ICON_DIR, exist_ok=True)

    source_png = os.path.join(ICON_DIR, 'icon-512x512.png')

    if args.source:
        source_png_input = args.source
    else:
        # Try converting SVG → PNG
        svg_path = os.path.join(ICON_DIR, 'icon-source.svg')
        if not os.path.exists(svg_path):
            print(f'ERROR: No source found at {svg_path}')
            print('Please provide --source path/to/icon.png or place icon-source.svg in assets/icons/')
            sys.exit(1)
        tmp_png = os.path.join(ICON_DIR, '_tmp_source.png')
        if svg_to_png(svg_path, tmp_png, 512):
            source_png_input = tmp_png
        else:
            print('ERROR: Cannot convert SVG. Install cairosvg or provide a PNG with --source.')
            sys.exit(1)

    print(f'Source: {source_png_input}')
    # Report dimensions and auto-crop
    from PIL import Image as _Img
    _src = _Img.open(source_png_input)
    w, h = _src.size
    print(f'Source size: {w}x{h}')
    if w != h:
        side = min(w, h)
        print(f'Auto-cropping center {side}x{side} from {w}x{h}')
    print(f'Output: {ICON_DIR}')
    print()

    for size in SIZES:
        out = os.path.join(ICON_DIR, f'icon-{size}x{size}.png')
        resize_png(source_png_input, out, size)
        print(f'  ✓ icon-{size}x{size}.png')

    # Maskable icon (512x512 with safe-zone padding)
    maskable_out = os.path.join(ICON_DIR, 'maskable-512x512.png')
    create_maskable(source_png_input, maskable_out, 512)
    print(f'  ✓ maskable-512x512.png')

    # Clean up temp file
    tmp = os.path.join(ICON_DIR, '_tmp_source.png')
    if os.path.exists(tmp):
        os.remove(tmp)

    print()
    print('Done! Icons generated in assets/icons/')
    print()
    print('Next steps:')
    print('  1. Replace icon-source.svg (or pass --source your-logo.png) with your real artwork')
    print('  2. Re-run this script to regenerate all sizes')
    print('  3. Test with Lighthouse or Chrome DevTools > Application > Manifest')


if __name__ == '__main__':
    main()
