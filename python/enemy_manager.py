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
        self.flying_spawn_timer = 0
        self.flying_spawn_interval = 8.0  # Spawn flying enemies less frequently
        self.audio_manager = audio_manager
        
        # Spawn initial enemies
        self.spawn_enemy(400, 500, "BASIC")
        self.spawn_enemy(700, 500, "BASIC")
        self.spawn_enemy(1000, 500, "BASIC")
        
        # Spawn initial flying enemies
        self.spawn_enemy(600, 300, "FLYING")
        self.spawn_enemy(1200, 250, "FLYING")
    
    def spawn_enemy(self, x, y, enemy_type="BASIC"):
        """Spawn a new enemy at position"""
        enemy = Enemy(x, y, enemy_type=enemy_type, audio_manager=self.audio_manager)
        self.enemies.append(enemy)
    
    def update(self, dt, level, player):
        """Update all enemies"""
        # Update spawn timer for ground enemies
        self.spawn_timer += dt
        if self.spawn_timer >= self.spawn_interval:
            self.spawn_timer = 0
            # Spawn enemy off-screen to the right
            import random
            enemy_type = "BASIC" if random.random() < 0.7 else "FAST_BASIC"
            self.spawn_enemy(player.x + 800, 500, enemy_type)
        
        # Update spawn timer for flying enemies
        self.flying_spawn_timer += dt
        if self.flying_spawn_timer >= self.flying_spawn_interval:
            self.flying_spawn_timer = 0
            # Spawn flying enemy off-screen at random height
            import random
            spawn_y = random.randint(200, 400)
            self.spawn_enemy(player.x + 900, spawn_y, "FLYING")
        
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
        self.spawn_enemy(400, 500, "BASIC")
        self.spawn_enemy(700, 500, "BASIC")
        self.spawn_enemy(1000, 500, "BASIC")
        self.spawn_enemy(600, 300, "FLYING")
        self.spawn_enemy(1200, 250, "FLYING")
        self.spawn_timer = 0
        self.flying_spawn_timer = 0
    
    def render(self, screen, camera_x):
        """Render all enemies"""
        for enemy in self.enemies:
            enemy.render(screen, camera_x)
