"""
Clean up unnecessary PNG files from sprite processing
Removes _original.png backups and backup directories
"""
import os
import shutil

def cleanup_sprites():
    """Remove unnecessary sprite files"""
    
    print("🧹 Cleaning up unnecessary sprite files...")
    print("=" * 60)
    
    removed_files = 0
    removed_dirs = 0
    
    # Remove _original.png files
    sprite_dirs = [
        "assets/sprites/characters",
        "assets/sprites/enemies"
    ]
    
    for dir_path in sprite_dirs:
        if not os.path.exists(dir_path):
            continue
        
        print(f"\n📁 {dir_path}")
        
        for filename in os.listdir(dir_path):
            filepath = os.path.join(dir_path, filename)
            
            # Remove _original.png files
            if filename.endswith("_original.png"):
                try:
                    os.remove(filepath)
                    print(f"  🗑️  Deleted {filename}")
                    removed_files += 1
                except Exception as e:
                    print(f"  ❌ Failed to delete {filename}: {e}")
    
    # Remove backup directories
    backup_dirs = [
        "assets/sprites/characters/backup_horizontal",
        "assets/sprites/enemies/backup_horizontal"
    ]
    
    for backup_dir in backup_dirs:
        if os.path.exists(backup_dir):
            try:
                shutil.rmtree(backup_dir)
                print(f"\n🗑️  Deleted directory: {backup_dir}")
                removed_dirs += 1
            except Exception as e:
                print(f"❌ Failed to delete {backup_dir}: {e}")
    
    print("\n" + "=" * 60)
    print("✨ Cleanup complete!")
    print(f"   🗑️  Removed {removed_files} _original.png files")
    print(f"   🗑️  Removed {removed_dirs} backup directories")
    print("=" * 60)
    print("""
CLEANED UP:
✅ All _original.png backups removed
✅ All backup_horizontal directories removed
✅ Kept only the processed sprite sheets

Your sprite directory is now clean!
List of remaining sprites:
  Characters: ninja_idle.png, ninja_walk.png, ninja_jump.png, 
              ninja_attack.png, ninja_shadow_strike.png, ninja_hurt.png
  Enemies: basic_*.png, fly_*.png, boss_*.png
""")


if __name__ == "__main__":
    cleanup_sprites()
