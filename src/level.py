"""
Level class - Handles platforms and level layout
"""
import pygame
from config import *

class Level:
    """Game level with platforms and decorations"""
    
    def __init__(self, screen_width, screen_height):
        self.width = 3000  # Total level width
        self.height = screen_height
        self.platforms = []
        self.boundaries = []  # Invisible walls
        
        # Create platforms
        self.create_platforms()
        self.create_boundaries()
    
    def create_platforms(self):
        """Create platform layout with proper clearance (80px vertical, 80px horizontal min)"""
        # Ground platform (full width)
        self.platforms.append(pygame.Rect(0, 580, self.width, 40))
        
        # Starting area platforms - proper spacing (player is 64px wide/tall)
        self.platforms.append(pygame.Rect(200, 480, 150, 20))  # 100px clearance above
        self.platforms.append(pygame.Rect(430, 420, 150, 20))  # 80px gap from prev, 160px clearance above
        
        # Mid-section with varied heights - ensuring passable gaps
        self.platforms.append(pygame.Rect(680, 460, 180, 20))  # 100px gap, 120px clearance
        self.platforms.append(pygame.Rect(960, 380, 150, 20))  # 100px gap, 200px clearance - high platform
        self.platforms.append(pygame.Rect(1210, 440, 150, 20))  # 100px gap, 140px clearance
        self.platforms.append(pygame.Rect(1460, 360, 180, 20))  # 100px gap, 220px clearance - high platform
        
        # High platforms section - accessible jumps with ground passage
        self.platforms.append(pygame.Rect(1740, 300, 150, 20))  # 100px gap, 280px clearance - high platform
        self.platforms.append(pygame.Rect(1990, 360, 140, 20))  # 100px gap, 220px clearance
        
        # Raised floor sections - blocking ground passage intentionally
        self.platforms.append(pygame.Rect(2230, 540, 180, 40))  # 100px gap, raised floor at 540
        self.platforms.append(pygame.Rect(2510, 500, 180, 40))  # 100px gap, raised floor at 500
        
        # Staircase on raised sections
        self.platforms.append(pygame.Rect(2790, 430, 120, 20))  # 100px gap, 150px clearance
        
        # Final area - accessible from staircase with gap
        self.platforms.append(pygame.Rect(3000, 400, 0, 20))  # At boundary (no actual platform needed here)
    
    def create_boundaries(self):
        """Create invisible walls at level edges"""
        # Left wall
        self.boundaries.append(pygame.Rect(-50, 0, 50, self.height))
        
        # Right wall
        self.boundaries.append(pygame.Rect(self.width, 0, 50, self.height))
        
        # Death zone below level
        self.boundaries.append(pygame.Rect(0, 650, self.width, 50))
    
    def check_collision(self, rect, velocity_y):
        """Check if rect collides with platforms"""
        for platform in self.platforms:
            if rect.colliderect(platform):
                if velocity_y > 0:  # Falling
                    return True, platform.top
        return False, 0
    
    def render(self, screen, camera_x):
        """Render the level"""
        # Sky background with gradient effect
        screen.fill((135, 206, 235))  # Sky blue
        
        # Draw clouds (simple decoration)
        cloud_color = (255, 255, 255, 128)
        
        # Draw platforms
        for platform in self.platforms:
            screen_x = platform.x - camera_x
            
            # Different colors for ground vs floating platforms
            if platform.y >= 580:
                # Ground - grass green
                top_color = (34, 139, 34)
                side_color = (101, 67, 33)
            else:
                # Floating platforms - stone gray
                top_color = (120, 120, 120)
                side_color = (80, 80, 80)
            
            # Draw platform with depth effect
            # Main platform surface
            pygame.draw.rect(screen, top_color,
                           (screen_x, platform.y, platform.width, platform.height))
            
            # Top highlight (lighter)
            highlight_color = tuple(min(255, c + 30) for c in top_color)
            pygame.draw.rect(screen, highlight_color,
                           (screen_x, platform.y, platform.width, 3))
            
            # Side shadow (darker)
            if platform.height > 10:
                pygame.draw.rect(screen, side_color,
                               (screen_x, platform.y + 3, platform.width, platform.height - 3))
            
            # Platform outline
            pygame.draw.rect(screen, BLACK,
                           (screen_x, platform.y, platform.width, platform.height), 2)
        
        # Draw boundaries (visual indicators)
        for boundary in self.boundaries:
            screen_x = int(boundary.x - camera_x)
            
            # Only draw if visible on screen
            if -100 < screen_x < screen.get_width() + 100:
                # Left wall (red barrier)
                if boundary.x < 0:
                    # Draw warning stripes
                    for i in range(0, self.height, 40):
                        color = (200, 0, 0) if (i // 40) % 2 == 0 else (150, 0, 0)
                        pygame.draw.rect(screen, color,
                                       (screen_x, i, 50, 40))
                    # Outline
                    pygame.draw.rect(screen, (255, 0, 0),
                                   (screen_x, 0, 50, self.height), 3)
                
                # Right wall (red barrier)
                elif boundary.x >= self.width:
                    # Draw warning stripes
                    for i in range(0, self.height, 40):
                        color = (200, 0, 0) if (i // 40) % 2 == 0 else (150, 0, 0)
                        pygame.draw.rect(screen, color,
                                       (screen_x, i, 50, 40))
                    # Outline
                    pygame.draw.rect(screen, (255, 0, 0),
                                   (screen_x, 0, 50, self.height), 3)
