"""
Enemy character class
"""
import pygame
from config import *
from sprite_loader import sprite_loader, Animation

class Enemy:
    """Base enemy class"""
    
    def __init__(self, x, y, enemy_type="BASIC", audio_manager=None):
        self.x = x
        self.y = y
        self.enemy_type = enemy_type
        self.audio_manager = audio_manager
        
        # Load sprites based on enemy type
        self.load_sprites()
        
        # Set size based on type
        if enemy_type == "BASIC" or enemy_type == "FAST_BASIC":
            self.width = 48
            self.height = 48
            self.sprite_width = 48
            self.sprite_height = 48
        elif enemy_type == "FLYING":
            self.width = 64
            self.height = 64
            self.sprite_width = 64
            self.sprite_height = 64
        elif enemy_type == "BOSS":
            self.width = 128
            self.height = 128
            self.sprite_width = 128
            self.sprite_height = 128
        else:
            self.width = 50
            self.height = 70
            
        self.rect = pygame.Rect(x, y, self.width, self.height)
        
        # Stats
        if enemy_type == "FAST_BASIC":
            self.health = int(ENEMY_HEALTH * 0.8)  # 80% health
            self.max_health = self.health
            self.speed = ENEMY_SPEED * 1.5  # 50% faster
            self.attack_damage = ENEMY_ATTACK_DAMAGE
            self.points = int(ENEMY_POINTS * 1.2)  # 20% more points
        else:
            self.health = ENEMY_HEALTH
            self.max_health = ENEMY_HEALTH
            self.speed = ENEMY_SPEED
            self.attack_damage = ENEMY_ATTACK_DAMAGE
            self.points = ENEMY_POINTS
        
        # Movement
        self.velocity_x = -self.speed
        self.velocity_y = 0
        self.facing_right = False
        self.patrol_range = 200
        self.start_x = x
        self.start_y = y
        
        # Flying enemy specific
        if enemy_type == "FLYING":
            self.hover_time = 0
            self.hover_amplitude = 30  # How far up/down to bob
            self.hover_speed = 2.0  # Speed of bobbing
            self.dive_cooldown = 0
            self.is_diving = False
        
        # Combat
        self.is_attacking = False
        self.attack_timer = 0
        self.attack_duration = 0.5
        self.attack_cooldown = 2.0
        self.attack_cooldown_timer = 0
        self.attack_range = 80
        self.attack_hitbox = pygame.Rect(0, 0, 60, 40)
        
        # Hit feedback
        self.hit_stun_timer = 0
        self.knockback_velocity_x = 0
        
        # AI state
        self.state = "PATROL"  # PATROL, CHASE, ATTACK
        self.detection_range = 300
        
        # Animation
        self.current_animation = "idle"
        self.current_anim = None
        self.last_anim_state = "idle"
    
    def load_sprites(self):
        """Load sprites based on enemy type"""
        prefix = "basic" if (self.enemy_type == "BASIC" or self.enemy_type == "FAST_BASIC") else "fly" if self.enemy_type == "FLYING" else "boss"
        
        try:
            if self.enemy_type == "BASIC" or self.enemy_type == "FAST_BASIC":
                # Load sprite sheets for basic enemy (48x48 per frame in 192x48 sheets)
                idle_frames = sprite_loader.load_spritesheet(f"enemies/{prefix}_idle.png", 48, 48, 4, (48, 48))
                walk_frames = sprite_loader.load_spritesheet(f"enemies/{prefix}_walk.png", 48, 48, 4, (48, 48))
                attack_frames = sprite_loader.load_spritesheet(f"enemies/{prefix}_attack.png", 48, 48, 4, (48, 48))
                hurt_frames = sprite_loader.load_spritesheet(f"enemies/{prefix}_hurt.png", 48, 48, 4, (48, 48))
                
                self.animations = {
                    "idle": Animation(idle_frames, 0.2, True),
                    "walk": Animation(walk_frames, 0.15, True),
                    "attack": Animation(attack_frames, 0.1, False),
                    "hurt": Animation(hurt_frames, 0.1, False)
                }
            elif self.enemy_type == "FLYING":
                # Load sprite sheets for flying enemy (40x40 per frame in 120x40 sheets = 3 frames each)
                frame_size = 40
                idle_frames = sprite_loader.load_spritesheet(f"enemies/{prefix}_idle.png", frame_size, frame_size, 3, (64, 64))
                move_frames = sprite_loader.load_spritesheet(f"enemies/{prefix}_move.png", frame_size, frame_size, 3, (64, 64))
                attack_frames = sprite_loader.load_spritesheet(f"enemies/{prefix}_attack.png", frame_size, frame_size, 3, (64, 64))
                
                self.animations = {
                    "idle": Animation(idle_frames, 0.2, True),
                    "move": Animation(move_frames, 0.12, True),
                    "attack": Animation(attack_frames, 0.1, False)
                }
            elif self.enemy_type == "BOSS":
                # Load sprite sheets for boss enemy
                frame_size = 128
                idle_frames = sprite_loader.load_spritesheet(f"enemies/{prefix}_idle.png", frame_size, frame_size, 4, (128, 128))
                walk_frames = sprite_loader.load_spritesheet(f"enemies/{prefix}_walk.png", frame_size, frame_size, 6, (128, 128))
                attack1_frames = sprite_loader.load_spritesheet(f"enemies/{prefix}_attack1.png", frame_size, frame_size, 6, (128, 128))
                attack2_frames = sprite_loader.load_spritesheet(f"enemies/{prefix}_attack2.png", frame_size, frame_size, 6, (128, 128))
                special_frames = sprite_loader.load_spritesheet(f"enemies/{prefix}_special.png", frame_size, frame_size, 8, (128, 128))
                
                self.animations = {
                    "idle": Animation(idle_frames, 0.2, True),
                    "walk": Animation(walk_frames, 0.15, True),
                    "attack1": Animation(attack1_frames, 0.1, False),
                    "attack2": Animation(attack2_frames, 0.1, False),
                    "special": Animation(special_frames, 0.08, False)
                }
            
            # Set current animation and keep backward compatibility
            self.sprites = {key: anim.frames[0] for key, anim in self.animations.items()}
            self.current_anim = self.animations["idle"]
            
            print(f"✓ Loaded {self.enemy_type} enemy sprites with animations")
        except Exception as e:
            print(f"Error loading enemy sprites: {e}")
            import traceback
            traceback.print_exc()
            # Fallback to colored rectangles
            self.sprites = None
            self.animations = None
    
    def update(self, dt, level, player):
        """Update enemy behavior"""
        # Check player distance
        distance_to_player = abs(self.x - player.x)
        
        # AI state machine
        if distance_to_player < self.attack_range and abs(self.y - player.y) < 50:
            self.state = "ATTACK"
        elif distance_to_player < self.detection_range:
            self.state = "CHASE"
        else:
            self.state = "PATROL"
        
        # Update hit stun
        if self.hit_stun_timer > 0:
            self.hit_stun_timer -= dt
            # Apply knockback
            if self.knockback_velocity_x != 0:
                # Decay knockback
                self.knockback_velocity_x *= 0.9
                if abs(self.knockback_velocity_x) < 10:
                    self.knockback_velocity_x = 0
        
        # Behavior based on state (only if not in hit stun)
        if self.hit_stun_timer <= 0:
            if self.state == "PATROL":
                self.patrol(dt)
            elif self.state == "CHASE":
                self.chase(dt, player)
            elif self.state == "ATTACK":
                self.attack_player(dt, player)
        else:
            # Stop movement during hit stun
            self.velocity_x = 0
        
        # Apply gravity (not for flying enemies)
        if self.enemy_type != "FLYING":
            self.velocity_y += GRAVITY * dt
            if self.velocity_y > MAX_FALL_SPEED:
                self.velocity_y = MAX_FALL_SPEED
        
        # Update horizontal position (including knockback)
        total_velocity_x = self.velocity_x + self.knockback_velocity_x
        self.x += total_velocity_x * dt
        self.rect.x = int(self.x)
        
        # Check horizontal collisions with platforms (not for flying enemies)
        if self.enemy_type != "FLYING":
            for platform in level.platforms:
                if self.rect.colliderect(platform):
                    # Push out of platform and turn around
                    if self.velocity_x > 0:  # Moving right
                        self.x = platform.left - self.width
                        self.velocity_x = -self.speed
                        self.facing_right = False
                    elif self.velocity_x < 0:  # Moving left
                        self.x = platform.right
                        self.velocity_x = self.speed
                        self.facing_right = True
                    self.rect.x = int(self.x)
        
        # Check boundaries (level edges)
        for boundary in level.boundaries:
            if self.rect.colliderect(boundary):
                # Left wall
                if boundary.x < 0:
                    self.x = 0
                    self.velocity_x = self.speed
                    self.facing_right = True
                # Right wall
                elif boundary.x >= level.width:
                    self.x = level.width - self.width
                    self.velocity_x = -self.speed
                    self.facing_right = False
                # Death zone (fell off bottom) - kill enemy
                elif boundary.y > 600:
                    self.health = 0
                self.rect.x = int(self.x)
        
        # Update vertical position
        self.y += self.velocity_y * dt
        self.rect.y = int(self.y)
        
        # Check vertical collisions with platforms (not for flying enemies)
        if self.enemy_type != "FLYING":
            on_ground = False
            for platform in level.platforms:
                if self.rect.colliderect(platform):
                    if self.velocity_y > 0:  # Falling down
                        # Land on platform
                        self.y = platform.top - self.height
                        self.rect.y = int(self.y)
                        self.velocity_y = 0
                        on_ground = True
                        break
                    elif self.velocity_y < 0:  # Jumping up
                        # Hit head on platform
                        self.y = platform.bottom
                        self.rect.y = int(self.y)
                        self.velocity_y = 0
        
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
        self.update_animation_state(dt)
        if self.animations and self.current_anim:
            self.current_anim.update(dt)
    
    def update_animation_state(self, dt):
        """Update which animation to show"""
        anim_state = "idle"
        if self.is_attacking:
            anim_state = "attack"
        elif abs(self.velocity_x) > 0:
            anim_state = "walk" if self.enemy_type != "FLYING" else "move"
        
        # Switch animation if state changed
        if anim_state != self.last_anim_state and self.animations:
            self.current_anim = self.animations[anim_state]
            self.current_anim.reset()
            self.last_anim_state = anim_state
    
    def patrol(self, dt):
        """Patrol back and forth"""
        if self.enemy_type == "FLYING":
            # Flying patrol with sinusoidal movement
            self.hover_time += dt
            
            # Horizontal patrol
            if self.x <= self.start_x - self.patrol_range:
                self.velocity_x = self.speed
                self.facing_right = True
            elif self.x >= self.start_x + self.patrol_range:
                self.velocity_x = -self.speed
                self.facing_right = False
            
            # Vertical hover (sine wave)
            hover_offset = self.hover_amplitude * (1 + pygame.math.Vector2(0, 1).rotate(self.hover_time * self.hover_speed * 60).y)
            target_y = self.start_y + hover_offset - self.hover_amplitude
            self.velocity_y = (target_y - self.y) * 5  # Smooth movement to target
        else:
            # Ground enemy patrol
            if self.x <= self.start_x - self.patrol_range:
                self.velocity_x = self.speed
                self.facing_right = True
            elif self.x >= self.start_x + self.patrol_range:
                self.velocity_x = -self.speed
                self.facing_right = False
    
    def chase(self, dt, player):
        """Chase the player"""
        if self.enemy_type == "FLYING":
            # Check if player is directly below (and close vertically)
            horizontal_dist = abs(player.x - self.x)
            vertical_dist = player.y - self.y
            
            # If player is below and we're close horizontally, just hover in place
            if vertical_dist > 60 and horizontal_dist < 40:
                self.velocity_x = 0
                # Keep hovering vertically
                target_y = player.y - 50
                y_diff = target_y - self.y
                self.velocity_y = y_diff * 3
                if abs(self.velocity_y) > 300:
                    self.velocity_y = 300 if self.velocity_y > 0 else -300
            else:
                # Flying chase - move towards player in both axes
                if player.x > self.x:
                    self.velocity_x = self.speed * 1.2
                    self.facing_right = True
                else:
                    self.velocity_x = -self.speed * 1.2
                    self.facing_right = False
                
                # Vertical chase - try to match player height
                target_y = player.y - 50  # Fly slightly above player
                y_diff = target_y - self.y
                self.velocity_y = y_diff * 3  # Smooth vertical movement
                
                # Clamp vertical speed
                if abs(self.velocity_y) > 300:
                    self.velocity_y = 300 if self.velocity_y > 0 else -300
        else:
            # Ground enemy chase
            # Check if player is directly above
            horizontal_dist = abs(player.x - self.x)
            vertical_dist = self.y - player.y
            
            # If player is above and we're close horizontally, stop and idle
            if vertical_dist > 30 and horizontal_dist < 40:
                self.velocity_x = 0
            else:
                # Normal chase
                if player.x > self.x:
                    self.velocity_x = self.speed
                    self.facing_right = True
                else:
                    self.velocity_x = -self.speed
                    self.facing_right = False
    
    def attack_player(self, dt, player):
        """Attack the player"""
        self.velocity_x = 0
        
        if self.attack_cooldown_timer <= 0:
            self.is_attacking = True
            self.attack_timer = self.attack_duration
            self.attack_cooldown_timer = self.attack_cooldown
    
    def take_damage(self, damage, knockback_direction=1):
        """Take damage with knockback"""
        self.health -= damage
        
        # Apply hit stun and knockback
        self.hit_stun_timer = 0.15
        self.knockback_velocity_x = knockback_direction * 200
        
        # Play appropriate sound
        if self.audio_manager:
            if self.health <= 0:
                self.audio_manager.play_sound('enemy_death')
            else:
                self.audio_manager.play_sound('enemy_hit')
    
    def render(self, screen, camera_x):
        """Render the enemy"""
        screen_x = int(self.x - camera_x)
        screen_y = int(self.y)
        
        # Try to render animated sprite
        if self.animations and self.current_anim:
            sprite = self.current_anim.get_current_frame()
            
            # Flip sprite based on facing direction
            # Enemy sprites face left by default, so flip when facing_right
            if self.facing_right:
                sprite = pygame.transform.flip(sprite, True, False)
            
            # Hit flash effect
            if self.hit_stun_timer > 0:
                # Create white flash overlay
                flash_sprite = sprite.copy()
                flash_sprite.fill((255, 255, 255, 180), special_flags=pygame.BLEND_RGB_ADD)
                sprite = flash_sprite
            
            # Center sprite on collision box
            sprite_rect = sprite.get_rect()
            sprite_rect.center = (screen_x + self.width // 2, screen_y + self.height // 2)
            screen.blit(sprite, sprite_rect)
        else:
            # Fallback to colored rectangles with hit flash
            if self.hit_stun_timer > 0:
                color = WHITE
            else:
                color = RED if self.state == "ATTACK" else YELLOW if self.state == "CHASE" else GRAY
            pygame.draw.rect(screen, color, (screen_x, screen_y, self.width, self.height))
        
        # Health bar
        health_ratio = self.health / self.max_health
        bar_width = max(self.width, 50)
        bar_x = screen_x + (self.width - bar_width) // 2
        pygame.draw.rect(screen, RED, (bar_x, screen_y - 10, bar_width, 5))
        pygame.draw.rect(screen, GREEN, (bar_x, screen_y - 10, int(bar_width * health_ratio), 5))
        
        # Debug: Draw collision box outline to see sprite alignment (TEMPORARY)
        if False:  # Set to False to disable debug
            pygame.draw.rect(screen, (0, 255, 255), (screen_x, screen_y, self.width, self.height), 2)
            # Draw sprite bounds if sprite exists
            if self.animations and self.current_anim:
                sprite = self.current_anim.get_current_frame()
                sprite_rect = sprite.get_rect()
                sprite_rect.center = (screen_x + self.width // 2, screen_y + self.height // 2)
                pygame.draw.rect(screen, (255, 0, 255), sprite_rect, 2)
        
        # Attack hitbox when attacking (debug)
        if self.is_attacking and False:  # Set to True to see hitboxes
            hitbox_screen_x = int(self.attack_hitbox.x - camera_x)
            pygame.draw.rect(screen, RED,
                           (hitbox_screen_x, self.attack_hitbox.y,
                            self.attack_hitbox.width, self.attack_hitbox.height), 2)
