/**
 * Enemy character class
 */

// Enemy type configuration lookup table - centralizes all type-specific settings
const ENEMY_TYPE_CONFIG = {
    'BASIC': { prefix: 'basic', size: { width: 48, height: 48 }, fallback: null },
    'FAST_BASIC': { prefix: 'basic', size: { width: 48, height: 48 }, fallback: null },
    'SECOND_BASIC': { prefix: 'second', size: { width: 48, height: 48 }, fallback: 'basic' },
    'THIRD_BASIC': { prefix: 'third', size: { width: 48, height: 48 }, fallback: 'second' },
    'FOURTH_BASIC': { prefix: 'fourth', size: { width: 48, height: 48 }, fallback: 'third' },
    'FLYING': { prefix: 'fly', size: { width: 40, height: 40 }, fallback: null },
    'BOSS': { prefix: 'boss', size: { width: 128, height: 128 }, fallback: null, attackAnim: 'boss_attack1' },
    'BOSS2': { prefix: 'boss2', size: { width: 128, height: 128 }, fallback: 'boss', attackAnim: 'boss2_attack' },
    'BOSS3': { prefix: 'boss3', size: { width: 128, height: 128 }, fallback: 'boss2', attackAnim: 'boss3_attack' },
    'BOSS4': { prefix: 'boss4', size: { width: 128, height: 128 }, fallback: 'boss3', attackAnim: 'boss4_attack' }
};

class Enemy {
    constructor(x, y, enemyType = "BASIC", audioManager = null) {
        this.x = x;
        this.y = y;
        this.enemyType = enemyType;
        this.audioManager = audioManager;

        // Get configuration for this enemy type
        const config = ENEMY_TYPE_CONFIG[enemyType] || ENEMY_TYPE_CONFIG['BASIC'];
        this.width = config.size.width;
        this.height = config.size.height;

        // Stats
        if (this.enemyType === "FAST_BASIC") {
            this.health = Math.floor(Config.ENEMY_HEALTH * 0.8); // 80% health
            this.maxHealth = this.health;
            this.speed = Config.ENEMY_SPEED * 1.5; // 50% faster
            this.attackDamage = Math.floor(Config.ENEMY_ATTACK_DAMAGE * 0.8); // Fast but weaker hits
            this.points = Math.floor(Config.ENEMY_POINTS * 1.2); // 20% more points
        } else if (this.enemyType === "SECOND_BASIC") {
            this.health = Math.floor(Config.ENEMY_HEALTH * 1.5); // 150% health
            this.maxHealth = this.health;
            this.speed = Config.ENEMY_SPEED * 0.7; // 30% slower
            this.attackDamage = Math.floor(Config.ENEMY_ATTACK_DAMAGE * 1.3); // Tanky, hits hard
            this.points = Math.floor(Config.ENEMY_POINTS * 1.5); // 50% more points
        } else if (this.enemyType === "THIRD_BASIC") {
            // Kamikaze / Exploder: low health, fast rush, detonates near player or on death
            this.health = Math.floor(Config.ENEMY_HEALTH * 0.5); // Fragile
            this.maxHealth = this.health;
            this.speed = Config.ENEMY_SPEED * 2.0; // Fast base
            this.attackDamage = Math.floor(Config.ENEMY_ATTACK_DAMAGE * 0.6); // Weak melee, explosion is the threat
            this.points = Math.floor(Config.ENEMY_POINTS * 2.0); // Reward for dealing with threat
        } else if (this.enemyType === "FOURTH_BASIC") {
            this.health = Math.floor(Config.ENEMY_HEALTH * 1.2); // Slightly more health
            this.maxHealth = this.health;
            this.speed = 0; // No horizontal movement
            this.attackDamage = Math.floor(Config.ENEMY_ATTACK_DAMAGE * 1.5); // Stationary but punishing
            this.points = Math.floor(Config.ENEMY_POINTS * 2.0); // High reward for unique threat
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
        if (this.isBossType()) {
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
        this._spriteLoadAttempts = 0; // Track sprite loading attempts (allow multiple tries)
        this._maxSpriteLoadAttempts = 60; // Try for ~1 second at 60fps
        
        // Kamikaze / Exploder state (THIRD_BASIC)
        this.isExploding = false;      // Currently in detonation sequence
        this.fuseTimer = 0;            // Fuse countdown before dash phase
        this.hasDetonated = false;      // Prevent double-detonation
        this.explosionParticles = [];   // Visual explosion particles
        this.explosionAge = 0;          // For drawing the fading explosion
        this.explosionDuration = 0.9;   // How long explosion visual lasts (longer for impact)
        // Kamikaze phase state machine: 'FOLLOW' -> 'FUSE' -> 'DASH' -> detonated
        this.kamikazePhase = 'FOLLOW';  // Current phase
        this.dashTimer = 0;            // How long the dash has been going
        this.fuseSoundPlayed = false;   // Whether the fuse ignition sound played

        // Skunk effect state
        this.isSkunked = false;
        this.skunkTimer = 0;
        this.skunkDuration = 5.0; // 5 seconds of being disabled
        this.skunkParticles = [];
        // Third basic rush sparks (visual only)
        this.rushSparks = [];
        // Fourth basic jump sparks (green)
        this.jumpSparks = [];
        this.jumpCount = 0; // Track multi-jump
        this.maxJumps = 5; // Allow up to 5 consecutive jumps
        this.jumpCooldown = 0; // Cooldown between jump attempts
        this._jumpTrailTimer = 0; // Airborne trail particle timer
        this._lastJumpY = 0; // Y position of last jump for ring effect

        // Load sprites AFTER all fields are initialised so loadSprites()
        // can safely set this.currentAnimation without it being overwritten.
        this.loadSprites();
    }

    /**
     * Check if this enemy is a boss type
     */
    isBossType() {
        return this.enemyType === 'BOSS' || this.enemyType === 'BOSS2' || 
               this.enemyType === 'BOSS3' || this.enemyType === 'BOSS4';
    }

    /**
     * Check if this enemy is a basic type (including variants)
     */
    isBasicType() {
        return this.enemyType === 'BASIC' || this.enemyType === 'FAST_BASIC' ||
               this.enemyType === 'SECOND_BASIC' || this.enemyType === 'THIRD_BASIC' ||
               this.enemyType === 'FOURTH_BASIC';
    }

    loadSprites() {
        // Validate spriteLoader is ready
        if (!spriteLoader || !spriteLoader.sprites) {
            if (Config.DEBUG) console.warn('Enemy.loadSprites: spriteLoader not ready for', this.enemyType);
            return;
        }

        // Get sprite prefix from config
        const config = ENEMY_TYPE_CONFIG[this.enemyType] || ENEMY_TYPE_CONFIG['BASIC'];
        const prefix = config.prefix;
        const fallbackPrefix = config.fallback ? ENEMY_TYPE_CONFIG[config.fallback]?.prefix : null;

        const getSpriteKeySafe = (key, fallbackKey = null) => {
            const sprite = spriteLoader.getSprite(key);
            if (sprite) return { key, sprite };
            
            if (fallbackKey) {
                const fallback = spriteLoader.getSprite(fallbackKey);
                if (fallback) {
                    if (Config.DEBUG) {
                        console.warn(`Enemy sprite ${key} missing for ${this.enemyType}, using fallback ${fallbackKey}`);
                    }
                    return { key: fallbackKey, sprite: fallback };
                }
            }
            
            if (Config.DEBUG) {
                console.error(`Enemy sprite ${key} not found for ${this.enemyType}, no valid fallback`);
            }
            return { key, sprite: null };
        };

        const makeAnim = (resolved, frameCount, frameDuration) => {
            if (resolved && resolved.key && spriteLoader.createAnimation) {
                return spriteLoader.createAnimation(resolved.key, frameCount, frameDuration);
            }
            return new Animation(resolved ? resolved.sprite : null, frameCount, frameDuration);
        };

        const idle_sprite = getSpriteKeySafe(`${prefix}_idle`, fallbackPrefix ? `${fallbackPrefix}_idle` : null);
        const walk_sprite = getSpriteKeySafe(`${prefix}_walk`, fallbackPrefix ? `${fallbackPrefix}_walk` : null);
        
        // Get attack animation name (bosses have special naming)
        const attackName = config.attackAnim || `${prefix}_attack`;
        const fallbackAttackName = fallbackPrefix ? 
            (ENEMY_TYPE_CONFIG[config.fallback]?.attackAnim || `${fallbackPrefix}_attack`) : null;
        const attack_sprite = getSpriteKeySafe(attackName, fallbackAttackName);
        
        const hurt_sprite = getSpriteKeySafe(`${prefix}_hurt`, fallbackPrefix ? `${fallbackPrefix}_hurt` : null);

        // Some enemy sets (boss) don't have a dedicated hurt sheet.
        // Fall back to the idle sheet to avoid missing animations.
        const hurtFrames = (this.isBossType() || this.isBasicType()) ? 4 : 2;
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
        
        // Check if sprites actually loaded successfully
        if (this.currentAnimation && this.currentAnimation.spriteSheet) {
            // Sprites loaded successfully, reset attempt counter to prevent unnecessary checks
            this._spriteLoadAttempts = this._maxSpriteLoadAttempts;
        }
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
                if (!this.isBossType()) {
                    this.audioManager.playSound('enemy_death', 0.7);
                }
            } else {
                // Boss-specific hurt sound
                if (this.enemyType === 'BOSS') {
                    this.audioManager.playSound('boss_hurt', 0.6);
                } else if (this.isBossType()) {
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
        
        // Kamikaze phase machine (THIRD_BASIC): FOLLOW -> FUSE -> DASH -> detonate
        if (this.enemyType === 'THIRD_BASIC' && !this.hasDetonated && player) {
            const enemyRect = this.getRect();
            const playerRect = (typeof player.getRect === 'function')
                ? player.getRect()
                : { x: player.x, y: player.y, width: player.width || 0, height: player.height || 0 };

            if (this.kamikazePhase === 'FOLLOW') {
                // Check if player is within fuse ignition range
                const ecx = this.x + this.width / 2;
                const pcx = playerRect.x + playerRect.width / 2;
                const dist = Math.abs(ecx - pcx);
                const fuseRange = Config.EXPLODER_FUSE_RANGE || 160;
                if (dist < fuseRange && this.state === 'CHASE') {
                    // Ignite the fuse!
                    this.kamikazePhase = 'FUSE';
                    this.fuseTimer = Config.EXPLODER_FUSE_TIME || 1.6;
                    this.isExploding = true;
                    this.velocityX = 0;
                    this.fuseSoundPlayed = false;
                    if (this.audioManager) {
                        this.audioManager.playSound('kamikaze_fuse', { volume: 0.8, rate: 1.0 });
                        this.fuseSoundPlayed = true;
                    }
                }
            } else if (this.kamikazePhase === 'FUSE') {
                // Countdown the fuse — enemy is stopped, flashing/sparking
                this.fuseTimer -= dt;
                this.velocityX = 0;
                if (this.fuseTimer <= 0) {
                    // Fuse complete — begin the dash!
                    this.kamikazePhase = 'DASH';
                    this.dashTimer = 0;
                    this.isExploding = false; // stop the fuse flash, now dashing
                    if (this.audioManager) {
                        this.audioManager.playSound('dash', { volume: 0.6, rate: 1.4 });
                    }
                }
            } else if (this.kamikazePhase === 'DASH') {
                // Dash toward the player at high speed
                this.dashTimer += dt;
                const maxDash = Config.EXPLODER_DASH_DURATION || 1.2;

                // Contact detection — detonate on touching the player
                if (Utils.rectCollision(enemyRect, playerRect)) {
                    this.detonate();
                }
                // Auto-detonate if dash time expires (missed the player)
                else if (this.dashTimer >= maxDash) {
                    this.detonate();
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
                // THIRD_BASIC (Kamikaze): never does melee, chases until fuse/dash takes over
                if (this.enemyType === 'THIRD_BASIC') {
                    // During FUSE or DASH, don't change state — those are handled by the phase machine
                    if (this.kamikazePhase === 'FOLLOW') {
                        this.state = 'CHASE';
                    }
                } else {
                    this.state = "ATTACK";
                }
            } else if (horizontalGap < this.detectionRange) {
                // THIRD_BASIC: only chase during FOLLOW phase; FUSE/DASH are self-managed
                if (this.enemyType === 'THIRD_BASIC' && this.kamikazePhase !== 'FOLLOW') {
                    // Let the phase machine control movement
                } else {
                    this.state = "CHASE";
                }
            } else {
                // THIRD_BASIC: don't patrol during FUSE/DASH
                if (this.enemyType === 'THIRD_BASIC' && this.kamikazePhase !== 'FOLLOW') {
                    // Let the phase machine control movement
                } else {
                    this.state = "PATROL";
                }
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

        // Update rush sparks + fuse sparks for THIRD_BASIC (kamikaze)
        if (this.enemyType === 'THIRD_BASIC') {
            // Rush sparks while dashing (DASH phase only)
            const isDashing = this.kamikazePhase === 'DASH' && !this.hasDetonated;
            if (isDashing && Math.random() < 0.5) {
                const dir = this.facingRight ? -1 : 1;
                this.rushSparks.push({
                    x: this.x + this.width / 2 + dir * 10,
                    y: this.y + this.height - 6 + (Math.random() - 0.5) * 6,
                    vx: dir * (60 + Math.random() * 80),
                    vy: -50 - Math.random() * 70,
                    life: 0.3,
                    age: 0,
                    size: 2 + Math.random() * 3
                });
            }

            // Fuse warning sparks (FUSE phase — escalating intensity as fuse burns down)
            if (this.kamikazePhase === 'FUSE' && !this.hasDetonated) {
                const fuseTotal = Config.EXPLODER_FUSE_TIME || 1.6;
                const fuseProgress = 1 - (this.fuseTimer / fuseTotal); // 0 -> 1
                const sparkRate = 1 + Math.floor(fuseProgress * 5); // 1..6 sparks per frame
                for (let s = 0; s < sparkRate; s++) {
                    if (Math.random() < 0.5 + fuseProgress * 0.4) {
                        this.rushSparks.push({
                            x: this.x + Math.random() * this.width,
                            y: this.y + Math.random() * this.height,
                            vx: (Math.random() - 0.5) * (100 + fuseProgress * 150),
                            vy: -60 - Math.random() * (80 + fuseProgress * 80),
                            life: 0.2 + Math.random() * 0.2,
                            age: 0,
                            size: 2 + Math.random() * (3 + fuseProgress * 3)
                        });
                    }
                }
            }

            for (let i = this.rushSparks.length - 1; i >= 0; i--) {
                const p = this.rushSparks[i];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vx *= 0.9;
                p.vy *= 0.9;
                p.age += dt;
                if (p.age >= p.life) {
                    this.rushSparks.splice(i, 1);
                }
            }

            // Update explosion particles
            if (this.hasDetonated) {
                this.explosionAge += dt;
                for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
                    const p = this.explosionParticles[i];
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.vy += 200 * dt; // gravity on debris
                    p.age += dt;
                    if (p.age >= p.life) {
                        this.explosionParticles.splice(i, 1);
                    }
                }
            }
        }

        // Update jump sparks for fourth basic
        if (this.enemyType === 'FOURTH_BASIC') {
            for (let i = this.jumpSparks.length - 1; i >= 0; i--) {
                const p = this.jumpSparks[i];
                if (p.isRing) {
                    // Expand ring radius over lifetime
                    const progress = p.age / p.life;
                    p.ringRadius = p.maxRingRadius * progress;
                } else {
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.vx *= 0.92;
                    p.vy += Config.GRAVITY * dt * (p.isDust ? 0.15 : p.isTrail ? 0.1 : 0.3);
                }
                p.age += dt;
                if (p.age >= p.life) {
                    this.jumpSparks.splice(i, 1);
                }
            }
        }

        // Bounds checking
        this.x = Utils.clamp(this.x, 0, level.width - this.width);
    }
    patrol(dt, level) {
        // FOURTH_BASIC stays in place during patrol (no side-to-side movement)
        if (this.enemyType === 'FOURTH_BASIC') {
            this.velocityX = 0;
            return;
        }
        
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
                                    try { fetch('/__touch_log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).catch((e)=>{ __err('enemy', e); }); } catch (e) { __err('enemy', e); }
                                }
                            } catch (e) { __err('enemy', e); }
                            // Reset counter after attempt
                            window._enemyPatrolMissingLevelCount = 0;
                        };

                        // Periodically send aggregated counts (every 60s)
                        try { window._reportEnemyPatrolMissingLevelTimer = setInterval(() => { try { window._reportEnemyPatrolMissingLevel(); } catch (e) { __err('enemy', e); } }, 60000); } catch (e) { __err('enemy', e); }

                        // Ensure a final send on unload
                        try { window.addEventListener('beforeunload', () => { try { window._reportEnemyPatrolMissingLevel(true); } catch (e) { __err('enemy', e); } }); } catch (e) { __err('enemy', e); }

                        // Kick off a short delayed send so low-frequency occurrences are reported quickly
                        try { setTimeout(() => { try { window._reportEnemyPatrolMissingLevel(); } catch (e) { __err('enemy', e); } }, 10000); } catch (e) { __err('enemy', e); }
                    }
                    return;
                } else {
                    if (typeof console !== 'undefined' && console.log) console.log('Enemy.patrol: used fallback window.game.level');
                }
            } catch (e) { __err('enemy', e); }
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
        // THIRD_BASIC (Kamikaze): behavior depends on kamikazePhase
        if (this.enemyType === 'THIRD_BASIC') {
            // If already detonated, do nothing
            if (this.hasDetonated) return;
            // If fuse is lit, freeze in place (flash & spark)
            if (this.kamikazePhase === 'FUSE') {
                this.velocityX = 0;
                return;
            }

            // Face the player
            const playerCenterX = (player.x || 0) + (player.width || 0) * 0.5;
            const enemyCenterX = this.x + this.width * 0.5;
            this.facingRight = playerCenterX > enemyCenterX;

            if (this.kamikazePhase === 'DASH') {
                // DASH phase: rocket toward player at boosted speed
                const rushSpeed = this.speed * (Config.EXPLODER_RUSH_SPEED_MULT || 3.5);
                this.velocityX = (enemyCenterX < playerCenterX) ? rushSpeed : -rushSpeed;
            } else {
                // FOLLOW phase: normal chase speed (like other enemies)
                const chaseSpeed = this.speed;
                this.velocityX = (enemyCenterX < playerCenterX) ? chaseSpeed : -chaseSpeed;
            }

            // Move horizontally
            const nextX = this.x + this.velocityX * dt;
            this.x = nextX;
            return;
        }

        // FOURTH_BASIC has special behavior: no horizontal movement, multi-jump vertically
        if (this.enemyType === 'FOURTH_BASIC') {
            this.velocityX = 0; // No side-to-side movement
            
            // Update jump cooldown
            if (this.jumpCooldown > 0) {
                this.jumpCooldown -= dt;
            }
            
            // Check if on ground (velocityY ~= 0 and collision below)
            const isGrounded = Math.abs(this.velocityY) < 1;
            
            if (isGrounded) {
                this.jumpCount = 0; // Reset jump count when grounded
            }
            
            const playerCenterY = (player.y || 0) + (player.height || 0) * 0.5;
            const enemyCenterY = this.y + this.height * 0.5;
            const verticalDiff = enemyCenterY - playerCenterY; // positive if player is above
            
            // Jump if player is above us and we have jumps available and cooldown is ready
            if (verticalDiff > 30 && this.jumpCount < this.maxJumps && this.jumpCooldown <= 0) {
                // Each successive jump gets slightly weaker but still useful
                const jumpDecay = 1.0 - (this.jumpCount * 0.08); // 100%, 92%, 84%, 76%, 68%
                const jumpForce = Config.CHARACTER.jump_force * 0.75 * jumpDecay;
                this.velocityY = -jumpForce;
                this.jumpCount++;
                this.jumpCooldown = 0.2; // Faster cooldown for rapid multi-jumps
                this._lastJumpY = this.y + this.height;
                
                // Intensity scales with jump number for escalating drama
                const intensity = Math.min(this.jumpCount / 3, 1.0);
                const sparkCount = 10 + Math.floor(intensity * 10); // 10-20 sparks
                
                // Generate burst of green sparks on jump
                for (let i = 0; i < sparkCount; i++) {
                    const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.5;
                    const speed = 50 + Math.random() * 100 + intensity * 60;
                    this.jumpSparks.push({
                        x: this.x + this.width / 2 + (Math.random() - 0.5) * this.width,
                        y: this.y + this.height - 4,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - 20,
                        life: 0.4 + Math.random() * 0.4 + intensity * 0.2,
                        age: 0,
                        size: 2 + Math.random() * 3 + intensity * 2
                    });
                }
                
                // Shockwave ring particle (expanding circle marker)
                this.jumpSparks.push({
                    x: this.x + this.width / 2,
                    y: this.y + this.height,
                    vx: 0, vy: 0,
                    life: 0.4,
                    age: 0,
                    size: 4 + intensity * 6,
                    isRing: true, // Special flag for ring rendering
                    ringRadius: 0,
                    maxRingRadius: 30 + intensity * 30
                });
                
                // Ground dust puff (wider, lower particles)
                for (let i = 0; i < 6; i++) {
                    const dir = (i < 3) ? -1 : 1;
                    this.jumpSparks.push({
                        x: this.x + this.width / 2 + dir * (10 + Math.random() * 15),
                        y: this.y + this.height - 2,
                        vx: dir * (40 + Math.random() * 60),
                        vy: -5 - Math.random() * 15,
                        life: 0.35 + Math.random() * 0.2,
                        age: 0,
                        size: 3 + Math.random() * 4,
                        isDust: true // Flag for dust rendering (different color)
                    });
                }
                
                // Play jump sound — pitch increases with each successive jump
                if (this.audioManager) {
                    const rate = 0.85 + this.jumpCount * 0.1; // 0.95, 1.05, 1.15, 1.25, 1.35
                    this.audioManager.playSound('jump', { volume: 0.35 + intensity * 0.15, rate });
                }
            }
            
            // Airborne trail particles (continuous while in air)
            if (!isGrounded && this.velocityY !== 0) {
                this._jumpTrailTimer = (this._jumpTrailTimer || 0) + dt;
                if (this._jumpTrailTimer > 0.04) { // Every 40ms
                    this._jumpTrailTimer = 0;
                    this.jumpSparks.push({
                        x: this.x + this.width / 2 + (Math.random() - 0.5) * this.width * 0.6,
                        y: this.y + this.height * 0.5 + (Math.random() - 0.5) * this.height * 0.4,
                        vx: (Math.random() - 0.5) * 20,
                        vy: 10 + Math.random() * 20,
                        life: 0.25 + Math.random() * 0.15,
                        age: 0,
                        size: 1.5 + Math.random() * 2,
                        isTrail: true // Flag for trail rendering (softer glow)
                    });
                }
            }
            
            // Face the player
            const playerCenterX = (player.x || 0) + (player.width || 0) * 0.5;
            const enemyCenterX = this.x + this.width * 0.5;
            this.facingRight = playerCenterX > enemyCenterX;
            
            return;
        }
        
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
        // THIRD_BASIC (Kamikaze): no melee attack, phase machine handles everything
        if (this.enemyType === 'THIRD_BASIC') {
            this.velocityX = 0;
            return;
        }

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

    /**
     * THIRD_BASIC Kamikaze: trigger the explosion.
     * Sets hasDetonated = true, kills self, spawns explosion particles.
     * The actual AoE damage to player/enemies is handled by EnemyManager/Game.
     */
    detonate() {
        if (this.hasDetonated) return;
        this.hasDetonated = true;
        this.isExploding = false;
        this.kamikazePhase = 'DETONATED';
        this.health = 0; // Kill self

        // Pronounced explosion sound — use dedicated kamikaze_explosion, fall back to enemy_death
        if (this.audioManager) {
            this.audioManager.playSound('kamikaze_explosion', { volume: 1.0, rate: 0.9 });
        }

        // Spawn massive explosion particles (fiery orange/red burst)
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const radius = Config.EXPLODER_EXPLOSION_RADIUS || 120;

        // Primary fireball particles — fast, bright
        for (let i = 0; i < 36; i++) {
            const angle = (Math.PI * 2 * i) / 36 + (Math.random() - 0.5) * 0.4;
            const speed = 150 + Math.random() * 350;
            this.explosionParticles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 80,
                life: 0.4 + Math.random() * 0.5,
                age: 0,
                size: 3 + Math.random() * 6,
                color: Math.random() < 0.2 ? '#FFFFFF' : Math.random() < 0.5 ? '#FFAA00' : '#FF4400'
            });
        }

        // Secondary ring of ember particles — slower, lingering
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 140;
            this.explosionParticles.push({
                x: cx + (Math.random() - 0.5) * 20,
                y: cy + (Math.random() - 0.5) * 20,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                life: 0.6 + Math.random() * 0.6,
                age: 0,
                size: 2 + Math.random() * 3,
                color: Math.random() < 0.6 ? '#FF6600' : '#FF2200'
            });
        }

        // Smoke particles — dark, slow, long-lived
        for (let i = 0; i < 16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 60;
            this.explosionParticles.push({
                x: cx + (Math.random() - 0.5) * 30,
                y: cy + (Math.random() - 0.5) * 20,
                vx: Math.cos(angle) * speed,
                vy: -40 - Math.random() * 80,
                life: 0.8 + Math.random() * 0.7,
                age: 0,
                size: 6 + Math.random() * 8,
                color: Math.random() < 0.4 ? '#333333' : '#555555'
            });
        }

        // Spark/debris fragments — fast, tiny, short-lived
        for (let i = 0; i < 14; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 200 + Math.random() * 400;
            this.explosionParticles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 100,
                life: 0.3 + Math.random() * 0.3,
                age: 0,
                size: 1.5 + Math.random() * 2,
                color: '#FFFFFF'
            });
        }

        this.explosionAge = 0;
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

            // Draw rush sparks (behind body)
            if (this.enemyType === 'THIRD_BASIC' && this.rushSparks && this.rushSparks.length > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                for (const p of this.rushSparks) {
                    const alpha = 1 - (p.age / p.life);
                    ctx.globalAlpha = alpha * 0.85;
                    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.2);
                    grad.addColorStop(0, '#FFFFFF');
                    grad.addColorStop(0.5, '#FF4444');
                    grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * 1.8, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            // Draw jump sparks (green for fourth basic)
            if (this.enemyType === 'FOURTH_BASIC' && this.jumpSparks && this.jumpSparks.length > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                for (const p of this.jumpSparks) {
                    const alpha = 1 - (p.age / p.life);

                    if (p.isRing) {
                        // Expanding shockwave ring
                        ctx.globalAlpha = alpha * 0.6;
                        ctx.strokeStyle = '#44FF88';
                        ctx.shadowColor = '#00FF66';
                        ctx.shadowBlur = 8;
                        ctx.lineWidth = 2 + (1 - p.age / p.life) * 3;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.ringRadius || 1, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                    } else if (p.isDust) {
                        // Ground dust puff — softer, tan/brown
                        ctx.globalAlpha = alpha * 0.5;
                        const dGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
                        dGrad.addColorStop(0, 'rgba(200, 200, 180, 0.8)');
                        dGrad.addColorStop(0.6, 'rgba(160, 150, 120, 0.4)');
                        dGrad.addColorStop(1, 'rgba(120, 110, 90, 0)');
                        ctx.fillStyle = dGrad;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (p.isTrail) {
                        // Airborne trail — small, soft green glow
                        ctx.globalAlpha = alpha * 0.6;
                        const tGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 1.8);
                        tGrad.addColorStop(0, '#88FFAA');
                        tGrad.addColorStop(0.5, '#44FF66');
                        tGrad.addColorStop(1, 'rgba(68, 255, 102, 0)');
                        ctx.fillStyle = tGrad;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        // Standard jump spark — bright green burst
                        ctx.globalAlpha = alpha * 0.9;
                        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
                        grad.addColorStop(0, '#FFFFFF');
                        grad.addColorStop(0.3, '#88FF88');
                        grad.addColorStop(0.6, '#44FF44');
                        grad.addColorStop(1, 'rgba(68, 255, 68, 0)');
                        ctx.fillStyle = grad;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                ctx.restore();
            }

            // Draw sprite or colored rectangle
            // If animation exists but has no sprite sheet, keep trying to reload (handles late-loading assets)
            if (this.currentAnimation && !this.currentAnimation.spriteSheet) {
                if (this._spriteLoadAttempts < this._maxSpriteLoadAttempts) {
                    this._spriteLoadAttempts++;
                    
                    // Check if sprites are actually available now
                    const config = ENEMY_TYPE_CONFIG[this.enemyType] || ENEMY_TYPE_CONFIG['BASIC'];
                    const prefix = config.prefix;
                    const testKey = `${prefix}_idle`;
                    
                    // Only reload if the sprite is actually present in spriteLoader now
                    if (spriteLoader && spriteLoader.getSprite(testKey)) {
                        this.loadSprites();
                        // Update current animation reference after reload
                        if (this.animations && this.animations[this.animationState]) {
                            this.currentAnimation = this.animations[this.animationState];
                        }
                        if (Config.DEBUG) {
                            console.log(`Enemy ${this.enemyType} at (${Math.round(this.x)},${Math.round(this.y)}) sprites loaded after ${this._spriteLoadAttempts} attempts`);
                        }
                    }
                } else if (this._spriteLoadAttempts === this._maxSpriteLoadAttempts) {
                    // Log warning once when max attempts reached
                    this._spriteLoadAttempts++;
                    console.warn(`Enemy ${this.enemyType} failed to load sprites after ${this._maxSpriteLoadAttempts} attempts. Sprites may be missing.`);
                }
            }
            
            if (this.currentAnimation && this.currentAnimation.spriteSheet) {
                this.currentAnimation.draw(ctx, this.x, this.y, this.width, this.height, this.facingRight);
            } else {
                // Red box fallback when sprites aren't loaded yet
                ctx.fillStyle = '#FF4444';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                
                // Draw debug info when sprites missing
                if (Config.DEBUG && typeof ctx.fillText === 'function') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '8px monospace';
                    ctx.fillText(this.enemyType, this.x + 2, this.y + 10);
                    ctx.fillText(`Attempt ${this._spriteLoadAttempts}`, this.x + 2, this.y + 20);
                }
            }
        
        // Draw skunk effect if skunked
        if (this.isSkunked) {
            // Draw skunk particles (bubbles)
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
        // Draw rush sparks (behind body)
        if (this.enemyType === 'THIRD_BASIC' && this.rushSparks && this.rushSparks.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (const p of this.rushSparks) {
                const alpha = 1 - (p.age / p.life);
                ctx.globalAlpha = alpha * 0.85;
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.2);
                grad.addColorStop(0, '#FFFFFF');
                grad.addColorStop(0.5, '#FF4444');
                grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

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
            } catch (e) { __err('enemy', e); }
        }

        // THIRD_BASIC Kamikaze: fuse flash overlay (during FUSE phase)
        if (this.enemyType === 'THIRD_BASIC' && this.kamikazePhase === 'FUSE' && !this.hasDetonated) {
            // Escalating flash — faster as fuse burns down
            const fuseTotal = Config.EXPLODER_FUSE_TIME || 1.6;
            const fuseProgress = 1 - (this.fuseTimer / fuseTotal); // 0 -> 1
            const flashSpeed = 0.015 + fuseProgress * 0.04; // Flash frequency increases
            const flash = Math.sin(Date.now() * flashSpeed * Math.PI * 2);
            if (flash > 0) {
                ctx.save();
                ctx.globalAlpha = 0.3 + fuseProgress * 0.4; // Gets brighter
                ctx.fillStyle = fuseProgress > 0.7 ? '#FF4400' : '#FFFFFF';
                ctx.fillRect(this.x - 4, this.y - 4, this.width + 8, this.height + 8);
                ctx.restore();
            }
            // Danger indicator with countdown
            ctx.save();
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FF0000';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            const warningText = fuseProgress > 0.75 ? '💥💥' : '💣';
            ctx.strokeText(warningText, this.x + this.width / 2, this.y - 14);
            ctx.fillText(warningText, this.x + this.width / 2, this.y - 14);
            // Fuse bar under the bomb emoji
            const barW = this.width + 8;
            const barH = 3;
            const barX = this.x - 4;
            const barY = this.y - 8;
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = fuseProgress > 0.75 ? '#FF2200' : '#FF8800';
            ctx.fillRect(barX, barY, barW * fuseProgress, barH);
            ctx.restore();
        }

        // THIRD_BASIC Kamikaze: dash glow (during DASH phase)
        if (this.enemyType === 'THIRD_BASIC' && this.kamikazePhase === 'DASH' && !this.hasDetonated) {
            ctx.save();
            const pulseAlpha = 0.3 + Math.sin(Date.now() * 0.02 * Math.PI * 2) * 0.2;
            ctx.globalAlpha = pulseAlpha;
            ctx.fillStyle = '#FF4400';
            ctx.fillRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);
            ctx.restore();
            // Danger indicator
            ctx.save();
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FF0000';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeText('💥', this.x + this.width / 2, this.y - 14);
            ctx.fillText('💥', this.x + this.width / 2, this.y - 14);
            ctx.restore();
        }

        // THIRD_BASIC Kamikaze: draw explosion effect after detonation
        if (this.enemyType === 'THIRD_BASIC' && this.hasDetonated) {
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const radius = Config.EXPLODER_EXPLOSION_RADIUS || 120;
            const progress = this.explosionAge / this.explosionDuration;

            if (progress < 1) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';

                // --- Bright initial flash (first 20% of explosion) ---
                if (progress < 0.2) {
                    const flashAlpha = (1 - progress / 0.2) * 0.7;
                    ctx.globalAlpha = flashAlpha;
                    const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.6);
                    flashGrad.addColorStop(0, '#FFFFFF');
                    flashGrad.addColorStop(0.5, '#FFFFAA');
                    flashGrad.addColorStop(1, 'rgba(255, 200, 0, 0)');
                    ctx.fillStyle = flashGrad;
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
                    ctx.fill();
                }

                // --- Primary shockwave ring ---
                const ringRadius = radius * Math.min(1, progress * 1.8);
                const ringAlpha = (1 - progress) * 0.7;
                ctx.globalAlpha = ringAlpha;
                ctx.strokeStyle = '#FF8800';
                ctx.lineWidth = 4 + (1 - progress) * 10;
                ctx.shadowColor = '#FF4400';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // --- Secondary inner shockwave (delayed, smaller) ---
                if (progress > 0.1) {
                    const innerProgress = (progress - 0.1) / 0.9;
                    const innerRadius = radius * 0.6 * Math.min(1, innerProgress * 2.0);
                    const innerAlpha = (1 - innerProgress) * 0.5;
                    ctx.globalAlpha = innerAlpha;
                    ctx.strokeStyle = '#FFCC00';
                    ctx.lineWidth = 3 + (1 - innerProgress) * 6;
                    ctx.beginPath();
                    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // --- Fireball core glow ---
                const coreProgress = Math.min(1, progress * 2.5);
                const coreRadius = radius * 0.5 * coreProgress;
                const coreAlpha = (1 - progress) * 0.5;
                ctx.globalAlpha = coreAlpha;
                const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
                glow.addColorStop(0, '#FFFFFF');
                glow.addColorStop(0.2, '#FFCC00');
                glow.addColorStop(0.5, '#FF6600');
                glow.addColorStop(0.8, '#FF2200');
                glow.addColorStop(1, 'rgba(255, 0, 0, 0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();

                // --- Ground scorch mark (below the explosion, normal composite) ---
                ctx.save();
                const scorchAlpha = Math.max(0, 0.4 * (1 - progress * 0.5));
                ctx.globalAlpha = scorchAlpha;
                ctx.fillStyle = '#1a0a00';
                ctx.beginPath();
                ctx.ellipse(cx, cy + this.height / 2 + 4, radius * 0.5 * Math.min(1, progress * 3), 8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Draw explosion debris particles
            if (this.explosionParticles.length > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                for (const p of this.explosionParticles) {
                    const alpha = 1 - (p.age / p.life);
                    ctx.globalAlpha = alpha * 0.9;
                    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
                    grad.addColorStop(0, '#FFFFFF');
                    grad.addColorStop(0.4, p.color || '#FF6600');
                    grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
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
