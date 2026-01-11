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
            'ninja_walk': 4,
            'ninja_jump': 4,
            'ninja_attack': 4,
            'ninja_shadow_strike': 4,
            'ninja_hurt': 2,
            'basic_idle': 4,
            'basic_walk': 4,
            'basic_attack': 4,
            'basic_hurt': 2,
            'second_idle': 4,
            'second_walk': 4,
            'second_attack': 4,
            'second_hurt': 2
        };
    }

    /**
     * Load an image by trying a list of candidate paths (useful for backgrounds)
     * Tries combinations of suffixes (@1x,@2x) and extensions (.webp,.png).
     * Stores the first successfully decoded image into `this.sprites[name]`.
     * Returns the stored image (ImageBitmap or HTMLImageElement or canvas placeholder).
     */
    async loadSpriteBest(name, basePathNoExt) {
        const cacheBuster = this._cacheBuster ? ('?cb=' + this._cacheBuster) : '';
        const suffixes = ['', '@1x', '@2x'];
        // Try PNG first to avoid noisy .webp 404s on hosts without WebP variants
        const exts = ['.png', '.webp'];

        const tryLoad = async (path) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                try { img.decoding = 'async'; } catch (e) {}
                try { img.crossOrigin = 'anonymous'; } catch (e) {}
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('failed to load ' + path));
                try { img.src = path; } catch (e) { reject(e); }
            });
        };

        // Loop ext first (png variants for all suffixes), then webp variants
        for (const e of exts) {
            for (const s of suffixes) {
                const path = `${basePathNoExt}${s}${e}${cacheBuster}`;
                try {
                    const img = await tryLoad(path);
                    // Prefer ImageBitmap when available
                    if (typeof createImageBitmap === 'function') {
                        try {
                            const bitmap = await createImageBitmap(img);
                            this.sprites[name] = bitmap;
                            this.loadedCount++;
                            try { if (typeof Config !== 'undefined' && Config.DEBUG && typeof console !== 'undefined') console.log(`SpriteLoader: loaded ${name} from ${path} -> ${bitmap.width}x${bitmap.height}`); } catch (e) {}
                            return bitmap;
                        } catch (e) {
                            // fallback to image element if bitmap creation fails
                            this.sprites[name] = img;
                            this.loadedCount++;
                            try { if (typeof Config !== 'undefined' && Config.DEBUG && typeof console !== 'undefined') console.log(`SpriteLoader: loaded ${name} from ${path} -> ${img.width}x${img.height}`); } catch (e) {}
                            return img;
                        }
                    } else {
                        this.sprites[name] = img;
                        this.loadedCount++;
                        try { if (typeof Config !== 'undefined' && Config.DEBUG && typeof console !== 'undefined') console.log(`SpriteLoader: loaded ${name} from ${path} -> ${img.width}x${img.height}`); } catch (e) {}
                        return img;
                    }
                } catch (e) {
                    // try next candidate
                }
            }
        }

        // All candidates failed — fall back to placeholder behavior similar to loadSprite onerror
        if (!this._missing) this._missing = [];
        this._missing.push({ name, path: basePathNoExt });

        // Provide a simple fallback canvas (single-tile placeholder)
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
        return canvas;
    }

    /**
     * Load a sprite image
     */
    loadSprite(name, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            // Hint to the browser to decode off-main-thread where supported
            try { img.decoding = 'async'; } catch (e) {}
            // Allow cross-origin decoding if assets are served from CDN
            try { img.crossOrigin = 'anonymous'; } catch (e) {}

            img.onload = () => {
                // Prefer creating an ImageBitmap when available to avoid
                // main-thread decode stalls. Fall back to the HTMLImageElement.
                const finishWith = (stored) => {
                    this.sprites[name] = stored;
                    try {
                        if (typeof Config !== 'undefined' && Config.DEBUG && typeof console !== 'undefined') console.log(`SpriteLoader: loaded ${name} -> ${stored.width}x${stored.height}`);
                    } catch (e) {}
                    this.loadedCount++;
                    resolve(stored);
                };

                if (typeof createImageBitmap === 'function') {
                    try {
                        createImageBitmap(img).then(bitmap => finishWith(bitmap)).catch(() => finishWith(img));
                    } catch (e) {
                        finishWith(img);
                    }
                } else {
                    finishWith(img);
                }
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
            // Start loading
            try {
                img.src = path;
            } catch (e) {
                // In some environments setting src may throw; handle as error
                img.onerror && img.onerror();
            }
        });
    }

    /**
     * Load all game sprites
     */
    async loadAllSprites() {
        // Reset counters for a fresh progress run
        this.loadedCount = 0;
        this.totalAssets = 0;

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
            ['second_idle', 'assets/sprites/enemies/second_idle.png'],
            ['second_walk', 'assets/sprites/enemies/second_walk.png'],
            ['second_attack', 'assets/sprites/enemies/second_attack.png'],
            ['second_hurt', 'assets/sprites/enemies/second_hurt.png'],

            // Background / tile sprites
            ['ground_tile', 'assets/sprites/backgrounds/tiles/ground_tile.png'],
            ['platform_tile', 'assets/sprites/backgrounds/tiles/platform_tile.png'],
            ['wall_tile', 'assets/sprites/backgrounds/tiles/wall_tile.png'],
            // Background panoramas are large; load them lazily per-level to
            // avoid decoding and memory spikes on startup. Leave them out of
            // the global preload list so Level can request only what it needs.
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
            const expectedFrames = this.expectedFrames;
            for (const [name, count] of Object.entries(expectedFrames)) {
                const img = this.sprites[name];
                if (!img) continue;

                // Try to detect a uniform padding between frames (common when
                    // sheets have 1px-8px gaps between frames). If detected, annotate
                    // the image with the discovered frameWidth/frameStride so
                    // createAnimation can use them even when the sheet width happens
                    // to be divisible by frameCount (padding can still be present).
                    let detectedPad = 0;
                    let detectedFrameWidth = null;
                    for (let pad = 1; pad <= 8; pad++) {
                        const adjusted = img.width - pad * (count - 1);
                        if (adjusted > 0 && (adjusted % count) === 0) {
                            detectedPad = pad;
                            detectedFrameWidth = adjusted / count;
                            break;
                        }
                    }

                    if (detectedPad > 0) {
                        img._detectedPad = detectedPad;
                        img._detectedFrameWidth = detectedFrameWidth;
                        img._detectedFrameStride = detectedFrameWidth + detectedPad;
                        try {
                            if (typeof Config !== 'undefined' && Config.DEBUG) console.info(`SpriteLoader: sprite ${name} width ${img.width}; detected uniform ${detectedPad}px padding (frameWidth=${detectedFrameWidth}, stride=${img._detectedFrameStride})`);
                        } catch (e) {}
                    } else if ((img.width % count) !== 0) {
                        try {
                            if (typeof Config !== 'undefined' && Config.DEBUG) console.warn(`SpriteLoader: sprite ${name} width ${img.width} is not divisible by frameCount ${count} (frame width=${(img.width/count).toFixed(2)})`);
                        } catch (e) {}
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
                        if (typeof Config !== 'undefined' && Config.DEBUG) console.log(`SpriteLoader: upscaled tile ${t} from ${img.width}x${img.height} to 64x64`);
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

        // Prefer explicit opts, then any detected values, then naive inference
        const inferredFrameWidth = opts.frameWidth || sheet._detectedFrameWidth || Math.floor(sheet.width / frameCount);
        const inferredFrameHeight = opts.frameHeight || sheet.height || 64;

        let frameStride = opts.frameStride;
        if (!frameStride) {
            // Prefer any detected stride (handles sheets with uniform padding)
            if (sheet._detectedFrameStride) {
                frameStride = sheet._detectedFrameStride;
            } else if ((sheet.width % frameCount) === 0) {
                frameStride = inferredFrameWidth;
            } else {
                // Choose the nearest integer stride and warn — this handles
                // sheets that include padding or fractional frames.
                frameStride = Math.round(sheet.width / frameCount);
                try { if (typeof Config !== 'undefined' && Config.DEBUG) console.warn(`SpriteLoader: ${name} width ${sheet.width} not divisible by ${frameCount}; using inferred stride ${frameStride}`); } catch (e) {}
            }
        }

        // Compute the total used width for frames: start of last frame + frameWidth
        // (i.e., (frameCount - 1) * frameStride + frameWidth)
        const totalUsed = (frameCount - 1) * frameStride + inferredFrameWidth;

        // Respect an explicitly provided frameOffset (including 0). Only auto-center
        // when the caller did not provide a frameOffset.
        const hasFrameOffset = Object.prototype.hasOwnProperty.call(opts, 'frameOffset');
        let frameOffset = hasFrameOffset ? opts.frameOffset : 0;
        if (!hasFrameOffset && sheet.width > totalUsed) {
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
        // Optional: sample frames from a larger sheet (e.g., use 4 frames out of an 8-frame sheet)
        this.frameIndices = (opts && Array.isArray(opts.frameIndices) && opts.frameIndices.length > 0) ? opts.frameIndices.slice() : null;
        if (this.frameIndices) {
            this.frameCount = this.frameIndices.length;
        }
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

        const sheetFrameIndex = this.frameIndices ? (this.frameIndices[this.currentFrame] || 0) : this.currentFrame;
        const sx = Math.floor(this.frameOffset + (sheetFrameIndex * this.frameStride));
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
