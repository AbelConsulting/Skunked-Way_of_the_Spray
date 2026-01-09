"""
Player character class
"""
import pygame
from config import *
from sprite_loader import sprite_loader, Animation

class Player:
    """Player character with combat and platforming abilities"""
    
    def __init__(self, x, y, audio_manager=None):
        # Position and movement
        self.x = x
        self.y = y
        self.audio_manager = audio_manager
        self.width = 64
        self.height = 64
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
        
        # Load sprites
        self.load_sprites()
        
        # Movement state
        self.velocity_x = 0
        self.velocity_y = 0
        self.target_velocity_x = 0
        self.acceleration = 2500  # How fast we reach target speed
        self.friction = 1800  # How fast we slow down
        self.facing_right = True
        self.on_ground = False
        
        # Jump mechanics
        self.coyote_time = 0.15  # Time after leaving ground you can still jump
        self.coyote_timer = 0
        self.jump_buffer_time = 0.1  # Time before landing jump is buffered
        self.jump_buffer_timer = 0
        
        # Combat state
        self.is_attacking = False
        self.attack_timer = 0
        self.attack_duration = 0.3
        self.attack_cooldown = 0.3  # Reduced for faster combos
        self.attack_cooldown_timer = 0
        self.default_attack_width = 60
        self.default_attack_height = 40
        self.attack_hitbox = pygame.Rect(0, 0, self.default_attack_width, self.default_attack_height)
        self.hit_enemies = set()  # Track enemies hit in current attack
        
        # Shadow strike state
        self.is_shadow_striking = False
        # Keep duration in sync with animation timing (frame_duration * frames).
        shadow_anim = self.animations.get("shadow_strike") if self.animations else None
        self.shadow_strike_duration = (
            (len(shadow_anim.frames) * shadow_anim.frame_duration) if shadow_anim else 0.25
        )
        self.shadow_strike_speed = 600  # Dash speed in pixels/second
        
        # Combo system
        self.combo_count = 0
        self.combo_window = 0.4  # Time to continue combo
        self.combo_timer = 0
        self.max_combo = 3
        
        # Hit feedback
        self.hit_stun_timer = 0
        self.invulnerable_timer = 0
        self.invulnerable_duration = 0.5
        
        # Animation state
        self.animation_state = "IDLE"  # IDLE, WALK, JUMP, ATTACK, HURT
        self.animation_frame = 0
        self.animation_timer = 0
        
        # Input
        self.keys = pygame.key.get_pressed()
    
    def load_sprites(self):
        """Load Ninja Skunk sprites"""
        print("Loading Ninja Skunk sprites...")
        try:
            # Actual sprite sheet frame sizes:
            # idle: 256x64 (4 frames of 64x64)
            # walk, jump, attack, shadow_strike, hurt: 128x32 (4 frames of 32x32)
            
            # Load sprite sheets - assuming horizontal sprite sheets
            # For idle, load just the first frame as a static sprite (no animation)
            import os
            idle_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'assets', 'sprites', 'characters', 'ninja_idle.png')
            idle_img = pygame.image.load(idle_path).convert_alpha()
            # Extract only the first 64x64 frame as a completely static pose
            temp_surface = pygame.Surface((64, 64), pygame.SRCALPHA)
            temp_surface.blit(idle_img, (0, 0), pygame.Rect(0, 0, 64, 64))
            # Scale to 96x96 for good visibility without being too large
            self.idle_sprite = pygame.transform.scale(temp_surface, (96, 96))
            # Pre-create flipped version to avoid recreating every frame
            self.idle_sprite_flipped = pygame.transform.flip(self.idle_sprite, True, False)
            
            walk_frames = sprite_loader.load_spritesheet("characters/ninja_walk.png", 32, 32, 4, (96, 96))
            jump_frames = sprite_loader.load_spritesheet("characters/ninja_jump.png", 32, 32, 4, (96, 96))
            attack_frames = sprite_loader.load_spritesheet("characters/ninja_attack.png", 32, 32, 4, (96, 96))
            shadow_strike_frames = sprite_loader.load_spritesheet("characters/ninja_shadow_strike.png", 32, 32, 4, (96, 96))
            hurt_frames = sprite_loader.load_spritesheet("characters/ninja_hurt.png", 32, 32, 2, (96, 96))
            
            # Create animations from frames (idle is handled separately as static sprite)
            self.animations = {
                "walk": Animation(walk_frames, 0.1, True),
                "jump": Animation(jump_frames, 0.12, True),
                "attack": Animation(attack_frames, 0.08, False),
                "shadow_strike": Animation(shadow_strike_frames, 0.05, False),
                "hurt": Animation(hurt_frames, 0.1, False)
            }
            
            # Keep reference for backward compatibility
            self.sprites = {key: anim.frames[0] for key, anim in self.animations.items()}
            
            # Current animation (start with idle, but handled separately)
            self.current_anim = None
            self.last_anim_state = "idle"
            
            print(f"✓ Loaded {len(self.animations)} Ninja Skunk animations with multiple frames")
        except Exception as e:
            print(f"Warning: Could not load player sprites: {e}")
            import traceback
            traceback.print_exc()
            self.sprites = None
            self.animations = None
    
    def handle_event(self, event):
        """Handle player input events"""
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_SPACE:
                # Jump buffering - remember jump input
                self.jump_buffer_timer = self.jump_buffer_time
            elif event.key == pygame.K_x:
                self.attack()
            elif event.key == pygame.K_z:
                self.special_attack()
    
    def update(self, dt, level):
        """Update player state"""
        self.keys = pygame.key.get_pressed()
        
        # Update timers
        if self.coyote_timer > 0:
            self.coyote_timer -= dt
        if self.jump_buffer_timer > 0:
            self.jump_buffer_timer -= dt
        if self.combo_timer > 0:
            self.combo_timer -= dt
        else:
            self.combo_count = 0  # Reset combo if timer expires
        if self.hit_stun_timer > 0:
            self.hit_stun_timer -= dt
        if self.invulnerable_timer > 0:
            self.invulnerable_timer -= dt
        
        # Determine target velocity based on input (no movement during hit stun)
        self.target_velocity_x = 0
        if self.hit_stun_timer <= 0:
            if self.keys[pygame.K_LEFT] or self.keys[pygame.K_a]:
                self.target_velocity_x = -self.speed
                self.facing_right = False
            if self.keys[pygame.K_RIGHT] or self.keys[pygame.K_d]:
                self.target_velocity_x = self.speed
                self.facing_right = True
        
        # Smooth acceleration/deceleration
        if self.target_velocity_x != 0:
            # Accelerate towards target
            if abs(self.velocity_x) < abs(self.target_velocity_x):
                self.velocity_x += (self.target_velocity_x / abs(self.target_velocity_x)) * self.acceleration * dt
                # Clamp to target
                if abs(self.velocity_x) > abs(self.target_velocity_x):
                    self.velocity_x = self.target_velocity_x
            else:
                # Already at or above target, match it
                self.velocity_x = self.target_velocity_x
        else:
            # Apply friction when no input
            if abs(self.velocity_x) > 0:
                friction_amount = self.friction * dt
                if abs(self.velocity_x) <= friction_amount:
                    self.velocity_x = 0
                else:
                    self.velocity_x -= (self.velocity_x / abs(self.velocity_x)) * friction_amount
            
            # Ensure completely zero velocity when very small (prevent micro-movements)
            if abs(self.velocity_x) < 0.1:
                self.velocity_x = 0
        
        # Check if we just left the ground (for coyote time)
        was_on_ground = self.on_ground
        
        # Apply gravity
        self.velocity_y += GRAVITY * dt
        if self.velocity_y > MAX_FALL_SPEED:
            self.velocity_y = MAX_FALL_SPEED
        
        # Update horizontal position (only if actually moving)
        if abs(self.velocity_x) > 0:
            self.x += self.velocity_x * dt
            self.rect.x = int(self.x)
        
        # Check horizontal collisions with platforms
        for platform in level.platforms:
            if self.rect.colliderect(platform):
                # Push out of platform
                if self.velocity_x > 0:  # Moving right
                    self.x = platform.left - self.width
                elif self.velocity_x < 0:  # Moving left
                    self.x = platform.right
                self.rect.x = int(self.x)
        
        # Check boundaries (level edges)
        for boundary in level.boundaries:
            if self.rect.colliderect(boundary):
                # Left wall
                if boundary.x < 0:
                    self.x = 0
                    self.velocity_x = 0
                # Right wall
                elif boundary.x >= level.width:
                    self.x = level.width - self.width
                    self.velocity_x = 0
                # Death zone (fell off bottom)
                elif boundary.y > 600:
                    self.take_damage(999)  # Instant death
                self.rect.x = int(self.x)
        
        # Update vertical position
        self.y += self.velocity_y * dt
        self.rect.y = int(self.y)
        
        # Check vertical collisions with platforms
        self.on_ground = False
        just_landed = False
        
        for platform in level.platforms:
            # Check with slight tolerance to prevent flickering
            feet_rect = pygame.Rect(self.rect.x, self.rect.bottom - 2, self.rect.width, 4)
            if feet_rect.colliderect(platform) and self.velocity_y >= 0:
                # We're on or very close to the platform
                self.on_ground = True
                
                if self.rect.colliderect(platform):
                    if self.velocity_y > 0:  # Falling down
                        # Land on platform
                        self.y = platform.top - self.height
                        self.rect.y = int(self.y)
                        
                        # Check if we just landed (for sound)
                        if not was_on_ground and self.velocity_y > 200:
                            just_landed = True
                        
                        self.velocity_y = 0
                    break
                elif self.velocity_y < 0:  # Jumping up
                    # Hit head on platform
                    self.y = platform.bottom
                    self.rect.y = int(self.y)
                    self.velocity_y = 0
        
        # Play landing sound if significant fall
        if just_landed and self.audio_manager:
            self.audio_manager.play_sound('land', volume=0.5)
        
        # Update coyote timer
        if was_on_ground and not self.on_ground:
            self.coyote_timer = self.coyote_time
        elif self.on_ground:
            self.coyote_timer = 0
        
        # Handle jump buffering - try to jump if we buffered a jump and just landed
        if self.jump_buffer_timer > 0 and (self.on_ground or self.coyote_timer > 0):
            self.jump()
            self.jump_buffer_timer = 0
        
        # Update attack
        if self.is_attacking:
            self.attack_timer -= dt
            if self.attack_timer <= 0:
                self.is_attacking = False
                self.is_shadow_striking = False
                # Restore default hitbox size after any attack concludes
                self.attack_hitbox.width = self.default_attack_width
                self.attack_hitbox.height = self.default_attack_height
                # Stop dash momentum from shadow strike
                if abs(self.velocity_x) > self.speed:
                    self.velocity_x = 0
                # Move hitbox off-screen to prevent lingering hits
                self.attack_hitbox.x = -1000
                self.attack_hitbox.y = -1000
        
        if self.attack_cooldown_timer > 0:
            self.attack_cooldown_timer -= dt
        
        # Update attack hitbox position (only while actively attacking)
        if self.is_attacking and self.attack_timer > 0:
            # Check if there are enemies above us (for upward strikes)
            enemies_above = False
            if hasattr(self, '_current_enemies'):
                for enemy in self._current_enemies:
                    # Enemy is above if their bottom is higher than our top
                    if enemy.y + enemy.height < self.rect.y + 20:
                        # And within horizontal attack range
                        horizontal_dist = abs((enemy.x + enemy.width/2) - (self.x + self.width/2))
                        if horizontal_dist < 80:
                            enemies_above = True
                            break
            
            if enemies_above:
                # Extend attack hitbox upward
                if self.facing_right:
                    self.attack_hitbox.x = self.rect.x
                else:
                    self.attack_hitbox.x = self.rect.x - 20
                # Position hitbox to cover upward area
                self.attack_hitbox.y = self.rect.y - 60  # Reach above
                self.attack_hitbox.width = self.default_attack_width + 20
                self.attack_hitbox.height = 80  # Tall hitbox for upward strikes
            else:
                # Normal horizontal attack
                if self.facing_right:
                    self.attack_hitbox.x = self.rect.right
                else:
                    self.attack_hitbox.x = self.rect.left - self.attack_hitbox.width
                self.attack_hitbox.y = self.rect.y + 20
        
        # Update animation state and animate
        self.update_animation_state()
        if self.animations and self.current_anim:  # Only update if there's an active animation
            self.current_anim.update(dt)
    
    def update_animation_state(self):
        """Update current animation state"""
        # Determine which animation should play
        anim_state = "idle"
        if self.is_attacking:
            anim_state = "shadow_strike" if self.is_shadow_striking else "attack"
        elif not self.on_ground:
            anim_state = "jump"
        elif abs(self.velocity_x) > 10.0:  # Higher dead zone to prevent idle->walk jitter
            anim_state = "walk"
        
        # Switch animation if state changed
        if anim_state != self.last_anim_state:
            # Idle is handled as a static sprite, not an animation
            if anim_state == "idle":
                self.current_anim = None  # No animation for idle
            elif self.animations and anim_state in self.animations:
                self.current_anim = self.animations[anim_state]
                self.current_anim.reset()
            self.last_anim_state = anim_state
    
    def jump(self):
        """Make the player jump"""
        if self.on_ground or self.coyote_timer > 0:
            self.velocity_y = -self.jump_force
            self.on_ground = False
            self.coyote_timer = 0  # Used up coyote time
            
            # Play jump sound
            if self.audio_manager:
                self.audio_manager.play_sound('jump')
    
    def attack(self):
        """Perform basic attack with combo system"""
        if self.attack_cooldown_timer <= 0 and not self.is_attacking:
            # Ensure hitbox is reset for normal attacks
            self.attack_hitbox.width = self.default_attack_width
            self.attack_hitbox.height = self.default_attack_height
            self.is_attacking = True
            self.attack_timer = self.attack_duration
            self.attack_cooldown_timer = self.attack_cooldown
            self.hit_enemies.clear()  # Clear hit tracking for new attack
            
            # Combo system
            if self.combo_timer > 0 and self.combo_count < self.max_combo:
                self.combo_count += 1
            else:
                self.combo_count = 1
            self.combo_timer = self.combo_window
            
            # Scale damage with combo
            combo_multiplier = 1 + (self.combo_count - 1) * 0.2
            self.current_attack_damage = int(self.attack_damage * combo_multiplier)
            
            # Play attack sound based on combo
            if self.audio_manager:
                self.audio_manager.play_attack_sound(self.combo_count)
                
                # Play combo sound on 3rd hit
                if self.combo_count == 3:
                    self.audio_manager.play_sound('combo', volume=0.6)
    
    def special_attack(self):
        """Perform Shadow Strike - fast dash attack"""
        if not self.is_attacking and self.on_ground:
            self.is_attacking = True
            self.is_shadow_striking = True
            self.attack_timer = self.shadow_strike_duration
            self.attack_cooldown_timer = self.attack_cooldown * 1.5  # Longer cooldown for special
            self.hit_enemies.clear()  # Clear hit tracking
            
            # Set dash velocity instead of instant teleport
            dash_speed = self.shadow_strike_speed
            if self.facing_right:
                self.velocity_x = dash_speed
            else:
                self.velocity_x = -dash_speed
            
            # Larger hitbox for special
            self.attack_hitbox.width = 80
            self.attack_hitbox.height = 60
            
            # Play shadow strike sound
            if self.audio_manager:
                self.audio_manager.play_sound('shadow_strike')
    
    def take_damage(self, damage):
        """Take damage from enemy"""
        if self.invulnerable_timer <= 0:  # Only take damage if not invulnerable
            self.health -= damage
            if self.health < 0:
                self.health = 0
            
            # Apply hit stun and invulnerability
            self.hit_stun_timer = 0.2
            self.invulnerable_timer = self.invulnerable_duration
            
            # Knockback
            self.velocity_x = -200 if self.facing_right else 200
            self.velocity_y = -300
            
            # Play hit sound
            if self.audio_manager:
                self.audio_manager.play_sound('player_hit')
    
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
        # Calculate screen position with smooth rounding
        screen_x = round(self.x - camera_x)
        screen_y = round(self.y)
        
        # Flicker during invulnerability
        if self.invulnerable_timer > 0:
            # Flash effect - skip rendering every other frame
            if int(self.invulnerable_timer * 20) % 2 == 0:
                return  # Don't render this frame
        
        # Get current animation frame
        # Handle idle as special case - static sprite with no animation
        if self.last_anim_state == "idle" and hasattr(self, 'idle_sprite'):
            # Use pre-cached sprite to avoid any transformations per frame
            sprite = self.idle_sprite_flipped if not self.facing_right else self.idle_sprite
        elif self.animations and self.current_anim:
            sprite = self.current_anim.get_current_frame()
            # Flip sprite if facing left
            if not self.facing_right:
                sprite = pygame.transform.flip(sprite, True, False)
        else:
            sprite = None
        
        if sprite:
            # Center sprite on player position
            sprite_rect = sprite.get_rect()
            sprite_rect.center = (screen_x + self.width // 2, screen_y + self.height // 2)
            screen.blit(sprite, sprite_rect)
        else:
            # Fallback to colored rectangle
            pygame.draw.rect(screen, self.color, (screen_x, screen_y, self.width, self.height))
            
            # Health indicator overlay
            if self.health < 30:
                overlay_color = RED if self.health < 15 else YELLOW
                overlay = pygame.Surface((self.width, self.height))
                overlay.set_alpha(100)
                overlay.fill(overlay_color)
                screen.blit(overlay, (screen_x, screen_y))
        
        # Direction indicator (for placeholder mode)
        if not self.animations:
            if self.facing_right:
                pygame.draw.circle(screen, BLACK, (screen_x + self.width - 10, screen_y + 20), 5)
            else:
                pygame.draw.circle(screen, BLACK, (screen_x + 10, screen_y + 20), 5)
        
        # Draw attack hitbox (debug - set to True to see hitboxes)
        if self.is_attacking and False:
            hitbox_screen_x = int(self.attack_hitbox.x - camera_x)
            pygame.draw.rect(screen, RED, 
                           (hitbox_screen_x, self.attack_hitbox.y, 
                            self.attack_hitbox.width, self.attack_hitbox.height), 2)
