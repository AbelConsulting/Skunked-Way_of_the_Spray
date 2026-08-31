"""
Generate Google Play phone screenshots with image-first layouts.

Outputs:
  assets/store-listing/google-play/phone/phone-shot-01.png ... phone-shot-08.png
"""

import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "tools")
STORE = os.path.join(ROOT, "assets", "store-listing")
OUT = os.path.join(STORE, "google-play", "phone")

W = 1080
H = 1920


def get_font(size, bold=False):
    names = [
        "arialbd.ttf" if bold else "arial.ttf",
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
    ]
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def focus_crop(img, crop=None):
    if crop is None:
        return img
    x0, y0, x1, y1 = crop
    w, h = img.size
    return img.crop((int(w * x0), int(h * y0), int(w * x1), int(h * y1)))


def cover_fit(img, target_w, target_h):
    w, h = img.size
    ratio = max(target_w / w, target_h / h)
    resized = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    left = max(0, (resized.size[0] - target_w) // 2)
    top = max(0, (resized.size[1] - target_h) // 2)
    return resized.crop((left, top, left + target_w, top + target_h))


def draw_text_shadow(draw, xy, text, font, fill):
    x, y = xy
    for dx, dy in [(-3, -3), (-3, 3), (3, -3), (3, 3), (0, 5)]:
        draw.text((x + dx, y + dy), text, font=font, fill=(0, 0, 0, 220))
    draw.text((x, y), text, font=font, fill=fill)


def build_background():
    bg = Image.new("RGBA", (W, H), (8, 8, 22, 255))
    d = ImageDraw.Draw(bg)
    for y in range(H):
        t = y / max(1, H - 1)
        r = int(8 + 10 * t)
        g = int(8 + 12 * t)
        b = int(22 + 34 * t)
        d.line([(0, y), (W, y)], fill=(r, g, b, 255))
    # Neon edge glows
    d.rectangle([0, 0, 18, H], fill=(0, 255, 240, 120))
    d.rectangle([W - 18, 0, W, H], fill=(255, 60, 200, 120))
    d.rectangle([0, 0, W, 12], fill=(0, 180, 255, 90))
    d.rectangle([0, H - 12, W, H], fill=(255, 180, 40, 80))
    return bg.filter(ImageFilter.GaussianBlur(2))


def add_card(canvas, img, box, border=(0, 255, 240, 200)):
    x0, y0, x1, y1 = box
    card = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
    shadow = Image.new("RGBA", card.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([8, 12, card.width - 8, card.height - 8], radius=34, fill=(0, 0, 0, 170))
    shadow = shadow.filter(ImageFilter.GaussianBlur(16))
    canvas.paste(shadow, (x0, y0), shadow)

    framed = img.copy()
    framed = framed.filter(ImageFilter.SMOOTH_MORE)
    card.paste(framed, (0, 0))
    cd = ImageDraw.Draw(card)
    cd.rounded_rectangle([0, 0, card.width - 1, card.height - 1], radius=34, outline=border, width=4)
    canvas.paste(card, (x0, y0), card)


def overlay_badge(canvas, text, box, fill=(10, 12, 28, 200), outline=(0, 255, 240, 180), font_size=30):
    d = ImageDraw.Draw(canvas)
    x0, y0, x1, y1 = box
    d.rounded_rectangle(box, radius=24, fill=fill, outline=outline, width=2)
    font = get_font(font_size, bold=True)
    bb = d.textbbox((0, 0), text, font=font)
    tw = bb[2] - bb[0]
    th = bb[3] - bb[1]
    tx = x0 + (x1 - x0 - tw) // 2
    ty = y0 + (y1 - y0 - th) // 2 - 2
    draw_text_shadow(d, (tx, ty), text, font, (220, 255, 255, 255))


def compose_shot(src_path, headline, subhead, out_path, crop=None, accent="cyan", icon_path=None):
    src = Image.open(src_path).convert("RGBA")
    src = focus_crop(src, crop)
    src = cover_fit(src, 920, 1380)
    src = ImageEnhance.Contrast(src).enhance(1.10)
    src = ImageEnhance.Color(src).enhance(1.12)
    src = ImageEnhance.Brightness(src).enhance(1.04)

    canvas = build_background()
    # Main art card: most of the screenshot is image.
    add_card(canvas, src, (80, 150, 1000, 1530), border=(0, 255, 240, 210) if accent == "cyan" else (255, 90, 200, 210))

    # Small branding badge.
    overlay_badge(canvas, "SKUNKED: WAY OF THE SPRAY", (150, 44, 930, 108), font_size=28)

    # Optional icon sticker.
    if icon_path and os.path.exists(icon_path):
        icon = Image.open(icon_path).convert("RGBA").resize((160, 160), Image.LANCZOS)
        icon = icon.filter(ImageFilter.SMOOTH_MORE)
        sticker = Image.new("RGBA", (190, 190), (0, 0, 0, 0))
        sd = ImageDraw.Draw(sticker)
        sd.rounded_rectangle([0, 0, 189, 189], radius=34, fill=(0, 0, 0, 120), outline=(255, 215, 0, 150), width=2)
        sticker.paste(icon, (15, 15), icon)
        canvas.paste(sticker, (860, 1440), sticker)

    # Bottom caption strip: short text, image still dominant.
    strip = Image.new("RGBA", (W - 160, 300), (0, 0, 0, 0))
    sd = ImageDraw.Draw(strip)
    sd.rounded_rectangle([0, 0, strip.width - 1, strip.height - 1], radius=28, fill=(7, 10, 24, 210), outline=(0, 255, 240, 140), width=2)
    canvas.paste(strip, (80, 1600), strip)

    d = ImageDraw.Draw(canvas)
    h_font = get_font(56, bold=True)
    s_font = get_font(28, bold=False)
    hb = d.textbbox((0, 0), headline, font=h_font)
    hw = hb[2] - hb[0]
    hx = (W - hw) // 2
    hy = 1640
    headline_fill = (255, 214, 64, 255) if accent == "gold" else (255, 232, 255, 255)
    draw_text_shadow(d, (hx, hy), headline, h_font, headline_fill)

    sb = d.textbbox((0, 0), subhead, font=s_font)
    sw = sb[2] - sb[0]
    sx = (W - sw) // 2
    sy = 1730
    draw_text_shadow(d, (sx, sy), subhead, s_font, (235, 245, 255, 255))

    # Tiny footer note: short and unobtrusive.
    f_font = get_font(22, bold=True)
    footer = "Mobile-ready. Quick runs. Big fights."
    fb = d.textbbox((0, 0), footer, font=f_font)
    fx = (W - (fb[2] - fb[0])) // 2
    draw_text_shadow(d, (fx, 1810), footer, f_font, (130, 255, 240, 255))

    canvas.convert("RGB").save(out_path, "PNG", optimize=True)


def main():
    os.makedirs(OUT, exist_ok=True)

    shots = [
        {
            "name": "phone-shot-01.png",
            "src": os.path.join(ROOT, "tmp-frames", "rebuild_static_screenshot.png"),
            "crop": (0.00, 0.42, 1.00, 1.00),
            "headline": "FAST NINJA COMBAT",
            "subhead": "Dodge, strike, and push deeper.",
            "accent": "cyan",
            "icon": os.path.join(STORE, "app-icon-512x512.png"),
        },
        {
            "name": "phone-shot-02.png",
            "src": os.path.join(TOOLS, "game_screenshot.png"),
            "crop": (0.00, 0.10, 1.00, 1.00),
            "headline": "PRESS START",
            "subhead": "Built for fast mobile sessions.",
            "accent": "gold",
            "icon": os.path.join(STORE, "maskable-icon-512x512.png"),
        },
        {
            "name": "phone-shot-03.png",
            "src": os.path.join(STORE, "feature-graphic-1024x500.png"),
            "crop": None,
            "headline": "EPIC BOSS RUNS",
            "subhead": "Bosses, waves, and score-chasing.",
            "accent": "cyan",
            "icon": os.path.join(STORE, "app-icon-512x512.png"),
        },
        {
            "name": "phone-shot-04.png",
            "src": os.path.join(ROOT, "tmp-frames", "rebuild_static_screenshot.png"),
            "crop": (0.00, 0.50, 1.00, 1.00),
            "headline": "SURVIVE THE STAGES",
            "subhead": "Keep moving or get overwhelmed.",
            "accent": "gold",
            "icon": os.path.join(STORE, "maskable-icon-512x512.png"),
        },
        {
            "name": "phone-shot-05.png",
            "src": os.path.join(TOOLS, "game_screenshot.png"),
            "crop": (0.00, 0.24, 1.00, 1.00),
            "headline": "NINJA SKUNK STYLE",
            "subhead": "Retro attitude with modern speed.",
            "accent": "cyan",
            "icon": os.path.join(STORE, "app-icon-512x512.png"),
        },
        {
            "name": "phone-shot-06.png",
            "src": os.path.join(STORE, "feature-graphic-1024x500.png"),
            "crop": None,
            "headline": "UNLOCK RARE SKINS",
            "subhead": "Cosmetics that stand out in-game.",
            "accent": "gold",
            "icon": os.path.join(STORE, "app-icon-512x512.png"),
        },
        {
            "name": "phone-shot-07.png",
            "src": os.path.join(ROOT, "tmp-frames", "rebuild_static_screenshot.png"),
            "crop": (0.00, 0.50, 1.00, 1.00),
            "headline": "DODGE. SLASH. WIN.",
            "subhead": "Tight controls, quick feedback.",
            "accent": "cyan",
            "icon": os.path.join(STORE, "maskable-icon-512x512.png"),
        },
        {
            "name": "phone-shot-08.png",
            "src": os.path.join(TOOLS, "game_screenshot.png"),
            "crop": (0.00, 0.00, 1.00, 1.00),
            "headline": "RETRO ACTION, MOBILE READY",
            "subhead": "A polished arcade run for Android.",
            "accent": "gold",
            "icon": os.path.join(STORE, "app-icon-512x512.png"),
        },
    ]

    created = []
    for shot in shots:
        if not os.path.exists(shot["src"]):
            continue
        out_path = os.path.join(OUT, shot["name"])
        compose_shot(
            shot["src"],
            shot["headline"],
            shot["subhead"],
            out_path,
            crop=shot["crop"],
            accent=shot["accent"],
            icon_path=shot["icon"],
        )
        created.append(out_path)

    print("Generated", len(created), "phone screenshots:")
    for p in created:
        print(" -", p)


if __name__ == "__main__":
    main()
