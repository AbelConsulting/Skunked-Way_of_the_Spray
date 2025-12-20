"""
Auto-process existing sprites into proper sprite sheets
Resizes and creates horizontal sprite sheets from current single-frame images
"""
from PIL import Image
import os

def process_ninja_sprites():
    """Process Ninja Skunk sprites from 2048×2048 to proper sprite sheets"""
    
    base_path = "assets/sprites/characters"
    
    # Ninja sprite configuration
    ninja_sprites = {
        'ninja_idle.png': {'frames': 4, 'target_size': 64},
        'ninja_walk.png': {'frames': 4, 'target_size': 64},
        'ninja_jump.png': {'frames': 4, 'target_size': 64},
        'ninja_attack.png': {'frames': 4, 'target_size': 64},
        'ninja_shadow_strike.png': {'frames': 8, 'target_size': 64},
        'ninja_hurt.png': {'frames': 2, 'target_size': 64}
    }
    
    print("🎨 Processing Ninja Skunk Sprites...")
    print("=" * 60)
    
    for filename, config in ninja_sprites.items():
        filepath = os.path.join(base_path, filename)
        
        if not os.path.exists(filepath):
            print(f"⚠️  Skipping {filename} - not found")
            continue
        
        try:
            # Load original image
            img = Image.open(filepath)
            print(f"\n📁 {filename}")
            print(f"   Original: {img.size[0]}×{img.size[1]} px")
            
            # Resize to target size while maintaining aspect ratio
            target_size = config['target_size']
            frames = config['frames']
            
            # Resize single frame to target size
            resized = img.resize((target_size, target_size), Image.Resampling.LANCZOS)
            
            # Create horizontal sprite sheet
            sheet_width = target_size * frames
            sheet_height = target_size
            sprite_sheet = Image.new('RGBA', (sheet_width, sheet_height), (0, 0, 0, 0))
            
            # Paste the same frame multiple times (placeholder until real animation)
            for i in range(frames):
                sprite_sheet.paste(resized, (i * target_size, 0))
            
            # Save processed sprite sheet
            output_path = filepath  # Overwrite original
            backup_path = filepath.replace('.png', '_original.png')
            
            # Backup original
            if not os.path.exists(backup_path):
                img.save(backup_path)
                print(f"   💾 Backed up to: {os.path.basename(backup_path)}")
            
            # Save new sprite sheet
            sprite_sheet.save(output_path)
            print(f"   ✅ Processed: {sheet_width}×{sheet_height} px ({frames} frames)")
            print(f"   📦 Size reduced: {os.path.getsize(filepath):,} bytes")
            
        except Exception as e:
            print(f"   ❌ Error processing {filename}: {e}")
    
    print("\n" + "=" * 60)
    print("✨ Ninja Skunk sprites processed!")
    print("\n📝 Note: Each animation uses the same frame repeated.")
    print("   To add real animation:")
    print("   1. Edit _original.png files to create different frames")
    print("   2. Save as separate files (frame_0.png, frame_1.png, etc.)")
    print("   3. Run: python sprite_stitcher.py ninja")

def process_enemy_sprites():
    """Process enemy sprites"""
    
    base_path = "assets/sprites/enemies"
    
    enemy_sprites = {
        'basic_idle.png': {'frames': 4, 'target_size': 48, 'original': 2048},
        'basic_walk.png': {'frames': 6, 'target_size': 48, 'original': 2048},
        'basic_attack.png': {'frames': 4, 'target_size': 48, 'original': 2048},
        'basic_hurt.png': {'frames': 2, 'target_size': 48, 'original': 2048},
        'fly_idle.png': {'frames': 4, 'target_size': 40, 'original': 1024},
        'fly_move.png': {'frames': 6, 'target_size': 40, 'original': 1024},
        'fly_attack.png': {'frames': 4, 'target_size': 40, 'original': 1024},
        'boss_idle.png': {'frames': 4, 'target_size': 128, 'original': 1024},
        'boss_walk.png': {'frames': 6, 'target_size': 128, 'original': 1024},
        'boss_attack1.png': {'frames': 6, 'target_size': 128, 'original': 1024},
        'boss_attack2.png': {'frames': 6, 'target_size': 128, 'original': 1024},
        'boss_special.png': {'frames': 8, 'target_size': 128, 'original': 1024}
    }
    
    print("\n\n🎨 Processing Enemy Sprites...")
    print("=" * 60)
    
    for filename, config in enemy_sprites.items():
        filepath = os.path.join(base_path, filename)
        
        if not os.path.exists(filepath):
            print(f"⚠️  Skipping {filename} - not found")
            continue
        
        try:
            img = Image.open(filepath)
            print(f"\n📁 {filename}")
            print(f"   Original: {img.size[0]}×{img.size[1]} px")
            
            target_size = config['target_size']
            frames = config['frames']
            
            # Resize single frame
            resized = img.resize((target_size, target_size), Image.Resampling.LANCZOS)
            
            # Create horizontal sprite sheet
            sheet_width = target_size * frames
            sheet_height = target_size
            sprite_sheet = Image.new('RGBA', (sheet_width, sheet_height), (0, 0, 0, 0))
            
            # Repeat frame
            for i in range(frames):
                sprite_sheet.paste(resized, (i * target_size, 0))
            
            # Backup and save
            backup_path = filepath.replace('.png', '_original.png')
            if not os.path.exists(backup_path):
                img.save(backup_path)
                print(f"   💾 Backed up to: {os.path.basename(backup_path)}")
            
            sprite_sheet.save(filepath)
            print(f"   ✅ Processed: {sheet_width}×{sheet_height} px ({frames} frames)")
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 60)
    print("✨ Enemy sprites processed!")

def show_summary():
    """Show what was done and next steps"""
    print("\n\n" + "=" * 60)
    print("🎉 PROCESSING COMPLETE!")
    print("=" * 60)
    print("""
WHAT WAS DONE:
- Resized high-res images to correct sprite sizes
- Created horizontal sprite sheets (frames side-by-side)
- Backed up originals as *_original.png
- Each animation now has correct frame count (repeated for now)

CURRENT STATE:
✅ Game will run with proper sprite sheet format
✅ Sprites are correct size and won't be blurry
⚠️  Animations use same frame repeated (static)

TO ADD REAL ANIMATION:
1. Use the *_original.png files as reference
2. Create variations for each frame
3. Save as: frame_0.png, frame_1.png, etc.
4. Run: python sprite_stitcher.py ninja

OR:
1. Use Aseprite, Piskel, or other pixel art tool
2. Create multi-frame animations
3. Export as horizontal sprite sheets
4. Replace the processed files

TEST THE GAME:
cd src
python main.py
(Press Enter to start)

Your sprites will now display at the correct size!
""")

if __name__ == "__main__":
    print("🔧 Auto-Processing Sprites to Correct Format\n")
    
    # Check if PIL is available
    try:
        from PIL import Image
    except ImportError:
        print("❌ Pillow (PIL) not installed!")
        print("Run: pip install pillow")
        exit(1)
    
    # Process all sprites
    process_ninja_sprites()
    process_enemy_sprites()
    show_summary()
    
    print("\n" + "=" * 60)
    print("Ready to test? Run: cd src && python main.py")
    print("=" * 60)
