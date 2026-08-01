"""
Generate Google Play Store listing assets from existing game sprites.

Creates:
  1. Feature Graphic  — 1024 x 500  (required by Play Store)
  2. App Icon          — 512 x 512   (character-focused)
  3. Maskable Icon     — 512 x 512   (with safe-zone padding)

Usage:
    python generate_play_store_assets.py

Requires: Pillow
    pip install Pillow
"""

import os
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

ROOT = os.path.dirname(os.path.abspath(__file__))
SPRITES = os.path.join(ROOT, "assets", "sprites")
ICONS = os.path.join(ROOT, "assets", "icons")
OUT = os.path.join(ROOT, "assets", "store-listing")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def extract_frame(sprite_sheet_path, frame_index=0, num_frames=4):
    """Extract a single frame from a horizontal sprite strip."""
    sheet = Image.open(sprite_sheet_path).convert("RGBA")
    w, h = sheet.size
    fw = w // num_frames
    left = fw * frame_index
    return sheet.crop((left, 0, left + fw, h))


def trim_transparent(img):
    """Crop transparent border from an RGBA image."""
    bbox = img.getbbox()
    if bbox:
        return img.crop(bbox)
    return img


def scale_to_height(img, target_h):
    """Scale img proportionally so its height equals target_h."""
    w, h = img.size
    ratio = target_h / h
    new_w = int(w * ratio)
    return img.resize((new_w, target_h), Image.LANCZOS)


def scale_to_fit(img, max_w, max_h):
    """Scale img to fit within max_w x max_h, preserving ratio."""
    w, h = img.size
    ratio = min(max_w / w, max_h / h)
    return img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)


def cover_fit(img, target_w, target_h):
    """Scale img to fully cover target_w x target_h, then center-crop."""
    w, h = img.size
    ratio = max(target_w / w, target_h / h)
    resized = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    left = max(0, (resized.size[0] - target_w) // 2)
    top = max(0, (resized.size[1] - target_h) // 2)
    return resized.crop((left, top, left + target_w, top + target_h))


def draw_text_with_outline(draw, xy, text, font, fill, outline_fill, outline_width=3):
    """Draw text with an outline/stroke for readability."""
    x, y = xy
    for dx in range(-outline_width, outline_width + 1):
        for dy in range(-outline_width, outline_width + 1):
            if dx == 0 and dy == 0:
                continue
            draw.text((x + dx, y + dy), text, font=font, fill=outline_fill)
    draw.text((x, y), text, font=font, fill=fill)


def get_font(size, bold=False):
    """Try to load a system font, fall back to default."""
    font_names = [
        "arialbd.ttf" if bold else "arial.ttf",
        "Impact",
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
    ]
    for name in font_names:
        try:
            return ImageFont.truetype(name, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def add_glow(canvas, sprite, position, glow_color=(0, 255, 200), glow_radius=12):
    """Paste a sprite with a colored glow behind it."""
    # Create glow layer from sprite alpha
    alpha = sprite.split()[3]
    glow = Image.new("RGBA", sprite.size, (*glow_color, 0))
    glow_alpha = alpha.filter(ImageFilter.GaussianBlur(glow_radius))
    glow.putalpha(glow_alpha)
    canvas.paste(glow, position, glow)
    canvas.paste(sprite, position, sprite)


def draw_feature_chip(draw, box, text, font, fill, outline, text_fill):
    """Draw a compact rounded badge for store-art feature callouts."""
    left, top, right, bottom = box
    draw.rounded_rectangle(box, radius=18, fill=fill, outline=outline, width=2)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = left + (right - left - tw) // 2
    ty = top + (bottom - top - th) // 2 - 2
    draw_text_with_outline(draw, (tx, ty), text, font, text_fill, (0, 0, 0), outline_width=1)


# ---------------------------------------------------------------------------
# 1. Feature Graphic  (1024 x 500)
# ---------------------------------------------------------------------------

def generate_feature_graphic():
    """Create the Play Store feature graphic (1024x500)."""
    W, H = 1024, 500

    # --- Background: forest_bg, cover-fit + softened for depth ---
    bg = Image.open(os.path.join(SPRITES, "backgrounds", "forest_bg.png")).convert("RGBA")
    bg = cover_fit(bg, W, H)
    bg = ImageEnhance.Brightness(bg).enhance(0.34)
    bg = bg.filter(ImageFilter.GaussianBlur(5))

    canvas = bg.copy()
    draw = ImageDraw.Draw(canvas)

    # --- Atmospheric color wash and motion streaks ---
    wash = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    wash_draw = ImageDraw.Draw(wash)
    wash_draw.rectangle([0, 0, W, H], fill=(10, 12, 20, 120))
    for i in range(5):
        y = 70 + i * 52
        wash_draw.line([(52, y), (W - 220, y - 36)], fill=(0, 255, 200, 14), width=8)
        wash_draw.line([(122, y + 16), (W - 130, y - 14)], fill=(255, 215, 0, 10), width=3)
    canvas = Image.alpha_composite(canvas, wash)

    # --- Gradient overlay: dark edges for vignette ---
    vignette = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vig_draw = ImageDraw.Draw(vignette)
    # Left fade
    for x in range(200):
        alpha = int(180 * (1 - x / 200))
        vig_draw.line([(x, 0), (x, H)], fill=(0, 0, 0, alpha))
    # Right fade
    for x in range(W - 200, W):
        alpha = int(180 * ((x - (W - 200)) / 200))
        vig_draw.line([(x, 0), (x, H)], fill=(0, 0, 0, alpha))
    # Top/bottom fade
    for y in range(80):
        alpha = int(120 * (1 - y / 80))
        vig_draw.line([(0, y), (W, y)], fill=(0, 0, 0, alpha))
    for y in range(H - 80, H):
        alpha = int(140 * ((y - (H - 80)) / 80))
        vig_draw.line([(0, y), (W, y)], fill=(0, 0, 0, alpha))
    canvas = Image.alpha_composite(canvas, vignette)

    # --- Ninja hero on the left ---
    ninja = extract_frame(
        os.path.join(SPRITES, "characters", "ninja_attack.png"), frame_index=0
    )
    ninja = trim_transparent(ninja)
    ninja = scale_to_height(ninja, int(H * 0.82))
    px = 34
    py = H - ninja.size[1] - 12
    add_glow(canvas, ninja, (px, py), glow_color=(0, 255, 200), glow_radius=14)

    # --- Boss threat on the right ---
    boss = extract_frame(
        os.path.join(SPRITES, "enemies", "boss2_attack.png"), frame_index=0
    )
    boss = trim_transparent(boss)
    boss = scale_to_height(boss, int(H * 0.76))
    boss = boss.transpose(Image.FLIP_LEFT_RIGHT)
    bx = W - boss.size[0] - 28
    by = H - boss.size[1] - 8
    add_glow(canvas, boss, (bx, by), glow_color=(255, 140, 80), glow_radius=14)

    # --- Mid-frame energy ribbon to pull the eye toward the title ---
    ribbon = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ribbon_draw = ImageDraw.Draw(ribbon)
    ribbon_draw.polygon(
        [(300, 370), (452, 188), (510, 194), (360, 382)],
        fill=(0, 255, 200, 30),
    )
    ribbon_draw.polygon(
        [(392, 382), (544, 186), (586, 192), (438, 392)],
        fill=(255, 215, 0, 22),
    )
    ribbon = ribbon.filter(ImageFilter.GaussianBlur(2))
    canvas = Image.alpha_composite(canvas, ribbon)

    # --- Title text ---
    draw = ImageDraw.Draw(canvas)
    title_font = get_font(82, bold=True)
    sub_font = get_font(30, bold=True)
    chip_font = get_font(20, bold=True)

    title = "SKUNKED"
    subtitle = "Way of the Spray"

    # Measure title
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    tw = title_bbox[2] - title_bbox[0]
    th = title_bbox[3] - title_bbox[1]

    sub_bbox = draw.textbbox((0, 0), subtitle, font=sub_font)
    sw = sub_bbox[2] - sub_bbox[0]

    # Center title with a small left bias so the hero silhouette balances it.
    tx = (W - tw) // 2 + 6
    ty = 48

    # Title panel
    glow_pad = 24
    glow_rect = Image.new("RGBA", (tw + glow_pad * 2, th + glow_pad * 2 + 50), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_rect)
    glow_draw.rounded_rectangle(
        [0, 0, tw + glow_pad * 2, th + glow_pad * 2 + 50],
        radius=24,
        fill=(6, 8, 16, 160),
    )
    glow_draw.line([(18, 16), (tw + glow_pad * 2 - 18, 16)], fill=(255, 215, 0, 120), width=3)
    glow_rect = glow_rect.filter(ImageFilter.GaussianBlur(8))
    canvas.paste(
        glow_rect,
        (tx - glow_pad, ty - glow_pad),
        glow_rect,
    )

    # Draw title with gold color + dark outline
    draw = ImageDraw.Draw(canvas)
    draw_text_with_outline(
        draw, (tx, ty), title, title_font,
        fill=(255, 215, 0),       # gold
        outline_fill=(30, 15, 0),  # dark brown
        outline_width=4,
    )

    # Subtitle
    sx = (W - sw) // 2 + 20
    sy = ty + th + 15
    draw_text_with_outline(
        draw, (sx, sy), subtitle, sub_font,
        fill=(255, 255, 255),
        outline_fill=(0, 0, 0),
        outline_width=2,
    )

    # --- Decorative line under subtitle ---
    line_y = sy + 40
    line_half = 126
    cx = sx + sw // 2
    for i in range(line_half):
        alpha = int(210 * (1 - i / line_half))
        draw.point((cx - i, line_y), fill=(255, 215, 0, alpha))
        draw.point((cx + i, line_y), fill=(255, 215, 0, alpha))
        draw.point((cx - i, line_y + 1), fill=(255, 215, 0, alpha // 2))
        draw.point((cx + i, line_y + 1), fill=(255, 215, 0, alpha // 2))

    # --- Store listing callouts ---
    chip_y = H - 78
    chip_w = 186
    chip_gap = 18
    total_chips = chip_w * 2 + chip_gap
    chip_x = (W - total_chips) // 2
    chip_fill = (12, 16, 28, 208)
    chip_outline = (255, 215, 0, 165)
    chip_text = (245, 245, 245, 255)
    draw_feature_chip(draw, (chip_x, chip_y, chip_x + chip_w, chip_y + 44), "ACHIEVEMENTS", chip_font, chip_fill, chip_outline, chip_text)
    draw_feature_chip(draw, (chip_x + chip_w + chip_gap, chip_y, chip_x + total_chips, chip_y + 44), "LEADERBOARDS", chip_font, chip_fill, chip_outline, chip_text)

    # --- Action particles (small dots scattered) ---
    import random
    random.seed(42)  # deterministic
    particle_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    p_draw = ImageDraw.Draw(particle_layer)
    for _ in range(42):
        rx = random.randint(0, W)
        ry = random.randint(0, H)
        size = random.randint(1, 3)
        color = random.choice([
            (255, 215, 0, random.randint(80, 180)),   # gold sparkle
            (0, 255, 200, random.randint(60, 150)),    # cyan
            (255, 255, 255, random.randint(40, 120)),  # white
        ])
        p_draw.ellipse([rx, ry, rx + size, ry + size], fill=color)
    canvas = Image.alpha_composite(canvas, particle_layer)

    # Save
    out_path = os.path.join(OUT, "feature-graphic-1024x500.png")
    canvas.convert("RGB").save(out_path, "PNG")
    print(f"  ✓ Feature graphic: {out_path}")
    return out_path


# ---------------------------------------------------------------------------
# 2. App Icon  (512 x 512) — character-focused
# ---------------------------------------------------------------------------

def generate_app_icon():
    """Create a character-focused 512x512 app icon."""
    SIZE = 512

    # --- Background: radial gradient dark blue → darker ---
    canvas = Image.new("RGBA", (SIZE, SIZE), (10, 10, 30, 255))
    draw = ImageDraw.Draw(canvas)

    # Radial gradient (brighter center)
    center = SIZE // 2
    for r in range(center, 0, -1):
        t = r / center  # 1.0 at edge, 0.0 at center
        # Blend from (20,30,80) center to (10,10,30) edge
        cr = int(10 + (20 - 10) * (1 - t))
        cg = int(10 + (40 - 10) * (1 - t))
        cb = int(30 + (90 - 30) * (1 - t))
        draw.ellipse(
            [center - r, center - r, center + r, center + r],
            fill=(cr, cg, cb, 255),
        )

    # --- Diagonal accent slash for more punch at icon size ---
    accent = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    a_draw = ImageDraw.Draw(accent)
    a_draw.polygon([(74, 348), (216, 206), (252, 220), (110, 362)], fill=(0, 255, 200, 54))
    a_draw.polygon([(138, 380), (286, 232), (318, 246), (170, 394)], fill=(255, 215, 0, 36))
    accent = accent.filter(ImageFilter.GaussianBlur(3))
    canvas = Image.alpha_composite(canvas, accent)

    # --- Dojo floor hint (subtle horizontal stripe at bottom) ---
    floor_y = int(SIZE * 0.72)
    for y in range(floor_y, SIZE):
        t = (y - floor_y) / (SIZE - floor_y)
        alpha = int(60 * t)
        draw.line([(0, y), (SIZE, y)], fill=(80, 50, 30, alpha))

    # --- Iron Claw (boss2) — idle pose, centered ---
    char = extract_frame(
        os.path.join(SPRITES, "enemies", "boss2_idle.png"), frame_index=0
    )
    char = trim_transparent(char)
    char_h = int(SIZE * 0.66)
    char = scale_to_height(char, char_h)

    # Center character
    cx = (SIZE - char.size[0]) // 2
    cy = SIZE - char.size[1] - int(SIZE * 0.08)
    add_glow(canvas, char, (cx, cy), glow_color=(180, 60, 60), glow_radius=18)

    # --- Title text "SKUNKED" arched across top ---
    draw = ImageDraw.Draw(canvas)
    title_font = get_font(58, bold=True)
    title = "SKUNKED"

    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    tw = title_bbox[2] - title_bbox[0]
    th = title_bbox[3] - title_bbox[1]
    tx = (SIZE - tw) // 2
    ty = 22

    # Text backdrop glow
    glow_bg = Image.new("RGBA", (tw + 40, th + 30), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glow_bg)
    g_draw.rounded_rectangle([0, 0, tw + 40, th + 30], radius=18, fill=(0, 0, 0, 130))
    g_draw.line([(18, 14), (tw + 22, 14)], fill=(255, 215, 0, 110), width=2)
    glow_bg = glow_bg.filter(ImageFilter.GaussianBlur(8))
    canvas.paste(glow_bg, (tx - 20, ty - 10), glow_bg)

    draw = ImageDraw.Draw(canvas)
    draw_text_with_outline(
        draw, (tx, ty), title, title_font,
        fill=(255, 215, 0),
        outline_fill=(30, 15, 0),
        outline_width=3,
    )

    # --- Circular border ring ---
    ring = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    r_draw = ImageDraw.Draw(ring)
    # Outer gold ring
    r_draw.ellipse([8, 8, SIZE - 8, SIZE - 8], outline=(255, 215, 0, 205), width=4)
    # Inner subtle ring
    r_draw.ellipse([16, 16, SIZE - 16, SIZE - 16], outline=(255, 215, 0, 80), width=2)
    canvas = Image.alpha_composite(canvas, ring)

    # --- Sparkle particles ---
    import random
    random.seed(7)
    sparkle = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(sparkle)
    for _ in range(25):
        rx = random.randint(20, SIZE - 20)
        ry = random.randint(20, SIZE - 20)
        s = random.randint(1, 3)
        a = random.randint(60, 160)
        s_draw.ellipse([rx, ry, rx + s, ry + s],
                       fill=(255, 255, 200, a))
    canvas = Image.alpha_composite(canvas, sparkle)

    out_path = os.path.join(OUT, "app-icon-512x512.png")
    canvas.convert("RGB").save(out_path, "PNG")
    print(f"  ✓ App icon: {out_path}")
    return out_path


# ---------------------------------------------------------------------------
# 3. Maskable Icon (512 x 512) — safe-zone version of app icon
# ---------------------------------------------------------------------------

def generate_maskable_icon(icon_path):
    """Wrap the app icon in maskable safe-zone padding."""
    SIZE = 512
    BG = (26, 26, 46, 255)  # dark indigo, matches existing maskable
    canvas = Image.new("RGBA", (SIZE, SIZE), BG)

    icon = Image.open(icon_path).convert("RGBA")
    inner = int(SIZE * 0.80)
    icon = icon.resize((inner, inner), Image.LANCZOS)
    offset = (SIZE - inner) // 2
    canvas.paste(icon, (offset, offset), icon)

    out_path = os.path.join(OUT, "maskable-icon-512x512.png")
    canvas.save(out_path, "PNG")
    print(f"  ✓ Maskable icon: {out_path}")
    return out_path


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    os.makedirs(OUT, exist_ok=True)
    print("Generating Play Store assets…\n")

    generate_feature_graphic()
    icon_path = generate_app_icon()
    generate_maskable_icon(icon_path)

    print(f"\nAll assets saved to: {OUT}")
    print("\nGoogle Play Store requirements:")
    print("  • Feature Graphic:  1024 × 500  (used at top of store listing)")
    print("  • App Icon:         512 × 512   (the main store icon)")
    print("  • Maskable Icon:    512 × 512   (for adaptive icon on Android)")


if __name__ == "__main__":
    main()
