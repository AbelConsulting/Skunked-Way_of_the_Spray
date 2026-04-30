"""Preview the GoldenSkin palettes on ninja_idle.

Mirrors the JS palettes in js/goldenSkin.js so we can render PNG previews
without launching the game.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

PALETTES = {
    'gold': [
        (0.00, 0x3a, 0x22, 0x06),
        (0.08, 0x6a, 0x42, 0x0a),
        (0.20, 0xa8, 0x70, 0x14),
        (0.40, 0xe0, 0xa8, 0x28),
        (0.65, 0xff, 0xd8, 0x60),
        (0.85, 0xff, 0xee, 0xa8),
        (1.00, 0xff, 0xfa, 0xe0),
    ],
    'sapphire': [
        (0.00, 0x06, 0x10, 0x30),
        (0.08, 0x0c, 0x22, 0x55),
        (0.20, 0x14, 0x3e, 0x90),
        (0.40, 0x28, 0x70, 0xd0),
        (0.65, 0x60, 0xb8, 0xff),
        (0.85, 0xb8, 0xe2, 0xff),
        (1.00, 0xe8, 0xf6, 0xff),
    ],
    'amethyst': [
        (0.00, 0x18, 0x06, 0x2c),
        (0.08, 0x32, 0x12, 0x55),
        (0.20, 0x5e, 0x26, 0x95),
        (0.40, 0x8c, 0x46, 0xc8),
        (0.65, 0xc8, 0x80, 0xff),
        (0.85, 0xe2, 0xc0, 0xff),
        (1.00, 0xf6, 0xe8, 0xff),
    ],
    'steel': [
        (0.00, 0x12, 0x16, 0x1c),
        (0.08, 0x28, 0x2e, 0x38),
        (0.20, 0x4a, 0x52, 0x60),
        (0.40, 0x76, 0x82, 0x94),
        (0.65, 0xb0, 0xbc, 0xcc),
        (0.85, 0xdc, 0xe4, 0xee),
        (1.00, 0xf4, 0xf8, 0xfd),
    ],
}

def lum_to_rgb(stops, L):
    if L <= stops[0][0]:
        _, r, g, b = stops[0]; return r, g, b
    if L >= stops[-1][0]:
        _, r, g, b = stops[-1]; return r, g, b
    for i in range(1, len(stops)):
        la, ra, ga, ba = stops[i-1]
        lb, rb, gb, bb = stops[i]
        if L <= lb:
            t = (L - la) / (lb - la)
            return (
                round(ra + (rb - ra) * t),
                round(ga + (gb - ga) * t),
                round(ba + (bb - ba) * t),
            )
    _, r, g, b = stops[-1]; return r, g, b

def tint(src: Image.Image, stops):
    img = src.copy()
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0
            nr, ng, nb = lum_to_rgb(stops, L)
            px[x, y] = (nr, ng, nb, a)
    return img

def make_grid(src: Image.Image, out_path: Path):
    scale = 4
    pad = 12
    label_h = 22
    cell_w = src.width * scale
    cell_h = src.height * scale + label_h
    cols = len(PALETTES) + 1  # original + variants
    cw = pad + (cell_w + pad) * cols
    ch = pad + cell_h + pad
    canvas = Image.new('RGBA', (cw, ch), (28, 28, 36, 255))
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype('arial.ttf', 14)
    except Exception:
        font = ImageFont.load_default()

    def paste_cell(idx, label, image):
        x = pad + idx * (cell_w + pad)
        y = pad
        big = image.resize((cell_w, src.height * scale), Image.NEAREST)
        canvas.alpha_composite(big, (x, y))
        tw = draw.textlength(label, font=font)
        draw.text((x + (cell_w - tw) / 2, y + src.height * scale + 4), label, fill=(255, 255, 255, 230), font=font)

    paste_cell(0, 'Original', src)
    for i, (name, stops) in enumerate(PALETTES.items(), start=1):
        paste_cell(i, name.capitalize(), tint(src, stops))
    canvas.save(out_path)

if __name__ == '__main__':
    base = Path('assets/sprites/characters')
    out_dir = Path('tmp/gold_preview')
    out_dir.mkdir(parents=True, exist_ok=True)
    for name in ['ninja_idle', 'ninja_attack', 'ninja_shadow_strike']:
        src = base / f'{name}.png'
        if not src.exists():
            continue
        img = Image.open(src).convert('RGBA')
        make_grid(img, out_dir / f'{name}_variants.png')
        print(f'wrote {name}_variants.png')
