class Level {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.platforms = [];
        this.backgroundGradient = null;
        
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

    /**
     * Load level data from an external configuration
     * This allows you to have Level 1, Level 2, etc. without changing code.
     */
    loadLevel(levelData) {
        this.width = levelData.width || this.width;
        this.height = levelData.height || this.height;
        
        // Initialize platforms (static and moving)
        this.platforms = levelData.platforms.map(p => ({
            ...p,
            // If it's a moving platform, set initial state
            initialX: p.x,
            initialY: p.y,
            timeOffset: Math.random() * Math.PI * 2 // Randomize start phase
        }));
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
        // 1. Draw Background (Optimized)
        if (!this.backgroundGradient) {
            this.backgroundGradient = ctx.createLinearGradient(0, 0, 0, this.height);
            this.backgroundGradient.addColorStop(0, this.theme.bgTop);
            this.backgroundGradient.addColorStop(0.5, this.theme.bgMid);
            this.backgroundGradient.addColorStop(1, this.theme.bgBot);
        }
        
        ctx.fillStyle = this.backgroundGradient;
        // Draw the background using logical view dimensions when provided so
        // it matches the scaled world coordinates and doesn't depend on
        // the canvas pixel buffer size (avoids intermittent visual jumps
        // when pixel buffer is resized during asset loads).
        const w = viewWidth || this.width || ctx.canvas.width;
        const h = viewHeight || this.height || ctx.canvas.height;
        ctx.fillRect(cameraX, cameraY, w, h);

        ctx.save();
        ctx.translate(-cameraX, -cameraY);

        // 2. Draw Platforms
        for (const platform of this.platforms) {
            this.drawPlatform(ctx, platform);
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
            const tileImg = (typeof spriteLoader !== 'undefined') ? spriteLoader.getSprite(tileName) : null;
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
}