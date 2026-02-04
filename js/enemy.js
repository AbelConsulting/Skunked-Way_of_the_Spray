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
        if (enemyType === "BASIC" || enemyType === "FAST_BASIC" || enemyType === "SECOND_BASIC") {
            this.width = 48;
            this.height = 48;
        } else if (enemyType === "FLYING") {
            this.width = 40;
            this.height = 40;
        } else if (enemyType === "BOSS" || enemyType === "BOSS2" || enemyType === "BOSS3" || enemyType === "BOSS4") {
            this.width = 128;
            this.height = 128;
        } else {
            this.width = 50;
            this.height = 70;
        }

        // Load sprites
        this.loadSprites();

        // Stats
        if (this.enemyType === "FAST_BASIC") {
            this.health = Math.floor(Config.ENEMY_HEALTH * 0.8); // 80% health
            this.maxHealth = this.health;
            this.speed = Config.ENEMY_SPEED * 1.5; // 50% faster
            this.attackDamage = Config.ENEMY_ATTACK_DAMAGE;
            this.points = Math.floor(Config.ENEMY_POINTS * 1.2); // 20% more points
        } else if (this.enemyType === "SECOND_BASIC") {
            this.health = Math.floor(Config.ENEMY_HEALTH * 1.5); // 150% health
            this.maxHealth = this.health;
            this.speed = Config.ENEMY_SPEED * 0.7; // 30% slower
            this.attackDamage = Config.ENEMY_ATTACK_DAMAGE;
            this.points = Math.floor(Config.ENEMY_POINTS * 1.5); // 50% more points
        } else {
            this.health = Config.ENEMY_HEALTH;
            this.maxHealth = Config.ENEMY_HEALTH;
            this.speed = Config.ENEMY_SPEED;
            this.attackDamage = Config.ENEMY_ATTACK_DAMAGE;
            this.points = Config.ENEMY_POINTS;
        }

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
        // Small windup before the hitbox becomes damaging (fair reaction time)
        this.attackWindup = 0.18;
        this.attackCooldown = 2.0;
        this.attackCooldownTimer = 0;
        this.attackRange = 80;
        this.attackHitbox = { x: 0, y: 0, width: 60, height: 40 };

        // Type-specific combat tuning (kept conservative)
        const isBossType = (this.enemyType === 'BOSS' || this.enemyType === 'BOSS2' || this.enemyType === 'BOSS3' || this.enemyType === 'BOSS4');
        if (isBossType) {
            this.attackRange = 120;
            this.attackDuration = 0.65;
            this.attackWindup = 0.26;
            this.attackCooldown = 1.6;
            this.attackHitbox = { x: 0, y: 0, width: 120, height: 80 };
        }

        // Hit feedback
        this.hitStunTimer = 0;
        this.knockbackVelocityX = 0;

        // AI state
        this.state = "PATROL"; // PATROL, CHASE, ATTACK
        this.detectionRange = 300;

        // Animation
        this.currentAnimation = null;
        this.animationState = "idle";
        
        // Skunk effect state
        this.isSkunked = false;
        this.skunkTimer = 0;
        this.skunkDuration = 5.0; // 5 seconds of being disabled
        this.skunkParticles = [];
    }

    loadSprites() {
          const prefix = (this.enemyType === "BASIC" || this.enemyType === "FAST_BASIC") ? "basic" : 
              this.enemyType === "SECOND_BASIC" ? "second" :
              this.enemyType === "FLYING" ? "fly" :
              this.enemyType === "BOSS2" ? "boss2" :
              this.enemyType === "BOSS3" ? "boss3" :
              this.enemyType === "BOSS4" ? "boss4" : "boss";

        const getSpriteKeySafe = (key, fallbackKey = null) => {
            try {
                if (typeof spriteLoader !== 'undefined' && spriteLoader.getSprite) {
                    let spr = spriteLoader.getSprite(key);
                    if (spr) return { key, sprite: spr };
                    if (fallbackKey) {
                        spr = spriteLoader.getSprite(fallbackKey);
                        if (spr) return { key: fallbackKey, sprite: spr };
                    }
                }
            } catch (e) {}
            return { key, sprite: null };
        };

        const makeAnim = (resolved, frameCount, frameDuration) => {
            try {
                if (resolved && resolved.key && typeof spriteLoader !== 'undefined' && spriteLoader.createAnimation) {
                    return spriteLoader.createAnimation(resolved.key, frameCount, frameDuration);
                }
            } catch (e) {}
            return new Animation(resolved ? resolved.sprite : null, frameCount, frameDuration);
        };

        const fallbackPrefix = (prefix === 'boss4') ? 'boss3' : (prefix === 'boss3') ? 'boss2' : (prefix === 'boss2') ? 'boss' : null;
        const idle_sprite = getSpriteKeySafe(`${prefix}_idle`, fallbackPrefix ? `${fallbackPrefix}_idle` : null);
        const walk_sprite = getSpriteKeySafe(`${prefix}_walk`, fallbackPrefix ? `${fallbackPrefix}_walk` : null);
        
        // Handle naming variance for boss
        const attackName = (prefix === 'boss') ? 'boss_attack1'
            : (prefix === 'boss2') ? 'boss2_attack'
            : (prefix === 'boss3') ? 'boss3_attack'
            : (prefix === 'boss4') ? 'boss4_attack'
            : `${prefix}_attack`;
        const fallbackAttack = fallbackPrefix
            ? (fallbackPrefix === 'boss') ? 'boss_attack1'
            : (fallbackPrefix === 'boss2') ? 'boss2_attack'
            : (fallbackPrefix === 'boss3') ? 'boss3_attack'
            : null
            : null;
        const attack_sprite = getSpriteKeySafe(attackName, fallbackAttack);
        
        const hurt_sprite = getSpriteKeySafe(`${prefix}_hurt`, fallbackPrefix ? `${fallbackPrefix}_hurt` : null);

        // Some enemy sets (boss) don't have a dedicated hurt sheet.
        // Fall back to the idle sheet to avoid missing animations.
        const isBossType = (this.enemyType === 'BOSS' || this.enemyType === 'BOSS2' || this.enemyType === 'BOSS3' || this.enemyType === 'BOSS4');
        const isBasicType = (this.enemyType === 'BASIC' || this.enemyType === 'FAST_BASIC');
        const hurtFrames = (isBossType || isBasicType) ? 4 : 2;
        const hurtAnim = (hurt_sprite && hurt_sprite.sprite)
            ? makeAnim(hurt_sprite, hurtFrames, 0.1)
            : makeAnim(idle_sprite, 4, 0.12);

        this.animations = {
            idle: makeAnim(idle_sprite, 4, 0.2),
            walk: makeAnim(walk_sprite, 4, 0.15),
            attack: makeAnim(attack_sprite, 4, 0.1),
            hurt: hurtAnim
        };

        this.currentAnimation = this.animations.idle;
    }

    takeDamage(damage, knockbackDirection = 1, opts = null) {
        this.health -= damage;

        // Backwards compatible signature:
        // - takeDamage(damage, dir)
        // - takeDamage(damage, dir, { knockback: number, hitStun: number })
        // - takeDamage(damage, dir, knockbackNumber)
        let knockback = 200;
        let hitStun = 0.3;
        if (typeof opts === 'number') {
            knockback = opts;
        } else if (opts && typeof opts === 'object') {
            if (typeof opts.knockback === 'number') knockback = opts.knockback;
            if (typeof opts.hitStun === 'number') hitStun = opts.hitStun;
        }

        this.hitStunTimer = hitStun;
        this.knockbackVelocityX = knockbackDirection * knockback;

        if (this.audioManager) {
            if (this.health <= 0) {
                // For bosses, let the Game logic play the big defeat sting.
                if (this.enemyType !== 'BOSS' && this.enemyType !== 'BOSS2' && this.enemyType !== 'BOSS3' && this.enemyType !== 'BOSS4') {
                    this.audioManager.playSound('enemy_death', 0.7);
                }
            } else {
                // Boss-specific hurt sound
                if (this.enemyType === 'BOSS') {
                    this.audioManager.playSound('boss_hurt', 0.6);
                } else if (this.enemyType === 'BOSS2' || this.enemyType === 'BOSS3' || this.enemyType === 'BOSS4') {
                    this.audioManager.playSound('boss2_hurt', 0.6);
                } else {
                    const rate = 0.94 + Math.random() * 0.12; // 0.94..1.06
                    this.audioManager.playSound('enemy_hit', { volume: 0.5, rate });
                }
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

        // Update skunk effect
        if (this.isSkunked) {
            this.skunkTimer -= dt;
            if (this.skunkTimer <= 0) {
                this.isSkunked = false;
                this.skunkParticles = [];
            } else {
                // Generate green particles
                if (Math.random() < 0.3) {
                    this.skunkParticles.push({
                        x: this.x + Math.random() * this.width,
                        y: this.y + Math.random() * this.height,
                        vx: (Math.random() - 0.5) * 30,
                        vy: -20 - Math.random() * 30,
                        life: 1.0,
                        age: 0,
                        size: 3 + Math.random() * 4
                    });
                }
                // Update particles
                for (let i = this.skunkParticles.length - 1; i >= 0; i--) {
                    const p = this.skunkParticles[i];
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.age += dt;
                    if (p.age >= p.life) {
                        this.skunkParticles.splice(i, 1);
                    }
                }
            }
        }
        
        // AI behavior (only if not stunned or skunked)
        if (this.hitStunTimer <= 0 && !this.isSkunked) {
            const playerRect = (player && typeof player.getRect === 'function')
                ? player.getRect()
                : { x: player.x, y: player.y, width: player.width || 0, height: player.height || 0 };
            const enemyRect = this.getRect();

            // Horizontal gap between rect edges (0 if overlapping)
            const enemyRight = enemyRect.x + enemyRect.width;
            const playerRight = playerRect.x + playerRect.width;
            let horizontalGap = 0;
            if (enemyRight < playerRect.x) horizontalGap = playerRect.x - enemyRight;
            else if (playerRight < enemyRect.x) horizontalGap = enemyRect.x - playerRight;

            // Only attack if the player is roughly on the same vertical band.
            const verticalSlack = 50;
            const verticallyAligned =
                (playerRect.y < (enemyRect.y + enemyRect.height + verticalSlack)) &&
                ((playerRect.y + playerRect.height) > (enemyRect.y - verticalSlack));

            // Determine state
            if (verticallyAligned && horizontalGap < this.attackRange && this.attackCooldownTimer <= 0) {
                this.state = "ATTACK";
            } else if (horizontalGap < this.detectionRange) {
                this.state = "CHASE";
            } else {
                this.state = "PATROL";
            }

            // Execute state behavior
            switch (this.state) {
                case "PATROL":
                    this.patrol(dt, level);
                    break;
                case "CHASE":
                    this.chase(dt, player, level);
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


        // Store previous rect before moving
        const prevRect = { x: this.x, y: this.y, width: this.width, height: this.height };

        // Update vertical position
        this.y += this.velocityY * dt;

        // Check platform collisions (pass prevRect)
        const rect = { x: this.x, y: this.y, width: this.width, height: this.height };
        const collision = level.checkPlatformCollision(rect, prevRect, this.velocityY);

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

    patrol(dt, level) {
        // Defensive: ensure level is provided (safeguard for older builds/clients)
        if (!level) {
            try {
                if (typeof console !== 'undefined' && console.warn) console.warn('Enemy.patrol called without level; attempting fallback to window.game.level.');
                // Try fallback to global game-level if available (emergency mitigation for older cached clients)
                level = (typeof window !== 'undefined' && window.game && window.game.level) ? window.game.level : null;

                if (!level) {
                    // No fallback available — record telemetry and return
                    window._enemyPatrolMissingLevelCount = (window._enemyPatrolMissingLevelCount || 0) + 1;

                    // Lazily install a reporter to aggregate and send counts infrequently
                    if (!window._reportEnemyPatrolMissingLevel) {
                        window._reportEnemyPatrolMissingLevel = function(sendNow = false) {
                            try {
                                const cnt = window._enemyPatrolMissingLevelCount || 0;
                                if (cnt <= 0 && !sendNow) return;
                                const payload = { ts: Date.now(), event: 'enemy.patrol_missing_level', count: cnt, ua: (navigator && navigator.userAgent) ? navigator.userAgent : '' };
                                const body = JSON.stringify({ logs: [payload] });
                                // Prefer sendBeacon for reliability during unload
                                if (navigator && typeof navigator.sendBeacon === 'function') {
                                    try { navigator.sendBeacon('/__touch_log', body); } catch (e) { /* ignore */ }
                                } else {
                                    try { fetch('/__touch_log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).catch(()=>{}); } catch (e) {}
                                }
                            } catch (e) {}
                            // Reset counter after attempt
                            window._enemyPatrolMissingLevelCount = 0;
                        };

                        // Periodically send aggregated counts (every 60s)
                        try { window._reportEnemyPatrolMissingLevelTimer = setInterval(() => { try { window._reportEnemyPatrolMissingLevel(); } catch (e) {} }, 60000); } catch (e) {}

                        // Ensure a final send on unload
                        try { window.addEventListener('beforeunload', () => { try { window._reportEnemyPatrolMissingLevel(true); } catch (e) {} }); } catch (e) {}

                        // Kick off a short delayed send so low-frequency occurrences are reported quickly
                        try { setTimeout(() => { try { window._reportEnemyPatrolMissingLevel(); } catch (e) {} }, 10000); } catch (e) {}
                    }
                    return;
                } else {
                    if (typeof console !== 'undefined' && console.log) console.log('Enemy.patrol: used fallback window.game.level');
                }
            } catch (e) {}
        }

        const nextX = this.x + this.velocityX * dt;
        const avoidLedges = (typeof Config !== 'undefined' && Config && Config.ENEMY_AVOID_LEDGES === true);
        if (avoidLedges) {
            // Check for ledge before moving
            if (!this.checkGround(nextX, this.y, level)) {
                // Turn around if no ground ahead
                this.velocityX = -this.velocityX;
                this.facingRight = !this.facingRight;
            } else {
                // Move if safe
                this.x = nextX;
            }
        } else {
            // Default: allow enemies to run/fall off ledges.
            this.x = nextX;
        }

        // Check patrol range
        if (this.x < this.startX - this.patrolRange) {
            this.velocityX = this.speed;
            this.facingRight = true;
        } else if (this.x > this.startX + this.patrolRange) {
            this.velocityX = -this.speed;
            this.facingRight = false;
        }
    }

    chase(dt, player, level) {
        // Move towards player (prefer center-to-center direction)
        const playerCenterX = (player.x || 0) + (player.width || 0) * 0.5;
        const enemyCenterX = this.x + this.width * 0.5;

        if (enemyCenterX < playerCenterX) {
            this.velocityX = this.speed;
            this.facingRight = true;
        } else {
            this.velocityX = -this.speed;
            this.facingRight = false;
        }

        const nextX = this.x + this.velocityX * dt;
        const avoidLedges = (typeof Config !== 'undefined' && Config && Config.ENEMY_AVOID_LEDGES === true);
        if (avoidLedges && level && typeof this.checkGround === 'function') {
            // Optional: avoid chasing off ledges.
            if (this.checkGround(nextX, this.y, level)) {
                this.x = nextX;
            } else {
                this.velocityX = 0;
            }
        } else {
            // Default: allow enemies to run/fall off ledges.
            this.x = nextX;
        }
        
        // Jump logic: Jump if player is significantly above us and we're on ground
        const playerCenterY = (player.y || 0) + (player.height || 0) * 0.5;
        const enemyCenterY = this.y + this.height * 0.5;
        const verticalDiff = enemyCenterY - playerCenterY; // positive if player is above
        const horizontalDist = Math.abs(playerCenterX - enemyCenterX);
        
        // Check if on ground (velocityY ~= 0 and collision below)
        const isGrounded = Math.abs(this.velocityY) < 1;
        
        // Jump if: player is above us, we're reasonably close horizontally, and we're on ground
        if (isGrounded && verticalDiff > 50 && horizontalDist < 250) {
            // Jump with reduced force compared to player
            const jumpForce = Config.CHARACTER.jump_force * 0.7; // 70% of player jump
            this.velocityY = -jumpForce;
            
            // Play jump sound occasionally
            if (this.audioManager && Math.random() < 0.3) {
                this.audioManager.playSound('jump', { volume: 0.4, rate: 0.85 });
            }
        }
    }

    attack(dt) {
        // Stop moving and attack
        this.velocityX = 0;

        if (!this.isAttacking && this.attackCooldownTimer <= 0) {
            this.isAttacking = true;
            this.attackTimer = this.attackDuration;
            this.attackCooldownTimer = this.attackCooldown;

            // Play attack sound
            if (this.audioManager) {
                if (this.enemyType === 'BOSS') {
                    this.audioManager.playSound('boss_attack', 0.7);
                } else if (this.enemyType === 'BOSS2' || this.enemyType === 'BOSS3' || this.enemyType === 'BOSS4') {
                    this.audioManager.playSound('boss2_attack', 0.7);
                } else {
                     this.audioManager.playSound('enemy_attack', 0.5);
                }
            }

            // Reset attack animation
            if (this.animations.attack) {
                this.animations.attack.reset();
            }
        }
    }

    isAttackDamageActive() {
        if (!this.isAttacking) return false;
        const dur = this.attackDuration || 0;
        if (dur <= 0) return false;

        const elapsed = dur - (this.attackTimer || 0);
        // Active after windup; end slightly before the final frame to avoid “late” hits.
        const windup = Math.max(0, this.attackWindup || 0);
        const endEarly = 0.06;
        return elapsed >= windup && elapsed <= Math.max(0, dur - endEarly);
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

    draw(ctx, cameraX = 0, cameraY = 0) {
        ctx.save();
        ctx.translate(-cameraX, -cameraY);

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, this.y + this.height, this.width / 2, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw sprite or colored rectangle
        if (this.currentAnimation) {
            this.currentAnimation.draw(ctx, this.x, this.y, this.width, this.height, this.facingRight);
        } else {
            ctx.fillStyle = '#FF4444';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        // Draw green skunk effect overlay if skunked
        if (this.isSkunked) {
            // Green tint overlay
            ctx.save();
            ctx.globalAlpha = 0.4 + Math.sin(Date.now() / 150) * 0.2;
            ctx.fillStyle = '#40FF40';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.restore();
            
            // Draw skunk particles
            if (this.skunkParticles && this.skunkParticles.length > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                for (const p of this.skunkParticles) {
                    const alpha = 1 - (p.age / p.life);
                    ctx.globalAlpha = alpha * 0.8;
                    
                    const pGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                    pGrad.addColorStop(0, '#80FF80');
                    pGrad.addColorStop(0.5, '#40FF40');
                    pGrad.addColorStop(1, 'rgba(80, 255, 80, 0)');
                    ctx.fillStyle = pGrad;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
            
            // Draw "stunned" indicator above enemy
            ctx.save();
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = '#40FF40';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            const textX = this.x + this.width / 2;
            const textY = this.y - 5;
            ctx.strokeText('💫', textX, textY);
            ctx.fillText('💫', textX, textY);
            ctx.restore();
        }

        // Attack range FX (subtle overlay, not a hitbox)
        if (this.isAttacking && this.attackHitbox && !(typeof Config !== 'undefined' && Config.SHOW_HITBOXES)) {
            try {
                const hb = this.attackHitbox;
                const fxX = hb.x;
                const fxY = hb.y;
                const fxW = hb.width;
                const fxH = hb.height;
                const grad = ctx.createLinearGradient(fxX, fxY, fxX + fxW, fxY + fxH);
                grad.addColorStop(0, 'rgba(120, 255, 140, 0.12)');
                grad.addColorStop(1, 'rgba(60, 220, 120, 0.22)');
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = grad;
                const r = Math.max(4, Math.min(10, Math.floor(fxH * 0.2)));
                ctx.beginPath();
                ctx.moveTo(fxX + r, fxY);
                ctx.lineTo(fxX + fxW - r, fxY);
                ctx.quadraticCurveTo(fxX + fxW, fxY, fxX + fxW, fxY + r);
                ctx.lineTo(fxX + fxW, fxY + fxH - r);
                ctx.quadraticCurveTo(fxX + fxW, fxY + fxH, fxX + fxW - r, fxY + fxH);
                ctx.lineTo(fxX + r, fxY + fxH);
                ctx.quadraticCurveTo(fxX, fxY + fxH, fxX, fxY + fxH - r);
                ctx.lineTo(fxX, fxY + r);
                ctx.quadraticCurveTo(fxX, fxY, fxX + r, fxY);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } catch (e) {}
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

        // Debug: draw collision boxes
        if (typeof Config !== 'undefined' && (Config.DEBUG || Config.SHOW_HITBOXES)) {
            // Enemy body
            ctx.strokeStyle = 'rgba(255, 140, 0, 0.6)';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);

            // Enemy attack hitbox (only while attacking)
            if (this.isAttacking && this.attackHitbox) {
                ctx.strokeStyle = 'rgba(255, 0, 255, 0.45)';
                ctx.lineWidth = 2;
                ctx.strokeRect(this.attackHitbox.x, this.attackHitbox.y, this.attackHitbox.width, this.attackHitbox.height);
            }
        }

        ctx.restore();
    }

    checkGround(x, y, level) {
        // Check if there's a platform that would support standing at this position
        // Create a small test rectangle at the bottom of the enemy
        const testRect = {
            x: x,
            y: y + this.height - 1, // Just below the enemy's feet
            width: this.width,
            height: 2 // Small height to check for platform intersection
        };

        // Check collision with all platforms
        for (const platform of level.platforms) {
            if (Utils.rectCollision(testRect, platform)) {
                return true;
            }
        }
        return false;
    }

    getRect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}
