"""
Generate Steam store + library graphical assets for
"Skunked: Way of the Spray" (AppID 4815180) from the existing game art.

Produces (assets/store-listing/steam/):
  Store capsules (shown on the store before you own it):
    • small_capsule   231 x 87    (required — lists / search results, title must be legible)
    • header_capsule  460 x 215   (required — top of store page, recommended hub)
    • main_capsule    616 x 353   (front-page features / daily deals)
    • vertical_capsule 374 x 448  (sales, "Discovery" pop-ups)
    • page_background 1438 x 810   (optional store page backdrop)
  Library assets (shown to owners in their Steam Library):
    • library_capsule 600 x 900   (vertical box-art in the library grid)
    • library_header  460 x 215   (small library header)
    • library_hero   3840 x 1240  (big banner; center kept clear for the logo)
    • library_logo   1280 x 720   (TRANSPARENT png — title treatment overlaid on the hero)
  Community:
    • community_icon  184 x 184

Usage:
    python generate_steam_assets.py        # generate everything
    python generate_steam_assets.py --list # print Steam upload size reference and exit

Requires: Pillow   ->   pip install Pillow

NOTE: Steam ALSO requires at least 5 screenshots (1920x1080 / 16:9) and a
trailer — those are captured from gameplay, not generated here.
"""

import os
import sys
import math
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

ROOT = os.path.dirname(os.path.abspath(__file__))
SPRITES = os.path.join(ROOT, "assets", "sprites")
BG_DIR = os.path.join(SPRITES, "backgrounds")
CHARS = os.path.join(SPRITES, "characters")
ENEMIES = os.path.join(SPRITES, "enemies")
OUT = os.path.join(ROOT, "assets", "store-listing", "steam")

GOLD = (255, 215, 0)
DARK_BROWN = (30, 15, 0)

# Steam asset reference (filename -> (width, height, note))
STEAM_SIZES = {
    "small_capsule":    (231, 87,   "required — search/list, title legible"),
    "header_capsule":   (460, 215,  "required — store page header"),
    "main_capsule":     (616, 353,  "front-page features"),
    "vertical_capsule": (374, 448,  "sales / discovery"),
    "page_background":  (1438, 810, "optional store backdrop"),
    "library_capsule":  (600, 900,  "library vertical box-art"),
    "library_header":   (460, 215,  "library small header"),
    "library_hero":     (3840, 1240, "library hero banner (keep center clear)"),
    "library_logo":     (1280, 720, "TRANSPARENT title treatment"),
    "community_icon":   (184, 184,  "community hub icon"),
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def extract_frame(sheet_path, frame_index=0, num_frames=4):
    """Extract a single frame from a horizontal sprite strip."""
    sheet = Image.open(sheet_path).convert("RGBA")
    w, h = sheet.size
    fw = w // num_frames
    left = fw * frame_index
    return sheet.crop((left, 0, left + fw, h))


def trim_transparent(img):
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def scale_to_height(img, target_h):
    w, h = img.size
    ratio = target_h / h
    return img.resize((max(1, int(w * ratio)), target_h), Image.LANCZOS)


def get_font(size, bold=True):
    names = [
        "impact.ttf", "Impact",
        "arialbd.ttf" if bold else "arial.ttf",
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
    ]
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def draw_text_outline(draw, xy, text, font, fill, outline=DARK_BROWN, width=3):
    x, y = xy
    for dx in range(-width, width + 1):
        for dy in range(-width, width + 1):
            if dx or dy:
                draw.text((x + dx, y + dy), text, font=font, fill=outline)
    draw.text((x, y), text, font=font, fill=fill)


def add_glow(canvas, sprite, position, glow_color=(0, 255, 200), radius=12):
    alpha = sprite.split()[3]
    glow = Image.new("RGBA", sprite.size, (*glow_color, 0))
    glow.putalpha(alpha.filter(ImageFilter.GaussianBlur(radius)))
    canvas.paste(glow, position, glow)
    canvas.paste(sprite, position, sprite)


def load_bg(name, w, h, brightness=0.5, blur=3):
    bg = Image.open(os.path.join(BG_DIR, name)).convert("RGBA")
    # Cover-fit (fill, crop overflow) so we never letterbox.
    bw, bh = bg.size
    ratio = max(w / bw, h / bh)
    bg = bg.resize((int(bw * ratio), int(bh * ratio)), Image.LANCZOS)
    left = (bg.size[0] - w) // 2
    top = (bg.size[1] - h) // 2
    bg = bg.crop((left, top, left + w, top + h))
    bg = ImageEnhance.Brightness(bg).enhance(brightness)
    if blur:
        bg = bg.filter(ImageFilter.GaussianBlur(blur))
    return bg


def vignette(canvas, edge=180, top_bottom=120, margin_frac=0.22):
    w, h = canvas.size
    vig = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(vig)
    m = max(20, int(w * margin_frac))
    for x in range(m):
        a = int(edge * (1 - x / m))
        d.line([(x, 0), (x, h)], fill=(0, 0, 0, a))
        d.line([(w - 1 - x, 0), (w - 1 - x, h)], fill=(0, 0, 0, a))
    mv = max(16, int(h * 0.18))
    for y in range(mv):
        a = int(top_bottom * (1 - y / mv))
        d.line([(0, y), (w, y)], fill=(0, 0, 0, a))
        d.line([(0, h - 1 - y), (w, h - 1 - y)], fill=(0, 0, 0, a))
    return Image.alpha_composite(canvas, vig)


def sparkles(canvas, count=40, seed=42):
    w, h = canvas.size
    random.seed(seed)
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(count):
        rx, ry = random.randint(0, w), random.randint(0, h)
        s = random.randint(1, max(2, w // 200))
        color = random.choice([
            (255, 215, 0, random.randint(80, 180)),
            (0, 255, 200, random.randint(60, 150)),
            (255, 255, 255, random.randint(40, 120)),
        ])
        d.ellipse([rx, ry, rx + s, ry + s], fill=color)
    return Image.alpha_composite(canvas, layer)


def title_block(canvas, cx, top, scale=1.0, sub=True):
    """Draw the SKUNKED / Way of the Spray title centered on cx."""
    w, h = canvas.size
    tf = get_font(int(82 * scale))
    sf = get_font(int(28 * scale))
    draw = ImageDraw.Draw(canvas)
    title = "SKUNKED"
    tb = draw.textbbox((0, 0), title, font=tf)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    tx, ty = int(cx - tw / 2), top
    # backdrop glow
    pad = int(18 * scale)
    glow = Image.new("RGBA", (tw + pad * 2, th + pad * 2 + int(40 * scale)), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.rounded_rectangle([0, 0, glow.size[0], glow.size[1]], radius=int(18 * scale), fill=(0, 0, 0, 110))
    glow = glow.filter(ImageFilter.GaussianBlur(int(9 * scale)))
    canvas.paste(glow, (tx - pad, ty - pad), glow)
    draw = ImageDraw.Draw(canvas)
    draw_text_outline(draw, (tx, ty), title, tf, GOLD, width=max(2, int(4 * scale)))
    if sub:
        subt = "Way of the Spray"
        sb = draw.textbbox((0, 0), subt, font=sf)
        sw = sb[2] - sb[0]
        sx, sy = int(cx - sw / 2), ty + th + int(16 * scale)
        draw_text_outline(draw, (sx, sy), subt, sf, (255, 255, 255), outline=(0, 0, 0), width=max(1, int(2 * scale)))
    return canvas


def paste_char(canvas, sheet, pose_path, height_frac, x, flip=False,
               glow=(0, 255, 200), align_bottom=True, y=None, margin=14):
    h = canvas.size[1]
    char = trim_transparent(extract_frame(pose_path))
    char = scale_to_height(char, int(h * height_frac))
    if flip:
        char = char.transpose(Image.FLIP_LEFT_RIGHT)
    if y is None:
        y = h - char.size[1] - margin if align_bottom else 0
    add_glow(canvas, char, (int(x), int(y)), glow_color=glow, radius=max(8, h // 60))
    return char.size


# ---------------------------------------------------------------------------
# Composite layouts
# ---------------------------------------------------------------------------

def hero_scene(w, h, bg_name="city_bg.png", title_scale=1.0, with_villains=True,
               with_title=True, sub=True, sparkle=50):
    """A reusable horizontal hero composite: ninja vs bosses + title."""
    canvas = load_bg(bg_name, w, h, brightness=0.5, blur=3)
    canvas = vignette(canvas)

    # Hero ninja (left)
    paste_char(canvas, "ninja", os.path.join(CHARS, "ninja_attack.png"),
               height_frac=0.78, x=int(w * 0.04), glow=(0, 255, 200))

    if with_villains:
        # Iron Claw (boss2) right
        paste_char(canvas, "boss2", os.path.join(ENEMIES, "boss2_idle.png"),
                   height_frac=0.74, x=int(w * 0.74), flip=True, glow=(200, 60, 60))

    if with_title:
        title_block(canvas, cx=w / 2, top=int(h * 0.10), scale=title_scale, sub=sub)

    canvas = sparkles(canvas, count=sparkle)
    return canvas


def vertical_scene(w, h, bg_name="neon_bg.png", title_scale=1.0):
    """Vertical box-art: ninja large, title top, boss silhouette behind."""
    canvas = load_bg(bg_name, w, h, brightness=0.45, blur=4)
    canvas = vignette(canvas, margin_frac=0.16)

    # Boss looming behind (darkened, centered)
    boss = trim_transparent(extract_frame(os.path.join(ENEMIES, "boss6_idle.png")))
    boss = scale_to_height(boss, int(h * 0.55))
    boss = ImageEnhance.Brightness(boss).enhance(0.35)
    bx = (w - boss.size[0]) // 2
    by = int(h * 0.18)
    canvas.paste(boss, (bx, by), boss)

    # Hero ninja front and center
    ninja = trim_transparent(extract_frame(os.path.join(CHARS, "ninja_idle.png")))
    ninja = scale_to_height(ninja, int(h * 0.40))
    nx = (w - ninja.size[0]) // 2
    ny = h - ninja.size[1] - int(h * 0.06)
    add_glow(canvas, ninja, (nx, ny), glow_color=(0, 255, 200), radius=14)

    title_block(canvas, cx=w / 2, top=int(h * 0.05), scale=title_scale, sub=True)
    canvas = sparkles(canvas, count=40)
    return canvas


# ---------------------------------------------------------------------------
# Individual asset generators
# ---------------------------------------------------------------------------

def gen_small_capsule():
    w, h = STEAM_SIZES["small_capsule"][:2]
    canvas = load_bg("city_bg.png", w, h, brightness=0.4, blur=2)
    canvas = vignette(canvas, margin_frac=0.12)
    # Small ninja on the left, title fills the rest (must stay legible at tiny size)
    ninja = trim_transparent(extract_frame(os.path.join(CHARS, "ninja_idle.png")))
    ninja = scale_to_height(ninja, int(h * 0.92))
    add_glow(canvas, ninja, (4, h - ninja.size[1] - 2), glow_color=(0, 255, 200), radius=5)
    draw = ImageDraw.Draw(canvas)
    tf = get_font(34)
    title = "SKUNKED"
    tb = draw.textbbox((0, 0), title, font=tf)
    tw = tb[2] - tb[0]
    tx = ninja.size[0] + 10 + ((w - ninja.size[0] - 10) - tw) // 2
    draw_text_outline(draw, (tx, (h - (tb[3] - tb[1])) // 2 - 6), title, tf, GOLD, width=3)
    return canvas


def gen_header_capsule():
    w, h = STEAM_SIZES["header_capsule"][:2]
    return hero_scene(w, h, bg_name="city_bg.png", title_scale=0.95, sparkle=45)


def gen_main_capsule():
    w, h = STEAM_SIZES["main_capsule"][:2]
    return hero_scene(w, h, bg_name="neon_bg.png", title_scale=1.15, sparkle=60)


def gen_vertical_capsule():
    w, h = STEAM_SIZES["vertical_capsule"][:2]
    return vertical_scene(w, h, bg_name="neon_bg.png", title_scale=0.7)


def gen_page_background():
    w, h = STEAM_SIZES["page_background"][:2]
    canvas = load_bg("final_bg.png", w, h, brightness=0.32, blur=6)
    canvas = vignette(canvas, edge=220, top_bottom=160, margin_frac=0.3)
    return canvas


def gen_library_capsule():
    w, h = STEAM_SIZES["library_capsule"][:2]
    return vertical_scene(w, h, bg_name="neon_bg.png", title_scale=1.05)


def gen_library_header():
    w, h = STEAM_SIZES["library_header"][:2]
    return hero_scene(w, h, bg_name="dojo_bg.png", title_scale=0.95, sparkle=40)


def gen_library_hero():
    w, h = STEAM_SIZES["library_hero"][:2]
    # Wide cinematic banner. Center is intentionally clear so Steam can overlay
    # the transparent library_logo on top.
    canvas = load_bg("final_bg.png", w, h, brightness=0.5, blur=5)
    canvas = vignette(canvas, edge=260, top_bottom=200, margin_frac=0.18)
    # Hero far-left, villains far-right; nothing in the central third.
    paste_char(canvas, "ninja", os.path.join(CHARS, "ninja_attack.png"),
               height_frac=0.82, x=int(w * 0.06), glow=(0, 255, 200))
    paste_char(canvas, "boss2", os.path.join(ENEMIES, "boss2_attack.png"),
               height_frac=0.80, x=int(w * 0.74), flip=True, glow=(200, 60, 60))
    paste_char(canvas, "boss4", os.path.join(ENEMIES, "boss4_idle.png"),
               height_frac=0.66, x=int(w * 0.84), flip=True, glow=(255, 160, 30))
    canvas = sparkles(canvas, count=120)
    return canvas


def gen_library_logo():
    w, h = STEAM_SIZES["library_logo"][:2]
    # Transparent canvas — just the title treatment, centered.
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    tf = get_font(200)
    sf = get_font(74)
    title = "SKUNKED"
    tb = draw.textbbox((0, 0), title, font=tf)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    tx, ty = (w - tw) // 2, (h - th) // 2 - 60
    draw_text_outline(draw, (tx, ty), title, tf, GOLD, width=8)
    subt = "Way of the Spray"
    sb = draw.textbbox((0, 0), subt, font=sf)
    sw = sb[2] - sb[0]
    draw_text_outline(draw, ((w - sw) // 2, ty + th + 40), subt, sf,
                      (255, 255, 255), outline=(0, 0, 0), width=4)
    return canvas


def gen_community_icon():
    w, h = STEAM_SIZES["community_icon"][:2]
    canvas = Image.new("RGBA", (w, h), (12, 12, 32, 255))
    draw = ImageDraw.Draw(canvas)
    c = w // 2
    for r in range(c, 0, -1):
        t = r / c
        draw.ellipse([c - r, c - r, c + r, c + r],
                     fill=(int(10 + 14 * (1 - t)), int(10 + 30 * (1 - t)), int(30 + 60 * (1 - t)), 255))
    ninja = trim_transparent(extract_frame(os.path.join(CHARS, "ninja_idle.png")))
    ninja = scale_to_height(ninja, int(h * 0.74))
    nx = (w - ninja.size[0]) // 2
    ny = h - ninja.size[1] - int(h * 0.06)
    add_glow(canvas, ninja, (nx, ny), glow_color=(0, 255, 200), radius=10)
    return canvas


GENERATORS = {
    "small_capsule":    gen_small_capsule,
    "header_capsule":   gen_header_capsule,
    "main_capsule":     gen_main_capsule,
    "vertical_capsule": gen_vertical_capsule,
    "page_background":  gen_page_background,
    "library_capsule":  gen_library_capsule,
    "library_header":   gen_library_header,
    "library_hero":     gen_library_hero,
    "library_logo":     gen_library_logo,
    "community_icon":   gen_community_icon,
}

# Which assets keep an alpha channel (transparent PNG); the rest are flattened.
TRANSPARENT = {"library_logo"}


def main():
    if "--list" in sys.argv:
        print("Steam graphical asset sizes:")
        for name, (w, h, note) in STEAM_SIZES.items():
            print(f"  {name:<18} {w} x {h:<5}  {note}")
        print("\nAlso required (not generated): >=5 screenshots 1920x1080, trailer.")
        return

    os.makedirs(OUT, exist_ok=True)
    print(f"Generating Steam assets -> {OUT}")
    for name, fn in GENERATORS.items():
        w, h = STEAM_SIZES[name][:2]
        img = fn()
        if img.size != (w, h):
            img = img.resize((w, h), Image.LANCZOS)
        out_path = os.path.join(OUT, f"{name}_{w}x{h}.png")
        if name in TRANSPARENT:
            img.save(out_path, "PNG")
        else:
            img.convert("RGB").save(out_path, "PNG")
        print(f"  OK {name:<18} {w}x{h}  -> {os.path.basename(out_path)}")
    print("Done.")


if __name__ == "__main__":
    main()
