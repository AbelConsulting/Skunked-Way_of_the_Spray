/**
 * Player character class
 */

class Player {
    constructor(x, y, audioManager) {
        // Position and movement
        this.x = x;
        this.y = y;
        this.audioManager = audioManager;
        this.width = 64;
        this.height = 64;

        // Character stats (Ninja Skunk)
        this.name = Config.CHARACTER.name;
        this.maxHealth = Config.CHARACTER.health;
        this.health = this.maxHealth;
        this.speed = Config.CHARACTER.speed;
        this.jumpForce = Config.CHARACTER.jump_force;
        this.attackDamage = Config.CHARACTER.attack_damage;
        this.specialAbility = Config.CHARACTER.special_ability;
        this.color = Config.CHARACTER.color;

        // Load sprites
        this.loadSprites();

        // Movement state
        this.velocityX = 0;
        this.velocityY = 0;
        this.targetVelocityX = 0;
        this.acceleration = 2500;
        this.friction = 1800;
        this.facingRight = true;
        this.onGround = false;

        // Jump mechanics
        this.coyoteTime = 0.15;
        this.coyoteTimer = 0;
        this.jumpBufferTime = 0.1;
        this.jumpBufferTimer = 0;

        // Combat state
        this.isAttacking = false;
        this.attackTimer = 0;
        this.attackDuration = 0.3;
        this.attackCooldown = 0.3;
        this.attackCooldownTimer = 0;
        this.defaultAttackWidth = 60;
        this.defaultAttackHeight = 40;
        this.attackHitbox = { x: 0, y: 0, width: this.defaultAttackWidth, height: this.defaultAttackHeight };
        this.hitEnemies = new Set();

        // Track previous-frame attack hitbox (used for swept collision checks)
        this._prevAttackHitbox = null;

        // Shadow strike state
        this.isShadowStriking = false;
        // Keep the move duration in sync with the animation timing.
        // Shadow Strike should have enough active frames to feel consistent.
        const shadowStrikeAnim = this.animations && this.animations.shadow_strike;
        this.shadowStrikeDuration = shadowStrikeAnim ? (shadowStrikeAnim.frameCount * shadowStrikeAnim.frameDuration) : 0.4;
        // Tune dash distance (speed * duration). With 4 frames @ 0.08s => 0.32s total.
        this.shadowStrikeSpeed = 380;

        // Shadow strike tuning: active damage window and hitbox size
        // Default: active on all frames except the first/last (windup/recovery)
        this.shadowStrikeHitboxWidth = 120;
        this.shadowStrikeHitboxHeight = 70;

        // Combo system
        this.comboCount = 0;
        this.comboWindow = 0.4;
        this.comboTimer = 0;
        this.maxCombo = 3;

        // Hit feedback
        this.hitStunTimer = 0;
        this.invulnerableTimer = 0;
        this.invulnerableDuration = 0.5;

        // Footstep sounds
        this.footstepTimer = 0;
        this.footstepInterval = 0.25; // Footstep every 0.25 seconds when walking

        // Health regeneration effect (applied by health regen pickups)
        this.healthRegen = null;

        // Animation state
        this.animationState = "IDLE";
        this.currentAnimation = null;

        // Input
        this.keys = {};

        // Attack stats hooks (consumed by Game for accuracy tracking)
        this._attackJustStarted = false;
        this._attackDidHit = false;
    }

    loadSprites() {
        const ninja_idle = spriteLoader.getSprite('ninja_idle');
        const ninja_walk = spriteLoader.getSprite('ninja_walk');
        const ninja_jump = spriteLoader.getSprite('ninja_jump');
                const ninja_attack = spriteLoader.getSprite('ninja_attack');
        const ninja_shadow_strike = spriteLoader.getSprite('ninja_shadow_strike');
        const ninja_hurt = spriteLoader.getSprite('ninja_hurt');

        // Use spriteLoader.createAnimation when available so frameStride can be
        // inferred from sheet dimensions (handles padding between frames).
        if (spriteLoader && typeof spriteLoader.createAnimation === 'function') {
            // Let the SpriteLoader infer frame width/stride (it can detect
            // per-sheet padding) instead of forcing a hardcoded value.
            this.animations = {
                idle: spriteLoader.createAnimation('ninja_idle', 4, 0.15),
                        walk: spriteLoader.createAnimation('ninja_walk', 4, 0.1),
                jump: spriteLoader.createAnimation('ninja_jump', 4, 0.12),
                        attack: spriteLoader.createAnimation('ninja_attack', 4, 0.08),
                // Shadow Strike: 4 frames, snappy timing.
                // Note: the current sheet is 256x64 (4x 64px frames) so we let
                // SpriteLoader infer correct slicing.
                shadow_strike: spriteLoader.createAnimation('ninja_shadow_strike', 4, 0.06),
                hurt: spriteLoader.createAnimation('ninja_hurt', 2, 0.1)
            };
        } else {
            this.animations = {
                idle: new Animation(ninja_idle, 4, 0.15, { frameWidth: 64, frameHeight: 64, frameStride: 65 }),
                        walk: new Animation(ninja_walk, 4, 0.1, { frameWidth: 64, frameHeight: 64, frameStride: 65 }),
                jump: new Animation(ninja_jump, 4, 0.12, { frameWidth: 64, frameHeight: 64, frameStride: 65 }),
                        attack: new Animation(ninja_attack, 4, 0.08, { frameWidth: 64, frameHeight: 64, frameStride: 65 }),
                    shadow_strike: new Animation(ninja_shadow_strike, 4, 0.06, { frameWidth: 64, frameHeight: 64, frameStride: 64, frameOffset: 0 }),
                hurt: new Animation(ninja_hurt, 2, 0.1, { frameWidth: 64, frameHeight: 64, frameStride: 65 })
            };
        }

        this.currentAnimation = this.animations.idle;
    }

    handleInput(key, isDown) {
        // Normalize key (accept both event.code and event.key forms)
        const k = (key || '').toString().toLowerCase();
        this.keys[k] = isDown;

        if (isDown) {
            if (k === 'space' || k === 'spacebar' || k === ' ') {
                this.jumpBufferTimer = this.jumpBufferTime;
            } else if (k === 'keyx' || k === 'x') {
                this.attack();
            } else if (k === 'keyz' || k === 'z') {
                this.specialAttack();
            }
        }
    }

    jump() {
        if ((this.onGround || this.coyoteTimer > 0) && this.hitStunTimer <= 0) {
            this.velocityY = -this.jumpForce;
            this.coyoteTimer = 0;
            if (this.audioManager) {
                this.audioManager.playSound('jump', 0.6);
            }
        }
    }

    attack() {
        if (this.attackCooldownTimer <= 0 && this.hitStunTimer <= 0) {
            this.isAttacking = true;
            this.isShadowStriking = false;
            this.attackTimer = this.attackDuration;
            this.attackCooldownTimer = this.attackCooldown;
            this.hitEnemies.clear();

            // Mark attack start for Game stats (count once per attack)
            this._attackJustStarted = true;
            this._attackDidHit = false;

            // Ensure hitbox is positioned immediately (not one frame later)
            this.attackHitbox.width = this.defaultAttackWidth;
            this.attackHitbox.height = this.defaultAttackHeight;
            this._updateAttackHitboxPosition();

            // Update combo
            if (this.comboTimer > 0) {
                this.comboCount = Math.min(this.comboCount + 1, this.maxCombo);
            } else {
                this.comboCount = 1;
            }
            this.comboTimer = this.comboWindow;

            if (this.audioManager && this.comboCount >= 2) {
                this.audioManager.playSound('combo_level_up', 0.55);
            }

            // Play attack sound
            if (this.audioManager) {
                const sounds = ['attack1', 'attack2', 'attack3'];
                const sound = sounds[(this.comboCount - 1) % 3];
                this.audioManager.playSound(sound, 0.7);
            }

            // Reset attack animation
            if (this.animations.attack) {
                this.animations.attack.reset();
            }
        }
    }

    specialAttack() {
        if (this.attackCooldownTimer <= 0 && this.hitStunTimer <= 0) {
            this.isAttacking = true;
            this.isShadowStriking = true;
            this.attackTimer = this.shadowStrikeDuration;
            this.attackCooldownTimer = this.attackCooldown * 1.5;
            this.hitEnemies.clear();

            // Mark attack start for Game stats (count once per attack)
            this._attackJustStarted = true;
            this._attackDidHit = false;

            // Enhanced hitbox for shadow strike
            this.attackHitbox.width = this.shadowStrikeHitboxWidth;
            this.attackHitbox.height = this.shadowStrikeHitboxHeight;
            this._updateAttackHitboxPosition();

            // Dash forward
            this.velocityX = this.facingRight ? this.shadowStrikeSpeed : -this.shadowStrikeSpeed;

            if (this.audioManager) {
                this.audioManager.playSound('shadow_strike', 0.8);
            }

            // Reset shadow strike animation
            if (this.animations.shadow_strike) {
                this.animations.shadow_strike.reset();
            }
        }
    }

    takeDamage(damage, source = null) {
        // Shadow Strike grants brief i-frames without the normal invuln flashing
        if (this.isShadowStriking) {
            return false;
        }
        if (this.invulnerableTimer <= 0) {
            this.health -= damage;
            this.invulnerableTimer = this.invulnerableDuration;
            this.hitStunTimer = 0.2;

            // Knockback
            if (source) {
                const knockbackDirection = this.x < source.x ? -1 : 1;
                this.velocityX = knockbackDirection * 300;
                this.velocityY = -200;
            }

            if (this.audioManager) {
                this.audioManager.playSound('player_hit', 0.8);
            }

            // Reset hurt animation
            if (this.animations.hurt) {
                this.animations.hurt.reset();
            }

            return this.health <= 0;
        }
        return false;
    }

    reset() {
        this.x = 100;
        this.y = 500;
        this.health = this.maxHealth;
        this.velocityX = 0;
        this.velocityY = 0;
        this.targetVelocityX = 0;
        this.comboCount = 0;
        this.hitStunTimer = 0;
        this.invulnerableTimer = 0;

        // Reset attack state and clear any stuck input (e.g., missed keyup
        // during transitions) so the player doesn't auto-run on respawn.
        this.isAttacking = false;
        this.isShadowStriking = false;
        this.attackTimer = 0;
        this.attackCooldownTimer = 0;
        try { this.hitEnemies && this.hitEnemies.clear && this.hitEnemies.clear(); } catch (e) {}
        this._prevAttackHitbox = null;
        this.clearInputState();
    }

    clearInputState() {
        // Clear held keys; used when focus is lost or levels transition.
        this.keys = {};
        this.targetVelocityX = 0;
    }

    update(dt, level) {
        // Snapshot prior attack hitbox for swept collision checks (important for dash attacks)
        if (this.isAttacking) {
            this._prevAttackHitbox = {
                x: this.attackHitbox.x,
                y: this.attackHitbox.y,
                width: this.attackHitbox.width,
                height: this.attackHitbox.height
            };
        } else {
            this._prevAttackHitbox = null;
        }

        // Update timers
        if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
        if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
        } else {
            this.comboCount = 0;
        }

        // Update health regeneration effect
        if (this.healthRegen) {
            this.healthRegen.timer += dt;
            const healAmount = this.healthRegen.hpPerSecond * dt;
            this.health = Math.min(this.maxHealth, this.health + healAmount);
            
            // Remove effect when duration expires
            if (this.healthRegen.timer >= this.healthRegen.duration) {
                this.healthRegen = null;
            }
        }

        if (this.hitStunTimer > 0) this.hitStunTimer -= dt;
        if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;

        // Update footstep timer
        if (this.footstepTimer > 0) this.footstepTimer -= dt;

        // Determine target velocity based on input
        this.targetVelocityX = 0;
        if (this.hitStunTimer <= 0) {
            if (this.keys['arrowleft'] || this.keys['a'] || this.keys['keya']) {
                this.targetVelocityX = -this.speed;
                if (!this.isAttacking) this.facingRight = false;
            }
            if (this.keys['arrowright'] || this.keys['d'] || this.keys['keyd']) {
                this.targetVelocityX = this.speed;
                if (!this.isAttacking) this.facingRight = true;
            }
        }

        // Smooth acceleration/deceleration
        if (this.targetVelocityX !== 0) {
            if (Math.abs(this.velocityX) < Math.abs(this.targetVelocityX)) {
                this.velocityX += (this.targetVelocityX / Math.abs(this.targetVelocityX)) * this.acceleration * dt;
                if (Math.abs(this.velocityX) > Math.abs(this.targetVelocityX)) {
                    this.velocityX = this.targetVelocityX;
                }
            } else {
                this.velocityX = this.targetVelocityX;
            }
        } else {
            if (Math.abs(this.velocityX) > 0 && !this.isShadowStriking) {
                const frictionAmount = this.friction * dt;
                if (Math.abs(this.velocityX) <= frictionAmount) {
                    this.velocityX = 0;
                } else {
                    this.velocityX -= (this.velocityX / Math.abs(this.velocityX)) * frictionAmount;
                }
            }
            if (Math.abs(this.velocityX) < 0.1) {
                this.velocityX = 0;
            }
        }

        const wasOnGround = this.onGround;

        // Apply gravity
        this.velocityY += Config.GRAVITY * dt;
        if (this.velocityY > Config.MAX_FALL_SPEED) {
            this.velocityY = Config.MAX_FALL_SPEED;
        }


        // Store previous rect before moving
        const prevRect = { x: this.x, y: this.y, width: this.width, height: this.height };

        // Update horizontal position
        if (Math.abs(this.velocityX) > 0) {
            this.x += this.velocityX * dt;
        }

        // Update vertical position
        this.y += this.velocityY * dt;

        // Check platform collisions (pass prevRect)
        // Preserve pre-collision vertical velocity so we can detect hard landings.
        const preCollisionVY = this.velocityY;
        const rect = { x: this.x, y: this.y, width: this.width, height: this.height };
        const collision = level.checkPlatformCollision(rect, prevRect, this.velocityY);

        if (collision.collided) {
            this.y = collision.landingY;
            this.velocityY = 0;
            this.onGround = true;
            
            // Play landing sound if falling from significant height.
            // Note: velocity is positive when falling (downwards).
            if (!wasOnGround && preCollisionVY > 450) {
                if (this.audioManager) this.audioManager.playSound('land', 0.6);
            }
        } else {
            this.onGround = false;
        }

        // Update coyote timer
        if (wasOnGround && !this.onGround) {
            this.coyoteTimer = this.coyoteTime;
        } else if (this.onGround) {
            this.coyoteTimer = 0;
        }

        // Play footstep sounds when walking on ground
        if (this.onGround && Math.abs(this.velocityX) > 50 && this.footstepTimer <= 0 && !this.isAttacking && !this.isShadowStriking) {
            if (this.audioManager) {
                this.audioManager.playSound('footstep', 0.3);
            }
            this.footstepTimer = this.footstepInterval;
        }

        // Handle jump buffering
        if (this.jumpBufferTimer > 0 && (this.onGround || this.coyoteTimer > 0)) {
            this.jump();
            this.jumpBufferTimer = 0;
        }

        // Update attack
        if (this.isAttacking) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
                this.isShadowStriking = false;
                this._attackDidHit = false;
                this.attackHitbox.width = this.defaultAttackWidth;
                this.attackHitbox.height = this.defaultAttackHeight;
                if (Math.abs(this.velocityX) > this.speed) {
                    this.velocityX = Utils.clamp(this.velocityX, -this.speed, this.speed);
                }
            }
        }

        if (this.attackCooldownTimer > 0) {
            this.attackCooldownTimer -= dt;
        }

        // Update attack hitbox position
        if (this.isAttacking) {
            this._updateAttackHitboxPosition();
        }

        // Update animations
        this.updateAnimation(dt);

        // Bounds checking
        this.x = Utils.clamp(this.x, 0, level.width - this.width);
    }

    updateAnimation(dt) {
        let newState = "idle";

        if (this.hitStunTimer > 0) {
            newState = "hurt";
        } else if (this.isShadowStriking) {
            newState = "shadow_strike";
        } else if (this.isAttacking) {
            newState = "attack";
        } else if (!this.onGround) {
            newState = "jump";
        } else if (Math.abs(this.velocityX) > 10) {
            newState = "walk";
        }

        if (newState !== this.animationState) {
            this.animationState = newState;
            this.currentAnimation = this.animations[newState];
            if (this.currentAnimation) {
                this.currentAnimation.reset();
            }
        }

        if (this.currentAnimation) {
            this.currentAnimation.update(dt);
        }
    }

    draw(ctx, cameraX = 0, cameraY = 0) {
        ctx.save();
        ctx.translate(-cameraX, -cameraY);

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, this.y + this.height, this.width / 2, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Flash when invulnerable
        if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 20) % 2 === 0) {
            ctx.restore();
            return;
        }

        // Draw sprite or colored rectangle
        if (this.currentAnimation) {
            this.currentAnimation.draw(ctx, this.x, this.y, this.width, this.height, !this.facingRight);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // Debug: draw collision boxes
        if (typeof Config !== 'undefined' && (Config.DEBUG || Config.SHOW_HITBOXES)) {
            // Player body
            ctx.strokeStyle = 'rgba(0, 180, 255, 0.65)';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);

            // Attack hitbox (only while attacking)
            if (this.isAttacking) {
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.55)';
                ctx.lineWidth = 2;
                ctx.strokeRect(this.attackHitbox.x, this.attackHitbox.y, this.attackHitbox.width, this.attackHitbox.height);

                // Shadow strike swept hitbox (helps visualize dash collisions)
                try {
                    const swept = (typeof this.getAttackHitboxForCollision === 'function') ? this.getAttackHitboxForCollision() : null;
                    if (swept && this.isShadowStriking) {
                        ctx.strokeStyle = 'rgba(180, 0, 255, 0.45)';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(swept.x, swept.y, swept.width, swept.height);
                    }
                } catch (e) {}
            }
        }

        ctx.restore();
    }

    getRect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    _updateAttackHitboxPosition() {
        const offsetX = this.facingRight ? this.width : -this.attackHitbox.width;
        this.attackHitbox.x = this.x + offsetX;
        this.attackHitbox.y = this.y + (this.height - this.attackHitbox.height) / 2;
    }

    isAttackDamageActive() {
        if (!this.isAttacking) return false;
        if (!this.isShadowStriking) return true;

        const anim = this.animations && this.animations.shadow_strike;
        if (anim && typeof anim.currentFrame === 'number' && typeof anim.frameCount === 'number') {
            // Active on all frames except first/last
            return anim.currentFrame > 0 && anim.currentFrame < (anim.frameCount - 1);
        }

        // Fallback: active for the middle 70% of the move
        const dur = this.shadowStrikeDuration || 0.4;
        const elapsed = dur - (this.attackTimer || 0);
        const t = Utils.clamp(elapsed / dur, 0, 1);
        return t >= 0.15 && t <= 0.85;
    }

    getAttackHitboxForCollision() {
        if (!this.isAttacking) return null;
        if (!this.isShadowStriking || !this._prevAttackHitbox) return this.attackHitbox;

        // Swept AABB: union of previous and current hitbox
        const x1 = Math.min(this._prevAttackHitbox.x, this.attackHitbox.x);
        const y1 = Math.min(this._prevAttackHitbox.y, this.attackHitbox.y);
        const x2 = Math.max(this._prevAttackHitbox.x + this._prevAttackHitbox.width, this.attackHitbox.x + this.attackHitbox.width);
        const y2 = Math.max(this._prevAttackHitbox.y + this._prevAttackHitbox.height, this.attackHitbox.y + this.attackHitbox.height);
        return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
    }
}
