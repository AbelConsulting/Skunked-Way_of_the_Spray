/**
 * Sprite loader and animation system
 */

class SpriteLoader {
    constructor() {
        this.sprites = {};
        this.loadQueue = [];
        this.loadedCount = 0;
        this.totalAssets = 0;
    }

    /**
     * Load a sprite image
     */
    loadSprite(name, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.sprites[name] = img;
                this.loadedCount++;
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`Failed to load sprite: ${path}, using placeholder`);
                // Create a placeholder colored rectangle
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#808080';
                ctx.fillRect(0, 0, 64, 64);
                this.sprites[name] = canvas;
                this.loadedCount++;
                resolve(canvas);
            };
            img.src = path;
        });
    }

    /**
     * Load all game sprites
     */
    async loadAllSprites() {
        const spritesToLoad = [
            // Player sprites
            ['ninja_idle', 'assets/sprites/characters/ninja_idle.png'],
            ['ninja_walk', 'assets/sprites/characters/ninja_walk.png'],
            ['ninja_jump', 'assets/sprites/characters/ninja_jump.png'],
            ['ninja_attack', 'assets/sprites/characters/ninja_attack.png'],
            ['ninja_shadow_strike', 'assets/sprites/characters/ninja_shadow_strike.png'],
            ['ninja_hurt', 'assets/sprites/characters/ninja_hurt.png'],
            
            // Enemy sprites
            ['basic_idle', 'assets/sprites/enemies/basic_idle.png'],
            ['basic_walk', 'assets/sprites/enemies/basic_walk.png'],
            ['basic_attack', 'assets/sprites/enemies/basic_attack.png'],
            ['basic_hurt', 'assets/sprites/enemies/basic_hurt.png']
        ];

        this.totalAssets = spritesToLoad.length;
        const promises = spritesToLoad.map(([name, path]) => this.loadSprite(name, path));
        await Promise.all(promises);
        return this.sprites;
    }

    /**
     * Get a sprite by name
     */
    getSprite(name) {
        return this.sprites[name] || null;
    }

    /**
     * Get loading progress (0-1)
     */
    getProgress() {
        return this.totalAssets > 0 ? this.loadedCount / this.totalAssets : 0;
    }
}

/**
 * Animation class for sprite sheet animations
 */
class Animation {
    constructor(spriteSheet, frameCount, frameDuration = 0.1) {
        this.spriteSheet = spriteSheet;
        this.frameCount = frameCount;
        this.frameDuration = frameDuration;
        this.currentFrame = 0;
        this.timer = 0;
        this.frameWidth = spriteSheet ? spriteSheet.width / frameCount : 64;
        this.frameHeight = spriteSheet ? spriteSheet.height : 64;
    }

    /**
     * Update animation
     */
    update(dt) {
        this.timer += dt;
        if (this.timer >= this.frameDuration) {
            this.timer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.frameCount;
        }
    }

    /**
     * Reset animation to first frame
     */
    reset() {
        this.currentFrame = 0;
        this.timer = 0;
    }

    /**
     * Draw current frame
     */
    draw(ctx, x, y, width, height, flipHorizontal = false) {
        if (!this.spriteSheet) return;

        const sx = this.currentFrame * this.frameWidth;
        const sy = 0;

        ctx.save();
        if (flipHorizontal) {
            ctx.translate(x + width, y);
            ctx.scale(-1, 1);
            ctx.drawImage(this.spriteSheet, sx, sy, this.frameWidth, this.frameHeight, 0, 0, width, height);
        } else {
            ctx.drawImage(this.spriteSheet, sx, sy, this.frameWidth, this.frameHeight, x, y, width, height);
        }
        ctx.restore();
    }
}

// Global sprite loader instance
const spriteLoader = new SpriteLoader();
