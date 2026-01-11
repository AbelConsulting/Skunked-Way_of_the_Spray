class Level {
    /**
     * Load level data from an external configuration object.
     * Accepts partial data; missing fields will keep previous values.
     * @param {Object} levelData
     */
    loadLevel(levelData = {}) {
        this.width = levelData.width || this.width;
        this.height = levelData.height || this.height;
        // Optional background name (matches keys from spriteLoader)
        this.backgroundName = levelData.background || levelData.backgroundName || this.backgroundName || 'bg_city';
        // Additional background layers
        this.backgroundLayers = Array.isArray(levelData.backgroundLayers) ? levelData.backgroundLayers.map(layer => ({ ...layer })) : [];
        // Lazy-load background panoramas (non-blocking). Construct a simple
        // path mapping from sprite key to expected asset path and request
        // the spriteLoader to fetch them only when a level references them.
        try {
            if (typeof spriteLoader !== 'undefined') {
                const ensureLoaded = (name) => {
                    if (!name) return;
                    if (spriteLoader.getSprite(name)) return; // already present
                    // map bg_xxx -> assets/sprites/backgrounds/xxx_bg
                    const base = name.replace(/^bg_/, '');
                    const basePath = `assets/sprites/backgrounds/${base}_bg`;
                    // Use the robust variant loader which tries webp/png and suffixes
                    try {
                        spriteLoader.loadSpriteBest(name, basePath).then(img => { try { this.cachedSprites[name] = img; } catch (e) {} }).catch(() => {});
                    } catch (e) {}
                };

                ensureLoaded(this.backgroundName);
                for (const layer of this.backgroundLayers) {
                    if (layer && layer.name) ensureLoaded(layer.name);
                }
            }
        } catch (e) {}
        // Per-level background parallax factor (0..1). Lower = slower (farther away).
        this.backgroundParallax = (typeof levelData.backgroundParallax !== 'undefined') ? levelData.backgroundParallax : (typeof Config !== 'undefined' ? Config.BACKGROUND_PARALLAX : 0.5);
        
        // Initialize platforms (static and moving)
        // Accept partial data: if platforms is missing, keep existing platforms.
        const incomingPlatforms = Array.isArray(levelData.platforms) ? levelData.platforms : this.platforms;
        this.platforms = (Array.isArray(incomingPlatforms) ? incomingPlatforms : []).map(p => ({
            ...p,
            // If it's a moving platform, set initial state
            initialX: p.x,
            initialY: p.y,
            timeOffset: Math.random() * Math.PI * 2 // Randomize start phase
        }));
        // Optional enemy spawn points (array of { x: number|'left'|'right', y: number })
        this.spawnPoints = Array.isArray(levelData.spawnPoints) ? levelData.spawnPoints.slice() : null;
        
        // Store boss and completion config for Game logic
        this.bossConfig = levelData.boss || null;
        this.completionConfig = levelData.completion || null;

        // Mark static layer dirty so it will be re-rendered on next draw
        this._staticNeedsUpdate = true;
        // Hazards removed: clear all hazards on load to prevent spawning
        const hadHazards = Array.isArray(levelData.hazards) && levelData.hazards.length > 0;
        this.hazards = [];
        if (hadHazards && typeof Config !== 'undefined' && Config.DEBUG && typeof console !== 'undefined' && console.log) console.log(`Removed ${levelData.hazards.length} hazards from level load (global hazard removal).`);
    }

    /**
     * Update animated level elements (moving platforms, hazards).
     * @param {number} deltaTime - Time (seconds) since last update
     */
    update(deltaTime) {
        // Update moving platforms
        const time = Date.now() / 1000;
        
        this.platforms.forEach(plat => {
            if (plat.type === 'moving') {
                // Simple Sine wave movement
                const range = plat.range || 100;
                const speed = plat.speed || 1;
                
                if (plat.axis === 'y') {
                    plat.y = plat.initialY + Math.sin(time * speed + plat.timeOffset) * range;
                    // Store velocity to move player with platform later if needed
                    plat.dy = (Math.cos(time * speed + plat.timeOffset) * range * speed); 
                } else {
                    plat.x = plat.initialX + Math.sin(time * speed + plat.timeOffset) * range;
                    plat.dx = (Math.cos(time * speed + plat.timeOffset) * range * speed);
                }
            }
        });

        // Update moving hazards (if any)
        if (this.hazards && this.hazards.length > 0) {
            this.hazards.forEach(h => {
                // Generic moving hazard support: if axis and range are present, animate position
                if (h.axis && h.range) {
                    const speed = h.speed || 1.0;
                    if (!('initialX' in h)) h.initialX = h.x;
                    if (!('initialY' in h)) h.initialY = h.y;
                    if (!('timeOffset' in h)) h.timeOffset = Math.random() * Math.PI * 2;
                    if (h.axis === 'y') {
                        h.y = h.initialY + Math.sin(time * speed + h.timeOffset) * h.range;
                    } else {
                        h.x = h.initialX + Math.sin(time * speed + h.timeOffset) * h.range;
                    }
                }
            });
        }
    }

    /**
     * Check collision against platforms using previous-frame position to avoid tunneling.
     * Returns { collided: boolean, platform?: Object, landingY?: number }
     * @param {Object} rect - Current object bounding rect { x,y,width,height }
     * @param {Object} prevRect - Previous frame bounding rect
     * @param {number} velocityY - Current vertical velocity (used to skip upward movement)
     */
    checkPlatformCollision(rect, prevRect, velocityY) {
        // Optimization: Don't check if moving up
        if (velocityY < 0) return { collided: false };

        const rectBottom = rect.y + rect.height;
        const prevBottom = prevRect.y + prevRect.height;

        for (const platform of this.platforms) {
            // 1. Horizontal Overlap Check
            if (rect.x + rect.width > platform.x && rect.x < platform.x + platform.width) {
                
                // 2. Vertical "Crossed the Line" Check
                // Did we exist ABOVE the platform in the last frame?
                const wasAbove = prevBottom <= platform.y;
                // Are we BELOW (or ON) the platform in this frame?
                const isBelow = rectBottom >= platform.y;

                // If we crossed the threshold, it's a collision
                if (wasAbove && isBelow) {
                    return {
                        collided: true,
                        platform: platform,
                        // Snap exactly to top of platform
                        landingY: platform.y - rect.height 
                    };
                }
            }
        }
        return { collided: false };
    }

    /**
     * Render the level: background layers, static layer, moving platforms.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} [cameraX=0]
     * @param {number} [cameraY=0]
     * @param {number|null} [viewWidth=null]
     * @param {number|null} [viewHeight=null]
     */
    draw(ctx, cameraX = 0, cameraY = 0, viewWidth = null, viewHeight = null) {
        // 1. Draw Background (screen-space): panorama if available, otherwise gradient.
        // Important: background should fill the viewport (0..w,0..h) regardless of camera.
        const w = viewWidth || this.width || ctx.canvas.width;
        const h = viewHeight || this.height || ctx.canvas.height;

        // Mobile performance tuning: allow the same draw path, but optionally
        // disable heavy background images on very low-end devices.
        let mobilePerfMode = null;
        try { mobilePerfMode = (typeof localStorage !== 'undefined') ? localStorage.getItem('mobilePerfMode') : null; } catch (e) {}
        const allowBackgroundImage = !(this.useMobileOptimizations && mobilePerfMode === 'low');

        let bgImg = null;
        // Always attempt to draw the main background image when available
        // unless explicitly disabled by low-end mobile perf mode.
        if (allowBackgroundImage) {
            try {
                if (!this.cachedSprites[this.backgroundName]) {
                    this.cachedSprites[this.backgroundName] = (typeof spriteLoader !== 'undefined') ? spriteLoader.getSprite(this.backgroundName) : null;
                }
                bgImg = this.cachedSprites[this.backgroundName];
            } catch (e) { bgImg = null; }
        }

        // Main background first (farthest layer)
        if (bgImg) {
            try {
                const scaleY = h / bgImg.height;
                const tileW = Math.max(1, Math.ceil(bgImg.width * scaleY));
                const parallax = (typeof this.backgroundParallax !== 'undefined') ? this.backgroundParallax : (typeof Config !== 'undefined' ? Config.BACKGROUND_PARALLAX : 0.5);
                const repeatCount = Math.ceil(w / tileW) + 2;
                const startX = Math.floor(-((cameraX * parallax) % tileW));
                for (let i = 0; i < repeatCount; i++) {
                    const dx = startX + i * tileW;
                    ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height, dx, 0, tileW, h);
                }
            } catch (e) {
                bgImg = null;
            }
        }

        // Fallback gradient if background image isn't available
        if (!bgImg) {
            // Recreate gradient if viewport height changes
            if (!this.backgroundGradient || this._backgroundGradientH !== h) {
                this._backgroundGradientH = h;
                this.backgroundGradient = ctx.createLinearGradient(0, 0, 0, h);
                this.backgroundGradient.addColorStop(0, this.theme.bgTop);
                this.backgroundGradient.addColorStop(0.5, this.theme.bgMid);
                this.backgroundGradient.addColorStop(1, this.theme.bgBot);
            }
            ctx.fillStyle = this.backgroundGradient;
            ctx.fillRect(0, 0, w, h);
        }

        // Background layers (drawn on top of main background for depth)
        if (!this.useMobileOptimizations) {
            for (const layer of this.backgroundLayers) {
                let layerImg = null;
                try {
                    if (!layer || !layer.name) continue;
                    if (!this.cachedSprites[layer.name]) {
                        this.cachedSprites[layer.name] = (typeof spriteLoader !== 'undefined') ? spriteLoader.getSprite(layer.name) : null;
                    }
                    layerImg = this.cachedSprites[layer.name];
                } catch (e) { layerImg = null; }
                if (!layerImg) continue;

                try {
                    const scaleY = h / layerImg.height;
                    const tileW = Math.max(1, Math.ceil(layerImg.width * scaleY));
                    const parallax = (typeof layer.parallax === 'number') ? layer.parallax : 0.5;
                    const repeatCount = Math.ceil(w / tileW) + 2;
                    const startX = Math.floor(-((cameraX * parallax) % tileW));
                    for (let i = 0; i < repeatCount; i++) {
                        const dx = startX + i * tileW;
                        ctx.drawImage(layerImg, 0, 0, layerImg.width, layerImg.height, dx, 0, tileW, h);
                    }
                } catch (e) {}
            }
        }

        ctx.save();
        ctx.translate(-cameraX, -cameraY);

        // 2. Draw Platforms — use pre-rendered static layer for non-moving
        // platforms to speed up rendering on low-end devices.
        if (this._staticLayerCanvas && !this._staticNeedsUpdate) {
            try {
                ctx.imageSmoothingEnabled = false;
                // Draw entire static layer stretched to the level size.
                ctx.drawImage(this._staticLayerCanvas, 0, 0, this._staticLayerCanvas.width, this._staticLayerCanvas.height, 0, 0, this.width, this.height);
            } catch (e) {
                // fallback to per-platform draw
                for (const platform of this.platforms) {
                    if (platform.type !== 'moving') this.drawPlatform(ctx, platform);
                }
            }
        } else {
            for (const platform of this.platforms) {
                if (platform.type !== 'moving') this.drawPlatform(ctx, platform);
            }
        }

        // Always draw moving platforms on top
        for (const platform of this.platforms) {
            if (platform.type === 'moving') this.drawPlatform(ctx, platform);
        }

        // 3. Hazards are not supported in this build; legacy hazard data is ignored.

        ctx.restore();
    }

    constructor(width = 800, height = 600) {
        this.width = width;
        this.height = height;
        this.platforms = [];

        // Level visuals & content
        this.backgroundName = 'bg_city';
        this.backgroundLayers = [];
        this.backgroundParallax = (typeof Config !== 'undefined' ? Config.BACKGROUND_PARALLAX : 0.5);
        this.spawnPoints = null;
        this.hazards = [];

        this.backgroundGradient = null;
        this.tileMode = 'tiles'; // 'tiles' or 'neon' - controls platform rendering
        this._tilePatterns = {}; // reserved for future per-canvas pattern caching
        this.cachedSprites = {}; // cache for sprite images

        // Static layer caching for pre-rendered non-moving platforms
        this._staticNeedsUpdate = true;
        this._staticLayerCanvas = null;
        this._staticLayerScale = 1;

        // Performance flags
        this.useMobileOptimizations = false;

        // Cyberpunk style config
        this.theme = {
            // Default/fallback background: light pastel green gradient
            // (used when no panorama is available or when low-end mobile perf mode disables it)
            bgTop: '#eefaf0',
            bgMid: '#d6f3da',
            bgBot: '#bfecc6',
            platTop: '#00fff7',    // Neon cyan
            platBot: '#ff00ea',    // Neon magenta
            border: '#fffb00',     // Bright yellow border
            glow: '#00fff7',       // Neon cyan glow
        };
    }

    /**
     * Load and cache a sprite by name using the global spriteLoader.
     * Returns null if the sprite isn't available.
     * @param {string} name
     * @returns {HTMLImageElement|null}
     */
    _getSprite(name) {
        if (!name) return null;
        if (!this.cachedSprites[name]) {
            try {
                this.cachedSprites[name] = (typeof spriteLoader !== 'undefined') ? spriteLoader.getSprite(name) : null;
            } catch (e) {
                this.cachedSprites[name] = null;
                if (typeof console !== 'undefined' && console.warn) console.warn(`Failed to load sprite ${name}`, e);
            }
        }
        return this.cachedSprites[name];
    }

    /**
     * Create a repeating CanvasPattern for the given tile on the provided context.
     * Returns null on failure.
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} tileName
     * @returns {CanvasPattern|null}
     */
    _createPattern(ctx, tileName) {
        if (!ctx || !tileName) return null;
        const tileImg = this._getSprite(tileName);
        if (!tileImg) return null;
        try {
            return ctx.createPattern(tileImg, 'repeat');
        } catch (e) {
            if (typeof console !== 'undefined' && console.warn) console.warn(`Failed to create pattern for ${tileName}`, e);
            return null;
        }
    }

    drawPlatform(ctx, p) {
        // If tile mode is enabled and sprite exists, draw a tiled fill
        if (this.tileMode === 'tiles') {
            const tileName = p.tile || 'platform_tile';
            const pattern = this._createPattern(ctx, tileName);
            if (pattern) {
                ctx.save();
                ctx.fillStyle = pattern;
                ctx.fillRect(p.x, p.y, p.width, p.height);
                ctx.restore();

                // Subtle border and highlight for readability
                ctx.save();
                ctx.strokeStyle = 'rgba(0,0,0,0.6)';
                ctx.lineWidth = 2;
                ctx.strokeRect(p.x, p.y, p.width, p.height);
                ctx.globalAlpha = 0.25;
                ctx.fillStyle = '#fff';
                ctx.fillRect(p.x, p.y, p.width, 4);
                ctx.restore();

                return; // done
            }
        }

            // Fallback: Cyberpunk neon shadow/glow (reduced on mobile for perf)
            ctx.save();
            ctx.shadowColor = this.theme.glow;
            const glowBlur = this.useMobileOptimizations ? 6 : 20;
            ctx.shadowBlur = glowBlur;
            ctx.fillStyle = this.useMobileOptimizations ? 'rgba(0,255,247,0.08)' : 'rgba(0,255,247,0.15)';
            ctx.fillRect(p.x - 8, p.y - 8, p.width + 16, p.height + 16);
            ctx.restore();

           // Neon gradient fill
           const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
           grad.addColorStop(0, this.theme.platTop);
           grad.addColorStop(1, this.theme.platBot);
           ctx.fillStyle = grad;
           ctx.fillRect(p.x, p.y, p.width, p.height);

           // Neon border
           ctx.save();
           ctx.shadowColor = this.theme.border;
           const borderBlur = this.useMobileOptimizations ? 3 : 10;
           ctx.shadowBlur = borderBlur;
           ctx.strokeStyle = this.theme.border;
           ctx.lineWidth = 3;
           ctx.strokeRect(p.x, p.y, p.width, p.height);
           ctx.restore();

           // Neon highlight
           ctx.save();
           ctx.globalAlpha = 0.25;
           ctx.fillStyle = '#fff';
           ctx.fillRect(p.x, p.y, p.width, 6);
           ctx.restore();
    }

    // ----- Static layer pre-rendering for non-moving platforms -----
    // Call when level content or viewport size changes
    renderStaticLayer(viewWidth = null, viewHeight = null) {
        try {
            // Cap pre-rendered static layer width to avoid excessive memory
            // and GPU texture usage. Use a smaller cap on mobile to reduce
            // pressure on devices like iPad/Safari.
            const MAX_STATIC_WIDTH = this.useMobileOptimizations ? 2048 : 4096;
            const targetW = Math.min(this.width, MAX_STATIC_WIDTH);
            // We'll render at the level height so vertical content is preserved
            const targetH = Math.max(1, Math.floor(this.height));

            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.floor(targetW));
            canvas.height = Math.max(1, Math.floor(targetH));
            const c = canvas.getContext('2d');
            c.imageSmoothingEnabled = false;

            // Clear
            c.fillStyle = 'rgba(0,0,0,0)';
            c.fillRect(0, 0, canvas.width, canvas.height);

            // Draw static (non-moving) platforms into the static canvas
            for (const p of this.platforms) {
                if (p.type === 'moving') continue; // skip moving platforms

                const sx = Math.floor((p.x / this.width) * canvas.width);
                const sy = Math.floor((p.y / this.height) * canvas.height);
                const sw = Math.max(1, Math.floor((p.width / this.width) * canvas.width));
                const sh = Math.max(1, Math.floor((p.height / this.height) * canvas.height));

                // If tile mode with a pattern, create pattern on the static ctx
                if (this.tileMode === 'tiles') {
                    const tileName = p.tile || 'platform_tile';
                    const pattern = this._createPattern(c, tileName);
                    if (pattern) {
                        c.save();
                        c.fillStyle = pattern;
                        c.fillRect(sx, sy, sw, sh);
                        c.restore();
                        // subtle border
                        c.save(); c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 2; c.strokeRect(sx, sy, sw, sh); c.restore();
                        continue;
                    }
                }

                // Fallback neon style
                c.save();
                const grad = c.createLinearGradient(sx, sy, sx, sy + sh);
                grad.addColorStop(0, this.theme.platTop);
                grad.addColorStop(1, this.theme.platBot);
                c.fillStyle = grad;
                c.fillRect(sx, sy, sw, sh);
                c.restore();
            }

            this._staticLayerCanvas = canvas;
            this._staticLayerScale = canvas.width / this.width;
            this._staticNeedsUpdate = false;
        } catch (e) {
            this._staticLayerCanvas = null;
            this._staticNeedsUpdate = true;
            console.warn('renderStaticLayer failed', e);
        }
    }
}