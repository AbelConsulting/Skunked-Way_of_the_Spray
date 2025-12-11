"""
Sprite Analysis Tool - Diagnose sprite sheet properties
"""
import pygame
import os
from pathlib import Path

pygame.init()

def analyze_sprite(filepath):
    """Analyze a sprite file and return its properties"""
    try:
        image = pygame.image.load(filepath)
        width = image.get_width()
        height = image.get_height()
        
        # Try to determine if it's a sprite sheet
        aspect_ratio = width / height if height > 0 else 0
        
        # Common frame sizes
        possible_frames = []
        for frame_size in [32, 40, 48, 64, 128]:
            if width % frame_size == 0 and height == frame_size:
                num_frames = width // frame_size
                possible_frames.append((frame_size, num_frames))
        
        return {
            'width': width,
            'height': height,
            'aspect_ratio': aspect_ratio,
            'file_size': os.path.getsize(filepath),
            'possible_frames': possible_frames
        }
    except Exception as e:
        return {'error': str(e)}

def analyze_all_sprites():
    """Analyze all sprite files in the project"""
    base_path = Path('assets/sprites')
    
    print("=" * 80)
    print("SPRITE ANALYSIS REPORT")
    print("=" * 80)
    
    # Analyze character sprites
    print("\n📁 CHARACTER SPRITES (Ninja Skunk)")
    print("-" * 80)
    char_path = base_path / 'characters'
    
    expected_ninja = {
        'ninja_idle.png': {'frames': 4, 'size': 64},
        'ninja_walk.png': {'frames': 6, 'size': 64},
        'ninja_jump.png': {'frames': 4, 'size': 64},
        'ninja_attack.png': {'frames': 6, 'size': 64},
        'ninja_shadow_strike.png': {'frames': 8, 'size': 64},
        'ninja_hurt.png': {'frames': 2, 'size': 64}
    }
    
    for filename, expected in expected_ninja.items():
        filepath = char_path / filename
        if filepath.exists():
            info = analyze_sprite(str(filepath))
            
            if 'error' in info:
                print(f"❌ {filename}: ERROR - {info['error']}")
            else:
                expected_width = expected['frames'] * expected['size']
                expected_height = expected['size']
                
                status = "✅" if (info['width'] == expected_width and 
                                 info['height'] == expected_height) else "⚠️ "
                
                print(f"{status} {filename}")
                print(f"   Size: {info['width']}×{info['height']} px")
                print(f"   Expected: {expected_width}×{expected_height} px")
                print(f"   File: {info['file_size']:,} bytes")
                
                if info['possible_frames']:
                    print(f"   Detected frames: {info['possible_frames']}")
                
                # Diagnosis
                if info['width'] == info['height']:
                    print(f"   ⚠️  DIAGNOSIS: This appears to be a SINGLE FRAME (square)")
                    print(f"      Should be: {expected['frames']} frames @ {expected['size']}×{expected['size']} each")
                    print(f"      Action: Create {expected['frames']-1} more frames and stitch horizontally")
                elif info['width'] != expected_width:
                    actual_frames = info['width'] // info['height'] if info['height'] > 0 else 0
                    print(f"   ⚠️  DIAGNOSIS: Has {actual_frames} frames, expected {expected['frames']}")
                    if actual_frames < expected['frames']:
                        print(f"      Action: Add {expected['frames'] - actual_frames} more frames")
                print()
        else:
            print(f"❌ {filename}: FILE NOT FOUND")
    
    # Analyze enemy sprites
    print("\n📁 ENEMY SPRITES")
    print("-" * 80)
    enemy_path = base_path / 'enemies'
    
    expected_enemies = {
        'basic_idle.png': {'frames': 4, 'size': 48},
        'basic_walk.png': {'frames': 6, 'size': 48},
        'basic_attack.png': {'frames': 4, 'size': 48},
        'basic_hurt.png': {'frames': 2, 'size': 48},
        'fly_idle.png': {'frames': 4, 'size': 40},
        'fly_move.png': {'frames': 6, 'size': 40},
        'fly_attack.png': {'frames': 4, 'size': 40},
        'boss_idle.png': {'frames': 4, 'size': 128},
        'boss_walk.png': {'frames': 6, 'size': 128},
        'boss_attack1.png': {'frames': 6, 'size': 128},
        'boss_attack2.png': {'frames': 6, 'size': 128},
        'boss_special.png': {'frames': 8, 'size': 128}
    }
    
    for filename, expected in expected_enemies.items():
        filepath = enemy_path / filename
        if filepath.exists():
            info = analyze_sprite(str(filepath))
            
            if 'error' in info:
                print(f"❌ {filename}: ERROR - {info['error']}")
            else:
                expected_width = expected['frames'] * expected['size']
                expected_height = expected['size']
                
                status = "✅" if (info['width'] == expected_width and 
                                 info['height'] == expected_height) else "⚠️ "
                
                print(f"{status} {filename}")
                print(f"   Size: {info['width']}×{info['height']} px")
                
                if info['width'] == info['height']:
                    print(f"   ⚠️  Single frame detected (should be {expected['frames']} frames)")
                print()
    
    # Summary and recommendations
    print("\n" + "=" * 80)
    print("RECOMMENDATIONS")
    print("=" * 80)
    print("""
1. CURRENT STATE:
   - Sprites exist but appear to be single-frame images
   - Game will display them but without animation
   
2. TO ENABLE ANIMATION:
   
   Option A - Use Sprite Stitcher Tool:
   
   1. Create individual frames as separate images:
      raw_frames/ninja/idle/idle_0.png
      raw_frames/ninja/idle/idle_1.png
      raw_frames/ninja/idle/idle_2.png
      raw_frames/ninja/idle/idle_3.png
   
   2. Run: python create_frame_folders.py ninja
      This creates organized folders
   
   3. Draw your frames (64×64 for Ninja)
   
   4. Run: python sprite_stitcher.py ninja
      This combines them into horizontal sheets
   
   Option B - Create Sprite Sheets Manually:
   
   1. Open image editor (Aseprite, Piskel, GIMP, etc.)
   2. Create canvas: width = 64 × num_frames, height = 64
   3. Paste frames side-by-side [Frame0][Frame1][Frame2]...
   4. Export as PNG with transparency
   5. Save to assets/sprites/characters/
   
3. QUICK TEST:
   
   To see if sprites are working:
   python test_sprites.py
   
   To test in-game:
   cd src
   python main.py
   (Press Enter to start, watch for animations)

4. TOOLS AVAILABLE:
   - create_frame_folders.py - Setup frame organization
   - sprite_stitcher.py - Auto-stitch frames into sheets
   - test_sprites.py - Verify all sprites exist
   - SPRITE_GUIDE.md - Complete reference guide
""")

if __name__ == "__main__":
    analyze_all_sprites()
    
    print("\n" + "=" * 80)
    print("Would you like to:")
    print("1. See a visual preview of the sprites (opens pygame window)")
    print("2. Generate template frames for animation")
    print("3. Auto-detect and report animation issues")
    print("=" * 80)
