"""
Game class - Main game controller
"""
import pygame
from player import Player
from level import Level
from enemy_manager import EnemyManager
from ui import UI
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
    
    def update(self, dt):
        """Update game state"""
        if self.state != "PLAYING":
            return
        
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
            for enemy in self.enemy_manager.enemies:
                if self.player.attack_hitbox.colliderect(enemy.rect):
                    # Use combo-modified damage
                    damage = getattr(self.player, 'current_attack_damage', self.player.attack_damage)
                    enemy.take_damage(damage)
                    if enemy.health <= 0:
                        # Bonus points for combos
                        combo_bonus = (self.player.combo_count - 1) * 50
                        self.score += enemy.points + combo_bonus
                        self.enemy_manager.remove_enemy(enemy)
        
        # Enemy attacks hitting player
        for enemy in self.enemy_manager.enemies:
            if enemy.is_attacking and enemy.attack_hitbox.colliderect(self.player.rect):
                self.player.take_damage(enemy.attack_damage)
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
        
        # Render UI
        self.ui.render_hud(self.screen, self.player.health, self.lives, self.score, self.player)
    
    def render_pause(self):
        """Render pause overlay"""
        self.ui.render_pause(self.screen)
    
    def render_game_over(self):
        """Render game over screen"""
        self.ui.render_game_over(self.screen, self.score)
