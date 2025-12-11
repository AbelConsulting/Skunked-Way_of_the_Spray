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

        // Shadow strike state
        this.isShadowStriking = false;
        this.shadowStrikeDuration = 0.25;
        this.shadowStrikeSpeed = 600;

        // Combo system
        this.comboCount = 0;
        this.comboWindow = 0.4;
        this.comboTimer = 0;
        this.maxCombo = 3;

        // Hit feedback
        this.hitStunTimer = 0;
        this.invulnerableTimer = 0;
        this.invulnerableDuration = 0.5;

        // Animation state
        this.animationState = "IDLE";
        this.currentAnimation = null;

        // Input
        this.keys = {};
    }

    loadSprites() {
        const ninja_idle = spriteLoader.getSprite('ninja_idle');
        const ninja_walk = spriteLoader.getSprite('ninja_walk');
        const ninja_jump = spriteLoader.getSprite('ninja_jump');
        const ninja_attack = spriteLoader.getSprite('ninja_attack');
        const ninja_shadow_strike = spriteLoader.getSprite('ninja_shadow_strike');
        const ninja_hurt = spriteLoader.getSprite('ninja_hurt');

        this.animations = {
            idle: new Animation(ninja_idle, 4, 0.15),
            walk: new Animation(ninja_walk, 6, 0.1),
            jump: new Animation(ninja_jump, 4, 0.12),
            attack: new Animation(ninja_attack, 6, 0.08),
            shadow_strike: new Animation(ninja_shadow_strike, 8, 0.05),
            hurt: new Animation(ninja_hurt, 2, 0.1)
        };

        this.currentAnimation = this.animations.idle;
    }

    handleInput(key, isDown) {
        this.keys[key] = isDown;

        if (isDown) {
            if (key === ' ' || key === 'Spacebar') {
                this.jumpBufferTimer = this.jumpBufferTime;
            } else if (key === 'x' || key === 'X') {
                this.attack();
            } else if (key === 'z' || key === 'Z') {
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

            // Update combo
            if (this.comboTimer > 0) {
                this.comboCount = Math.min(this.comboCount + 1, this.maxCombo);
            } else {
                this.comboCount = 1;
            }
            this.comboTimer = this.comboWindow;

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

            // Enhanced hitbox for shadow strike
            this.attackHitbox.width = 100;
            this.attackHitbox.height = 60;

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
        this.comboCount = 0;
        this.hitStunTimer = 0;
        this.invulnerableTimer = 0;
    }

    update(dt, level) {
        // Update timers
        if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
        if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
        } else {
            this.comboCount = 0;
        }
        if (this.hitStunTimer > 0) this.hitStunTimer -= dt;
        if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;

        // Determine target velocity based on input
        this.targetVelocityX = 0;
        if (this.hitStunTimer <= 0) {
            if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
                this.targetVelocityX = -this.speed;
                if (!this.isAttacking) this.facingRight = false;
            }
            if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
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

        // Update horizontal position
        if (Math.abs(this.velocityX) > 0) {
            this.x += this.velocityX * dt;
        }

        // Update vertical position
        this.y += this.velocityY * dt;

        // Check platform collisions
        const rect = { x: this.x, y: this.y, width: this.width, height: this.height };
        const collision = level.checkPlatformCollision(rect, this.velocityY);

        if (collision.collided) {
            this.y = collision.landingY;
            this.velocityY = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // Update coyote timer
        if (wasOnGround && !this.onGround) {
            this.coyoteTimer = this.coyoteTime;
        } else if (this.onGround) {
            this.coyoteTimer = 0;
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
                this.attackHitbox.width = this.defaultAttackWidth;
                this.attackHitbox.height = this.defaultAttackHeight;
                if (Math.abs(this.velocityX) > this.speed) {
                    this.velocityX = 0;
                }
            }
        }

        if (this.attackCooldownTimer > 0) {
            this.attackCooldownTimer -= dt;
        }

        // Update attack hitbox position
        if (this.isAttacking) {
            const offsetX = this.facingRight ? this.width : -this.attackHitbox.width;
            this.attackHitbox.x = this.x + offsetX;
            this.attackHitbox.y = this.y + (this.height - this.attackHitbox.height) / 2;
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

    draw(ctx, cameraX = 0) {
        ctx.save();
        ctx.translate(-cameraX, 0);

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
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

        // Debug: draw hitbox
        if (this.isAttacking) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.strokeRect(this.attackHitbox.x, this.attackHitbox.y, this.attackHitbox.width, this.attackHitbox.height);
        }

        ctx.restore();
    }

    getRect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}
