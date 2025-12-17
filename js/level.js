class Level {
    /**
     * Load level data from an external configuration
     * This allows you to have Level 1, Level 2, etc. without changing code.
     */
    loadLevel(levelData) {
        this.width = levelData.width || this.width;
        this.height = levelData.height || this.height;
        // Optional background name (matches keys from spriteLoader)
        this.backgroundName = levelData.background || levelData.backgroundName || this.backgroundName || 'bg_city';
        // Per-level background parallax factor (0..1). Lower = slower (farther away).
        this.backgroundParallax = (typeof levelData.backgroundParallax !== 'undefined') ? levelData.backgroundParallax : (typeof Config !== 'undefined' ? Config.BACKGROUND_PARALLAX : 0.5);
        
        // Initialize platforms (static and moving)
        this.platforms = levelData.platforms.map(p => ({
            ...p,
            // If it's a moving platform, set initial state
            initialX: p.x,
            initialY: p.y,
            timeOffset: Math.random() * Math.PI * 2 // Randomize start phase
        }));
        // Optional enemy spawn points (array of { x: number|'left'|'right', y: number })
        this.spawnPoints = Array.isArray(levelData.spawnPoints) ? levelData.spawnPoints.slice() : null;
        // Mark static layer dirty so it will be re-rendered on next draw
        this._staticNeedsUpdate = true;
        // Hazards (e.g., spikes) - array of rects: { x,y,width,height,type }
        this.hazards = Array.isArray(levelData.hazards) ? levelData.hazards.map(h => ({ ...h })) : [];
        // If spikes are globally disabled, remove them from the loaded hazards so
        // they don't exist in level data anymore (permanent removal at load time).
        if (typeof Config !== 'undefined' && Config.DISABLE_SPIKES) {
            const before = this.hazards.length;
            this.hazards = this.hazards.filter(h => !(h && (h.type === 'spike' || h.type === 'moving_spike')));
            const removed = before - this.hazards.length;
            if (removed > 0 && typeof console !== 'undefined' && console.log) console.log(`Removed ${removed} spike hazards from level due to Config.DISABLE_SPIKES`);
        }
    }

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
                if (h.axis && h.range && (h.type === 'moving_spike' || h.moving)) {
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
     * ROBUST Collision Detection
     * Uses "previous frame" position to prevent tunneling.
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

    draw(ctx, cameraX = 0, cameraY = 0, viewWidth = null, viewHeight = null) {
        // 1. Draw Background (panorama if available, otherwise gradient)
        const w = viewWidth || this.width || ctx.canvas.width;
        const h = viewHeight || this.height || ctx.canvas.height;

        let bgImg = null;
        try {
            if (!this.cachedSprites[this.backgroundName]) {
                this.cachedSprites[this.backgroundName] = (typeof spriteLoader !== 'undefined') ? spriteLoader.getSprite(this.backgroundName) : null;
            }
            bgImg = this.cachedSprites[this.backgroundName];
        } catch (e) { bgImg = null; }
        if (bgImg) {
            // Draw a simple parallax: background stretched horizontally to level width
            // and vertically to cover the view height. Use cameraX to offset for parallax.
            try {
                // Compute scale so bg image covers the visible area vertically
                const scaleY = h / bgImg.height;
                const scaledW = Math.ceil(bgImg.width * scaleY);
                // Determine repeated tiles needed to cover level width. On mobile
                // use a single stretched background to reduce draw calls.
                const parallax = (typeof this.backgroundParallax !== 'undefined') ? this.backgroundParallax : (typeof Config !== 'undefined' ? Config.BACKGROUND_PARALLAX : 0.5);
                let repeatCount = Math.ceil((this.width) / scaledW) + 1;
                let drawScaledW = scaledW;
                if (this.useMobileOptimizations) {
                    // Stretch the background to the level width and draw it once.
                    drawScaledW = Math.max(1, Math.ceil(this.width));
                    repeatCount = 1;
                }
                const startX = Math.floor(-((cameraX * parallax) % drawScaledW));
                for (let i = 0; i < repeatCount; i++) {
                    const dx = startX + i * drawScaledW;
                    ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height, dx, cameraY, drawScaledW, h);
                }
            } catch (e) {
                // fallback to gradient if draw fails
                bgImg = null;
            }
        }

        if (!bgImg) {
            if (!this.backgroundGradient) {
                this.backgroundGradient = ctx.createLinearGradient(0, 0, 0, this.height);
                this.backgroundGradient.addColorStop(0, this.theme.bgTop);
                this.backgroundGradient.addColorStop(0.5, this.theme.bgMid);
                this.backgroundGradient.addColorStop(1, this.theme.bgBot);
            }
            ctx.fillStyle = this.backgroundGradient;
            ctx.fillRect(cameraX, cameraY, w, h);
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

        // 3. Draw hazards (spikes etc.) on top of platforms
        if (this.hazards && this.hazards.length > 0) {
            const now = Date.now() / 1000;
            for (const h of this.hazards) {
                try {
                    // If enabled, draw path indicator for moving hazards
                    const showIndicator = (typeof Config !== 'undefined') ? !!Config.HAZARD_INDICATORS : true;
                    if (showIndicator && (h.axis && h.range)) {
                        ctx.save();
                        ctx.lineWidth = 2;
                        ctx.strokeStyle = 'rgba(255,200,0,0.25)';
                        ctx.setLineDash([6, 6]);
                        if (h.axis === 'x') {
                            const minX = h.x - h.range;
                            const maxX = h.x + h.range;
                            const midY = h.y + h.height / 2;
                            ctx.beginPath(); ctx.moveTo(minX, midY); ctx.lineTo(maxX, midY); ctx.stroke();
                            // draw endpoints
                            ctx.fillStyle = 'rgba(255,200,0,0.12)'; ctx.fillRect(minX - 3, h.y, 6, h.height); ctx.fillRect(maxX - 3, h.y, 6, h.height);
                        } else {
                            const minY = h.y - h.range;
                            const maxY = h.y + h.range;
                            const midX = h.x + h.width / 2;
                            ctx.beginPath(); ctx.moveTo(midX, minY); ctx.lineTo(midX, maxY); ctx.stroke();
                            ctx.fillStyle = 'rgba(255,200,0,0.12)'; ctx.fillRect(h.x, minY - 3, h.width, 6); ctx.fillRect(h.x, maxY - 3, h.width, 6);
                        }
                        ctx.restore();
                    }

                    // Draw spike visuals unless spikes have been disabled via config
                    if (h.type === 'spike' || h.type === 'moving_spike') {
                        if (typeof Config !== 'undefined' && Config.DISABLE_SPIKES) {
                            // No visual for disabled spikes
                        } else {
                            const step = 8;
                            const spikeH = Math.min(14, Math.max(8, Math.floor(h.height * 0.9)));
                            const left = h.x;
                            const top = h.y;
                            const right = h.x + h.width;
                            const n = Math.ceil(h.width / step);
                            ctx.save();
                            ctx.fillStyle = '#ff4d4d';
                            for (let i = 0; i < n; i++) {
                                const sx = left + i * step;
                                const sw = Math.min(step, right - sx);
                                ctx.beginPath();
                                ctx.moveTo(sx, top + h.height);
                                ctx.lineTo(sx + sw / 2, top + h.height - spikeH);
                                ctx.lineTo(sx + sw, top + h.height);
                                ctx.closePath();
                                ctx.fill();
                            }

                            // timing indicator: small pulse above spikes for moving spikes
                            if (h.type === 'moving_spike' && showIndicator) {
                                try {
                                    const phase = Math.sin(now * (h.speed || 1) + (h.timeOffset || 0));
                                    const intensity = (phase + 1) / 2; // 0..1
                                    const cx = h.x + h.width / 2;
                                    const cy = h.y - 8;
                                    ctx.globalAlpha = 0.6 * intensity + 0.2;
                                    ctx.fillStyle = '#ffef8a';
                                    ctx.beginPath(); ctx.arc(cx, cy, 6 + intensity * 4, 0, Math.PI * 2); ctx.fill();
                                    ctx.globalAlpha = 1.0;
                                } catch (e) {}
                            }

                            ctx.restore();
                        }
                    } else {
                        // Generic hazard box
                        ctx.save(); ctx.fillStyle = 'rgba(255,0,0,0.12)'; ctx.fillRect(h.x, h.y, h.width, h.height); ctx.restore();
                    }
                } catch (e) {}
            }
        }

        ctx.restore();
    }

    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.platforms = [];
        this.backgroundGradient = null;
        this.tileMode = 'tiles'; // 'tiles' or 'neon' - controls platform rendering
        this._tilePatterns = {}; // cache for canvas patterns
        this.cachedSprites = {}; // cache for sprite images
        
        // Cyberpunk style config
        this.theme = {
            bgTop: '#0f0026',      // Deep purple/blue night sky
            bgMid: '#2d0a4b',      // Neon purple
            bgBot: '#0a0a23',      // Dark blue/black
            platTop: '#00fff7',    // Neon cyan
            platBot: '#ff00ea',    // Neon magenta
            border: '#fffb00',     // Bright yellow border
            glow: '#00fff7',       // Neon cyan glow
        };
    }

    drawPlatform(ctx, p) {
        // If tile mode is enabled and sprite exists, draw a tiled fill
        if (this.tileMode === 'tiles') {
            const tileName = p.tile || 'platform_tile';
            let tileImg = this.cachedSprites[tileName];
            if (!tileImg) {
                tileImg = (typeof spriteLoader !== 'undefined') ? spriteLoader.getSprite(tileName) : null;
                if (tileImg) this.cachedSprites[tileName] = tileImg;
            }
            if (tileImg) {
                if (!this._tilePatterns) this._tilePatterns = {};
                if (!this._tilePatterns[tileName]) {
                    try {
                        this._tilePatterns[tileName] = ctx.createPattern(tileImg, 'repeat');
                    } catch (e) {
                        this._tilePatterns[tileName] = null;
                    }
                }
                const pattern = this._tilePatterns[tileName];
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
            const MAX_STATIC_WIDTH = 4096; // cap to avoid excessive memory use
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
                    let tileImg = this.cachedSprites[tileName];
                    if (!tileImg) {
                        tileImg = (typeof spriteLoader !== 'undefined') ? spriteLoader.getSprite(tileName) : null;
                        if (tileImg) this.cachedSprites[tileName] = tileImg;
                    }
                    if (tileImg) {
                        try {
                            const pattern = c.createPattern(tileImg, 'repeat');
                            if (pattern) {
                                c.save();
                                c.fillStyle = pattern;
                                c.fillRect(sx, sy, sw, sh);
                                c.restore();
                                // subtle border
                                c.save(); c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 2; c.strokeRect(sx, sy, sw, sh); c.restore();
                                continue;
                            }
                        } catch (e) {}
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