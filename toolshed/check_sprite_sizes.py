#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
names = [('ninja_idle',4),('ninja_walk',4),('ninja_jump',4),('ninja_attack',4),('ninja_shadow_strike',8),('ninja_hurt',2)]
for name, frames in names:
    p = Path('assets/sprites/characters') / f'{name}.png'
    if not p.exists():
        print(f"{name}: MISSING: {p}")
        continue
    img = Image.open(p)
    w,h = img.size
    ok = (w % frames == 0)
    print(f"{name}: {w}x{h} -> {'OK' if ok else 'NOT DIVISIBLE'} (frames={frames}, frameWidth={w/frames:.2f})")
