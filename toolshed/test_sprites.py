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

# Add repo `python` (preferred) or legacy `src` directory to path
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
python_path = os.path.join(repo_root, 'python')
src_path = os.path.join(repo_root, 'src')

if os.path.isdir(python_path):
    sys.path.insert(0, python_path)
elif os.path.isdir(src_path):
    sys.path.insert(0, src_path)
else:
    # fallback to parent of repo_root in case this file moved
    fallback_src = os.path.join(os.path.dirname(repo_root), 'src')
    if os.path.isdir(fallback_src):
        sys.path.insert(0, fallback_src)

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
        ("enemies/basic_hurt.png", (48, 48), 4),
        ("enemies/fly_idle.png", (40, 40), 4),
        ("enemies/boss_idle.png", (128, 128), 4),
        ("enemies/boss_walk.png", (128, 128), 4),
        ("enemies/boss_attack1.png", (128, 128), 4),
        ("enemies/boss2_idle.png", (128, 128), 4),
        ("enemies/boss2_walk.png", (128, 128), 4),
        ("enemies/boss2_attack.png", (128, 128), 4),
        ("enemies/boss2_hurt.png", (128, 128), 4),
        ("enemies/boss3_idle.png", (128, 128), 4),
        ("enemies/boss3_walk.png", (128, 128), 4),
        ("enemies/boss3_attack.png", (128, 128), 4),
        ("enemies/boss3_hurt.png", (128, 128), 4),
        ("enemies/boss4_idle.png", (128, 128), 4),
        ("enemies/boss4_walk.png", (128, 128), 4),
        ("enemies/boss4_attack.png", (128, 128), 4),
        ("enemies/boss4_hurt.png", (128, 128), 4),
        ("enemies/boss5_idle.png", (128, 128), 4),
        ("enemies/boss5_walk.png", (128, 128), 4),
        ("enemies/boss5_attack.png", (128, 128), 4),
        ("enemies/boss5_hurt.png", (128, 128), 4),
        ("enemies/boss6_idle.png", (128, 128), 4),
        ("enemies/boss6_walk.png", (128, 128), 4),
        ("enemies/boss6_attack.png", (128, 128), 4),
        ("enemies/boss6_hurt.png", (128, 128), 4),
        ("enemies/boss7_idle.png", (128, 128), 4),
        ("enemies/boss7_walk.png", (128, 128), 4),
        ("enemies/boss7_attack.png", (128, 128), 4),
        ("enemies/boss7_hurt.png", (128, 128), 4),
        ("enemies/boss8_walk.png", (128, 128), 4),
        ("enemies/boss8_attack.png", (128, 128), 4),
        ("enemies/boss8_hurt.png", (128, 128), 4),
        ("enemies/boss8_idle.png", (128, 128), 4),
        ("enemies/boss9_idle.png", (128, 128), 4),
        ("enemies/boss9_walk.png", (128, 128), 4),
        ("enemies/boss9_attack.png", (128, 128), 4),
        ("enemies/boss9_hurt.png", (128, 128), 4),
        ("enemies/boss10_idle.png", (128, 128), 4),
        ("enemies/boss10_walk.png", (128, 128), 4),
        ("enemies/boss10_attack.png", (128, 128), 4),
        ("enemies/boss10_hurt.png", (128, 128), 4),
    ]

    optional_sheets = []

    player_sheets = [
        ("characters/ninja_idle.png", (64, 64), 4),
        ("characters/ninja_walk.png", (64, 64), 4),
        ("characters/ninja_jump.png", (64, 64), 4),
        ("characters/ninja_attack.png", (64, 64), 4),
        ("characters/ninja_shadow_strike.png", (64, 64), 8),
        ("characters/ninja_hurt.png", (64, 64), 2),
    ]

    def check_sheet(path, frame_size, frames, required=True):
        full_path = os.path.join(sprite_loader.base_path, path)
        exists = os.path.exists(full_path)
        status = "✓" if exists else "✗"
        print(f"  {path}: {status} Found")
        if not exists:
            if required:
                failures.append(path)
            else:
                print(f"    ! Optional asset intentionally omitted for {path}")
            return
        try:
            sprite_loader.load_spritesheet(path, frame_size[0], frame_size[1], frames, frame_size)
        except Exception as exc:  # pragma: no cover - defensive
            failures.append(path)
            print(f"    ✗ Failed to load: {exc}")

    print("Enemy Sprites:")
    for sprite_path, size, frames in enemy_sheets:
        check_sheet(sprite_path, size, frames, required=True)
    for sprite_path in optional_sheets:
        check_sheet(sprite_path, (128, 128), 4, required=False)

    print()
    print("Ninja Skunk Sprites:")
    for sprite_path, size, frames in player_sheets:
        check_sheet(sprite_path, size, frames)

    # Background panoramas and tiles
    background_images = [
        "backgrounds/city_bg.png",
        "backgrounds/forest_bg.png",
        "backgrounds/mountains_bg.png",
        "backgrounds/dojo_bg.png",
        "backgrounds/neon_bg.png",
        "backgrounds/final_bg.png",
        "backgrounds/cave_depths_bg.png",
        "backgrounds/caves_crystal_bg.png",
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
