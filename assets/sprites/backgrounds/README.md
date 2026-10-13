# Background Assets

## Environment Backgrounds

### Level Backgrounds
- forest_bg.png (parallax layers)
- city_bg.png
- mountains_bg.png
- cave_bg.png

### Platform Tiles
- ground_tile.png (tileable)
- platform_tile.png
- wall_tile.png

## Specifications
- Background resolution: 1920x1080 for parallax
- Tile size: 32x32 pixels
- Format: PNG

## Attack Effects

These transparent PNGs are loaded as complete, static images (not animation
strips) and shown while the corresponding attack is in progress:

- `attack_slash.png`: normal player attack
- `attack_strike.png`: player Shadow Strike
- `attack_enemy.png`: regular enemy attack
- `attack_boss.png`: boss attack

Artwork faces right and is mirrored for left-facing attacks. Each image is
scaled to the current attack hitbox; Shadow Strike does not use the larger
swept collision region for rendering. Collision geometry and damage timing
are unchanged. `SHOW_HITBOXES` hides the artwork so the debug boxes remain clear.
