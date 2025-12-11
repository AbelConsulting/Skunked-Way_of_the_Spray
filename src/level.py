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
        
        # Background elements (clouds, mountains)
        self.clouds = self.create_clouds()
        self.mountains = self.create_mountains()
        
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
    
    def create_clouds(self):
        """Create parallax clouds across the level"""
        clouds = []
        # Layer 1 - Far clouds (slower parallax)
        for i in range(8):
            x = i * 400 + 100
            y = 80 + (i % 3) * 30
            width = 80 + (i % 2) * 40
            height = 40 + (i % 2) * 15
            clouds.append({'x': x, 'y': y, 'width': width, 'height': height, 'layer': 1})
        
        # Layer 2 - Near clouds (faster parallax)
        for i in range(10):
            x = i * 350 + 200
            y = 120 + (i % 4) * 25
            width = 100 + (i % 3) * 30
            height = 50 + (i % 2) * 10
            clouds.append({'x': x, 'y': y, 'width': width, 'height': height, 'layer': 2})
        
        return clouds
    
    def create_mountains(self):
        """Create distant mountain silhouettes"""
        mountains = []
        # Create 5 mountain ranges
        for i in range(5):
            x = i * 650
            base_y = 400
            height = 180 + (i % 3) * 60
            width = 500 + (i % 2) * 150
            mountains.append({'x': x, 'y': base_y, 'width': width, 'height': height})
        
        return mountains
    
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
        # Cyberpunk sky gradient - dark purple to magenta
        for y in range(0, 400, 20):
            ratio = y / 400
            # Deep purple at top to hot magenta at horizon
            r = int(25 + (138 - 25) * ratio)
            g = int(0 + (43 - 0) * ratio)
            b = int(51 + (226 - 51) * ratio)
            pygame.draw.rect(screen, (r, g, b), (0, y, SCREEN_WIDTH, 20))
        
        # Draw distant mountains (parallax layer 0.2x)
        for mountain in self.mountains:
            screen_x = mountain['x'] - (camera_x * 0.2)
            if -mountain['width'] < screen_x < SCREEN_WIDTH:
                # Mountain peak as triangle
                peak_x = screen_x + mountain['width'] // 2
                peak_y = mountain['y'] - mountain['height']
                base_left = screen_x
                base_right = screen_x + mountain['width']
                base_y = mountain['y']
                
                # Mountain silhouette (dark cyan-purple)
                points = [(peak_x, peak_y), (base_left, base_y), (base_right, base_y)]
                pygame.draw.polygon(screen, (20, 30, 60), points)
                
                # Neon cyan peak glow (top 20% of mountain)
                snow_height = mountain['height'] * 0.2
                snow_left_x = peak_x - snow_height * 0.5
                snow_right_x = peak_x + snow_height * 0.5
                snow_y = peak_y + snow_height
                snow_points = [(peak_x, peak_y), (snow_left_x, snow_y), (snow_right_x, snow_y)]
                pygame.draw.polygon(screen, (0, 255, 255), snow_points)
        
        # Draw clouds with parallax
        for cloud in self.clouds:
            # Different parallax speeds for different layers
            parallax = 0.3 if cloud['layer'] == 1 else 0.5
            screen_x = cloud['x'] - (camera_x * parallax)
            
            if -cloud['width'] < screen_x < SCREEN_WIDTH:
                # Draw clouds as neon pink/purple vapor
                color = (255, 0, 200) if cloud['layer'] == 1 else (200, 0, 255)
                # Main cloud body
                pygame.draw.ellipse(screen, color, 
                                  (screen_x, cloud['y'], cloud['width'], cloud['height']))
                # Additional puffs for depth
                pygame.draw.ellipse(screen, color, 
                                  (screen_x + cloud['width'] * 0.2, cloud['y'] - cloud['height'] * 0.2, 
                                   cloud['width'] * 0.5, cloud['height'] * 0.8))
                pygame.draw.ellipse(screen, color, 
                                  (screen_x + cloud['width'] * 0.5, cloud['y'] - cloud['height'] * 0.15, 
                                   cloud['width'] * 0.6, cloud['height'] * 0.9))
        
        # Draw platforms
        for platform in self.platforms:
            screen_x = platform.x - camera_x
            
            # Different colors for ground vs floating platforms
            if platform.y >= 580:
                # Ground - neon grid floor
                base_dark = (10, 10, 30)  # Very dark blue
                neon_cyan = (0, 255, 255)  # Bright cyan
                
                # Draw dark base
                pygame.draw.rect(screen, base_dark,
                               (screen_x, platform.y + 8, platform.width, platform.height - 8))
                
                # Draw cyan energy layer
                pygame.draw.rect(screen, (0, 100, 120),
                               (screen_x, platform.y, platform.width, 8))
                
                # Add neon grid lines
                for i in range(0, platform.width, 8):
                    # Draw vertical neon lines
                    blade_x = screen_x + i
                    pygame.draw.line(screen, neon_cyan, 
                                   (blade_x + 2, platform.y + 7), 
                                   (blade_x + 2, platform.y + 2), 2)
                    pygame.draw.line(screen, neon_cyan,
                                   (blade_x + 5, platform.y + 7),
                                   (blade_x + 5, platform.y + 3), 2)
                
                # Bright cyan top edge
                pygame.draw.rect(screen, neon_cyan,
                               (screen_x, platform.y, platform.width, 2))
            else:
                # Floating platforms - holographic purple/magenta
                base_purple = (60, 20, 80)
                dark_purple = (30, 10, 50)
                neon_magenta = (255, 0, 255)
                
                # Main platform body
                pygame.draw.rect(screen, base_purple,
                               (screen_x, platform.y, platform.width, platform.height))
                
                # Neon magenta edge on top
                pygame.draw.rect(screen, neon_magenta,
                               (screen_x, platform.y, platform.width, 3))
                
                # Dark shadow/depth
                if platform.height > 10:
                    pygame.draw.rect(screen, dark_purple,
                                   (screen_x, platform.y + 3, platform.width, platform.height - 3))
                
                # Bright magenta highlight
                highlight_color = (200, 50, 255)
                pygame.draw.rect(screen, highlight_color,
                               (screen_x, platform.y, platform.width, 2))
            
            # Platform outline - neon cyan glow
            pygame.draw.rect(screen, (0, 255, 255),
                           (screen_x, platform.y, platform.width, platform.height), 2)
        
        # Draw boundaries (visual indicators)
        for boundary in self.boundaries:
            screen_x = int(boundary.x - camera_x)
            
            # Only draw if visible on screen
            if -100 < screen_x < screen.get_width() + 100:
                # Left wall (neon magenta barrier)
                if boundary.x < 0:
                    # Draw warning stripes
                    for i in range(0, self.height, 40):
                        color = (255, 0, 150) if (i // 40) % 2 == 0 else (150, 0, 100)
                        pygame.draw.rect(screen, color,
                                       (screen_x, i, 50, 40))
                    # Outline
                    pygame.draw.rect(screen, (255, 0, 255),
                                   (screen_x, 0, 50, self.height), 3)
                
                # Right wall (neon magenta barrier)
                elif boundary.x >= self.width:
                    # Draw warning stripes
                    for i in range(0, self.height, 40):
                        color = (255, 0, 150) if (i // 40) % 2 == 0 else (150, 0, 100)
                        pygame.draw.rect(screen, color,
                                       (screen_x, i, 50, 40))
                    # Outline
                    pygame.draw.rect(screen, (255, 0, 255),
                                   (screen_x, 0, 50, self.height), 3)
