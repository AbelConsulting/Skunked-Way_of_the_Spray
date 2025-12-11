"""
Debug script to check what's happening during idle state
"""
import sys
sys.path.insert(0, 'src')

import pygame
from player import Player
from audio_manager import AudioManager

pygame.init()
screen = pygame.display.set_mode((800, 600))
clock = pygame.time.Clock()

audio = AudioManager()
player = Player(400, 300, audio)

print("\n=== IDLE STATE DEBUG ===")
print(f"Initial state: {player.last_anim_state}")
print(f"Current anim: {player.current_anim}")
print(f"Velocity X: {player.velocity_x}")
print(f"Has idle_sprite: {hasattr(player, 'idle_sprite')}")

running = True
frame_count = 0
last_state = None
last_sprite_id = None

while running and frame_count < 300:  # Run for 5 seconds
    dt = clock.tick(60) / 1000.0
    frame_count += 1
    
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
    
    # Don't press any keys - pure idle
    player.keys = pygame.key.get_pressed()
    
    # Create a minimal level object
    class FakeLevel:
        platforms = [pygame.Rect(0, 350, 800, 50)]
        boundaries = []
    
    player.update(dt, FakeLevel())
    
    # Check if state changed
    if player.last_anim_state != last_state:
        print(f"\nFrame {frame_count}: State changed to '{player.last_anim_state}'")
        print(f"  current_anim: {player.current_anim}")
        print(f"  velocity_x: {player.velocity_x}")
        last_state = player.last_anim_state
    
    # Check which sprite is being used
    if player.last_anim_state == "idle" and hasattr(player, 'idle_sprite'):
        current_sprite_id = id(player.idle_sprite)
    elif player.current_anim:
        current_sprite_id = id(player.current_anim.get_current_frame())
    else:
        current_sprite_id = None
    
    if current_sprite_id != last_sprite_id and frame_count % 10 == 0:
        print(f"Frame {frame_count}: Sprite object changed (ID: {current_sprite_id})")
        if player.current_anim:
            print(f"  Animation frame: {player.current_anim.current_frame}/{len(player.current_anim.frames)}")
        last_sprite_id = current_sprite_id

print(f"\n=== FINAL STATE (after {frame_count} frames) ===")
print(f"Animation state: {player.last_anim_state}")
print(f"Current anim: {player.current_anim}")
print(f"Velocity X: {player.velocity_x}")
print(f"On ground: {player.on_ground}")

pygame.quit()
print("\nDone!")
