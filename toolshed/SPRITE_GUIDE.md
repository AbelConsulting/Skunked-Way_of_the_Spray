# Sprite Sheet Creation Guide

This guide explains how to create animated sprite sheets for Skunk Fu.

## Sprite Sheet Format

All sprite sheets use **horizontal strips** where frames are arranged side-by-side:

```
[Frame 0][Frame 1][Frame 2][Frame 3][Frame 4][Frame 5]
```

Example: `ninja_walk.png` (6 frames @ 64x64) = **384 x 64 pixels**

## Quick Start

### Option 1: Using the Sprite Stitcher Tool

1. **Organize your individual frames:**
```
raw_frames/
  ninja/
    idle/
      idle_0.png
      idle_1.png
      idle_2.png
      idle_3.png
    walk/
      walk_0.png
      walk_1.png
      ... walk_5.png
    jump/
      jump_0.png ... jump_3.png
    attack/
      attack_0.png ... attack_5.png
    shadow_strike/
      shadow_strike_0.png ... shadow_strike_7.png
    hurt/
      hurt_0.png
      hurt_1.png
```

2. **Run the stitcher:**
```bash
pip install Pillow
python sprite_stitcher.py ninja
```

3. **Output:** Sprite sheets will be created in `assets/sprites/characters/`

### Option 2: Manual Creation in Procreate/Photoshop

1. Create a canvas with dimensions: `(frame_width × num_frames) × frame_height`
2. Place each frame side-by-side
3. Export as PNG with transparency
4. Save to the appropriate folder

## Frame Specifications

### Ninja Skunk (64x64 per frame)

| Animation | Frames | Sheet Size | File Name |
|-----------|--------|------------|-----------|
| Idle | 4 | 256 × 64 | `ninja_idle.png` |
| Walk | 6 | 384 × 64 | `ninja_walk.png` |
| Jump | 4 | 256 × 64 | `ninja_jump.png` |
| Attack | 6 | 384 × 64 | `ninja_attack.png` |
| Shadow Strike | 8 | 512 × 64 | `ninja_shadow_strike.png` |
| Hurt | 2 | 128 × 64 | `ninja_hurt.png` |

### Basic Enemy (48x48 per frame)

| Animation | Frames | Sheet Size | File Name |
|-----------|--------|------------|-----------|
| Idle | 4 | 192 × 48 | `basic_idle.png` |
| Walk | 6 | 288 × 48 | `basic_walk.png` |
| Attack | 4 | 192 × 48 | `basic_attack.png` |
| Hurt | 2 | 96 × 48 | `basic_hurt.png` |

### Flying Enemy (40x40 per frame)

| Animation | Frames | Sheet Size | File Name |
|-----------|--------|------------|-----------|
| Idle | 4 | 160 × 40 | `fly_idle.png` |
| Move | 6 | 240 × 40 | `fly_move.png` |
| Attack | 4 | 160 × 40 | `fly_attack.png` |

### Boss Enemy (128x128 per frame)

| Animation | Frames | Sheet Size | File Name |
|-----------|--------|------------|-----------|
| Idle | 4 | 512 × 128 | `boss_idle.png` |
| Walk | 6 | 768 × 128 | `boss_walk.png` |
| Attack 1 | 6 | 768 × 128 | `boss_attack1.png` |
| Attack 2 | 6 | 768 × 128 | `boss_attack2.png` |
| Special | 8 | 1024 × 128 | `boss_special.png` |

## Animation Guidelines

### Timing & Flow
- **Idle:** Gentle breathing/swaying (slow loop)
- **Walk:** Smooth locomotion cycle
- **Jump:** Crouch → Launch → Peak → Fall
- **Attack:** Wind-up → Strike → Recovery
- **Shadow Strike:** Pre-dash → Blur/Motion → Land
- **Hurt:** Impact → Recoil

### Pixel Art Tips
1. Use consistent outline thickness
2. Maintain readable silhouette
3. Add motion blur for fast movements (Shadow Strike)
4. Anticipation frame before big actions
5. Follow-through frame after impacts

## Workflow Options

### Option A: Using the Sprite Stitcher Tool (Recommended)

1. **Create frame folders (optional but organized):**
   ```bash
   python create_frame_folders.py ninja
   python create_frame_folders.py enemy basic
   ```
   This creates `raw_frames/` folders with README files showing requirements.

2. **Draw your frames** in your favorite pixel art tool (Aseprite, Piskel, etc.)

3. **Save individual frames** as PNG files:
   ```
   raw_frames/ninja/idle/idle_0.png
   raw_frames/ninja/idle/idle_1.png
   raw_frames/ninja/idle/idle_2.png
   raw_frames/ninja/idle/idle_3.png
   ```

4. **Run the stitcher:**
   ```bash
   python sprite_stitcher.py ninja
   ```

5. **Sheets are created** in `assets/sprites/characters/ninja/` ready to use!

### Option B: Manual Creation

1. Create a canvas with the correct width: `frame_width × num_frames`
2. Paste each frame side-by-side left to right
3. Save as PNG with transparency
4. Place in correct asset folder

## Using Custom Sprite Sheets

Once your sprite sheets are created and placed in the correct folders, the game will automatically:

1. ✅ Load them at startup
2. ✅ Split them into individual frames
3. ✅ Animate through frames based on character state
4. ✅ Loop idle/walk animations
5. ✅ Play attack animations once then return to idle

No code changes needed - just replace the sprite files!

## Troubleshooting

**Sprites not animating?**
- Check that the sprite sheet has the correct dimensions
- Verify frames are arranged horizontally (not vertically)
- Ensure the file is in the correct folder with the correct name

**Sprites look distorted?**
- Verify each frame is square (64x64, 48x48, etc.)
- Check that the total width = frame_width × num_frames
- Use PNG format with transparency (RGBA)

**Stitcher script errors?**
- Install Pillow: `pip install Pillow`
- Check that individual frame files are named correctly (`animation_0.png`, `animation_1.png`, etc.)
- Ensure the input folder structure matches the expected layout

## Advanced: Adjusting Frame Counts

If you want different frame counts, edit `src/player.py` or `src/enemy.py`:

```python
# In player.py load_sprites():
walk_frames = sprite_loader.load_spritesheet(
    "characters/ninja_walk.png", 
    64,  # frame width
    64,  # frame height
    8,   # <-- Change number of frames here
    (64, 64)
)
```

Then create your sprite sheet with the new frame count!
