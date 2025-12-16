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
                try {
                    if (typeof console !== 'undefined') console.log(`SpriteLoader: loaded ${name} -> ${img.width}x${img.height}`);
                } catch (e) {}
                this.loadedCount++;
                resolve(img);
            };
            img.onerror = () => {
                // Record missing asset; create placeholder canvas sized reasonably
                if (!this._missing) this._missing = [];
                this._missing.push({ name, path });
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#808080';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ffffff';
                ctx.font = '10px sans-serif';
                ctx.fillText(name || 'missing', 4, 12);
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
            ['basic_hurt', 'assets/sprites/enemies/basic_hurt.png'],

            // Background / tile sprites
            ['ground_tile', 'assets/sprites/backgrounds/tiles/ground_tile.png'],
            ['platform_tile', 'assets/sprites/backgrounds/tiles/platform_tile.png'],
            ['wall_tile', 'assets/sprites/backgrounds/tiles/wall_tile.png']
        ];

        this.totalAssets = spritesToLoad.length;
        const promises = spritesToLoad.map(([name, path]) => this.loadSprite(name, path));
        await Promise.all(promises);

        // Validate common player sprite sheet frame sizes and warn if mismatched
        try {
            const expectedFrames = {
                'ninja_idle': 4,
                'ninja_walk': 6,
                'ninja_jump': 4,
                'ninja_attack': 6,
                'ninja_shadow_strike': 8,
                'ninja_hurt': 2
            };
            for (const [name, count] of Object.entries(expectedFrames)) {
                const img = this.sprites[name];
                if (!img) continue;
                if ((img.width % count) !== 0) {
                    console.warn(`SpriteLoader: sprite ${name} width ${img.width} is not divisible by frameCount ${count} (frame width=${(img.width/count).toFixed(2)})`);
                }
            }
        } catch (e) {}

        // Report missing assets once
        if (this._missing && this._missing.length > 0) {
            if (typeof Config !== 'undefined' && Config.DEBUG) console.warn('SpriteLoader: missing assets', this._missing.map(m => m.path));
        }

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
        // Backwards-compatible: accept an options object if provided as 4th arg
        const opts = (arguments && arguments.length >= 4) ? arguments[3] : {};
        // If explicit frameWidth provided, use it. Otherwise infer from sheet width.
        this.frameWidth = opts.frameWidth || (spriteSheet ? (spriteSheet.width / frameCount) : 64);
        this.frameHeight = opts.frameHeight || (spriteSheet ? spriteSheet.height : 64);
        // If frames in the sheet have padding/spacing, frameStride is the distance
        // between consecutive frames on the sheet. Default to frameWidth.
        this.frameStride = opts.frameStride || this.frameWidth;
    }

    /**
     * Update animation
     */
    update(dt) {
        this.timer += dt;
        while (this.timer >= this.frameDuration) {
            this.timer -= this.frameDuration;
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

        const sx = Math.floor(this.currentFrame * this.frameStride);
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
