#!/usr/bin/env python3
"""
Sprite Validation Script for SkunkFU Game
This script validates that all sprite files can be loaded and are compatible with the game.
"""

import pygame
import os
import sys

# Constants
BYTES_TO_MB = 1024 * 1024

def validate_sprite(filepath, expected_frame_width=None):
    """
    Validate a single sprite file.
    
    Args:
        filepath: Path to the sprite file
        expected_frame_width: Expected width of each frame (optional)
    
    Returns:
        dict: Validation results
    """
    try:
        # Load the sprite
        img = pygame.image.load(filepath)
        width, height = img.get_size()
        file_size = os.path.getsize(filepath) / BYTES_TO_MB
        
        # Calculate frames if expected width provided
        frames = None
        if expected_frame_width and expected_frame_width > 0:
            frames = width // expected_frame_width
        
        # Check if image has alpha channel (transparency)
        has_alpha = img.get_alpha() is not None or img.get_flags() & pygame.SRCALPHA
        
        return {
            'success': True,
            'width': width,
            'height': height,
            'file_size_mb': file_size,
            'frames': frames,
            'has_alpha': has_alpha,
            'error': None
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def main():
    """Main validation function"""
    pygame.init()
    
    print("=" * 80)
    print("SKUNKFU SPRITE VALIDATION REPORT")
    print("=" * 80)
    print()
    
    sprites_dir = 'assets/sprites'
    validation_results = {
        'character': {},
        'enemy': {},
        'total_size': 0,
        'total_files': 0,
        'failed_files': 0
    }
    
    # Define sprite specifications
    sprite_specs = {
        'characters': {
            'ninja_idle.png': 64,
            'ninja_walk.png': 64,
            'ninja_jump.png': 64,
            'ninja_attack.png': 64,
            'ninja_shadow_strike.png': 64,
            'ninja_hurt.png': 64,
        },
        'enemies': {
            'basic_idle.png': 48,
            'basic_walk.png': 48,
            'basic_attack.png': 48,
            'basic_hurt.png': 48,
            'fly_idle.png': 40,
            'fly_move.png': 40,
            'fly_attack.png': 40,
            'boss_idle.png': 128,
            'boss_walk.png': 128,
            'boss_attack1.png': 128,
            'boss_attack2.png': 128,
            'boss_special.png': 128,
        }
    }
    
    # Validate character sprites
    print("CHARACTER SPRITES (Ninja Skunk)")
    print("-" * 80)
    char_dir = os.path.join(sprites_dir, 'characters')
    
    for filename, frame_width in sprite_specs['characters'].items():
        filepath = os.path.join(char_dir, filename)
        if os.path.exists(filepath):
            result = validate_sprite(filepath, frame_width)
            validation_results['character'][filename] = result
            validation_results['total_files'] += 1
            
            if result['success']:
                validation_results['total_size'] += result['file_size_mb']
                status = "✅ VALID"
                print(f"{status} | {filename:<30s} | {result['width']:4d}x{result['height']:<4d} | "
                      f"{result['file_size_mb']:6.2f}MB | {result['frames']:2d} frames @ {frame_width}px")
            else:
                validation_results['failed_files'] += 1
                status = "❌ FAILED"
                print(f"{status} | {filename:<30s} | Error: {result['error']}")
        else:
            validation_results['failed_files'] += 1
            print(f"❌ MISSING | {filename}")
    
    print()
    
    # Validate enemy sprites
    print("ENEMY SPRITES")
    print("-" * 80)
    enemy_dir = os.path.join(sprites_dir, 'enemies')
    
    for filename, frame_width in sprite_specs['enemies'].items():
        filepath = os.path.join(enemy_dir, filename)
        if os.path.exists(filepath):
            result = validate_sprite(filepath, frame_width)
            validation_results['enemy'][filename] = result
            validation_results['total_files'] += 1
            
            if result['success']:
                validation_results['total_size'] += result['file_size_mb']
                status = "✅ VALID"
                print(f"{status} | {filename:<30s} | {result['width']:4d}x{result['height']:<4d} | "
                      f"{result['file_size_mb']:6.2f}MB | {result['frames']:2d} frames @ {frame_width}px")
            else:
                validation_results['failed_files'] += 1
                status = "❌ FAILED"
                print(f"{status} | {filename:<30s} | Error: {result['error']}")
        else:
            validation_results['failed_files'] += 1
            print(f"❌ MISSING | {filename}")
    
    print()
    print("=" * 80)
    print("VALIDATION SUMMARY")
    print("=" * 80)
    print(f"Total Files Checked:     {validation_results['total_files']}")
    print(f"Successfully Validated:  {validation_results['total_files'] - validation_results['failed_files']}")
    print(f"Failed/Missing:          {validation_results['failed_files']}")
    print(f"Total Asset Size:        {validation_results['total_size']:.2f} MB")
    print()
    
    if validation_results['failed_files'] == 0:
        print("✅ ALL SPRITES ARE VALID AND COMPATIBLE WITH THE GAME!")
        print()
        print("NEXT STEPS:")
        print("1. Implement sprite loading system in the game code")
        print("2. Create animation manager for frame-based animations")
        print("3. Update player.py and enemy.py to render sprites instead of rectangles")
        print("4. (Optional) Optimize PNG file sizes for faster loading")
        return_code = 0
    else:
        print("⚠️  SOME SPRITES ARE MISSING OR INVALID")
        print("Please check the errors above and fix the issues.")
        return_code = 1
    
    print("=" * 80)
    
    pygame.quit()
    return return_code

if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)
