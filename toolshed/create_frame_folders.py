"""
Create template folder structure for sprite frames
"""
import os

def create_ninja_frame_templates():
    """Create folder structure for Ninja Skunk frames"""
    base = "raw_frames/ninja"
    
    animations = {
        "idle": 4,
        "walk": 6,
        "jump": 4,
        "attack": 6,
        "shadow_strike": 8,
        "hurt": 2
    }
    
    for anim_name, frame_count in animations.items():
        folder = os.path.join(base, anim_name)
        os.makedirs(folder, exist_ok=True)
        
        # Create placeholder README
        readme = os.path.join(folder, "README.txt")
        with open(readme, "w") as f:
            f.write(f"{anim_name.replace('_', ' ').title()} Animation\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Required frames: {frame_count}\n")
            f.write(f"Frame size: 64x64 pixels\n")
            f.write(f"Format: PNG with transparency\n\n")
            f.write("Name your frames:\n")
            for i in range(frame_count):
                f.write(f"  - {anim_name}_{i}.png\n")
        
        print(f"✓ Created {folder}/")
    
    print(f"\n✅ Ninja Skunk frame folders ready at: {base}/")

def create_enemy_frame_templates(enemy_type="basic"):
    """Create folder structure for enemy frames"""
    base = f"raw_frames/enemies/{enemy_type}"
    
    configs = {
        "basic": {
            "idle": 4,
            "walk": 6,
            "attack": 4,
            "hurt": 2
        },
        "fly": {
            "idle": 4,
            "move": 6,
            "attack": 4
        },
        "boss": {
            "idle": 4,
            "walk": 6,
            "attack1": 6,
            "attack2": 6,
            "special": 8
        }
    }
    
    sizes = {"basic": 48, "fly": 40, "boss": 128}
    
    if enemy_type not in configs:
        print(f"Unknown enemy type: {enemy_type}")
        return
    
    animations = configs[enemy_type]
    size = sizes[enemy_type]
    
    for anim_name, frame_count in animations.items():
        folder = os.path.join(base, anim_name)
        os.makedirs(folder, exist_ok=True)
        
        readme = os.path.join(folder, "README.txt")
        with open(readme, "w") as f:
            f.write(f"{enemy_type.title()} Enemy - {anim_name.replace('_', ' ').title()}\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Required frames: {frame_count}\n")
            f.write(f"Frame size: {size}x{size} pixels\n")
            f.write(f"Format: PNG with transparency\n\n")
            f.write("Name your frames:\n")
            for i in range(frame_count):
                f.write(f"  - {anim_name}_{i}.png\n")
        
        print(f"✓ Created {folder}/")
    
    print(f"\n✅ {enemy_type.title()} enemy frame folders ready at: {base}/")

if __name__ == "__main__":
    import sys
    
    print("🎨 Frame Folder Template Generator\n")
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "ninja":
            create_ninja_frame_templates()
        elif command == "enemy":
            enemy_type = sys.argv[2] if len(sys.argv) > 2 else "basic"
            create_enemy_frame_templates(enemy_type)
        else:
            print(f"Unknown command: {command}")
    else:
        print("Usage:")
        print("  python create_frame_folders.py ninja              - Ninja Skunk folders")
        print("  python create_frame_folders.py enemy basic        - Basic enemy folders")
        print("  python create_frame_folders.py enemy fly          - Flying enemy folders")
        print("  python create_frame_folders.py enemy boss         - Boss enemy folders")
        print("\nThis creates organized folders where you can place your individual frame images.")
