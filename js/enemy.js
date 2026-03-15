/*!
 * Skunked: Way of the Spray
 * Copyright (c) 2026 Mephitideus Interactive. All Rights Reserved.
 * Proprietary and confidential — unauthorized copying, distribution, or use
 * of this file, via any medium, is strictly prohibited. See LICENSE for terms.
 */
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
    'FIFTH_BASIC': { prefix: 'fifth', size: { width: 48, height: 48 }, fallback: 'fourth' },
    'FLYING': { prefix: 'fly', size: { width: 40, height: 40 }, fallback: null },
    'BOSS': { prefix: 'boss', size: { width: 128, height: 128 }, fallback: null, attackAnim: 'boss_attack1', bossName: 'SHADOW FANG', bossTitle: 'Guardian of the Forest', ability: 'charge' },
    'BOSS2': { prefix: 'boss2', size: { width: 128, height: 128 }, fallback: 'boss', attackAnim: 'boss2_attack', bossName: 'IRON CLAW', bossTitle: 'Enforcer of Skunk City', ability: 'groundSlam' },
    'BOSS3': { prefix: 'boss3', size: { width: 128, height: 128 }, fallback: 'boss2', attackAnim: 'boss3_attack', bossName: 'BURGER FURY', bossTitle: 'Master of the Dojo', ability: 'rapidStrike' },
    'BOSS4': { prefix: 'boss4', size: { width: 128, height: 128 }, fallback: 'boss3', attackAnim: 'boss4_attack', bossName: 'MALODOR', bossTitle: 'Enemy Kingpin', ability: 'projectile' },
    'BOSS5': { prefix: 'boss5', size: { width: 128, height: 128 }, fallback: 'boss4', attackAnim: 'boss5_attack', bossName: 'STEAMPUNK WRAITH', bossTitle: 'Depths Dweller', ability: 'teleport' },
    'BOSS6': { prefix: 'boss6', size: { width: 128, height: 128 }, fallback: 'boss5', attackAnim: 'boss6_attack', bossName: 'DR OBSIDIAN', bossTitle: 'Cavern Sentinel', ability: 'summon' },
    'BOSS7': { prefix: 'boss7', size: { width: 128, height: 128 }, fallback: 'boss6', attackAnim: 'boss7_attack', bossName: 'KYLE', bossTitle: 'Crystal Ridge Warden', ability: 'crystalBarrage' }
};

const HEAVY_BOSS_ATTACK_TYPES = new Set(['BOSS5', 'BOSS6', 'BOSS7']);
const ALT_BOSS_SOUND_TYPES = new Set(['BOSS2', 'BOSS3', 'BOSS4', 'BOSS5', 'BOSS6', 'BOSS7']);

const BOSS_TYPE_INFO = Object.freeze(
    Object.fromEntries(
        Object.entries(ENEMY_TYPE_CONFIG)
            .filter(([type]) => /^BOSS\d*$/.test(type))
            .map(([type, config]) => [type, {
                type,
                prefix: config.prefix,
                bossName: config.bossName,
                bossTitle: config.bossTitle,
                ability: config.ability
            }])
    )
);

if (typeof window !== 'undefined') {
    window.SKUNKFU_BOSS_INFO = BOSS_TYPE_INFO;
}

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
        } else if (this.enemyType === 'FIFTH_BASIC') {
            this.health = Math.floor(Config.ENEMY_HEALTH * 1.2); // Moderate — relies on range
            this.maxHealth = this.health;
            this.speed = Config.ENEMY_SPEED * 0.85; // Slightly slower, prefers to keep distance
            this.attackDamage = Math.floor(Config.ENEMY_ATTACK_DAMAGE * 1.4); // Projectile hits hard
            this.points = Math.floor(Config.ENEMY_POINTS * 2.5); // High reward
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

        // FIFTH_BASIC (Thrower): extended attack range to trigger ATTACK from range
        if (this.enemyType === 'FIFTH_BASIC') {
            this.attackRange = 400;
            this.attackCooldown = 2.8;
        }

        // Type-specific combat tuning (kept conservative)
        if (this.isBossType()) {
            this.attackRange = 120;
            this.attackDuration = 0.65;
            this.attackWindup = 0.26;
            this.attackCooldown = 1.6;
            this.attackHitbox = { x: 0, y: 0, width: 120, height: 80 };
        }

        // Boss phase / enrage system
        this.bossPhase = 1;            // 1 = normal, 2 = enraged (below 50%), 3 = desperate (below 25%)
        this.bossEnraged = false;       // Currently in enrage state
        this.bossDesparate = false;     // Below 25% HP
        this.bossAuraTimer = 0;         // Timer for aura pulse visual
        this.bossSpecialCooldown = 0;   // Cooldown for special attack
        this.bossSpecialActive = false; // Currently performing special attack
        this.bossSpecialTimer = 0;      // Duration of current special
        this.bossChargeSpeed = 0;       // Speed during charge attack
        this.bossChargeDirX = 0;        // Direction of charge
        this.bossEntranceTimer = 0;     // Entrance animation countdown
        this.bossEntranceDone = false;  // Has entrance animation played
        this.bossAbility = (config && config.ability) || null; // Unique ability type
        this.bossName = (config && config.bossName) || 'BOSS'; // Display name
        this.bossTitle = (config && config.bossTitle) || '';    // Sub-title
        this.bossDefeatParticles = [];  // Defeat celebration particles

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
        this.dashDirX = 0;             // Locked dash direction (set once at dash start)
        this.chainExplosionDepth = 0;   // How many chain explosions deep (for bonus scoring)

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

        // Thrower state (FIFTH_BASIC)
        this.thrownProjectiles = [];     // Active purple spray projectiles
        this.throwCooldown = 2.8;        // Seconds between throws
        this.throwCooldownTimer = 0.8;   // Initial delay before first throw
        this.preferredRangeMin = 180;    // Stay at least this far from player
        this.preferredRangeMax = 380;    // Back off if closer than min

        // Shield bubble state (SECOND_BASIC)
        // The shield activates automatically every SECOND_BASIC_SHIELD_COOLDOWN seconds
        // and lasts SECOND_BASIC_SHIELD_DURATION seconds, absorbing all incoming damage.
        this.shieldActive = false;
        this.shieldTimer = 0;            // Countdown while shield is active
        this.shieldCooldownTimer = 1.5;  // Initial delay before first activation
        this.shieldBreakFlash = 0;       // Short flash timer when a hit is blocked
        this.shieldParticles = [];       // Burst particles shown on a blocked hit

        // Load sprites AFTER all fields are initialised so loadSprites()
        // can safely set this.currentAnimation without it being overwritten.
        this.loadSprites();
    }

    /**
     * Check if this enemy is a boss type
     */
    isBossType() {
        return typeof this.enemyType === 'string' && /^BOSS\d*$/.test(this.enemyType) && !!ENEMY_TYPE_CONFIG[this.enemyType];
    }

    /**
     * Check if this enemy is a basic type (including variants)
     */
    isBasicType() {
        return this.enemyType === 'BASIC' || this.enemyType === 'FAST_BASIC' ||
               this.enemyType === 'SECOND_BASIC' || this.enemyType === 'THIRD_BASIC' ||
               this.enemyType === 'FOURTH_BASIC' || this.enemyType === 'FIFTH_BASIC';
    }

    loadSprites() {
        // Validate spriteLoader is ready
        if (!spriteLoader || !spriteLoader.sprites) {
            if (Config.DEBUG) console.warn('Enemy.loadSprites: spriteLoader not ready for', this.enemyType);
            // Defer: retry once spriteLoader finishes loading
            if (spriteLoader && typeof spriteLoader.whenReady === 'function') {
                spriteLoader.whenReady(() => this.loadSprites());
            }
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
            // Sprites loaded successfully, no further retries needed
            this._spriteLoadAttempts = this._maxSpriteLoadAttempts;
        } else if (spriteLoader && typeof spriteLoader.whenReady === 'function' && !spriteLoader._ready) {
            // Sprites not loaded yet — defer retry until spriteLoader finishes
            spriteLoader.whenReady(() => this.loadSprites());
        }
    }

    takeDamage(damage, knockbackDirection = 1, opts = null) {
        // SECOND_BASIC: shield bubble absorbs the hit entirely
        if (this.enemyType === 'SECOND_BASIC' && this.shieldActive) {
            // Trigger visual ripple flash
            this.shieldBreakFlash = 0.28;
            // Burst of shield impact particles
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            for (let i = 0; i < 10; i++) {
                const angle = (Math.PI * 2 * i) / 10;
                const spd = 90 + Math.random() * 70;
                this.shieldParticles.push({
                    x: cx + Math.cos(angle) * 28,
                    y: cy + Math.sin(angle) * 28,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    life: 0.45,
                    age: 0,
                    size: 4 + Math.random() * 4
                });
            }
            if (this.audioManager) {
                this.audioManager.playSound('enemy_hit', { volume: 0.45, rate: 1.9 });
            }
            return false; // damage fully absorbed — enemy does NOT die
        }

        // Boss summon shield: halved damage while active
        if (this.isBossType() && this._bossSummonShield && this.bossSpecialActive) {
            damage = Math.max(1, Math.floor(damage * 0.5));
        }

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
                // Skunk spray disrupts kamikaze fuse/dash — forces early detonation
                if (this.enemyType === 'THIRD_BASIC' && !this.hasDetonated) {
                    if (this.kamikazePhase === 'FUSE' || this.kamikazePhase === 'DASH') {
                        this.detonate();
                    }
                }
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

        // Shield bubble timer (SECOND_BASIC)
        if (this.enemyType === 'SECOND_BASIC') {
            if (this.shieldActive) {
                this.shieldTimer -= dt;
                if (this.shieldTimer <= 0) {
                    this.shieldActive = false;
                    this.shieldCooldownTimer = Config.SECOND_BASIC_SHIELD_COOLDOWN || 5.0;
                }
            } else {
                if (this.shieldCooldownTimer > 0) {
                    this.shieldCooldownTimer -= dt;
                } else {
                    // Activate shield
                    this.shieldActive = true;
                    this.shieldTimer = Config.SECOND_BASIC_SHIELD_DURATION || 1.0;
                    this.shieldBreakFlash = 0;
                }
            }
            // Decay hit-flash
            if (this.shieldBreakFlash > 0) this.shieldBreakFlash = Math.max(0, this.shieldBreakFlash - dt);
            // Update shield impact particles
            for (let i = this.shieldParticles.length - 1; i >= 0; i--) {
                const p = this.shieldParticles[i];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vx *= 0.87;
                p.vy *= 0.87;
                p.age += dt;
                if (p.age >= p.life) this.shieldParticles.splice(i, 1);
            }
        }

        // Boss phase system: enrage at 50% HP, desperate at 25% HP
        if (this.isBossType()) {
            this.bossAuraTimer += dt;
            const hpPct = this.health / this.maxHealth;

            // Phase transitions
            if (hpPct <= 0.25 && this.bossPhase < 3) {
                this.bossPhase = 3;
                this.bossDesparate = true;
                this.bossEnraged = true;
                // Desperate phase: even faster, shorter cooldowns
                this.attackCooldown = Math.max(0.4, this.attackCooldown * 0.6);
                this.speed *= 1.3;
                this.attackDamage = Math.floor(this.attackDamage * 1.2);
            } else if (hpPct <= 0.5 && this.bossPhase < 2) {
                this.bossPhase = 2;
                this.bossEnraged = true;
                // Enraged phase: faster attacks, more aggressive
                this.attackCooldown = Math.max(0.6, this.attackCooldown * 0.75);
                this.speed *= 1.15;
                this.detectionRange = Math.max(this.detectionRange, 700);
            }

            // Boss entrance animation (freeze boss briefly when first spawned)
            if (!this.bossEntranceDone) {
                this.bossEntranceTimer += dt;
                if (this.bossEntranceTimer < 1.5) {
                    // During entrance: don't move horizontally, but still
                    // apply gravity+collision so boss doesn't float or tunnel
                    this.velocityX = 0;
                    this.state = 'PATROL'; // idle
                    this._applyGravityAndCollision(dt, level);
                    this.updateAnimation(dt);
                    return; // Skip all AI
                }
                this.bossEntranceDone = true;
            }

            // Special ability cooldown
            if (this.bossSpecialCooldown > 0) {
                this.bossSpecialCooldown -= dt;
            }

            // Special ability execution
            if (this.bossSpecialActive) {
                this.bossSpecialTimer -= dt;
                this._updateBossSpecial(dt, player, level);
                if (this.bossSpecialTimer <= 0) {
                    this.bossSpecialActive = false;
                    this.bossSpecialCooldown = this.bossEnraged ? 3.0 : 5.0;
                }
            }

            // Trigger special ability when off cooldown and chasing
            if (!this.bossSpecialActive && this.bossSpecialCooldown <= 0 && this.state === 'CHASE' && player) {
                this._startBossSpecial(player);
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

                    // Lock dash direction at launch — player can dodge by jumping
                    const ecx = this.x + this.width / 2;
                    const pcx = playerRect.x + playerRect.width / 2;
                    this.dashDirX = (ecx < pcx) ? 1 : -1;

                    if (this.audioManager) {
                        this.audioManager.playSound('dash', { volume: 0.6, rate: 1.4 });
                    }
                }
            } else if (this.kamikazePhase === 'DASH') {
                // Dash in the locked direction at high speed
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
                // Safety: detonate if hitting a level boundary during dash
                else if (level && (this.x <= 0 || this.x + this.width >= level.width)) {
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
                } else if (this.enemyType === 'FIFTH_BASIC') {
                    // Thrower: enters ATTACK from range, but backs off if player is too close
                    this.state = 'ATTACK';
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
                    this.attack(dt, player);
                    break;
            }

            // FIFTH_BASIC: tick throw cooldown and keep preferred distance
            if (this.enemyType === 'FIFTH_BASIC' && player) {
                if (this.throwCooldownTimer > 0) this.throwCooldownTimer -= dt;

                // Maintain preferred range — back away if player is too close
                const ecx = this.x + this.width / 2;
                const pcx = player.x + (player.width || 0) / 2;
                const dist = Math.abs(ecx - pcx);
                if (dist < this.preferredRangeMin) {
                    // Retreat away from player
                    const dir = ecx < pcx ? -1 : 1;
                    this.x += dir * this.speed * 1.2 * dt;
                    this.facingRight = dir > 0;
                    this.velocityX = 0; // handled manually above
                }

                // Update thrown projectiles
                this._updateThrownProjectiles(dt, level);
            }

            // Boss projectile update (BOSS4 spread shot)
            if (this.isBossType() && this.thrownProjectiles && this.thrownProjectiles.length > 0) {
                this._updateThrownProjectiles(dt, level);
            }
        } // end if (!hitStunTimer && !isSkunked)

        // Apply gravity
        this._applyGravityAndCollision(dt, level);

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
                // DASH phase: rocket in locked direction at boosted speed
                const rushSpeed = this.speed * (Config.EXPLODER_RUSH_SPEED_MULT || 3.5);
                this.velocityX = this.dashDirX * rushSpeed;
                this.facingRight = this.dashDirX > 0;
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

    attack(dt, player) {
        // THIRD_BASIC (Kamikaze): no melee attack, phase machine handles everything
        if (this.enemyType === 'THIRD_BASIC') {
            this.velocityX = 0;
            return;
        }

        // FIFTH_BASIC (Thrower): fire a purple projectile instead of melee
        if (this.enemyType === 'FIFTH_BASIC') {
            this.velocityX = 0; // stand still while targeting
            if (!this.isAttacking && this.throwCooldownTimer <= 0 && player) {
                this.isAttacking = true;
                this.attackTimer = this.attackDuration;
                this.attackCooldownTimer = this.attackCooldown;
                this.throwCooldownTimer = this.throwCooldown;

                if (this.animations.attack) this.animations.attack.reset();

                // Aim toward player center
                const ecx = this.x + this.width / 2;
                const ecy = this.y + this.height / 2;
                const pcx = player.x + (player.width || 0) / 2;
                const pcy = player.y + (player.height || 0) / 2;
                const dx = pcx - ecx;
                const dy = pcy - ecy;
                const mag = Math.sqrt(dx * dx + dy * dy) || 1;
                const speed = 420;

                this.thrownProjectiles.push({
                    x: ecx,
                    y: ecy,
                    width: 22,
                    height: 22,
                    velocityX: (dx / mag) * speed,
                    velocityY: (dy / mag) * speed - 40, // slight upward arc
                    damage: this.attackDamage,
                    lifetime: 2.2,
                    age: 0
                });

                this.facingRight = dx > 0;

                if (this.audioManager) {
                    this.audioManager.playSound('skunk_spray', { volume: 0.55, rate: 0.85 });
                }
            }
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
                } else if (HEAVY_BOSS_ATTACK_TYPES.has(this.enemyType)) {
                    this.audioManager.playSound('boss5_attack', 0.7);
                } else if (ALT_BOSS_SOUND_TYPES.has(this.enemyType)) {
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
     * Apply gravity, move vertically, and resolve platform collisions.
     * Extracted so it can be reused during boss entrance and normal frames.
     */
    _applyGravityAndCollision(dt, level) {
        this.velocityY += Config.GRAVITY * dt;
        if (this.velocityY > Config.MAX_FALL_SPEED) {
            this.velocityY = Config.MAX_FALL_SPEED;
        }

        const prevRect = { x: this.x, y: this.y, width: this.width, height: this.height };
        this.y += this.velocityY * dt;

        const rect = { x: this.x, y: this.y, width: this.width, height: this.height };
        const collision = level.checkPlatformCollision(rect, prevRect, this.velocityY);

        if (collision.collided) {
            this.y = collision.landingY;
            this.velocityY = 0;
        }

        // Safety clamp: prevent bosses from falling through the world entirely.
        // If the enemy is below all known platforms, snap them onto the nearest one.
        if (this.isBossType() && this.y + this.height > level.height + 40) {
            this._snapToNearestPlatform(level);
            this.velocityY = 0;
        }
    }

    /**
     * Snap this enemy onto the nearest platform that overlaps horizontally.
     * Used as a safety net after teleport, ground-slam, or falling too far.
     */
    _snapToNearestPlatform(level) {
        if (!level || !Array.isArray(level.platforms)) return;
        const bx = this.x;
        const bw = this.width || 128;
        const bh = this.height || 128;
        let bestPlatform = null;
        let bestDist = Infinity;
        for (const p of level.platforms) {
            if (!p || typeof p.x !== 'number') continue;
            // Must overlap horizontally
            if (bx + bw <= p.x || bx >= p.x + p.width) continue;
            const dist = Math.abs((this.y + bh) - p.y);
            if (dist < bestDist) {
                bestDist = dist;
                bestPlatform = p;
            }
        }
        if (bestPlatform) {
            this.y = bestPlatform.y - bh;
        }
    }

    /**
     * Start a boss-specific special attack based on ability type.
     */
    _startBossSpecial(player) {
        if (!this.isBossType() || !this.bossAbility) return;

        const ecx = this.x + this.width / 2;
        const pcx = player.x + (player.width || 0) / 2;

        switch (this.bossAbility) {
            case 'charge':
                // BOSS: Charge attack — telegraph then rush across the arena
                this.bossSpecialActive = true;
                this.bossSpecialTimer = 1.8; // total duration: 0.6s windup + 1.2s charge
                this.bossChargeDirX = ecx < pcx ? 1 : -1;
                this.bossChargeSpeed = 0; // starts at 0, builds up after windup
                this._bossChargeWindup = 0.6;
                if (this.audioManager) this.audioManager.playSound('boss_attack', { volume: 0.8, rate: 0.7 });
                break;

            case 'groundSlam':
                // BOSS2: Jump up then slam down creating a shockwave
                this.bossSpecialActive = true;
                this.bossSpecialTimer = 1.5;
                this.velocityY = -(Config.CHARACTER ? Config.CHARACTER.jump_force : 550) * 1.2;
                this._bossSlamPhase = 'jump'; // jump -> fall -> impact
                if (this.audioManager) this.audioManager.playSound('boss2_attack', { volume: 0.8, rate: 0.8 });
                break;

            case 'rapidStrike':
                // BOSS3: Rapid 3-hit combo with short delays
                this.bossSpecialActive = true;
                this.bossSpecialTimer = 1.6;
                this._bossRapidHits = 0;
                this._bossRapidDelay = 0;
                this.facingRight = ecx < pcx;
                if (this.audioManager) this.audioManager.playSound('boss2_attack', { volume: 0.8, rate: 1.2 });
                break;

            case 'projectile':
                // BOSS4: Fire a spread of 3 projectiles
                this.bossSpecialActive = true;
                this.bossSpecialTimer = 1.0;
                this._fireProjectileSpread(player);
                break;

            case 'teleport':
                // BOSS5: Vanish and reappear behind the player
                this.bossSpecialActive = true;
                this.bossSpecialTimer = 1.2;
                this._bossTeleportPhase = 'vanish'; // vanish -> reappear
                this._bossTeleportTarget = { x: pcx + (ecx < pcx ? 100 : -100), y: player.y };
                if (this.audioManager) this.audioManager.playSound('boss2_attack', { volume: 0.6, rate: 1.5 });
                break;

            case 'summon':
                // BOSS6: Defensive stance (reduced damage taken briefly)
                this.bossSpecialActive = true;
                this.bossSpecialTimer = 2.0;
                this._bossSummonShield = true;
                break;

            case 'crystalBarrage':
                // BOSS7: two quick crystal volleys with a wider spread than BOSS4.
                this.bossSpecialActive = true;
                this.bossSpecialTimer = 1.4;
                this._bossBarrageShotsRemaining = 2;
                this._bossBarrageShotDelay = 0;
                this.facingRight = ecx < pcx;
                break;
        }
    }

    /**
     * Update boss special attack each frame.
     */
    _updateBossSpecial(dt, player, level) {
        if (!this.bossAbility) return;

        switch (this.bossAbility) {
            case 'charge': {
                if (this._bossChargeWindup > 0) {
                    // Windup: shake in place
                    this._bossChargeWindup -= dt;
                    this.velocityX = (Math.random() - 0.5) * 40; // tremor
                } else {
                    // Rush forward at high speed
                    this.bossChargeSpeed = this.speed * 3.5;
                    this.velocityX = this.bossChargeDirX * this.bossChargeSpeed;
                    this.facingRight = this.bossChargeDirX > 0;
                    this.x += this.velocityX * dt;
                    // Clamp to level bounds so boss doesn't charge off-screen
                    if (level) {
                        this.x = Utils.clamp(this.x, 0, level.width - this.width);
                    }
                    // Set attack hitbox active during charge
                    this.isAttacking = true;
                    this.attackTimer = 0.1;
                    const offsetX = this.facingRight ? this.width : -this.attackHitbox.width;
                    this.attackHitbox.x = this.x + offsetX;
                    this.attackHitbox.y = this.y + (this.height - this.attackHitbox.height) / 2;
                }
                break;
            }

            case 'groundSlam': {
                if (this._bossSlamPhase === 'jump') {
                    // Wait until falling
                    if (this.velocityY > 0) {
                        this._bossSlamPhase = 'fall';
                        this.velocityY = 800; // Slam down fast
                    }
                } else if (this._bossSlamPhase === 'fall') {
                    // When landing (velocityY resets to 0 from collision, or clamped to floor)
                    if (this.velocityY === 0 || (level && this.y + this.height >= level.height - 10)) {
                        this._bossSlamPhase = 'impact';
                        // Snap to ground if we overshot
                        if (level) this._snapToNearestPlatform(level);
                        // Create shockwave hitbox (wider than normal attack)
                        this.isAttacking = true;
                        this.attackTimer = 0.3;
                        this.attackHitbox = {
                            x: this.x - 80,
                            y: this.y + this.height - 40,
                            width: this.width + 160,
                            height: 60
                        };
                        this.attackDamage = Math.floor(this.attackDamage * 1.5);
                        // Restore normal hitbox after slam
                        setTimeout(() => {
                            this.attackHitbox = { x: 0, y: 0, width: 120, height: 80 };
                            this.attackDamage = Math.floor(this.attackDamage / 1.5);
                        }, 400);
                        if (this.audioManager) this.audioManager.playSound('boss_attack', { volume: 1.0, rate: 0.5 });
                    }
                }
                break;
            }

            case 'rapidStrike': {
                this._bossRapidDelay -= dt;
                if (this._bossRapidDelay <= 0 && this._bossRapidHits < 3) {
                    // Execute a quick strike
                    this.isAttacking = true;
                    this.attackTimer = 0.2;
                    this._bossRapidHits++;
                    this._bossRapidDelay = 0.35;
                    // Update hitbox
                    const offsetX = this.facingRight ? this.width : -this.attackHitbox.width;
                    this.attackHitbox.x = this.x + offsetX;
                    this.attackHitbox.y = this.y + (this.height - this.attackHitbox.height) / 2;
                    if (this.audioManager) {
                        this.audioManager.playSound('boss2_attack', { volume: 0.6, rate: 1.0 + this._bossRapidHits * 0.15 });
                    }
                    if (this.animations.attack) this.animations.attack.reset();
                }
                this.velocityX = 0;
                break;
            }

            case 'projectile': {
                // Projectiles already fired in _startBossSpecial, just wait
                this.velocityX = 0;
                break;
            }

            case 'teleport': {
                if (this._bossTeleportPhase === 'vanish') {
                    // Make enemy "vanish" — move offscreen briefly
                    this._bossTeleportOldX = this.x;
                    this._bossTeleportOldY = this.y;
                    this.x = -999;
                    this.y = -999;
                    this._bossTeleportPhase = 'wait';
                    this._bossTeleportWait = 0.5;
                } else if (this._bossTeleportPhase === 'wait') {
                    this._bossTeleportWait -= dt;
                    if (this._bossTeleportWait <= 0) {
                        // Reappear behind/near player
                        const target = this._bossTeleportTarget;
                        this.x = (target && typeof target.x === 'number') ? target.x : this._bossTeleportOldX;
                        this.y = (target && typeof target.y === 'number') ? target.y : this._bossTeleportOldY;
                        // Snap to valid level bounds
                        if (level) {
                            this.x = Utils.clamp(this.x, 0, level.width - this.width);
                            // Snap to nearest platform below teleport target
                            this._snapToNearestPlatform(level);
                        }
                        this._bossTeleportPhase = 'strike';
                        // Immediate attack on reappear
                        this.isAttacking = true;
                        this.attackTimer = 0.4;
                        this.attackCooldownTimer = 0;
                        if (player) this.facingRight = this.x < player.x;
                        const offsetX = this.facingRight ? this.width : -this.attackHitbox.width;
                        this.attackHitbox.x = this.x + offsetX;
                        this.attackHitbox.y = this.y + (this.height - this.attackHitbox.height) / 2;
                        if (this.audioManager) this.audioManager.playSound('boss2_attack', { volume: 0.9, rate: 1.3 });
                    }
                }
                break;
            }

            case 'summon': {
                // Defensive stance: halved damage taken while active
                this.velocityX = 0;
                // Visual only — the actual damage reduction is handled in takeDamage
                break;
            }

            case 'crystalBarrage': {
                this.velocityX = 0;
                if (player) {
                    const ecx = this.x + this.width / 2;
                    const pcx = player.x + (player.width || 0) / 2;
                    this.facingRight = ecx < pcx;
                }
                this._bossBarrageShotDelay -= dt;
                if (this._bossBarrageShotsRemaining > 0 && this._bossBarrageShotDelay <= 0) {
                    this._fireProjectileSpread(player, {
                        count: 5,
                        spread: 0.18,
                        speed: 420,
                        damageScale: 0.75,
                        width: 20,
                        height: 20,
                        lifetime: 2.8,
                        palette: [
                            {
                                trailRgb: '70, 255, 190',
                                glowInner: 'rgba(120, 255, 210, 0.70)',
                                glowMid: 'rgba(30, 210, 150, 0.34)',
                                glowOuter: 'rgba(0, 90, 60, 0)',
                                coreColor: '#7FFFE1',
                                strokeColor: '#18C58D',
                                shardColor: 'rgba(210, 255, 240, 0.95)'
                            },
                            {
                                trailRgb: '60, 185, 255',
                                glowInner: 'rgba(120, 220, 255, 0.74)',
                                glowMid: 'rgba(40, 150, 255, 0.34)',
                                glowOuter: 'rgba(0, 70, 170, 0)',
                                coreColor: '#78D8FF',
                                strokeColor: '#1B7FFF',
                                shardColor: 'rgba(225, 247, 255, 0.95)'
                            }
                        ],
                        projectileShape: 'crystal',
                        soundVolume: 0.78,
                        soundRate: 1.2
                    });
                    if (this.animations.attack) this.animations.attack.reset();
                    this._bossBarrageShotsRemaining--;
                    this._bossBarrageShotDelay = 0.32;
                }
                break;
            }
        }
    }

    /**
     * Fire a spread of 3 projectiles (BOSS4 special).
     */
    _fireProjectileSpread(player, opts = null) {
        if (!player) return;
        const options = opts || {};
        const ecx = this.x + this.width / 2;
        const ecy = this.y + this.height / 2;
        const pcx = player.x + (player.width || 0) / 2;
        const pcy = player.y + (player.height || 0) / 2;
        const baseAngle = Math.atan2(pcy - ecy, pcx - ecx);
        const count = Math.max(1, Math.floor(typeof options.count === 'number' ? options.count : 3));
        const spread = (typeof options.spread === 'number') ? options.spread : 0.25;
        const speed = (typeof options.speed === 'number') ? options.speed : 350;
        const damageScale = (typeof options.damageScale === 'number') ? options.damageScale : 0.6;
        const projectileWidth = (typeof options.width === 'number') ? options.width : 18;
        const projectileHeight = (typeof options.height === 'number') ? options.height : 18;
        const lifetime = (typeof options.lifetime === 'number') ? options.lifetime : 2.5;
        const centerIndex = (count - 1) / 2;
        const trailRgb = (typeof options.trailRgb === 'string') ? options.trailRgb : '160, 60, 255';
        const glowInner = (typeof options.glowInner === 'string') ? options.glowInner : 'rgba(200, 80, 255, 0.55)';
        const glowMid = (typeof options.glowMid === 'string') ? options.glowMid : 'rgba(150, 40, 255, 0.25)';
        const glowOuter = (typeof options.glowOuter === 'string') ? options.glowOuter : 'rgba(120, 0, 255, 0)';
        const coreColor = (typeof options.coreColor === 'string') ? options.coreColor : '#CC44FF';
        const strokeColor = (typeof options.strokeColor === 'string') ? options.strokeColor : '#8800CC';
        const shardColor = (typeof options.shardColor === 'string') ? options.shardColor : 'rgba(255, 255, 255, 0.92)';
        const projectileShape = (typeof options.projectileShape === 'string') ? options.projectileShape : 'orb';
        const palette = Array.isArray(options.palette) ? options.palette.filter((entry) => entry && typeof entry === 'object') : null;

        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (i - centerIndex) * spread;
            const paletteEntry = (palette && palette.length > 0) ? palette[i % palette.length] : null;
            this.thrownProjectiles = this.thrownProjectiles || [];
            this.thrownProjectiles.push({
                x: ecx,
                y: ecy,
                width: projectileWidth,
                height: projectileHeight,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                damage: Math.floor(this.attackDamage * damageScale),
                lifetime,
                age: 0,
                trailRgb: (paletteEntry && typeof paletteEntry.trailRgb === 'string') ? paletteEntry.trailRgb : trailRgb,
                glowInner: (paletteEntry && typeof paletteEntry.glowInner === 'string') ? paletteEntry.glowInner : glowInner,
                glowMid: (paletteEntry && typeof paletteEntry.glowMid === 'string') ? paletteEntry.glowMid : glowMid,
                glowOuter: (paletteEntry && typeof paletteEntry.glowOuter === 'string') ? paletteEntry.glowOuter : glowOuter,
                coreColor: (paletteEntry && typeof paletteEntry.coreColor === 'string') ? paletteEntry.coreColor : coreColor,
                strokeColor: (paletteEntry && typeof paletteEntry.strokeColor === 'string') ? paletteEntry.strokeColor : strokeColor,
                shardColor: (paletteEntry && typeof paletteEntry.shardColor === 'string') ? paletteEntry.shardColor : shardColor,
                projectileShape
            });
        }
        this.facingRight = pcx > ecx;
        if (this.audioManager) {
            this.audioManager.playSound('boss2_attack', {
                volume: (typeof options.soundVolume === 'number') ? options.soundVolume : 0.7,
                rate: (typeof options.soundRate === 'number') ? options.soundRate : 1.1
            });
        }
    }

    /**
     * FIFTH_BASIC Thrower: move and cull active projectiles.
     */
    _updateThrownProjectiles(dt, level) {
        for (let i = this.thrownProjectiles.length - 1; i >= 0; i--) {
            const p = this.thrownProjectiles[i];
            p.x += p.velocityX * dt;
            p.y += p.velocityY * dt;
            p.velocityY += Config.GRAVITY * 0.18 * dt; // gentle arc
            p.age += dt;
            if (p.age >= p.lifetime) { this.thrownProjectiles.splice(i, 1); continue; }
            if (level && (p.x < -100 || p.x > level.width + 100 || p.y > level.height + 100)) {
                this.thrownProjectiles.splice(i, 1); continue;
            }
        }
    }

    /**
     * Draw active projectiles for ranged enemies and bosses.
     */
    drawProjectiles(ctx, cameraX, cameraY) {
        if (!this.thrownProjectiles || this.thrownProjectiles.length === 0) return;
        for (const proj of this.thrownProjectiles) {
            const sx = proj.x - cameraX;
            const sy = proj.y - cameraY;
            ctx.save();
            ctx.translate(sx, sy);

            // Motion trail
            const mag = Math.sqrt(proj.velocityX * proj.velocityX + proj.velocityY * proj.velocityY) || 1;
            const nx = proj.velocityX / mag;
            const ny = proj.velocityY / mag;
            for (let j = 1; j <= 3; j++) {
                const a = ((3 - j) / 3) * 0.28;
                const trailRgb = (typeof proj.trailRgb === 'string') ? proj.trailRgb : '160, 60, 255';
                ctx.fillStyle = `rgba(${trailRgb}, ${a})`;
                ctx.beginPath();
                ctx.arc(-nx * j * 8, -ny * j * 8, proj.width * (1 - j / 3 * 0.5) / 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Outer glow
            const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, proj.width * 1.4);
            glow.addColorStop(0, proj.glowInner || 'rgba(200, 80, 255, 0.55)');
            glow.addColorStop(0.5, proj.glowMid || 'rgba(150, 40, 255, 0.25)');
            glow.addColorStop(1, proj.glowOuter || 'rgba(120, 0, 255, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, proj.width * 1.4, 0, Math.PI * 2);
            ctx.fill();

            if (proj.projectileShape === 'crystal') {
                const halfW = proj.width / 2;
                const halfH = proj.height / 2;

                // Main faceted crystal body.
                ctx.fillStyle = proj.coreColor || '#CC44FF';
                ctx.strokeStyle = proj.strokeColor || '#8800CC';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -halfH);
                ctx.lineTo(halfW * 0.72, 0);
                ctx.lineTo(0, halfH);
                ctx.lineTo(-halfW * 0.72, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Inner shard highlight for a more crystalline read.
                ctx.fillStyle = proj.shardColor || 'rgba(255, 255, 255, 0.92)';
                ctx.beginPath();
                ctx.moveTo(0, -halfH * 0.72);
                ctx.lineTo(halfW * 0.24, -halfH * 0.08);
                ctx.lineTo(0, halfH * 0.28);
                ctx.lineTo(-halfW * 0.18, -halfH * 0.1);
                ctx.closePath();
                ctx.fill();

                // Small trailing shard.
                ctx.globalAlpha = 0.7;
                ctx.fillStyle = proj.strokeColor || '#8800CC';
                ctx.beginPath();
                ctx.moveTo(-nx * 6, -ny * 6);
                ctx.lineTo(-nx * 10 + ny * 3, -ny * 10 - nx * 3);
                ctx.lineTo(-nx * 13, -ny * 13);
                ctx.lineTo(-nx * 10 - ny * 3, -ny * 10 + nx * 3);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1;
            } else {
                // Core orb
                ctx.fillStyle = proj.coreColor || '#CC44FF';
                ctx.strokeStyle = proj.strokeColor || '#8800CC';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, proj.width / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            ctx.restore();
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
            // If animation exists but has no sprite sheet, attempt a synchronous reload
            // (sprites may have become available since construction via whenReady callback)
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
                    }
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

            // --- AoE danger radius ring (shows blast zone preview) ---
            ctx.save();
            const radius = Config.EXPLODER_EXPLOSION_RADIUS || 120;
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const ringAlpha = 0.08 + fuseProgress * 0.18; // Fades in as fuse burns
            const ringPulse = 1 + Math.sin(Date.now() * 0.01) * 0.04;

            // Filled danger zone (subtle red wash)
            ctx.globalAlpha = ringAlpha * 0.5;
            ctx.fillStyle = '#FF2200';
            ctx.beginPath();
            ctx.arc(cx, cy, radius * ringPulse, 0, Math.PI * 2);
            ctx.fill();

            // Dashed ring outline
            ctx.globalAlpha = ringAlpha + 0.1;
            ctx.strokeStyle = fuseProgress > 0.7 ? '#FF2200' : '#FF6600';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.arc(cx, cy, radius * ringPulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

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

        // SECOND_BASIC: shield bubble overlay
        if (this.enemyType === 'SECOND_BASIC' && (this.shieldActive || (this.shieldBreakFlash && this.shieldBreakFlash > 0) || (this.shieldParticles && this.shieldParticles.length > 0))) {
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const radius = Math.max(this.width, this.height) * 0.62;

            if (this.shieldActive) {
                ctx.save();
                const pulse = 0.7 + Math.sin(Date.now() * 0.006) * 0.3;
                const flashBoost = (this.shieldBreakFlash && this.shieldBreakFlash > 0) ? (this.shieldBreakFlash / 0.28) : 0;

                // Outer radial glow
                const outerGrad = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius * 1.2);
                outerGrad.addColorStop(0, `rgba(80, 200, 255, ${(0.12 * pulse + flashBoost * 0.25).toFixed(3)})`);
                outerGrad.addColorStop(0.6, `rgba(40, 120, 255, ${(0.2 * pulse + flashBoost * 0.15).toFixed(3)})`);
                outerGrad.addColorStop(1, 'rgba(0, 60, 200, 0)');
                ctx.fillStyle = outerGrad;
                ctx.beginPath();
                ctx.arc(cx, cy, radius * 1.2, 0, Math.PI * 2);
                ctx.fill();

                // Bubble outline
                ctx.globalAlpha = Math.min(1, 0.55 + pulse * 0.25 + flashBoost * 0.4);
                ctx.strokeStyle = flashBoost > 0.1 ? '#FFFFFF' : '#88EEFF';
                ctx.lineWidth = 2.5;
                ctx.shadowColor = '#44AAFF';
                ctx.shadowBlur = 14 + flashBoost * 10;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Progress arc (clockwise, shows remaining shield time)
                const duration = Config.SECOND_BASIC_SHIELD_DURATION || 1.0;
                const progress = Math.max(0, this.shieldTimer / duration);
                ctx.globalAlpha = 0.75;
                ctx.strokeStyle = '#AADDFF';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(cx, cy, radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
                ctx.stroke();

                // Shield icon above enemy
                ctx.globalAlpha = 0.9;
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#AADDFF';
                ctx.fillText('🛡', cx, this.y - 16);

                ctx.restore();
            }

            // Shield impact burst particles
            if (this.shieldParticles && this.shieldParticles.length > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                for (const p of this.shieldParticles) {
                    const alpha = (1 - p.age / p.life) * 0.9;
                    ctx.globalAlpha = alpha;
                    const pGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                    pGrad.addColorStop(0, '#FFFFFF');
                    pGrad.addColorStop(0.4, '#88DDFF');
                    pGrad.addColorStop(1, 'rgba(40, 120, 255, 0)');
                    ctx.fillStyle = pGrad;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        // Draw health bar (kamikaze gets distinct orange/red bar)
        // Bosses get their health displayed in the dedicated UI bar — skip the small overhead bar
        if (this.isBossType()) {
            // Boss aura glow effect
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const hpPct = this.health / this.maxHealth;
            const pulseSpeed = this.bossEnraged ? 0.012 : 0.006;
            const pulse = 0.3 + Math.sin(this.bossAuraTimer * Math.PI * 2 * (pulseSpeed * 1000)) * 0.15;
            const auraRadius = this.width * 0.85;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = pulse;

            let auraColor1, auraColor2;
            if (this.bossDesparate) {
                auraColor1 = 'rgba(255, 0, 0, 0.4)';
                auraColor2 = 'rgba(255, 80, 0, 0)';
            } else if (this.bossEnraged) {
                auraColor1 = 'rgba(255, 120, 0, 0.3)';
                auraColor2 = 'rgba(255, 60, 0, 0)';
            } else {
                auraColor1 = 'rgba(100, 200, 255, 0.15)';
                auraColor2 = 'rgba(60, 120, 200, 0)';
            }

            const auraGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraRadius);
            auraGrad.addColorStop(0, auraColor1);
            auraGrad.addColorStop(1, auraColor2);
            ctx.fillStyle = auraGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
            ctx.fill();

            // Boss entrance effect: bright flash that fades
            if (!this.bossEntranceDone && this.bossEntranceTimer < 1.5) {
                const entranceAlpha = Math.max(0, 1 - this.bossEntranceTimer / 1.5) * 0.7;
                ctx.globalAlpha = entranceAlpha;
                const entranceGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraRadius * 2);
                entranceGrad.addColorStop(0, '#FFFFFF');
                entranceGrad.addColorStop(0.5, '#FFD700');
                entranceGrad.addColorStop(1, 'rgba(255, 200, 0, 0)');
                ctx.fillStyle = entranceGrad;
                ctx.beginPath();
                ctx.arc(cx, cy, auraRadius * 2 * (this.bossEntranceTimer / 1.5), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            // Teleport vanish effect (boss5)
            if (this.bossAbility === 'teleport' && this.bossSpecialActive && this._bossTeleportPhase === 'wait') {
                // Boss has vanished — draw a shimmer at old position
                ctx.save();
                ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.02) * 0.2;
                ctx.strokeStyle = '#88CCFF';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(this._bossTeleportOldX || this.x, this._bossTeleportOldY || this.y, this.width, this.height);
                ctx.setLineDash([]);
                ctx.restore();
            }

            // Charge windup visual telegraph (boss1)
            if (this.bossAbility === 'charge' && this.bossSpecialActive && this._bossChargeWindup > 0) {
                ctx.save();
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#FFAA00';
                const arrowDir = this.bossChargeDirX || 1;
                const arrowX = arrowDir > 0 ? this.x + this.width + 10 : this.x - 30;
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(arrowDir > 0 ? '▶▶' : '◀◀', arrowX, this.y + this.height / 2);
                ctx.restore();
            }

            // Ground slam impact visual (boss2)
            if (this.bossAbility === 'groundSlam' && this._bossSlamPhase === 'impact') {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.6;
                const impactGrad = ctx.createRadialGradient(cx, this.y + this.height, 0, cx, this.y + this.height, 160);
                impactGrad.addColorStop(0, '#FFFFFF');
                impactGrad.addColorStop(0.3, '#FFD700');
                impactGrad.addColorStop(1, 'rgba(255, 200, 0, 0)');
                ctx.fillStyle = impactGrad;
                ctx.beginPath();
                ctx.arc(cx, this.y + this.height, 160, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Summon shield visual (boss6)
            if (this._bossSummonShield && this.bossSpecialActive) {
                ctx.save();
                const shieldPulse = 0.3 + Math.sin(Date.now() * 0.008) * 0.15;
                ctx.globalAlpha = shieldPulse;
                ctx.strokeStyle = '#88FF88';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(cx, cy, this.width * 0.8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        } else {
            // Non-boss enemies: draw the small overhead health bar
            const barWidth = this.width;
            const barHeight = 4;
            const barY = this.y - 10;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(this.x, barY, barWidth, barHeight);

            const healthPercent = this.health / this.maxHealth;
            if (this.enemyType === 'THIRD_BASIC') {
                // Kamikaze: orange → red bar (always looks dangerous)
                ctx.fillStyle = healthPercent > 0.5 ? '#FF8800' : '#FF2200';
            } else {
                ctx.fillStyle = healthPercent > 0.5 ? '#00FF00' : healthPercent > 0.25 ? '#FFFF00' : '#FF0000';
            }
            ctx.fillRect(this.x, barY, barWidth * healthPercent, barHeight);
        }

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
