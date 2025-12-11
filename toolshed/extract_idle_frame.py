"""
Extract the first/best frame from the ninja_idle sprite sheet
and save it as a standalone idle image
"""
from PIL import Image
import os

# Load the idle sprite sheet
idle_path = "assets/sprites/characters/ninja_idle.png"
if os.path.exists(idle_path):
    img = Image.open(idle_path)
    print(f"Loaded idle sprite sheet: {img.size}")
    
    # Extract first frame (64x64)
    frame = img.crop((0, 0, 64, 64))
    
    # Save as standalone frame
    output_path = "assets/sprites/characters/ninja_idle_single.png"
    frame.save(output_path)
    print(f"✓ Extracted single idle frame to {output_path}")
    print(f"  Frame size: {frame.size}")
else:
    print(f"✗ File not found: {idle_path}")
