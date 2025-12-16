"""
Upscale background tile images to 64x64 using Pillow (nearest neighbor).
Usage: python toolshed/upscale_tiles.py
"""
from PIL import Image
from PIL import ImageDraw, ImageFont
import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sprites', 'backgrounds', 'tiles')
files = [
    'ground_tile.png',
    'wall_tile.png',
    # platform_tile already 64x64, but include it for consistency
    'platform_tile.png'
]

failed = []
for f in files:
    p = os.path.join(BASE, f)
    if not os.path.exists(p):
        print('Missing', p)
        failed.append(p)
        continue
    try:
        im = Image.open(p)
        w,h = im.size
        if (w,h) != (64,64):
            print(f'Resizing {f}: {w}x{h} -> 64x64')
            im = im.convert('RGBA')
            im = im.resize((64,64), Image.NEAREST)
            im.save(p, format='PNG')
        else:
            print(f'{f} already 64x64, skipping')
    except Exception as e:
        print('Failed to process', p, e)
        # If platform_tile is an SVG or non-raster, synthesize a PNG replacement
        if f == 'platform_tile.png':
            try:
                print('Generating fallback platform_tile.png as 64x64 PNG')
                canvas = Image.new('RGBA', (64,64), (0,0,0,0))
                draw = ImageDraw.Draw(canvas)
                # Background
                draw.rectangle([0,0,63,63], fill=(135,193,255,255))
                # Dark shape
                draw.ellipse([6,6,58,34], fill=(43,111,176,255))
                # Accent
                draw.rectangle([6,32,58,50], fill=(43,43,43,200))
                # Text 'GM'
                try:
                    from PIL import ImageFont
                    font = ImageFont.load_default()
                    draw.text((12,34), 'GM', font=font, fill=(10,35,80,255))
                except Exception:
                    draw.text((12,34), 'GM', fill=(10,35,80,255))
                canvas.save(p, format='PNG')
                print('platform_tile.png synthesized')
            except Exception as ee:
                print('Fallback generation failed', ee)
                failed.append(p)
        else:
            failed.append(p)

if failed:
    print('Some files failed:', failed)
    raise SystemExit(1)
print('All tiles upscaled to 64x64 (if needed)')