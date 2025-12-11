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

        // Random spawn position (off screen to the right)
        const spawnX = level.width + 50;
        const spawnY = 300 + Utils.randomInt(-50, 50);

        const enemy = new Enemy(spawnX, spawnY, "BASIC", this.audioManager);
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

    draw(ctx, cameraX = 0) {
        for (const enemy of this.enemies) {
            enemy.draw(ctx, cameraX);
        }
    }

    getEnemies() {
        return this.enemies;
    }
}
