"""
Visual effects for combat - damage numbers, hit sparks, etc.
"""
import pygame
from config import *

class DamageNumber:
    """Floating damage number that appears on hit"""
    
    def __init__(self, x, y, damage, is_critical=False):
        self.x = x
        self.y = y
        self.damage = damage
        self.is_critical = is_critical
        self.lifetime = 0.8  # Seconds to display
        self.timer = 0
        self.velocity_y = -100  # Float upward
        
    def update(self, dt):
        """Update position and lifetime"""
        self.timer += dt
        self.y += self.velocity_y * dt
        self.velocity_y += 300 * dt  # Slow down
        
    def is_alive(self):
        """Check if should still be displayed"""
        return self.timer < self.lifetime
        
    def render(self, screen, camera_x, font):
        """Render the damage number"""
        if not self.is_alive():
            return
            
        # Fade out over time
        alpha = int(255 * (1 - self.timer / self.lifetime))
        
        # Color based on damage value/type
        if self.is_critical:
            color = (255, 100, 100)  # Bright red for crits
            size = 24
        elif self.damage >= 30:
            color = (255, 255, 0)    # Yellow for high damage
            size = 20
        elif self.damage <= 5:
            color = (100, 200, 255)  # Blue for low damage
            size = 16
        elif self.damage < 0:
            color = (100, 255, 100)  # Green for healing
            size = 18
        else:
            color = (255, 255, 255)  # White for normal hits
            size = 18
        
        # Render bold text with outline for pop
        pop_font = pygame.font.Font(None, size + 8)
        outline_font = pygame.font.Font(None, size + 12)
        text_str = str(self.damage)
        # Black outline
        outline = outline_font.render(text_str, True, (0, 0, 0))
        outline.set_alpha(alpha)
        # Main colored text
        text = pop_font.render(text_str, True, color)
        text.set_alpha(alpha)

        screen_x = int(self.x - camera_x)
        screen_y = int(self.y)

        text_rect = text.get_rect(center=(screen_x, screen_y))
        outline_rect = outline.get_rect(center=(screen_x, screen_y))
        # Draw outline first, then main text
        screen.blit(outline, outline_rect)
        screen.blit(text, text_rect)


class HitSpark:
    """Small particle effect on hit"""
    
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.lifetime = 0.2
        self.timer = 0
        self.particles = []
        
        # Create particles
        import random
        for _ in range(8):
            angle = random.uniform(0, 2 * 3.14159)
            speed = random.uniform(100, 200)
            self.particles.append({
                'x': x,
                'y': y,
                'vx': speed * pygame.math.Vector2(1, 0).rotate_rad(angle).x,
                'vy': speed * pygame.math.Vector2(1, 0).rotate_rad(angle).y,
                'size': random.randint(2, 4)
            })
    
    def update(self, dt):
        """Update particles"""
        self.timer += dt
        for p in self.particles:
            p['x'] += p['vx'] * dt
            p['y'] += p['vy'] * dt
            p['vx'] *= 0.95  # Friction
            p['vy'] *= 0.95
    
    def is_alive(self):
        """Check if should still be displayed"""
        return self.timer < self.lifetime
    
    def render(self, screen, camera_x):
        """Render particles"""
        if not self.is_alive():
            return
            
        alpha = int(255 * (1 - self.timer / self.lifetime))
        
        for p in self.particles:
            screen_x = int(p['x'] - camera_x)
            screen_y = int(p['y'])
            
            # Draw particle as small circle
            color = (255, 200, 100, alpha)  # Orange/yellow
            pygame.draw.circle(screen, color[:3], (screen_x, screen_y), p['size'])
