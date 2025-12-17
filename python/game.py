"""
Game class - Main game controller
"""
import pygame
from player import Player
from level import Level
from enemy_manager import EnemyManager
from ui import UI
from visual_effects import DamageNumber, HitSpark
from audio_manager import AudioManager

class Game:
    """Main game controller"""
    
    def __init__(self, screen, width, height):
        self.screen = screen
        self.width = width
        self.height = height
        
        # Initialize audio
        self.audio_manager = AudioManager()
        
        # Game state
        self.state = "MENU"  # MENU, PLAYING, PAUSED, GAME_OVER
        self.score = 0
        self.lives = 3
        
        # Visual effects
        self.screen_shake_timer = 0
        self.screen_shake_intensity = 0
        self.hit_pause_timer = 0
        self.damage_numbers = []
        self.hit_sparks = []
        
        # Font for damage numbers
        self.damage_font = pygame.font.Font(None, 24)
        
        # Initialize game components
        self.player = Player(100, 500, audio_manager=self.audio_manager)
        self.level = Level(width, height)
        self.enemy_manager = EnemyManager(audio_manager=self.audio_manager)
        self.ui = UI(width, height)
        
        # Camera
        self.camera_x = 0
        
    def handle_event(self, event):
        """Handle input events"""
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                if self.state == "PLAYING":
                    self.state = "PAUSED"
                    self.audio_manager.play_sound('pause')
                    self.audio_manager.pause_music()
                elif self.state == "PAUSED":
                    self.state = "PLAYING"
                    self.audio_manager.unpause_music()
            elif event.key == pygame.K_RETURN:
                if self.state == "MENU":
                    self.audio_manager.play_sound('menu_select')
                    self.start_game()
                elif self.state == "GAME_OVER":
                    self.audio_manager.play_sound('menu_select')
                    self.start_game()  # Restart game
        
        if self.state == "PLAYING":
            self.player.handle_event(event)
    
    def start_game(self):
        """Start a new game"""
        self.state = "PLAYING"
        self.score = 0
        self.lives = 3
        self.player.reset()
        self.enemy_manager.reset()
        
        # Start gameplay music
        self.audio_manager.play_music('gameplay', loop=-1)
    
    def update(self, dt):
        """Update game state"""
        if self.state != "PLAYING":
            return
        
        # Update visual effect timers
        if self.screen_shake_timer > 0:
            self.screen_shake_timer -= dt
        if self.hit_pause_timer > 0:
            self.hit_pause_timer -= dt
            return  # Pause game during hit pause
        
        # Update damage numbers and effects
        self.damage_numbers = [dn for dn in self.damage_numbers if dn.is_alive()]
        for dn in self.damage_numbers:
            dn.update(dt)
            
        self.hit_sparks = [hs for hs in self.hit_sparks if hs.is_alive()]
        for hs in self.hit_sparks:
            hs.update(dt)
        
        # Pass enemy list to player for upward strike detection
        self.player._current_enemies = self.enemy_manager.enemies
        
        # Update player
        self.player.update(dt, self.level)
        
        # Update enemies
        self.enemy_manager.update(dt, self.level, self.player)
        
        # Check collisions
        self.check_collisions()
        
        # Update camera to follow player
        self.update_camera()
        
    def check_collisions(self):
        """Check for collisions between game objects"""
        # Player attacks hitting enemies
        if self.player.is_attacking:
            to_remove = []
            for enemy in list(self.enemy_manager.enemies):
                # Only hit each enemy once per attack
                if enemy not in self.player.hit_enemies:
                    if self.player.attack_hitbox.colliderect(enemy.rect):
                        # Mark enemy as hit
                        self.player.hit_enemies.add(enemy)
                        
                        # Use combo-modified damage
                        damage = getattr(self.player, 'current_attack_damage', self.player.attack_damage)
                        
                        # Determine knockback direction
                        knockback_dir = 1 if self.player.facing_right else -1
                        
                        # Apply damage with knockback
                        enemy.take_damage(damage, knockback_dir)
                        
                        # Create visual effects
                        is_critical = self.player.combo_count >= 3
                        damage_num = DamageNumber(
                            enemy.x + enemy.width // 2,
                            enemy.y,
                            damage,
                            is_critical
                        )
                        self.damage_numbers.append(damage_num)
                        
                        hit_spark = HitSpark(
                            enemy.x + enemy.width // 2,
                            enemy.y + enemy.height // 2
                        )
                        self.hit_sparks.append(hit_spark)
                        
                        # Visual feedback
                        self.screen_shake_timer = 0.1
                        self.screen_shake_intensity = 3 if enemy.health > 0 else 6
                        self.hit_pause_timer = 0.05  # Brief pause on hit
                        
                        # Score and cleanup
                        if enemy.health <= 0:
                            # Bonus points for combos
                            combo_bonus = (self.player.combo_count - 1) * 50
                            self.score += enemy.points + combo_bonus
                            to_remove.append(enemy)
        
            # Remove defeated enemies after processing to avoid mutation during iteration
            for enemy in to_remove:
                self.enemy_manager.remove_enemy(enemy)
        
        # Enemy attacks hitting player
        for enemy in self.enemy_manager.enemies:
            if enemy.is_attacking and enemy.attack_hitbox.colliderect(self.player.rect):
                self.player.take_damage(enemy.attack_damage)
                
                # Screen shake on player hit
                self.screen_shake_timer = 0.2
                self.screen_shake_intensity = 5
                
                if self.player.health <= 0:
                    self.lives -= 1
                    if self.lives <= 0:
                        self.state = "GAME_OVER"
                        self.audio_manager.play_sound('game_over')
                        self.audio_manager.stop_music()
                    else:
                        self.player.reset()
    
    def update_camera(self):
        """Update camera position to follow player"""
        # Keep player centered horizontally
        target_x = self.player.x - self.width // 2
        self.camera_x = max(0, min(target_x, self.level.width - self.width))
        
        # Apply screen shake
        if self.screen_shake_timer > 0:
            import random
            shake_x = random.randint(-int(self.screen_shake_intensity), int(self.screen_shake_intensity))
            self.camera_x += shake_x
    
    def render(self):
        """Render the game"""
        self.screen.fill((50, 150, 200))  # Sky blue background
        
        if self.state == "MENU":
            self.render_menu()
        elif self.state == "PLAYING":
            self.render_game()
        elif self.state == "PAUSED":
            self.render_game()
            self.render_pause()
        elif self.state == "GAME_OVER":
            self.render_game_over()
    
    def render_menu(self):
        """Render main menu"""
        self.ui.render_menu(self.screen)
    
    def render_game(self):
        """Render gameplay"""
        # Render level (with camera offset)
        self.level.render(self.screen, self.camera_x)
        
        # Render enemies
        self.enemy_manager.render(self.screen, self.camera_x)
        
        # Render player
        self.player.render(self.screen, self.camera_x)
        
        # Render visual effects
        for spark in self.hit_sparks:
            spark.render(self.screen, self.camera_x)
            
        for damage_num in self.damage_numbers:
            damage_num.render(self.screen, self.camera_x, self.damage_font)
        
        # Render UI
        self.ui.render_hud(self.screen, self.player.health, self.lives, self.score, self.player)
    
    def render_pause(self):
        """Render pause overlay"""
        self.ui.render_pause(self.screen)
    
    def render_game_over(self):
        """Render game over screen"""
        self.ui.render_game_over(self.screen, self.score)
