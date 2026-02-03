/**
 * Item and pickup management system
 */

class ItemManager {
    constructor(audioManager = null) {
        this.audioManager = audioManager;
        this.items = [];
        this.nextItemId = 0;
    }

    /**
     * Spawn a health regen pickup at the specified location
     */
    spawnHealthRegen(x, y) {
        const item = {
            id: this.nextItemId++,
            type: 'HEALTH_REGEN',
            x: x,
            y: y,
            width: Config.HEALTH_REGEN_ITEM_SIZE || 32,
            height: Config.HEALTH_REGEN_ITEM_SIZE || 32,
            collected: false,
            // Simple bounce animation
            baseY: y,
            bounceOffset: 0,
            bounceSpeed: 2.0,
            // Rotation for visual interest
            rotation: 0,
            rotationSpeed: 2.0
        };
        this.items.push(item);
        return item;
    }

    /**
     * Spawn an extra life pickup at the specified location
     */
    spawnExtraLife(x, y) {
        const item = {
            id: this.nextItemId++,
            type: 'EXTRA_LIFE',
            x: x,
            y: y,
            width: Config.EXTRA_LIFE_ITEM_SIZE || 32,
            height: Config.EXTRA_LIFE_ITEM_SIZE || 32,
            collected: false,
            // Gentle float animation
            baseY: y,
            bounceOffset: 0,
            bounceSpeed: 1.5,
            // Pulse effect
            scale: 1.0,
            pulseSpeed: 3.0,
            // Sparkle particles for visual appeal
            sparkles: []
        };
        this.items.push(item);
        return item;
    }

    /**
     * Spawn a golden idol collectible at the specified location
     */
    spawnGoldenIdol(x, y, idolIndex = 0, levelId = null) {
        const item = {
            id: this.nextItemId++,
            type: 'GOLDEN_IDOL',
            x: x,
            y: y,
            width: Config.IDOL_ITEM_SIZE || 30,
            height: Config.IDOL_ITEM_SIZE || 30,
            collected: false,
            idolIndex: idolIndex,
            levelId: levelId,
            // Float + gentle rotation
            baseY: y,
            bounceOffset: 0,
            bounceSpeed: 1.9,
            rotation: 0,
            rotationSpeed: 1.2,
            scale: 1.0,
            pulseSpeed: 2.5,
            // Light rays for divine appearance
            rayRotation: 0,
            // Shimmer particles
            shimmerParticles: []
        };
        this.items.push(item);
        return item;
    }

    /**
     * Spawn a speed boost pickup at the specified location
     */
    spawnSpeedBoost(x, y) {
        const item = {
            id: this.nextItemId++,
            type: 'SPEED_BOOST',
            x: x,
            y: y,
            width: Config.SPEED_BOOST_ITEM_SIZE || 32,
            height: Config.SPEED_BOOST_ITEM_SIZE || 32,
            collected: false,
            // Fast bounce for energy feel
            baseY: y,
            bounceOffset: 0,
            bounceSpeed: 3.5,
            // Rapid rotation
            rotation: 0,
            rotationSpeed: 4.0,
            // Fast pulse
            scale: 1.0,
            pulseSpeed: 5.0
        };
        this.items.push(item);
        return item;
    }

    /**
     * Spawn a damage boost pickup at the specified location
     */
    spawnDamageBoost(x, y) {
        const item = {
            id: this.nextItemId++,
            type: 'DAMAGE_BOOST',
            x: x,
            y: y,
            width: Config.DAMAGE_BOOST_ITEM_SIZE || 32,
            height: Config.DAMAGE_BOOST_ITEM_SIZE || 32,
            collected: false,
            // Aggressive bounce for power feel
            baseY: y,
            bounceOffset: 0,
            bounceSpeed: 3.0,
            // Fast rotation
            rotation: 0,
            rotationSpeed: 3.5,
            // Strong pulse
            scale: 1.0,
            pulseSpeed: 4.5,
            // Energy particles
            energyParticles: []
        };
        this.items.push(item);
        return item;
    }

    /**
     * Spawn a skunk power-up pickup at the specified location
     */
    spawnSkunkPowerup(x, y) {
        const item = {
            id: this.nextItemId++,
            type: 'SKUNK_POWERUP',
            x: x,
            y: y,
            width: Config.SKUNK_POWERUP_ITEM_SIZE || 32,
            height: Config.SKUNK_POWERUP_ITEM_SIZE || 32,
            collected: false,
            // Bouncy animation for cartoon feel
            baseY: y,
            bounceOffset: 0,
            bounceSpeed: 3.0,
            // Rotation
            rotation: 0,
            rotationSpeed: 2.5,
            // Pulse
            scale: 1.0,
            pulseSpeed: 4.0,
            // Green glow particles
            glowParticles: []
        };
        this.items.push(item);
        return item;
    }

    /**
     * Update all items (animations, lifetime, etc.)
     */
    update(dt) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            
            // Remove collected items
            if (item.collected) {
                this.items.splice(i, 1);
                continue;
            }

            // Update animations based on item type
            if (item.type === 'HEALTH_REGEN') {
                // Gentle bounce animation
                item.bounceOffset = Math.sin(item.bounceSpeed * Date.now() / 1000) * 6;
                item.y = item.baseY + item.bounceOffset;
                
                // Rotation
                item.rotation += item.rotationSpeed * dt;
                if (item.rotation > Math.PI * 2) item.rotation -= Math.PI * 2;
            } else if (item.type === 'EXTRA_LIFE') {
                // Gentle float animation
                item.bounceOffset = Math.sin(item.bounceSpeed * Date.now() / 1000) * 8;
                item.y = item.baseY + item.bounceOffset;
                
                // Pulse scale
                item.scale = 1.0 + Math.sin(item.pulseSpeed * Date.now() / 1000) * 0.1;
                
                // Update and generate sparkle particles
                if (!item.sparkles) item.sparkles = [];
                
                // Add new sparkles occasionally
                if (Math.random() < 0.15) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 20 + Math.random() * 15;
                    item.sparkles.push({
                        x: Math.cos(angle) * distance,
                        y: Math.sin(angle) * distance,
                        life: 1.0,
                        age: 0,
                        size: 2 + Math.random() * 3
                    });
                }
                
                // Update existing sparkles
                for (let j = item.sparkles.length - 1; j >= 0; j--) {
                    const sparkle = item.sparkles[j];
                    sparkle.age += dt;
                    if (sparkle.age >= sparkle.life) {
                        item.sparkles.splice(j, 1);
                    }
                }
            } else if (item.type === 'SKUNK_POWERUP') {
                // Bouncy animation
                item.bounceOffset = Math.sin(item.bounceSpeed * Date.now() / 1000) * 10;
                item.y = item.baseY + item.bounceOffset;
                
                // Rotation
                item.rotation += item.rotationSpeed * dt;
                if (item.rotation > Math.PI * 2) item.rotation -= Math.PI * 2;
                
                // Pulse scale
                item.scale = 1.0 + Math.sin(item.pulseSpeed * Date.now() / 1000) * 0.15;
                
                // Generate green glow particles
                if (!item.glowParticles) item.glowParticles = [];
                if (Math.random() < 0.2) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 15 + Math.random() * 10;
                    item.glowParticles.push({
                        x: Math.cos(angle) * distance,
                        y: Math.sin(angle) * distance,
                        life: 0.8,
                        age: 0,
                        size: 2 + Math.random() * 3
                    });
                }
                
                // Update particles
                for (let j = item.glowParticles.length - 1; j >= 0; j--) {
                    const p = item.glowParticles[j];
                    p.age += dt * 1.5;
                    if (p.age >= p.life) {
                        item.glowParticles.splice(j, 1);
                    }
                }
            } else if (item.type === 'GOLDEN_IDOL') {
                item.bounceOffset = Math.sin(item.bounceSpeed * Date.now() / 1000) * 5;
                item.y = item.baseY + item.bounceOffset;
                item.rotation += item.rotationSpeed * dt;
                if (item.rotation > Math.PI * 2) item.rotation -= Math.PI * 2;
                item.scale = 1.0 + Math.sin(item.pulseSpeed * Date.now() / 1000) * 0.06;
                
                // Rotate light rays slowly
                if (!item.rayRotation) item.rayRotation = 0;
                item.rayRotation += dt * 0.5;
                if (item.rayRotation > Math.PI * 2) item.rayRotation -= Math.PI * 2;
                
                // Update and generate shimmer particles
                if (!item.shimmerParticles) item.shimmerParticles = [];
                
                // Add new shimmer particles occasionally
                if (Math.random() < 0.12) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 15 + Math.random() * 20;
                    item.shimmerParticles.push({
                        x: Math.cos(angle) * distance,
                        y: Math.sin(angle) * distance,
                        vx: Math.cos(angle) * 10,
                        vy: Math.sin(angle) * 10 - 20, // Slight upward drift
                        life: 0.8 + Math.random() * 0.6,
                        age: 0,
                        size: 2 + Math.random() * 2.5
                    });
                }
                
                // Update existing shimmer particles
                for (let j = item.shimmerParticles.length - 1; j >= 0; j--) {
                    const shimmer = item.shimmerParticles[j];
                    shimmer.age += dt;
                    shimmer.x += shimmer.vx * dt;
                    shimmer.y += shimmer.vy * dt;
                    shimmer.vx *= 0.96;
                    shimmer.vy *= 0.96;
                    if (shimmer.age >= shimmer.life) {
                        item.shimmerParticles.splice(j, 1);
                    }
                }
            } else if (item.type === 'DAMAGE_BOOST') {
                // Aggressive bounce
                item.bounceOffset = Math.sin(item.bounceSpeed * Date.now() / 1000) * 12;
                item.y = item.baseY + item.bounceOffset;
                // Fast rotation for aggressive feel
                item.rotation += item.rotationSpeed * dt;
                if (item.rotation > Math.PI * 2) item.rotation -= Math.PI * 2;
                // Strong pulse
                item.scale = 1.0 + Math.sin(item.pulseSpeed * Date.now() / 1000) * 0.18;
                
                // Update and generate energy particles
                if (!item.energyParticles) item.energyParticles = [];
                
                // Add new energy particles frequently
                if (Math.random() < 0.25) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 10 + Math.random() * 25;
                    item.energyParticles.push({
                        x: Math.cos(angle) * distance,
                        y: Math.sin(angle) * distance,
                        vx: Math.cos(angle) * 30,
                        vy: Math.sin(angle) * 30,
                        life: 0.6 + Math.random() * 0.4,
                        age: 0,
                        size: 2 + Math.random() * 3
                    });
                }
                
                // Update existing energy particles
                for (let j = item.energyParticles.length - 1; j >= 0; j--) {
                    const energy = item.energyParticles[j];
                    energy.age += dt;
                    energy.x += energy.vx * dt;
                    energy.y += energy.vy * dt;
                    energy.vx *= 0.93;
                    energy.vy *= 0.93;
                    if (energy.age >= energy.life) {
                        item.energyParticles.splice(j, 1);
                    }
                }
            } else if (item.type === 'SPEED_BOOST') {
                // Fast energetic bounce
                item.bounceOffset = Math.sin(item.bounceSpeed * Date.now() / 1000) * 10;
                item.y = item.baseY + item.bounceOffset;
                // Rapid rotation for dynamic feel
                item.rotation += item.rotationSpeed * dt;
                if (item.rotation > Math.PI * 2) item.rotation -= Math.PI * 2;
                // Fast pulse
                item.scale = 1.0 + Math.sin(item.pulseSpeed * Date.now() / 1000) * 0.15;
            }
        }
    }

    /**
     * Check if player collects any items
     * Returns array of collected items
     */
    checkPlayerCollision(player) {
        const collected = [];
        const playerRect = (player && typeof player.getRect === 'function') 
            ? player.getRect() 
            : { x: player.x, y: player.y, width: player.width || 64, height: player.height || 64 };

        for (const item of this.items) {
            if (item.collected) continue;

            const itemRect = { 
                x: item.x - item.width / 2, 
                y: item.y - item.height / 2, 
                width: item.width, 
                height: item.height 
            };

            if (Utils.rectCollision(playerRect, itemRect)) {
                item.collected = true;
                collected.push(item);
                
                // Play pickup sound
                if (this.audioManager) {
                    if (item.type === 'HEALTH_REGEN') {
                        const rate = 0.96 + Math.random() * 0.10; // 0.96..1.06
                        this.audioManager.playSound('item_pickup', { volume: 0.6, rate });
                    } else if (item.type === 'EXTRA_LIFE') {
                        const rate = 0.95 + Math.random() * 0.10; // 0.95..1.05
                        this.audioManager.playSound('item_pickup', { volume: 0.8, rate });
                    } else if (item.type === 'GOLDEN_IDOL') {
                        const rate = 0.97 + Math.random() * 0.10; // 0.97..1.07
                        this.audioManager.playSound('coin_collect', { volume: 0.7, rate });
                    } else if (item.type === 'SPEED_BOOST') {
                        const rate = 1.05 + Math.random() * 0.10; // 1.05..1.15 (higher pitch)
                        this.audioManager.playSound('item_pickup', { volume: 0.7, rate });
                    } else if (item.type === 'DAMAGE_BOOST') {
                        const rate = 0.85 + Math.random() * 0.10; // 0.85..0.95 (lower, aggressive pitch)
                        this.audioManager.playSound('item_pickup', { volume: 0.75, rate });
                    } else if (item.type === 'SKUNK_POWERUP') {
                        const rate = 0.90 + Math.random() * 0.10; // 0.90..1.00
                        this.audioManager.playSound('item_pickup', { volume: 0.7, rate });
                    }
                }
            }
        }

        return collected;
    }

    /**
     * Apply collected item effects to the player
     * Returns { type, success, message } for game to handle UI feedback
     */
    applyItemEffect(player, item) {
        if (!player || !item) return { type: null, success: false };

        if (item.type === 'HEALTH_REGEN') {
            // Start regen effect on player
            if (!player.healthRegen) {
                player.healthRegen = {
                    duration: Config.HEALTH_REGEN_ITEM_DURATION || 6.0,
                    hpPerSecond: Config.HEALTH_REGEN_HP_PER_SECOND || 8.0,
                    timer: 0
                };
            } else {
                // Refresh duration if already active
                player.healthRegen.timer = 0;
            }
            return { type: 'HEALTH_REGEN', success: true };
        } else if (item.type === 'SPEED_BOOST') {
            // Start speed boost effect on player
            if (!player.speedBoost) {
                player.speedBoost = {
                    duration: Config.SPEED_BOOST_DURATION || 8.0,
                    multiplier: Config.SPEED_BOOST_MULTIPLIER || 1.5,
                    timer: 0
                };
            } else {
                // Refresh duration if already active
                player.speedBoost.timer = 0;
            }
            return { type: 'SPEED_BOOST', success: true };
        } else if (item.type === 'DAMAGE_BOOST') {
            // Start damage boost effect on player
            if (!player.damageBoost) {
                player.damageBoost = {
                    duration: Config.DAMAGE_BOOST_DURATION || 10.0,
                    multiplier: Config.DAMAGE_BOOST_MULTIPLIER || 3.0,
                    timer: 0
                };
            } else {
                // Refresh duration if already active
                player.damageBoost.timer = 0;
            }
            return { type: 'DAMAGE_BOOST', success: true };
        } else if (item.type === 'SKUNK_POWERUP') {
            // Give player 3 skunk shots
            if (player.skunkAmmo !== undefined) {
                player.skunkAmmo += 3;
            }
            return { type: 'SKUNK_POWERUP', success: true, ammo: 3 };
        } else if (item.type === 'EXTRA_LIFE') {
            return { type: 'EXTRA_LIFE', success: true, lives: 1 };
        } else if (item.type === 'GOLDEN_IDOL') {
            return { type: 'GOLDEN_IDOL', success: true, idolIndex: item.idolIndex, levelId: item.levelId };
        }
        return { type: item.type, success: false };
    }

    /**
     * Draw all items
     */
    draw(ctx, cameraX, cameraY) {
        for (const item of this.items) {
            if (item.collected) continue;

            const screenX = item.x - cameraX;
            const screenY = item.y - cameraY;

            ctx.save();
            
            // Apply rotation/scale from center
            ctx.translate(screenX, screenY);
            if (item.rotation) {
                ctx.rotate(item.rotation);
            }
            if (item.scale && item.scale !== 1.0) {
                ctx.scale(item.scale, item.scale);
            }

            if (item.type === 'HEALTH_REGEN') {
                // Use the utility helper to draw the sprite or placeholder
                Utils.drawHealthRegenItem(ctx, -item.width / 2, -item.height / 2, item.width);
            } else if (item.type === 'SPEED_BOOST') {
                Utils.drawSpeedBoostItem(ctx, -item.width / 2, -item.height / 2, item.width);
            } else if (item.type === 'EXTRA_LIFE') {
                // Draw golden glow behind extra life
                ctx.save();
                const glowSize = item.width * 0.8;
                const glowPulse = 0.3 + Math.sin(Date.now() / 200) * 0.2;
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
                gradient.addColorStop(0, `rgba(255, 215, 0, ${glowPulse})`);
                gradient.addColorStop(0.5, `rgba(255, 223, 0, ${glowPulse * 0.5})`);
                gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Draw sparkles around extra life
                if (item.sparkles && item.sparkles.length > 0) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    for (const sparkle of item.sparkles) {
                        const alpha = 1 - (sparkle.age / sparkle.life);
                        ctx.globalAlpha = alpha * 0.8;
                        
                        // Draw sparkle as a small star
                        const sparkleGrad = ctx.createRadialGradient(
                            sparkle.x, sparkle.y, 0,
                            sparkle.x, sparkle.y, sparkle.size
                        );
                        sparkleGrad.addColorStop(0, '#FFFFFF');
                        sparkleGrad.addColorStop(0.4, '#FFD700');
                        sparkleGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
                        ctx.fillStyle = sparkleGrad;
                        ctx.beginPath();
                        ctx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.restore();
                }
                
                Utils.drawExtraLifeItem(ctx, -item.width / 2, -item.height / 2, item.width);
            } else if (item.type === 'GOLDEN_IDOL') {
                // Draw divine glow behind idol
                ctx.save();
                const glowSize = item.width * 1.2;
                const glowPulse = 0.4 + Math.sin(Date.now() / 180) * 0.2;
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
                gradient.addColorStop(0, `rgba(255, 215, 0, ${glowPulse})`);
                gradient.addColorStop(0.3, `rgba(255, 185, 0, ${glowPulse * 0.6})`);
                gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Draw rotating light rays
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.3;
                ctx.rotate(item.rayRotation || 0);
                const rayCount = 8;
                const rayLength = item.width * 1.5;
                for (let i = 0; i < rayCount; i++) {
                    const angle = (Math.PI * 2 * i) / rayCount;
                    ctx.save();
                    ctx.rotate(angle);
                    const rayGrad = ctx.createLinearGradient(0, 0, rayLength, 0);
                    rayGrad.addColorStop(0, 'rgba(255, 223, 100, 0.6)');
                    rayGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
                    rayGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
                    ctx.fillStyle = rayGrad;
                    ctx.beginPath();
                    ctx.moveTo(0, -2);
                    ctx.lineTo(rayLength, -0.5);
                    ctx.lineTo(rayLength, 0.5);
                    ctx.lineTo(0, 2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
                ctx.restore();
                
                // Draw shimmer particles around idol
                if (item.shimmerParticles && item.shimmerParticles.length > 0) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    for (const shimmer of item.shimmerParticles) {
                        const alpha = 1 - (shimmer.age / shimmer.life);
                        ctx.globalAlpha = alpha * 0.9;
                        
                        // Draw shimmer as a golden sparkle
                        const shimmerGrad = ctx.createRadialGradient(
                            shimmer.x, shimmer.y, 0,
                            shimmer.x, shimmer.y, shimmer.size
                        );
                        shimmerGrad.addColorStop(0, '#FFFFFF');
                        shimmerGrad.addColorStop(0.5, '#FFD700');
                        shimmerGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
                        ctx.fillStyle = shimmerGrad;
                        ctx.beginPath();
                        ctx.arc(shimmer.x, shimmer.y, shimmer.size, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Add small cross sparkle
                        ctx.strokeStyle = '#FFFFFF';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(shimmer.x - shimmer.size * 0.8, shimmer.y);
                        ctx.lineTo(shimmer.x + shimmer.size * 0.8, shimmer.y);
                        ctx.moveTo(shimmer.x, shimmer.y - shimmer.size * 0.8);
                        ctx.lineTo(shimmer.x, shimmer.y + shimmer.size * 0.8);
                        ctx.stroke();
                    }
                    ctx.restore();
                }
                
                Utils.drawGoldenIdol(ctx, -item.width / 2, -item.height / 2, item.width);
            } else if (item.type === 'DAMAGE_BOOST') {
                // Draw aggressive red glow behind damage boost
                ctx.save();
                const glowSize = item.width * 1.0;
                const glowPulse = 0.5 + Math.sin(Date.now() / 150) * 0.3;
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
                gradient.addColorStop(0, `rgba(255, 50, 50, ${glowPulse})`);
                gradient.addColorStop(0.3, `rgba(255, 80, 0, ${glowPulse * 0.6})`);
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Draw energy particles around damage boost
                if (item.energyParticles && item.energyParticles.length > 0) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    for (const energy of item.energyParticles) {
                        const alpha = 1 - (energy.age / energy.life);
                        ctx.globalAlpha = alpha * 0.85;
                        
                        // Draw energy particle with red/orange gradient
                        const energyGrad = ctx.createRadialGradient(
                            energy.x, energy.y, 0,
                            energy.x, energy.y, energy.size
                        );
                        energyGrad.addColorStop(0, '#FFFFFF');
                        energyGrad.addColorStop(0.4, '#FF4444');
                        energyGrad.addColorStop(0.7, '#FF8800');
                        energyGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
                        ctx.fillStyle = energyGrad;
                        ctx.beginPath();
                        ctx.arc(energy.x, energy.y, energy.size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.restore();
                }
                
                Utils.drawDamageBoostItem(ctx, -item.width / 2, -item.height / 2, item.width);
            } else if (item.type === 'SKUNK_POWERUP') {
                // Draw green glow behind skunk powerup
                ctx.save();
                const glowSize = item.width * 1.1;
                const glowPulse = 0.4 + Math.sin(Date.now() / 160) * 0.25;
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
                gradient.addColorStop(0, `rgba(50, 255, 50, ${glowPulse})`);
                gradient.addColorStop(0.3, `rgba(80, 255, 120, ${glowPulse * 0.6})`);
                gradient.addColorStop(1, 'rgba(50, 255, 50, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Draw glow particles
                if (item.glowParticles && item.glowParticles.length > 0) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    for (const glow of item.glowParticles) {
                        const alpha = 1 - (glow.age / glow.life);
                        ctx.globalAlpha = alpha * 0.7;
                        
                        const glowGrad = ctx.createRadialGradient(
                            glow.x, glow.y, 0,
                            glow.x, glow.y, glow.size
                        );
                        glowGrad.addColorStop(0, '#80FF80');
                        glowGrad.addColorStop(0.5, '#40FF40');
                        glowGrad.addColorStop(1, 'rgba(80, 255, 80, 0)');
                        ctx.fillStyle = glowGrad;
                        ctx.beginPath();
                        ctx.arc(glow.x, glow.y, glow.size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.restore();
                }
                
                // Draw the skunk powerup icon (use a skunk emoji or symbol)
                ctx.fillStyle = '#000000';
                ctx.font = `${item.width * 0.7}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🦨', 0, 0);
            }

            ctx.restore();

            // Debug hitbox
            if (typeof Config !== 'undefined' && Config.SHOW_HITBOXES) {
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    screenX - item.width / 2,
                    screenY - item.height / 2,
                    item.width,
                    item.height
                );
            }
        }
    }

    /**
     * Clear all items
     */
    reset() {
        this.items = [];
        this.nextItemId = 0;
    }

    /**
     * Get all active items
     */
    getItems() {
        return this.items.filter(item => !item.collected);
    }
}
