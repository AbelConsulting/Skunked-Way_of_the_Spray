"""
Test script to verify sprite loading. Exits non-zero if required assets are missing.

Usage (from repo root):
  C:/Users/marcf/Documents/GitHub/SkunkFU/.venv/Scripts/python.exe test_sprites.py
"""
import os
import sys
import pygame

# Use headless video driver so this can run in CI/without a display
os.environ.setdefault("SDL_VIDEODRIVER", "dummy")

# Add repo `src` directory to path (works when running from toolshed or repo root)
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
src_path = os.path.join(repo_root, 'src')
if not os.path.isdir(src_path):
    # fallback to parent of repo_root in case this file moved
    src_path = os.path.join(os.path.dirname(repo_root), 'src')
sys.path.insert(0, src_path)

from sprite_loader import sprite_loader  # noqa: E402


def main():
    pygame.init()
    # convert_alpha needs a display surface
    pygame.display.set_mode((1, 1))

    print("Testing sprite loading...")
    print(f"Base path: {sprite_loader.base_path}")
    print()

    failures = []

    enemy_sheets = [
        ("enemies/basic_idle.png", (48, 48), 4),
        ("enemies/basic_walk.png", (48, 48), 6),
        ("enemies/basic_attack.png", (48, 48), 4),
        ("enemies/basic_hurt.png", (48, 48), 2),
        ("enemies/fly_idle.png", (40, 40), 4),
        ("enemies/boss_idle.png", (128, 128), 4),
    ]

    player_sheets = [
        ("characters/ninja_idle.png", (64, 64), 4),
        ("characters/ninja_walk.png", (64, 64), 4),
        ("characters/ninja_jump.png", (64, 64), 4),
        ("characters/ninja_attack.png", (64, 64), 4),
        ("characters/ninja_shadow_strike.png", (64, 64), 8),
        ("characters/ninja_hurt.png", (64, 64), 2),
    ]

    def check_sheet(path, frame_size, frames):
        full_path = os.path.join(sprite_loader.base_path, path)
        exists = os.path.exists(full_path)
        status = "✓" if exists else "✗"
        print(f"  {path}: {status} Found")
        if not exists:
            failures.append(path)
            return
        try:
            sprite_loader.load_spritesheet(path, frame_size[0], frame_size[1], frames, frame_size)
        except Exception as exc:  # pragma: no cover - defensive
            failures.append(path)
            print(f"    ✗ Failed to load: {exc}")

    print("Enemy Sprites:")
    for sprite_path, size, frames in enemy_sheets:
        check_sheet(sprite_path, size, frames)

    print()
    print("Ninja Skunk Sprites:")
    for sprite_path, size, frames in player_sheets:
        check_sheet(sprite_path, size, frames)

    # Background panoramas and tiles
    background_images = [
        "backgrounds/city_bg.png",
        "backgrounds/forest_bg.png",
        "backgrounds/mountains_bg.png",
        "backgrounds/cave_bg.png",
    ]

    tile_images = [
        "backgrounds/tiles/ground_tile.png",
        "backgrounds/tiles/platform_tile.png",
        "backgrounds/tiles/wall_tile.png",
    ]

    def check_image(path):
        full_path = os.path.join(sprite_loader.base_path, path)
        exists = os.path.exists(full_path)
        status = "✓" if exists else "✗"
        print(f"  {path}: {status} Found")
        if not exists:
            failures.append(path)
            return
        # attempt to load the image with pygame to ensure it's readable
        try:
            img = pygame.image.load(full_path)
            w = img.get_width()
            h = img.get_height()
            print(f"    size: {w}x{h}")
            return (w, h)
        except Exception as exc:  # pragma: no cover - defensive
            failures.append(path)
            print(f"    ✗ Failed to load image: {exc}")


    print()
    print("Background Images:")
    for p in background_images:
        dims = check_image(p)
        if dims:
            w, h = dims
            # Expect backgrounds to be reasonably large for panoramas
            if w < 800 or h < 360:
                failures.append(p)
                print(f"    ✗ Background too small (expected at least 800x360): {w}x{h}")

    print()
    print("Tile Images:")
    for p in tile_images:
        dims = check_image(p)
        if dims:
            w, h = dims
            # Tiles should be square 64x64 for consistency; accept 32x32 as legacy
            if not ((w == 64 and h == 64) or (w == 32 and h == 32)):
                failures.append(p)
                print(f"    ✗ Tile size incorrect (expected 64x64 or legacy 32x32): {w}x{h}")

    print()
    if failures:
        print("Missing or failed to load:")
        for f in failures:
            print(f"  - {f}")
        pygame.quit()
        return 1

    print("All required sprites found and loadable.")
    pygame.quit()
    return 0


if __name__ == "__main__":
    sys.exit(main())
