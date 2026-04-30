"""Preview the GoldenSkin tint on the ninja_idle sprite sheet.

Mirrors the JS algorithm in js/goldenSkin.js so we can render a PNG preview
without launching the game. Outputs side-by-side comparison PNGs.
"""
from PIL import Image
from pathlib import Path

GOLD_STOPS = [
    (0.00, 0x3a, 0x22, 0x06),
    (0.08, 0x6a, 0x42, 0x0a),
    (0.20, 0xa8, 0x70, 0x14),
    (0.40, 0xe0, 0xa8, 0x28),
    (0.65, 0xff, 0xd8, 0x60),
    (0.85, 0xff, 0xee, 0xa8),
    (1.00, 0xff, 0xfa, 0xe0),
]

def lum_to_gold(L):
    if L <= GOLD_STOPS[0][0]:
        _, r, g, b = GOLD_STOPS[0]; return r, g, b
    if L >= GOLD_STOPS[-1][0]:
        _, r, g, b = GOLD_STOPS[-1]; return r, g, b
    for i in range(1, len(GOLD_STOPS)):
        la, ra, ga, ba = GOLD_STOPS[i-1]
        lb, rb, gb, bb = GOLD_STOPS[i]
        if L <= lb:
            t = (L - la) / (lb - la)
            return (
                round(ra + (rb - ra) * t),
                round(ga + (gb - ga) * t),
                round(ba + (bb - ba) * t),
            )
    _, r, g, b = GOLD_STOPS[-1]; return r, g, b

def tint(src_path: Path, out_path: Path):
    img = Image.open(src_path).convert('RGBA')
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0
            nr, ng, nb = lum_to_gold(L)
            px[x, y] = (nr, ng, nb, a)
    img.save(out_path)
    return img

def make_comparison(src_path: Path, gold_img: Image.Image, out_path: Path):
    src = Image.open(src_path).convert('RGBA')
    w, h = src.size
    pad = 8
    scale = 4  # 4x upscale so it's actually visible in a screenshot
    cw = (w * 2 + pad * 3) * scale
    ch = (h + pad * 2) * scale
    canvas = Image.new('RGBA', (cw, ch), (40, 40, 48, 255))
    src_big = src.resize((w * scale, h * scale), Image.NEAREST)
    gold_big = gold_img.resize((w * scale, h * scale), Image.NEAREST)
    canvas.alpha_composite(src_big, (pad * scale, pad * scale))
    canvas.alpha_composite(gold_big, ((pad * 2 + w) * scale, pad * scale))
    canvas.save(out_path)

if __name__ == '__main__':
    base = Path('assets/sprites/characters')
    out_dir = Path('tmp/gold_preview')
    out_dir.mkdir(parents=True, exist_ok=True)
    for name in ['ninja_idle', 'ninja_walk', 'ninja_attack', 'ninja_shadow_strike']:
        src = base / f'{name}.png'
        if not src.exists():
            print(f'skip {src}'); continue
        gold = tint(src, out_dir / f'{name}_gold.png')
        make_comparison(src, gold, out_dir / f'{name}_compare.png')
        print(f'wrote {name}_compare.png')
