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
            pulseSpeed: 3.0
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
                        this.audioManager.playSound('item_pickup', 0.6);
                    } else if (item.type === 'EXTRA_LIFE') {
                        this.audioManager.playSound('item_pickup', 0.8);
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
        } else if (item.type === 'EXTRA_LIFE') {
            return { type: 'EXTRA_LIFE', success: true, lives: 1 };
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
            } else if (item.type === 'EXTRA_LIFE') {
                Utils.drawExtraLifeItem(ctx, -item.width / 2, -item.height / 2, item.width);
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
