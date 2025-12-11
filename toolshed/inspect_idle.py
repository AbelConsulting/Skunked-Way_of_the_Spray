"""
Inspect the idle sprite asset
"""
import pygame
import numpy as np

pygame.init()

# Load the idle sprite
img = pygame.image.load('assets/sprites/characters/ninja_idle.png')
print(f"Idle sprite dimensions: {img.get_width()}x{img.get_height()}")
print(f"Expected: 256x64 for 4 frames of 64x64")
print(f"Actual frame count (width/64): {img.get_width() // 64}")
print()

# Check if frames are different
if img.get_width() >= 128:
    arr = pygame.surfarray.array3d(img)
    
    # Extract frames (assuming 64x64 per frame)
    frames = []
    num_frames = img.get_width() // 64
    for i in range(min(num_frames, 4)):
        frame = arr[i*64:(i+1)*64, :, :]
        frames.append(frame)
    
    print(f"Analyzing {len(frames)} frames:")
    for i in range(len(frames) - 1):
        identical = np.array_equal(frames[i], frames[i+1])
        print(f"  Frame {i} vs Frame {i+1}: {'IDENTICAL' if identical else 'DIFFERENT'}")
        if not identical:
            diff_pixels = np.sum(~np.all(frames[i] == frames[i+1], axis=2))
            print(f"    Different pixels: {diff_pixels}")
    
    print()
    print("CONCLUSION:")
    all_same = all(np.array_equal(frames[0], frames[i]) for i in range(1, len(frames)))
    if all_same:
        print("  ✓ All frames are IDENTICAL - sprite is truly static")
    else:
        print("  ✗ Frames are DIFFERENT - this is causing the animation/twitch!")
        print("  → Need to use only the first frame or regenerate sprite as single frame")
else:
    print("Only one frame detected - sprite should be static")
