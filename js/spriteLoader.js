/**
 * Sprite loader and animation system
 */

class SpriteLoader {
    constructor() {
        this.sprites = {};
        this.loadQueue = [];
        this.loadedCount = 0;
        this.totalAssets = 0;
        // Enable cache-busting in development when Config.DEBUG is true to avoid stale browser cache
        // Enable cache-busting in development when Config.DEBUG is true
        // or when the URL includes ?devcache=1 (useful for local debugging without changing Config)
        try {
            const force = (typeof Config !== 'undefined' && Config.DEBUG) || (typeof location !== 'undefined' && (new URL(location.href)).searchParams.get('devcache') === '1');
            this._cacheBuster = force ? Date.now() : null;
        } catch (e) {
            this._cacheBuster = null;
        }
        // Known animation frame counts for player sheets — used to synthesize
        // placeholder sheets when the real asset is missing.
        this.expectedFrames = {
            'ninja_idle': 4,
            'ninja_walk': 6,
            'ninja_jump': 4,
            'ninja_attack': 6,
            'ninja_shadow_strike': 8,
            'ninja_hurt': 2
        };
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
                // Record missing asset
                if (!this._missing) this._missing = [];
                this._missing.push({ name, path });

                // If this is a known sprite sheet (multiple frames), synthesize
                // a simple placeholder sheet so animations keep working.
                const frameCount = this.expectedFrames[name];
                if (frameCount) {
                    const frameW = 64;
                    const pad = 1; // spacing between frames
                    const canvas = document.createElement('canvas');
                    canvas.width = frameCount * frameW + Math.max(0, frameCount - 1) * pad;
                    canvas.height = frameW;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = false;

                    for (let i = 0; i < frameCount; i++) {
                        const sx = i * (frameW + pad);
                        // alternating color bands for visual clarity
                        ctx.fillStyle = i % 2 === 0 ? '#6b6b6b' : '#8b8b8b';
                        ctx.fillRect(sx, 0, frameW, frameW);
                        ctx.fillStyle = '#fff';
                        ctx.font = '12px monospace';
                        ctx.fillText(String(i + 1), sx + 6, 18);
                    }
                    this.sprites[name] = canvas;
                    this.loadedCount++;
                    resolve(canvas);
                    return;
                }

                // Fallback: single-tile placeholder
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
        const baseList = [
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
            ['wall_tile', 'assets/sprites/backgrounds/tiles/wall_tile.png'],
            // Background panoramas
            ['bg_city', 'assets/sprites/backgrounds/city_bg.png'],
            ['bg_forest', 'assets/sprites/backgrounds/forest_bg.png'],
            ['bg_mountains', 'assets/sprites/backgrounds/mountains_bg.png'],
            ['bg_cave', 'assets/sprites/backgrounds/cave_bg.png']
        ];

        // Optionally add a cache-buster to asset paths when debugging to avoid stale caches
        const spritesToLoad = baseList.map(([n, p]) => {
            if (this._cacheBuster) return [n, p + '?cb=' + this._cacheBuster];
            return [n, p];
        });

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
            // Ensure tile sprites are upscaled to 64x64 for consistent tiling
            const tileNames = ['ground_tile', 'platform_tile', 'wall_tile'];
            for (const t of tileNames) {
                const img = this.sprites[t];
                if (!img) continue;
                try {
                    if (img.width !== 64 || img.height !== 64) {
                        const canvas = document.createElement('canvas');
                        canvas.width = 64;
                        canvas.height = 64;
                        const ctx = canvas.getContext('2d');
                        if (ctx) ctx.imageSmoothingEnabled = false;
                        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 64, 64);
                        this.sprites[t] = canvas;
                        console.log(`SpriteLoader: upscaled tile ${t} from ${img.width}x${img.height} to 64x64`);
                    }
                } catch (e) {
                    // ignore scaling errors
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
     * Convenience: create an Animation for a named sprite sheet using
     * sensible defaults or auto-detected frame stride when the sheet
     * width isn't perfectly divisible by frameCount.
     */
    createAnimation(name, frameCount, frameDuration = 0.1, opts = {}) {
        const sheet = this.getSprite(name);
        if (!sheet) return new Animation(null, frameCount, frameDuration, opts);

        const inferredFrameWidth = opts.frameWidth || Math.floor(sheet.width / frameCount);
        const inferredFrameHeight = opts.frameHeight || sheet.height || 64;

        let frameStride = opts.frameStride;
        if (!frameStride) {
            if ((sheet.width % frameCount) === 0) {
                frameStride = inferredFrameWidth;
            } else {
                // Choose the nearest integer stride and warn — this handles
                // sheets that include padding between frames.
                frameStride = Math.round(sheet.width / frameCount);
                try { console.warn(`SpriteLoader: ${name} width ${sheet.width} not divisible by ${frameCount}; using inferred stride ${frameStride}`); } catch (e) {}
            }
        }

        // Compute optional centered offset for spritesheets that contain
        // padding or margins so we sample frames from the center region.
        const totalUsed = frameStride * frameCount;
        let frameOffset = opts.frameOffset || 0;
        if (sheet.width > totalUsed) {
            frameOffset = Math.floor((sheet.width - totalUsed) / 2);
        }

        const cfg = Object.assign({}, opts, { frameWidth: inferredFrameWidth, frameHeight: inferredFrameHeight, frameStride, frameOffset });
        return new Animation(sheet, frameCount, frameDuration, cfg);
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
        // Optional offset to account for centered padding/margins on the sheet
        this.frameOffset = opts.frameOffset || 0;
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

        const sx = Math.floor(this.frameOffset + (this.currentFrame * this.frameStride));
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
