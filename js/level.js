class Level {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.platforms = [];
        this.backgroundGradient = null;
        
        // Default style config
        this.theme = {
            bgTop: '#2C1A4A',
            bgMid: '#3D2963',
            bgBot: '#1A0F2E',
            platTop: '#5A4A6A',
            platBot: '#3A2A4A',
            border: '#7A6A8A'
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

    draw(ctx, cameraX = 0, cameraY = 0) {
        // 1. Draw Background (Optimized)
        if (!this.backgroundGradient) {
            this.backgroundGradient = ctx.createLinearGradient(0, 0, 0, this.height);
            this.backgroundGradient.addColorStop(0, this.theme.bgTop);
            this.backgroundGradient.addColorStop(0.5, this.theme.bgMid);
            this.backgroundGradient.addColorStop(1, this.theme.bgBot);
        }
        
        ctx.fillStyle = this.backgroundGradient;
        // Draw bg relative to camera or fixed? usually fixed or parallax
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); 

        ctx.save();
        ctx.translate(-cameraX, -cameraY);

        // 2. Draw Platforms
        for (const platform of this.platforms) {
            this.drawPlatform(ctx, platform);
        }

        ctx.restore();
    }

    drawPlatform(ctx, p) {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(p.x + 5, p.y + 5, p.width, p.height);

        // Gradient Fill
        const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        grad.addColorStop(0, this.theme.platTop);
        grad.addColorStop(1, this.theme.platBot);
        ctx.fillStyle = grad;
        
        // Rounded corners for moving platforms?
        if (p.type === 'moving') {
             // You could change color here to indicate it moves
             ctx.fillStyle = '#6A5A8A'; 
        }

        ctx.fillRect(p.x, p.y, p.width, p.height);

        // Border
        ctx.strokeStyle = this.theme.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.width, p.height);

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(p.x, p.y, p.width, 5);
    }
}