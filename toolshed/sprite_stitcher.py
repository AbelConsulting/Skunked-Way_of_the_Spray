"""
Sprite Sheet Stitcher - Combines individual frame images into horizontal sprite sheets
"""
from PIL import Image
import os

def create_sprite_sheet(input_folder, output_file, frame_width=64, frame_height=64, num_frames=6, prefix="frame"):
    """
    Create a horizontal sprite sheet from individual frame images
    
    Args:
        input_folder: Folder containing individual frame images
        output_file: Output path for the sprite sheet
        frame_width: Width of each frame in pixels
        frame_height: Height of each frame in pixels
        num_frames: Number of frames to stitch together
        prefix: Filename prefix (e.g., 'walk' for walk_0.png, walk_1.png, etc.)
    """
    frames = []
    
    # Load all frame images
    for i in range(num_frames):
        try:
            filename = f"{prefix}_{i}.png"
            path = os.path.join(input_folder, filename)
            img = Image.open(path).convert("RGBA")
            
            # Resize if not exactly the target size (Nearest Neighbor keeps pixels sharp)
            if img.size != (frame_width, frame_height):
                img = img.resize((frame_width, frame_height), Image.NEAREST)
                
            frames.append(img)
            print(f"✓ Loaded {filename}")
        except FileNotFoundError:
            print(f"✗ Warning: Could not find {filename}")
        except Exception as e:
            print(f"✗ Error loading {filename}: {e}")

    if not frames:
        print("❌ No frames found!")
        return False

    # Create the blank sprite sheet (Width = frame_width * num_frames, Height = frame_height)
    total_width = frame_width * len(frames)
    sprite_sheet = Image.new("RGBA", (total_width, frame_height), (0, 0, 0, 0))

    # Paste frames side-by-side
    for index, frame in enumerate(frames):
        x_position = index * frame_width
        sprite_sheet.paste(frame, (x_position, 0))

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # Save
    sprite_sheet.save(output_file)
    print(f"✅ Success! Saved sprite sheet to: {output_file}")
    print(f"   Dimensions: {total_width}x{frame_height} ({len(frames)} frames)")
    return True


def batch_create_ninja_sheets(frames_folder, output_folder):
    """
    Create all Ninja Skunk sprite sheets from individual frames
    
    Expects folder structure:
    frames_folder/
        idle/idle_0.png ... idle_3.png (4 frames)
        walk/walk_0.png ... walk_5.png (6 frames)
        jump/jump_0.png ... jump_3.png (4 frames)
        attack/attack_0.png ... attack_5.png (6 frames)
        shadow_strike/shadow_strike_0.png ... shadow_strike_7.png (8 frames)
        hurt/hurt_0.png ... hurt_1.png (2 frames)
    """
    animations = {
        "idle": {"frames": 4, "size": 64},
        "walk": {"frames": 6, "size": 64},
        "jump": {"frames": 4, "size": 64},
        "attack": {"frames": 6, "size": 64},
        "shadow_strike": {"frames": 8, "size": 64},
        "hurt": {"frames": 2, "size": 64}
    }
    
    print("=" * 60)
    print("Creating Ninja Skunk Sprite Sheets")
    print("=" * 60)
    
    for anim_name, config in animations.items():
        print(f"\n📦 Processing {anim_name}...")
        input_path = os.path.join(frames_folder, anim_name)
        output_path = os.path.join(output_folder, f"ninja_{anim_name}.png")
        
        if not os.path.exists(input_path):
            print(f"⚠️  Skipping - folder not found: {input_path}")
            continue
            
        create_sprite_sheet(
            input_folder=input_path,
            output_file=output_path,
            frame_width=config["size"],
            frame_height=config["size"],
            num_frames=config["frames"],
            prefix=anim_name
        )
    
    print("\n" + "=" * 60)
    print("✅ Batch processing complete!")
    print("=" * 60)


def batch_create_enemy_sheets(frames_folder, output_folder, enemy_type="basic"):
    """
    Create enemy sprite sheets from individual frames
    
    Args:
        frames_folder: Root folder containing enemy frames
        output_folder: Output folder for sprite sheets
        enemy_type: 'basic', 'fly', or 'boss'
    """
    enemy_configs = {
        "basic": {
            "idle": {"frames": 4, "size": 48},
            "walk": {"frames": 6, "size": 48},
            "attack": {"frames": 4, "size": 48},
            "hurt": {"frames": 2, "size": 48}
        },
        "fly": {
            "idle": {"frames": 4, "size": 40},
            "move": {"frames": 6, "size": 40},
            "attack": {"frames": 4, "size": 40}
        },
        "boss": {
            "idle": {"frames": 4, "size": 128},
            "walk": {"frames": 6, "size": 128},
            "attack1": {"frames": 6, "size": 128},
            "attack2": {"frames": 6, "size": 128},
            "special": {"frames": 8, "size": 128}
        }
    }
    
    if enemy_type not in enemy_configs:
        print(f"❌ Unknown enemy type: {enemy_type}")
        return
    
    print("=" * 60)
    print(f"Creating {enemy_type.upper()} Enemy Sprite Sheets")
    print("=" * 60)
    
    animations = enemy_configs[enemy_type]
    
    for anim_name, config in animations.items():
        print(f"\n📦 Processing {anim_name}...")
        input_path = os.path.join(frames_folder, enemy_type, anim_name)
        output_path = os.path.join(output_folder, f"{enemy_type}_{anim_name}.png")
        
        if not os.path.exists(input_path):
            print(f"⚠️  Skipping - folder not found: {input_path}")
            continue
            
        create_sprite_sheet(
            input_folder=input_path,
            output_file=output_path,
            frame_width=config["size"],
            frame_height=config["size"],
            num_frames=config["frames"],
            prefix=anim_name
        )
    
    print("\n" + "=" * 60)
    print("✅ Batch processing complete!")
    print("=" * 60)


if __name__ == "__main__":
    import sys
    
    print("🎨 Skunk Fu Sprite Sheet Stitcher\n")
    
    # Example usage
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "ninja":
            # Stitch Ninja Skunk sprites
            frames_folder = "raw_frames/ninja"
            output_folder = "assets/sprites/characters"
            batch_create_ninja_sheets(frames_folder, output_folder)
            
        elif command == "enemy":
            # Stitch enemy sprites
            enemy_type = sys.argv[2] if len(sys.argv) > 2 else "basic"
            frames_folder = "raw_frames/enemies"
            output_folder = "assets/sprites/enemies"
            batch_create_enemy_sheets(frames_folder, output_folder, enemy_type)
            
        else:
            print(f"Unknown command: {command}")
    else:
        print("Usage:")
        print("  python sprite_stitcher.py ninja          - Create Ninja Skunk sprite sheets")
        print("  python sprite_stitcher.py enemy basic    - Create basic enemy sprite sheets")
        print("  python sprite_stitcher.py enemy fly      - Create flying enemy sprite sheets")
        print("  python sprite_stitcher.py enemy boss     - Create boss enemy sprite sheets")
        print("\nOr import and use the functions directly in Python")
