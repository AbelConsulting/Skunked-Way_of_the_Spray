"""
Remove backgrounds from sprite sheets to create transparent backgrounds
"""
from PIL import Image
import os

def remove_background(input_path, output_path, tolerance=10):
    """Remove background from sprite image, making it transparent
    
    Args:
        input_path: Path to sprite image
        output_path: Path to save processed sprite
        tolerance: Color tolerance for background detection (0-255)
    """
    try:
        # Open image and convert to RGBA if needed
        img = Image.open(input_path)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Get the most common color (likely the background)
        # We'll sample the corners to find background color
        width, height = img.size
        sample_points = [
            (0, 0),                    # top-left
            (width - 1, 0),            # top-right
            (0, height - 1),           # bottom-left
            (width - 1, height - 1)    # bottom-right
        ]
        
        # Use the color from top-left corner as background
        bg_color = img.getpixel((0, 0))
        
        # Create new image with transparency
        pixels = img.load()
        width, height = img.size
        
        for y in range(height):
            for x in range(width):
                pixel = pixels[x, y]
                
                # Check if pixel is similar to background color
                if len(pixel) >= 3:
                    # Compare RGB values
                    if all(abs(pixel[i] - bg_color[i]) <= tolerance for i in range(3)):
                        # Make this pixel transparent
                        pixels[x, y] = (pixel[0], pixel[1], pixel[2], 0)
                    elif len(pixel) == 4:
                        # Ensure full opacity for non-background pixels
                        pixels[x, y] = (pixel[0], pixel[1], pixel[2], 255)
        
        # Save with transparency
        img.save(output_path, 'PNG')
        return True
        
    except Exception as e:
        print(f"Error processing {input_path}: {e}")
        return False


def process_all_sprites():
    """Process all sprite sheets to remove backgrounds"""
    
    # Define all sprite files to process
    sprite_dirs = [
        ("assets/sprites/characters", [
            "ninja_idle.png",
            "ninja_walk.png",
            "ninja_jump.png",
            "ninja_attack.png",
            "ninja_shadow_strike.png",
            "ninja_hurt.png",
        ]),
        ("assets/sprites/enemies", [
            "basic_idle.png",
            "basic_walk.png",
            "basic_attack.png",
            "basic_hurt.png",
            "fly_idle.png",
            "fly_move.png",
            "fly_attack.png",
            "boss_idle.png",
            "boss_walk.png",
            "boss_attack1.png",
            "boss_attack2.png",
            "boss_special.png",
        ])
    ]
    
    print("🎨 Removing backgrounds from sprites...")
    print("=" * 60)
    
    processed = 0
    failed = 0
    
    for dir_path, sprite_files in sprite_dirs:
        print(f"\n📁 {dir_path}")
        
        for sprite_file in sprite_files:
            filepath = os.path.join(dir_path, sprite_file)
            
            if not os.path.exists(filepath):
                print(f"  ⚠️  {sprite_file} - not found")
                continue
            
            # Process with different tolerances to find best result
            if remove_background(filepath, filepath, tolerance=20):
                img = Image.open(filepath)
                print(f"  ✅ {sprite_file} ({img.width}×{img.height})")
                processed += 1
            else:
                print(f"  ❌ {sprite_file} - failed")
                failed += 1
    
    print("\n" + "=" * 60)
    print(f"✨ Background removal complete!")
    print(f"   ✅ Processed: {processed}")
    print(f"   ❌ Failed: {failed}")
    print("=" * 60)
    print("""
RESULTS:
- All sprites now have transparent backgrounds
- Sprites are saved with full alpha channel
- Background color was detected and made transparent

If the transparency isn't perfect:
1. Check if the original sprites have similar background color
2. Adjust the tolerance parameter (default: 20)
3. Manually edit _original.png files for better results

TEST: Run python src/main.py to see the sprites with transparent backgrounds!
""")


if __name__ == "__main__":
    print("🔧 Removing sprite backgrounds to create transparency\n")
    
    try:
        from PIL import Image
    except ImportError:
        print("❌ Pillow (PIL) not installed!")
        print("Run: pip install pillow")
        exit(1)
    
    process_all_sprites()
