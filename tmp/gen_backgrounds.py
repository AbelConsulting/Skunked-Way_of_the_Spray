from PIL import Image, ImageDraw
import random
import os

W, H = 1920, 1080

root = 'assets/sprites/backgrounds'
os.makedirs(root, exist_ok=True)


def gradient_bg(top, mid, bot):
    img = Image.new('RGB', (W, H))
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        if t < 0.5:
            tt = t / 0.5
            r = int(top[0] + (mid[0] - top[0]) * tt)
            g = int(top[1] + (mid[1] - top[1]) * tt)
            b = int(top[2] + (mid[2] - top[2]) * tt)
        else:
            tt = (t - 0.5) / 0.5
            r = int(mid[0] + (bot[0] - mid[0]) * tt)
            g = int(mid[1] + (bot[1] - mid[1]) * tt)
            b = int(mid[2] + (bot[2] - mid[2]) * tt)
        draw.line([(0, y), (W, y)], fill=(r, g, b))
    return img


def add_crystals(img, color_a, color_b, count=24):
    draw = ImageDraw.Draw(img)
    for _ in range(count):
        cx = random.randint(0, W)
        cy = random.randint(int(H * 0.2), int(H * 0.9))
        size = random.randint(40, 140)
        pts = [
            (cx, cy - size),
            (cx + int(size * 0.6), cy + int(size * 0.8)),
            (cx - int(size * 0.6), cy + int(size * 0.8))
        ]
        fill = color_a if random.random() < 0.5 else color_b
        draw.polygon(pts, fill=fill)


def add_glow_orbs(img, color, count=16):
    draw = ImageDraw.Draw(img, 'RGBA')
    for _ in range(count):
        r = random.randint(80, 180)
        x = random.randint(-r, W + r)
        y = random.randint(-r, H + r)
        alpha = random.randint(20, 60)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(*color, alpha))


def add_neon_lines(img):
    draw = ImageDraw.Draw(img, 'RGBA')
    for _ in range(24):
        y = random.randint(int(H * 0.3), int(H * 0.9))
        x1 = random.randint(0, W - 200)
        x2 = x1 + random.randint(200, 600)
        color = random.choice([(80, 255, 244, 90), (255, 80, 160, 90), (120, 220, 255, 80)])
        draw.line((x1, y, x2, y), fill=color, width=random.randint(2, 5))


def add_city_blocks(img):
    draw = ImageDraw.Draw(img)
    for _ in range(60):
        w = random.randint(60, 220)
        h = random.randint(80, 380)
        x = random.randint(0, W - w)
        y = H - h - random.randint(0, 60)
        shade = random.randint(10, 35)
        draw.rectangle((x, y, x + w, y + h), fill=(shade, shade, shade))


# 1) Crystal caverns (level 4)
img = gradient_bg((18, 16, 40), (28, 22, 70), (10, 8, 24))
add_glow_orbs(img, (120, 220, 255), 18)
add_crystals(img, (80, 200, 255), (140, 120, 255), 28)
img.save(os.path.join(root, 'cave_crystal_bg.png'))

# 2) Caverns depths (level 5)
img = gradient_bg((10, 8, 18), (16, 12, 30), (5, 4, 12))
add_glow_orbs(img, (90, 160, 220), 10)
add_crystals(img, (60, 120, 200), (100, 80, 180), 16)
img.save(os.path.join(root, 'cave_depths_bg.png'))

# 3) Neon city (level 6)
img = gradient_bg((6, 8, 20), (12, 18, 40), (5, 6, 16))
add_city_blocks(img)
add_neon_lines(img)
add_glow_orbs(img, (255, 80, 160), 8)
img.save(os.path.join(root, 'neon_bg.png'))

print('Generated backgrounds')
