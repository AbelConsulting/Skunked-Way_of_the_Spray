/**
 * Enemy character class
 */

class Enemy {
    constructor(x, y, enemyType = "BASIC", audioManager = null) {
        this.x = x;
        this.y = y;
        this.enemyType = enemyType;
        this.audioManager = audioManager;

        // Set size based on type
        if (enemyType === "BASIC") {
            this.width = 48;
            this.height = 48;
        } else if (enemyType === "FLYING") {
            this.width = 40;
            this.height = 40;
        } else if (enemyType === "BOSS") {
            this.width = 128;
            this.height = 128;
        } else {
            this.width = 50;
            this.height = 70;
        }

        // Load sprites
        this.loadSprites();

        // Stats
        this.health = Config.ENEMY_HEALTH;
        this.maxHealth = Config.ENEMY_HEALTH;
        this.speed = Config.ENEMY_SPEED;
        this.attackDamage = Config.ENEMY_ATTACK_DAMAGE;
        this.points = Config.ENEMY_POINTS;

        // Movement
        this.velocityX = -this.speed;
        this.velocityY = 0;
        this.facingRight = false;
        this.patrolRange = 200;
        this.startX = x;

        // Combat
        this.isAttacking = false;
        this.attackTimer = 0;
        this.attackDuration = 0.5;
        this.attackCooldown = 2.0;
        this.attackCooldownTimer = 0;
        this.attackRange = 80;
        this.attackHitbox = { x: 0, y: 0, width: 60, height: 40 };

        // Hit feedback
        this.hitStunTimer = 0;
        this.knockbackVelocityX = 0;

        // AI state
        this.state = "PATROL"; // PATROL, CHASE, ATTACK
        this.detectionRange = 300;

        // Animation
        this.currentAnimation = null;
        this.animationState = "idle";
    }

    loadSprites() {
        const prefix = this.enemyType === "BASIC" ? "basic" : 
                      this.enemyType === "FLYING" ? "fly" : "boss";

        const idle_sprite = spriteLoader.getSprite(`${prefix}_idle`);
        const walk_sprite = spriteLoader.getSprite(`${prefix}_walk`);
        const attack_sprite = spriteLoader.getSprite(`${prefix}_attack`);
        const hurt_sprite = spriteLoader.getSprite(`${prefix}_hurt`);

        this.animations = {
            idle: new Animation(idle_sprite, 4, 0.2),
            walk: new Animation(walk_sprite, 4, 0.15),
            attack: new Animation(attack_sprite, 4, 0.1),
            hurt: new Animation(hurt_sprite, 2, 0.1)
        };

        this.currentAnimation = this.animations.idle;
    }

    takeDamage(damage, knockbackDirection = 1) {
        this.health -= damage;
        this.hitStunTimer = 0.3;
        this.knockbackVelocityX = knockbackDirection * 200;

        if (this.audioManager) {
            if (this.health <= 0) {
                this.audioManager.playSound('enemy_death', 0.7);
            } else {
                this.audioManager.playSound('enemy_hit', 0.5);
            }
        }

        // Reset hurt animation
        if (this.animations.hurt) {
            this.animations.hurt.reset();
        }

        return this.health <= 0;
    }

    update(dt, player, level) {
        // Update timers
        if (this.hitStunTimer > 0) {
            this.hitStunTimer -= dt;
            // Apply knockback
            this.x += this.knockbackVelocityX * dt;
            this.knockbackVelocityX *= 0.9; // Friction
            if (Math.abs(this.knockbackVelocityX) < 1) {
                this.knockbackVelocityX = 0;
            }
        }

        if (this.attackCooldownTimer > 0) {
            this.attackCooldownTimer -= dt;
        }

        if (this.isAttacking) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
            }
        }

        // AI behavior (only if not stunned)
        if (this.hitStunTimer <= 0) {
            const distanceToPlayer = Math.abs(this.x - player.x);

            // Determine state
            if (distanceToPlayer < this.attackRange && this.attackCooldownTimer <= 0) {
                this.state = "ATTACK";
            } else if (distanceToPlayer < this.detectionRange) {
                this.state = "CHASE";
            } else {
                this.state = "PATROL";
            }

            // Execute state behavior
            switch (this.state) {
                case "PATROL":
                    this.patrol(dt);
                    break;
                case "CHASE":
                    this.chase(dt, player);
                    break;
                case "ATTACK":
                    this.attack(dt);
                    break;
            }
        }

        // Apply gravity
        this.velocityY += Config.GRAVITY * dt;
        if (this.velocityY > Config.MAX_FALL_SPEED) {
            this.velocityY = Config.MAX_FALL_SPEED;
        }

        // Update vertical position
        this.y += this.velocityY * dt;

        // Check platform collisions
        const rect = { x: this.x, y: this.y, width: this.width, height: this.height };
        const collision = level.checkPlatformCollision(rect, this.velocityY);

        if (collision.collided) {
            this.y = collision.landingY;
            this.velocityY = 0;
        }

        // Update attack hitbox
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

    patrol(dt) {
        // Move back and forth in patrol range
        this.x += this.velocityX * dt;

        if (this.x < this.startX - this.patrolRange) {
            this.velocityX = this.speed;
            this.facingRight = true;
        } else if (this.x > this.startX + this.patrolRange) {
            this.velocityX = -this.speed;
            this.facingRight = false;
        }
    }

    chase(dt, player) {
        // Move towards player
        if (this.x < player.x) {
            this.velocityX = this.speed;
            this.facingRight = true;
        } else {
            this.velocityX = -this.speed;
            this.facingRight = false;
        }

        this.x += this.velocityX * dt;
    }

    attack(dt) {
        // Stop moving and attack
        this.velocityX = 0;

        if (!this.isAttacking && this.attackCooldownTimer <= 0) {
            this.isAttacking = true;
            this.attackTimer = this.attackDuration;
            this.attackCooldownTimer = this.attackCooldown;

            // Reset attack animation
            if (this.animations.attack) {
                this.animations.attack.reset();
            }
        }
    }

    updateAnimation(dt) {
        let newState = "idle";

        if (this.hitStunTimer > 0) {
            newState = "hurt";
        } else if (this.isAttacking) {
            newState = "attack";
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
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, this.y + this.height, this.width / 2, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw sprite or colored rectangle
        if (this.currentAnimation) {
            this.currentAnimation.draw(ctx, this.x, this.y, this.width, this.height, !this.facingRight);
        } else {
            ctx.fillStyle = '#FF4444';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // Draw health bar
        const barWidth = this.width;
        const barHeight = 4;
        const barY = this.y - 10;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(this.x, barY, barWidth, barHeight);

        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#00FF00' : healthPercent > 0.25 ? '#FFFF00' : '#FF0000';
        ctx.fillRect(this.x, barY, barWidth * healthPercent, barHeight);

        ctx.restore();
    }

    getRect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}
