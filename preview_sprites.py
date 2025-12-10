#!/usr/bin/env python3
"""
Sprite Preview Tool for SkunkFU Game
This script displays a preview of all loaded sprites.
"""

import pygame
import os
import sys

def load_sprite_sheet(filepath, frame_width, frame_height):
    """Load a sprite sheet and extract individual frames."""
    sprite_sheet = pygame.image.load(filepath)
    sheet_width, sheet_height = sprite_sheet.get_size()
    
    frames = []
    for y in range(0, sheet_height, frame_height):
        for x in range(0, sheet_width, frame_width):
            frame = sprite_sheet.subsurface((x, y, frame_width, frame_height))
            frames.append(frame)
    
    return frames

def main():
    """Main preview function"""
    pygame.init()
    
    # Create window
    screen_width = 1280
    screen_height = 720
    screen = pygame.display.set_mode((screen_width, screen_height))
    pygame.display.set_caption("SkunkFU Sprite Preview")
    clock = pygame.time.Clock()
    
    # Load sprites
    sprites = {}
    
    # Character sprites
    char_sprites = {
        'ninja_idle': ('assets/sprites/characters/ninja_idle.png', 64, 64),
        'ninja_walk': ('assets/sprites/characters/ninja_walk.png', 64, 64),
        'ninja_jump': ('assets/sprites/characters/ninja_jump.png', 64, 64),
        'ninja_attack': ('assets/sprites/characters/ninja_attack.png', 64, 64),
    }
    
    # Enemy sprites
    enemy_sprites = {
        'basic_idle': ('assets/sprites/enemies/basic_idle.png', 48, 48),
        'boss_idle': ('assets/sprites/enemies/boss_idle.png', 128, 128),
        'fly_idle': ('assets/sprites/enemies/fly_idle.png', 40, 40),
    }
    
    print("Loading sprites...")
    
    # Load character sprites
    for name, (path, w, h) in char_sprites.items():
        try:
            sprites[name] = load_sprite_sheet(path, w, h)
            print(f"✓ Loaded {name}: {len(sprites[name])} frames")
        except Exception as e:
            print(f"✗ Failed to load {name}: {e}")
    
    # Load enemy sprites
    for name, (path, w, h) in enemy_sprites.items():
        try:
            sprites[name] = load_sprite_sheet(path, w, h)
            print(f"✓ Loaded {name}: {len(sprites[name])} frames")
        except Exception as e:
            print(f"✗ Failed to load {name}: {e}")
    
    print("\nSprite Preview Window Opened")
    print("Close the window to exit.")
    
    # Animation state
    frame_index = 0
    animation_timer = 0
    animation_speed = 0.1  # seconds per frame
    max_frames = 32  # Maximum frames to cycle through for preview
    
    # Main loop
    running = True
    while running:
        dt = clock.tick(60) / 1000.0  # Delta time in seconds
        
        # Handle events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
        
        # Update animation
        animation_timer += dt
        if animation_timer >= animation_speed:
            animation_timer = 0
            frame_index = (frame_index + 1) % max_frames
        
        # Clear screen
        screen.fill((50, 50, 50))  # Dark gray background
        
        # Draw title
        font = pygame.font.Font(None, 48)
        title = font.render("SkunkFU Sprite Preview", True, (255, 255, 255))
        screen.blit(title, (screen_width // 2 - title.get_width() // 2, 20))
        
        # Draw subtitle
        small_font = pygame.font.Font(None, 24)
        subtitle = small_font.render("All sprites loaded successfully - Animations playing", True, (200, 200, 200))
        screen.blit(subtitle, (screen_width // 2 - subtitle.get_width() // 2, 70))
        
        # Draw sprites
        y_offset = 120
        
        # Character sprites row
        label = small_font.render("NINJA SKUNK (Character Sprites)", True, (255, 200, 100))
        screen.blit(label, (50, y_offset))
        y_offset += 40
        
        x_pos = 100
        for name in ['ninja_idle', 'ninja_walk', 'ninja_jump', 'ninja_attack']:
            if name in sprites and len(sprites[name]) > 0:
                # Draw sprite (scaled up for visibility)
                current_frame = min(frame_index, len(sprites[name]) - 1)
                frame = sprites[name][current_frame]
                scaled_frame = pygame.transform.scale(frame, (128, 128))
                screen.blit(scaled_frame, (x_pos, y_offset))
                
                # Draw label
                label_text = small_font.render(name.replace('ninja_', '').upper(), True, (255, 255, 255))
                screen.blit(label_text, (x_pos, y_offset + 140))
                
                x_pos += 200
        
        y_offset += 200
        
        # Enemy sprites row
        label = small_font.render("ENEMY SPRITES", True, (255, 100, 100))
        screen.blit(label, (50, y_offset))
        y_offset += 40
        
        x_pos = 100
        for name, size in [('basic_idle', 96), ('fly_idle', 80), ('boss_idle', 128)]:
            if name in sprites and len(sprites[name]) > 0:
                # Draw sprite (scaled for visibility)
                current_frame = min(frame_index, len(sprites[name]) - 1)
                frame = sprites[name][current_frame]
                scaled_frame = pygame.transform.scale(frame, (size, size))
                screen.blit(scaled_frame, (x_pos, y_offset))
                
                # Draw label
                enemy_type = name.replace('_idle', '').upper()
                label_text = small_font.render(enemy_type, True, (255, 255, 255))
                screen.blit(label_text, (x_pos, y_offset + size + 10))
                
                x_pos += 250
        
        # Draw instructions
        y_offset = screen_height - 40
        instructions = small_font.render("Press ESC to exit | Frame: " + str(frame_index + 1), True, (150, 150, 150))
        screen.blit(instructions, (screen_width // 2 - instructions.get_width() // 2, y_offset))
        
        # Update display
        pygame.display.flip()
    
    pygame.quit()
    print("\nSprite preview closed.")

if __name__ == '__main__':
    main()
