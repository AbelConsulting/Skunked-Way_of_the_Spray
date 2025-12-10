"""
Enemy manager - Handles spawning and managing enemies
"""
import pygame
from enemy import Enemy

class EnemyManager:
    """Manages all enemies in the level"""
    
    def __init__(self, audio_manager=None):
        self.enemies = []
        self.spawn_timer = 0
        self.spawn_interval = 5.0  # Seconds between spawns
        self.audio_manager = audio_manager
        
        # Spawn initial enemies
        self.spawn_enemy(400, 500)
        self.spawn_enemy(700, 500)
        self.spawn_enemy(1000, 500)
    
    def spawn_enemy(self, x, y):
        """Spawn a new enemy at position"""
        enemy = Enemy(x, y, audio_manager=self.audio_manager)
        self.enemies.append(enemy)
    
    def update(self, dt, level, player):
        """Update all enemies"""
        # Update spawn timer
        self.spawn_timer += dt
        if self.spawn_timer >= self.spawn_interval:
            self.spawn_timer = 0
            # Spawn enemy off-screen to the right
            self.spawn_enemy(player.x + 800, 500)
        
        # Update each enemy
        for enemy in self.enemies:
            enemy.update(dt, level, player)
        
        # Remove dead enemies
        self.enemies = [e for e in self.enemies if e.health > 0]
    
    def remove_enemy(self, enemy):
        """Remove an enemy"""
        if enemy in self.enemies:
            self.enemies.remove(enemy)
    
    def reset(self):
        """Reset all enemies"""
        self.enemies.clear()
        self.spawn_enemy(400, 500)
        self.spawn_enemy(700, 500)
        self.spawn_enemy(1000, 500)
        self.spawn_timer = 0
    
    def render(self, screen, camera_x):
        """Render all enemies"""
        for enemy in self.enemies:
            enemy.render(screen, camera_x)
