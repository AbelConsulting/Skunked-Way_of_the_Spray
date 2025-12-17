"""
UI - User interface and HUD
"""
import pygame
from config import *

class UI:
    """Handles all UI rendering"""
    
    def __init__(self, width, height):
        self.width = width
        self.height = height
        
        # Fonts
        pygame.font.init()
        self.title_font = pygame.font.Font(None, 72)
        self.menu_font = pygame.font.Font(None, 48)
        self.hud_font = pygame.font.Font(None, 36)
        self.small_font = pygame.font.Font(None, 24)
    
    def render_menu(self, screen):
        """Render main menu"""
        # Title
        title = self.title_font.render("SKUNK FU", True, WHITE)
        title_rect = title.get_rect(center=(self.width // 2, 150))
        screen.blit(title, title_rect)
        
        # Subtitle
        subtitle = self.menu_font.render("Ninja Skunk - Shadow Strike", True, YELLOW)
        subtitle_rect = subtitle.get_rect(center=(self.width // 2, 230))
        screen.blit(subtitle, subtitle_rect)
        
        # Character info
        char_info = self.small_font.render("Fast & Agile Ninja Fighter", True, WHITE)
        char_rect = char_info.get_rect(center=(self.width // 2, 270))
        screen.blit(char_info, char_rect)
        
        # Instructions
        instructions = [
            "Press ENTER to Start",
            "",
            "Controls:",
            "Arrow Keys / A-D: Move",
            "SPACE: Jump",
            "X: Attack",
            "Z: Special Ability",
            "ESC: Pause"
        ]
        
        y_offset = 320
        for line in instructions:
            text = self.small_font.render(line, True, WHITE)
            text_rect = text.get_rect(center=(self.width // 2, y_offset))
            screen.blit(text, text_rect)
            y_offset += 35
    
    def render_hud(self, screen, health, lives, score, player=None):
        """Render HUD during gameplay"""
        # Health bar scaled to player's real max health
        health_text = self.hud_font.render("Health:", True, WHITE)
        screen.blit(health_text, (20, 20))

        max_health = player.max_health if player and hasattr(player, "max_health") else 100
        clamped_health = max(0, min(health, max_health))
        health_ratio = clamped_health / max_health if max_health else 0

        pygame.draw.rect(screen, RED, (140, 25, 200, 30))
        pygame.draw.rect(screen, GREEN, (140, 25, int(200 * health_ratio), 30))
        pygame.draw.rect(screen, WHITE, (140, 25, 200, 30), 2)
        
        # Lives
        lives_text = self.hud_font.render(f"Lives: {lives}", True, WHITE)
        screen.blit(lives_text, (20, 70))
        
        # Score
        score_text = self.hud_font.render(f"Score: {score}", True, YELLOW)
        score_rect = score_text.get_rect(topright=(self.width - 20, 20))
        screen.blit(score_text, score_rect)
        
        # Combo counter
        if player and player.combo_count > 1:
            combo_color = YELLOW if player.combo_count == 2 else RED
            combo_text = self.menu_font.render(f"{player.combo_count}x COMBO!", True, combo_color)
            combo_rect = combo_text.get_rect(center=(self.width // 2, 60))
            screen.blit(combo_text, combo_rect)
    
    def render_pause(self, screen):
        """Render pause overlay"""
        # Semi-transparent overlay
        overlay = pygame.Surface((self.width, self.height))
        overlay.set_alpha(128)
        overlay.fill(BLACK)
        screen.blit(overlay, (0, 0))
        
        # Pause text
        pause_text = self.title_font.render("PAUSED", True, WHITE)
        pause_rect = pause_text.get_rect(center=(self.width // 2, self.height // 2))
        screen.blit(pause_text, pause_rect)
        
        resume_text = self.menu_font.render("Press ESC to Resume", True, WHITE)
        resume_rect = resume_text.get_rect(center=(self.width // 2, self.height // 2 + 80))
        screen.blit(resume_text, resume_rect)
    
    def render_game_over(self, screen, score):
        """Render game over screen"""
        # Title
        game_over_text = self.title_font.render("GAME OVER", True, RED)
        game_over_rect = game_over_text.get_rect(center=(self.width // 2, self.height // 2 - 50))
        screen.blit(game_over_text, game_over_rect)
        
        # Final score
        score_text = self.menu_font.render(f"Final Score: {score}", True, YELLOW)
        score_rect = score_text.get_rect(center=(self.width // 2, self.height // 2 + 50))
        screen.blit(score_text, score_rect)
        
        # Restart prompt
        restart_text = self.small_font.render("Press ENTER to Restart", True, WHITE)
        restart_rect = restart_text.get_rect(center=(self.width // 2, self.height // 2 + 120))
        screen.blit(restart_text, restart_rect)
