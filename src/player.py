"""
Player character class
"""
import pygame
from config import *

class Player:
    """Player character with combat and platforming abilities"""
    
    def __init__(self, x, y):
        # Position and movement
        self.x = x
        self.y = y
        self.width = 50
        self.height = 80
        self.rect = pygame.Rect(x, y, self.width, self.height)
        
        # Character stats (Ninja Skunk)
        self.name = CHARACTER["name"]
        self.max_health = CHARACTER["health"]
        self.health = self.max_health
        self.speed = CHARACTER["speed"]
        self.jump_force = CHARACTER["jump_force"]
        self.attack_damage = CHARACTER["attack_damage"]
        self.special_ability = CHARACTER["special_ability"]
        self.color = CHARACTER["color"]
        
        # Movement state
        self.velocity_x = 0
        self.velocity_y = 0
        self.facing_right = True
        self.on_ground = False
        
        # Combat state
        self.is_attacking = False
        self.attack_timer = 0
        self.attack_duration = 0.3
        self.attack_cooldown = 0.5
        self.attack_cooldown_timer = 0
        self.attack_hitbox = pygame.Rect(0, 0, 60, 40)
        
        # Animation state
        self.animation_state = "IDLE"  # IDLE, WALK, JUMP, ATTACK, HURT
        self.animation_frame = 0
        self.animation_timer = 0
        
        # Input
        self.keys = pygame.key.get_pressed()
    
    def handle_event(self, event):
        """Handle player input events"""
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_SPACE and self.on_ground:
                self.jump()
            elif event.key == pygame.K_x:
                self.attack()
            elif event.key == pygame.K_z:
                self.special_attack()
    
    def update(self, dt, level):
        """Update player state"""
        self.keys = pygame.key.get_pressed()
        
        # Horizontal movement
        self.velocity_x = 0
        if self.keys[pygame.K_LEFT] or self.keys[pygame.K_a]:
            self.velocity_x = -self.speed
            self.facing_right = False
        if self.keys[pygame.K_RIGHT] or self.keys[pygame.K_d]:
            self.velocity_x = self.speed
            self.facing_right = True
        
        # Apply gravity
        self.velocity_y += GRAVITY * dt
        if self.velocity_y > MAX_FALL_SPEED:
            self.velocity_y = MAX_FALL_SPEED
        
        # Update position
        self.x += self.velocity_x * dt
        self.y += self.velocity_y * dt
        
        # Collision with ground
        if self.y >= 500:  # Temporary ground level
            self.y = 500
            self.velocity_y = 0
            self.on_ground = True
        else:
            self.on_ground = False
        
        # Update rect
        self.rect.x = int(self.x)
        self.rect.y = int(self.y)
        
        # Update attack
        if self.is_attacking:
            self.attack_timer -= dt
            if self.attack_timer <= 0:
                self.is_attacking = False
        
        if self.attack_cooldown_timer > 0:
            self.attack_cooldown_timer -= dt
        
        # Update attack hitbox
        if self.is_attacking:
            if self.facing_right:
                self.attack_hitbox.x = self.rect.right
            else:
                self.attack_hitbox.x = self.rect.left - self.attack_hitbox.width
            self.attack_hitbox.y = self.rect.y + 20
        
        # Update animation state
        self.update_animation_state()
    
    def update_animation_state(self):
        """Update current animation state"""
        if self.is_attacking:
            self.animation_state = "ATTACK"
        elif not self.on_ground:
            self.animation_state = "JUMP"
        elif self.velocity_x != 0:
            self.animation_state = "WALK"
        else:
            self.animation_state = "IDLE"
    
    def jump(self):
        """Make the player jump"""
        if self.on_ground:
            self.velocity_y = -self.jump_force
            self.on_ground = False
    
    def attack(self):
        """Perform basic attack"""
        if self.attack_cooldown_timer <= 0:
            self.is_attacking = True
            self.attack_timer = self.attack_duration
            self.attack_cooldown_timer = self.attack_cooldown
    
    def special_attack(self):
        """Perform Shadow Strike - fast dash attack"""
        if not self.is_attacking and self.on_ground:
            self.is_attacking = True
            self.attack_timer = self.attack_duration
            self.attack_cooldown_timer = self.attack_cooldown
            
            # Dash forward
            dash_distance = 150
            if self.facing_right:
                self.x += dash_distance
            else:
                self.x -= dash_distance
            
            # Larger hitbox for special
            self.attack_hitbox.width = 80
            self.attack_hitbox.height = 60
    
    def take_damage(self, damage):
        """Take damage from enemy"""
        self.health -= damage
        if self.health < 0:
            self.health = 0
    
    def reset(self):
        """Reset player to starting state"""
        self.x = 100
        self.y = 500
        self.health = self.max_health
        self.velocity_x = 0
        self.velocity_y = 0
        self.is_attacking = False
    
    def render(self, screen, camera_x):
        """Render the player"""
        # Calculate screen position
        screen_x = int(self.x - camera_x)
        screen_y = int(self.y)
        
        # Draw Ninja Skunk (placeholder for sprite)
        # Body - dark gray
        pygame.draw.rect(screen, self.color, (screen_x, screen_y, self.width, self.height))
        
        # Health indicator overlay
        if self.health < 30:
            overlay_color = RED if self.health < 15 else YELLOW
            overlay = pygame.Surface((self.width, self.height))
            overlay.set_alpha(100)
            overlay.fill(overlay_color)
            screen.blit(overlay, (screen_x, screen_y))
        
        # Draw direction indicator
        if self.facing_right:
            pygame.draw.circle(screen, BLACK, (screen_x + self.width - 10, screen_y + 20), 5)
        else:
            pygame.draw.circle(screen, BLACK, (screen_x + 10, screen_y + 20), 5)
        
        # Draw attack hitbox when attacking
        if self.is_attacking:
            hitbox_screen_x = int(self.attack_hitbox.x - camera_x)
            pygame.draw.rect(screen, RED, 
                           (hitbox_screen_x, self.attack_hitbox.y, 
                            self.attack_hitbox.width, self.attack_hitbox.height), 2)
