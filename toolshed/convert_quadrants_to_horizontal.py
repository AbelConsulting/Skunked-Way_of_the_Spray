"""
Convert sprites from 2x2 quadrant layout to horizontal strip format
This extracts the 4 frames from each 2x2 quadrant sprite and arranges them horizontally
"""
from PIL import Image
import os

def extract_quadrant_frames(input_path, num_frames=4):
    """Extract frames from a 2x2 quadrant layout sprite
    
    Args:
        input_path: Path to sprite with 2x2 quadrant layout
        num_frames: Number of frames (should be 4 for 2x2 grid)
    
    Returns:
        List of PIL Image frames
    """
    try:
        img = Image.open(input_path)
        width, height = img.size
        
        # For a 2x2 grid: height/2 = frame_size, width/2 = frame_size
        frame_size = height // 2  # Assuming square quadrants and 2 rows
        
        frames = []
        
        # Extract frames from 2x2 grid (top-left, top-right, bottom-left, bottom-right)
        positions = [
            (0, 0),                    # top-left
            (frame_size, 0),           # top-right
            (0, frame_size),           # bottom-left
            (frame_size, frame_size)   # bottom-right
        ]
        
        for x, y in positions:
            frame = img.crop((x, y, x + frame_size, y + frame_size))
            frames.append(frame)
        
        return frames, frame_size
        
    except Exception as e:
        print(f"Error extracting frames from {input_path}: {e}")
        return None, None


def create_horizontal_strip(frames, output_path):
    """Create a horizontal sprite sheet from frames
    
    Args:
        frames: List of PIL Image frames
        output_path: Path to save the horizontal strip
    """
    if not frames:
        return False
    
    frame_size = frames[0].width
    num_frames = len(frames)
    
    # Create horizontal strip: width = frame_size * num_frames, height = frame_size
    strip = Image.new('RGBA', (frame_size * num_frames, frame_size), (0, 0, 0, 0))
    
    # Paste frames horizontally
    for i, frame in enumerate(frames):
        strip.paste(frame, (i * frame_size, 0))
    
    strip.save(output_path)
    return True


def convert_sprites():
    """Convert all sprite sheets from quadrant to horizontal format"""
    
    # Define sprites that are in quadrant format
    # Format: (sprite_path, frame_count, frame_size_hint)
    sprites_to_convert = [
        # Ninja sprites (excluding idle which is already correct)
        ("assets/sprites/characters/ninja_walk.png", 4),
        ("assets/sprites/characters/ninja_jump.png", 4),
        ("assets/sprites/characters/ninja_attack.png", 4),
        ("assets/sprites/characters/ninja_shadow_strike.png", 4),
        ("assets/sprites/characters/ninja_hurt.png", 4),
        
        # Enemy sprites
        ("assets/sprites/enemies/basic_idle.png", 4),
        ("assets/sprites/enemies/basic_walk.png", 4),
        ("assets/sprites/enemies/basic_attack.png", 4),
        ("assets/sprites/enemies/basic_hurt.png", 4),
        ("assets/sprites/enemies/fly_idle.png", 4),
        ("assets/sprites/enemies/fly_move.png", 4),
        ("assets/sprites/enemies/fly_attack.png", 4),
        ("assets/sprites/enemies/boss_idle.png", 4),
        ("assets/sprites/enemies/boss_walk.png", 4),
        ("assets/sprites/enemies/boss_attack1.png", 4),
        ("assets/sprites/enemies/boss_attack2.png", 4),
        ("assets/sprites/enemies/boss_special.png", 4),
    ]
    
    print("🎨 Converting sprites from quadrant to horizontal format...")
    print("=" * 60)
    
    converted = 0
    failed = 0
    
    for sprite_path, num_frames in sprites_to_convert:
        if not os.path.exists(sprite_path):
            print(f"⚠️  Skipping {sprite_path} - not found")
            continue
        
        print(f"\n📁 {os.path.basename(sprite_path)}")
        
        # Extract frames from quadrant layout
        frames, frame_size = extract_quadrant_frames(sprite_path, num_frames)
        
        if frames is None:
            print(f"   ❌ Failed to extract frames")
            failed += 1
            continue
        
        print(f"   Extracted {len(frames)} frames ({frame_size}x{frame_size})")
        
        # Create horizontal strip
        if create_horizontal_strip(frames, sprite_path):
            img = Image.open(sprite_path)
            print(f"   ✅ Converted to horizontal: {img.width}×{img.height} px")
            converted += 1
        else:
            print(f"   ❌ Failed to create horizontal strip")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"✨ Conversion complete!")
    print(f"   ✅ Converted: {converted}")
    print(f"   ❌ Failed: {failed}")
    print("=" * 60)


if __name__ == "__main__":
    print("🔧 Converting Sprites from Quadrant to Horizontal Format\n")
    
    try:
        from PIL import Image
    except ImportError:
        print("❌ Pillow (PIL) not installed!")
        print("Run: pip install pillow")
        exit(1)
    
    convert_sprites()
    
    print("\nReady to test the game with properly formatted sprites!")
    print("Run: python python/main.py")
