/**
 * Enemy manager - spawning and management
 */

class EnemyManager {
    constructor(audioManager = null) {
        this.audioManager = audioManager;
        this.enemies = [];
        this.spawnTimer = 0;
        this.spawnInterval = 3.0; // Seconds between spawns
        this.maxEnemies = 5;
        this.waveNumber = 1;
        this.enemiesDefeated = 0;
    }

    reset() {
        this.enemies = [];
        this.spawnTimer = 0;
        this.waveNumber = 1;
        this.enemiesDefeated = 0;
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

        // Randomly choose enemy type (adjusted): 45% BASIC, 20% FAST_BASIC, 35% SECOND_BASIC
        const rand = Math.random();
        const enemyType = rand < 0.45 ? "BASIC" : rand < 0.65 ? "FAST_BASIC" : "SECOND_BASIC";
        const enemy = new Enemy(sx, sy, enemyType, this.audioManager);
        this.enemies.push(enemy);
    }

    update(dt, player, level) {
        // Update spawn timer
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnEnemy(level);
        }

        // Update all enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(dt, player, level);

            // Remove dead enemies
            if (enemy.health <= 0) {
                this.enemies.splice(i, 1);
                this.enemiesDefeated++;
            }
            // Remove enemies that fell off the map
            else if (enemy.y > level.height + 100) {
                this.enemies.splice(i, 1);
            }
        }
    }

    checkPlayerAttack(player) {
        if (!player.isAttacking) {
            return { hit: false, enemiesHit: 0, totalDamage: 0 };
        }

        let enemiesHit = 0;
        let totalDamage = 0;

        for (const enemy of this.enemies) {
            // Check if enemy hasn't been hit yet in this attack
            if (!player.hitEnemies.has(enemy)) {
                // Check collision between attack hitbox and enemy
                if (Utils.rectCollision(player.attackHitbox, enemy.getRect())) {
                    const knockbackDir = player.facingRight ? 1 : -1;
                    const damage = player.isShadowStriking ? 
                        player.attackDamage * 1.5 : player.attackDamage;
                    
                    enemy.takeDamage(damage, knockbackDir);
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
                if (Utils.rectCollision(enemy.attackHitbox, player.getRect())) {
                    return player.takeDamage(enemy.attackDamage, enemy);
                }
            }
        }
        return false;
    }

    draw(ctx, cameraX = 0, cameraY = 0) {
        for (const enemy of this.enemies) {
            enemy.draw(ctx, cameraX, cameraY);
        }
    }

    getEnemies() {
        return this.enemies;
    }
}
