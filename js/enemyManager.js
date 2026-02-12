/**
 * Enemy manager - spawning and management
 */

class EnemyManager {
    constructor(audioManager = null, itemManager = null) {
        this.audioManager = audioManager;
        this.itemManager = itemManager;
        this.enemies = [];
        this.spawnTimer = 0;
        this.spawnInterval = 3.0; // Seconds between spawns
        this.maxEnemies = 5;
        this.waveNumber = 1;
        this.enemiesDefeated = 0;
        this.spawningEnabled = true;
        this.bossInstance = null;
    }

    reset() {
        this.enemies = [];
        this.spawnTimer = 0;
        this.waveNumber = 1;
        this.enemiesDefeated = 0;
        this.spawningEnabled = true;
        this.bossInstance = null;
        // Start with a longer spawn delay on reset to give player breathing room
        this.spawnTimer = -2.0; // Don't spawn for first 2 seconds
    }

    isBossType(enemyType) {
        return enemyType === 'BOSS' || enemyType === 'BOSS2' || enemyType === 'BOSS3' || enemyType === 'BOSS4';
    }

    getBoss() {
        return this.enemies.find(e => e && this.isBossType(e.enemyType)) || null;
    }

    hasBossAlive() {
        const boss = this.getBoss();
        return !!(boss && boss.health > 0);
    }

    clearNonBossEnemies() {
        this.enemies = this.enemies.filter(e => e && this.isBossType(e.enemyType));
    }

    spawnBoss(bossConfig, level = null) {
        if (!bossConfig) return null;

        // Only one boss at a time
        const existing = this.getBoss();
        if (existing) {
            this.bossInstance = existing;
            return existing;
        }

        const fallbackX = (level && typeof level.width === 'number') ? (level.width - 520) : 0;
        const x = (typeof bossConfig.spawnX === 'number') ? bossConfig.spawnX : fallbackX;
        const y = (typeof bossConfig.spawnY === 'number') ? bossConfig.spawnY : 520;

        const bossType = (bossConfig && typeof bossConfig.type === 'string') ? bossConfig.type : 'BOSS';
        const boss = new Enemy(x, y, bossType, this.audioManager);

        // Snap boss onto the nearest supporting platform to avoid falling through gaps
        try {
            if (level && Array.isArray(level.platforms) && level.platforms.length > 0) {
                const bx = boss.x;
                const bw = boss.width || 128;
                const candidates = level.platforms.filter(p => {
                    if (!p || typeof p.x !== 'number' || typeof p.width !== 'number' || typeof p.y !== 'number') return false;
                    const overlap = (bx + bw) > p.x && bx < (p.x + p.width);
                    return overlap;
                });
                if (candidates.length > 0) {
                    // Prefer the highest platform below current spawn
                    const target = candidates.reduce((best, p) => {
                        if (!best) return p;
                        return (p.y > best.y) ? p : best;
                    }, null);
                    if (target) boss.y = target.y - (boss.height || 128);
                }
            }
        } catch (e) { __err('enemy', e); }

        // Apply multipliers if provided
        const hm = (typeof bossConfig.healthMultiplier === 'number') ? bossConfig.healthMultiplier : 5.0;
        const sm = (typeof bossConfig.speedMultiplier === 'number') ? bossConfig.speedMultiplier : 1.0;
        const dm = (typeof bossConfig.attackDamageMultiplier === 'number') ? bossConfig.attackDamageMultiplier : 2.0;

        boss.maxHealth = Math.max(1, Math.floor(boss.maxHealth * hm));
        boss.health = boss.maxHealth;
        boss.speed = boss.speed * sm;
        boss.attackDamage = boss.attackDamage * dm;

        // Ensure movement uses updated speed
        boss.velocityX = -boss.speed;

        // Make boss feel more “boss-like” without new AI
        boss.detectionRange = Math.max(boss.detectionRange || 300, 520);
        boss.attackRange = Math.max(boss.attackRange || 80, 110);

        this.enemies.push(boss);
        this.bossInstance = boss;
        try {
            if (typeof Config !== 'undefined' && Config.DEBUG) console.log('EnemyManager.spawnBoss', { x: boss.x, y: boss.y, hp: boss.maxHealth });
        } catch (e) { __err('enemy', e); }
        return boss;
    }

    spawnEnemy(level) {
        if (this.enemies.length >= this.maxEnemies) {
            return;
        }

        // Choose spawn point: prefer level.spawnPoints if provided
        let sx = null;
        let sy = null;
        try {
            if (level && Array.isArray(level.spawnPoints) && level.spawnPoints.length > 0) {
                const sp = level.spawnPoints[Utils.randomInt(0, level.spawnPoints.length - 1)];
                // sp.x can be 'left'|'right' or a number
                if (typeof sp.x === 'string') {
                    if (sp.x === 'left') sx = -50;
                    else if (sp.x === 'right') sx = level.width + 50;
                } else if (typeof sp.x === 'number') {
                    sx = sp.x;
                }
                sy = (typeof sp.y === 'number') ? sp.y : (300 + Utils.randomInt(-50, 50));
            }
        } catch (e) { /* ignore */ }

        // Fallback spawn right if none selected
        if (sx === null) sx = level.width + 50;
        if (sy === null) sy = 300 + Utils.randomInt(-50, 50);

        // Check for allowed types, otherwise default
        let enemyType = "BASIC";
        if (this.allowedEnemyTypes && Array.isArray(this.allowedEnemyTypes) && this.allowedEnemyTypes.length > 0) {
            enemyType = this.allowedEnemyTypes[Utils.randomInt(0, this.allowedEnemyTypes.length - 1)];
        } else {
            // Default distribution
            const rand = Math.random();
            enemyType = rand < 0.45 ? "BASIC" : rand < 0.65 ? "FAST_BASIC" : "SECOND_BASIC";
        }
        
        const enemy = new Enemy(sx, sy, enemyType, this.audioManager);
        this.enemies.push(enemy);

        // Play spawn sound with slight randomisation
        if (this.audioManager) {
            const rate = 0.92 + Math.random() * 0.16; // 0.92..1.08
            this.audioManager.playSound('enemy_spawn', { volume: 0.45, rate });
        }

        try {
            if (typeof Config !== 'undefined' && Config.DEBUG) console.log('EnemyManager.spawnEnemy', { type: enemyType, x: enemy.x, y: enemy.y, levelWidth: level && level.width, total: this.enemies.length });
        } catch (e) { __err('enemy', e); }
    }

    update(dt, player, level) {
        // Update spawn timer
        this.spawnTimer += dt;
        if (this.spawningEnabled && this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnEnemy(level);
        }

        // Track explosions that happen this frame (for AoE damage)
        this._pendingExplosions = [];

        // Update all enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(dt, player, level);

            // Remove dead enemies
            if (enemy.health <= 0) {
                // THIRD_BASIC (Kamikaze): trigger detonation on death if not already detonated
                if (enemy.enemyType === 'THIRD_BASIC' && !enemy.hasDetonated) {
                    enemy.detonate();
                }

                // If this was a kamikaze that just detonated, record it for AoE processing
                if (enemy.enemyType === 'THIRD_BASIC' && enemy.hasDetonated) {
                    this._pendingExplosions.push({
                        x: enemy.x + enemy.width / 2,
                        y: enemy.y + enemy.height / 2,
                        radius: Config.EXPLODER_EXPLOSION_RADIUS || 120,
                        enemyDamage: Config.EXPLODER_EXPLOSION_ENEMY_DAMAGE || 30,
                        playerDamage: Config.EXPLODER_EXPLOSION_DAMAGE || 25,
                        enemy: enemy // keep ref for particles/visual
                    });
                }

                // Try to drop an item at enemy location
                this.tryDropItem(enemy);
                
                this.enemies.splice(i, 1);
                this.enemiesDefeated++;
            }
            // Remove enemies that fell off the map
            else if (enemy.y > level.height + 100) {
                this.enemies.splice(i, 1);
            }
        }

        // Apply AoE damage from kamikaze explosions to surviving enemies
        for (const explosion of this._pendingExplosions) {
            for (const enemy of this.enemies) {
                // Don't damage other kamikazes that are already detonating
                if (enemy.enemyType === 'THIRD_BASIC' && enemy.hasDetonated) continue;

                const ecx = enemy.x + enemy.width / 2;
                const ecy = enemy.y + enemy.height / 2;
                const dx = explosion.x - ecx;
                const dy = explosion.y - ecy;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < explosion.radius) {
                    // Damage falls off with distance
                    const falloff = 1 - (dist / explosion.radius);
                    const damage = Math.floor(explosion.enemyDamage * falloff);
                    if (damage > 0) {
                        const knockDir = ecx > explosion.x ? 1 : -1;
                        enemy.takeDamage(damage, knockDir, { knockback: 300 * falloff, hitStun: 0.3 });
                    }
                }
            }
        }
    }

    checkPlayerAttack(player) {
        if (!player.isAttacking) {
            return { hit: false, enemiesHit: 0, totalDamage: 0 };
        }

        // If the player exposes an active-frame window for attacks, respect it.
        // This prevents damage during windup/recovery on special moves.
        try {
            if (typeof player.isAttackDamageActive === 'function' && !player.isAttackDamageActive()) {
                return { hit: false, enemiesHit: 0, totalDamage: 0 };
            }
        } catch (e) { /* ignore */ }

        // Prefer a swept/expanded hitbox for fast dash attacks.
        let attackBox = player.attackHitbox;
        try {
            if (typeof player.getAttackHitboxForCollision === 'function') {
                const hb = player.getAttackHitboxForCollision();
                if (hb) attackBox = hb;
            }
        } catch (e) { /* ignore */ }

        let enemiesHit = 0;
        let totalDamage = 0;

        for (const enemy of this.enemies) {
            // Check if enemy hasn't been hit yet in this attack
            if (!player.hitEnemies.has(enemy)) {
                // Check collision between attack hitbox and enemy
                if (Utils.rectCollision(attackBox, enemy.getRect())) {
                    const knockbackDir = player.facingRight ? 1 : -1;
                    const isShadow = !!player.isShadowStriking;
                    // Use getCurrentDamage() to apply damage boost multiplier
                    const baseDamage = typeof player.getCurrentDamage === 'function' ? player.getCurrentDamage() : player.attackDamage;
                    const damage = isShadow ? Math.floor(baseDamage * 2) : baseDamage;

                    if (isShadow && this.audioManager && typeof this.audioManager.playSound === 'function' && enemiesHit === 0) {
                        this.audioManager.playSound('shadow_strike_hit', { volume: 0.78, rate: 1.02 });
                    }
                    
                    if (isShadow) {
                        enemy.takeDamage(damage, knockbackDir, { knockback: 420, hitStun: 0.45 });
                    } else {
                        enemy.takeDamage(damage, knockbackDir);
                    }
                    player.hitEnemies.add(enemy);
                    enemiesHit++;
                    totalDamage += damage;
                }
            }
        }

        return { hit: enemiesHit > 0, enemiesHit, totalDamage };
    }

    checkEnemyAttacks(player) {
        for (const enemy of this.enemies) {
            if (enemy.isAttacking) {
                // If enemy exposes an active-frame window for attacks, respect it.
                try {
                    if (typeof enemy.isAttackDamageActive === 'function' && !enemy.isAttackDamageActive()) {
                        continue;
                    }
                } catch (e) { /* ignore */ }
                if (Utils.rectCollision(enemy.attackHitbox, player.getRect())) {
                    const result = player.takeDamage(enemy.attackDamage, enemy);
                    // Return damage taken for stat tracking
                    return { hit: result, damage: enemy.attackDamage };
                }
            }
        }
        return { hit: false, damage: 0 };
    }

    draw(ctx, cameraX = 0, cameraY = 0) {
        for (const enemy of this.enemies) {
            enemy.draw(ctx, cameraX, cameraY);
        }
    }

    getEnemies() {
        return this.enemies;
    }

    /**
     * Try to drop an item when an enemy is defeated
     */
    tryDropItem(enemy) {
        if (!this.itemManager || !enemy) return;

        const dropX = enemy.x + (enemy.width || 48) / 2;
        const dropY = enemy.y + (enemy.height || 48) / 2;

        // Boss enemies have higher drop rates
        const isBoss = this.isBossType(enemy.enemyType);
        const healthRegenRate = isBoss ? 0.5 : (Config.HEALTH_REGEN_DROP_RATE || 0.15);
        const extraLifeRate = isBoss ? 0.01 : 0; // 1% from bosses, 0% from regular enemies
        // Speed boost and damage boost are placed in levels, not dropped

        // Roll for extra life first (rarest)
        if (Math.random() < extraLifeRate) {
            this.itemManager.spawnExtraLife(dropX, dropY);
        }
        // Then roll for health regen
        else if (Math.random() < healthRegenRate) {
            this.itemManager.spawnHealthRegen(dropX, dropY);
        }
    }
}
