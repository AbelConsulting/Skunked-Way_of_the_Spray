/**
 * Level and platform handling
 */

class Level {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.platforms = [];
        this.createPlatforms();
    }

    /**
     * Create level platforms
     */
    createPlatforms() {
        this.platforms = [
            // Ground platform
            { x: 0, y: 650, width: this.width, height: 70 },
            
            // Floating platforms
            { x: 300, y: 500, width: 200, height: 20 },
            { x: 600, y: 400, width: 200, height: 20 },
            { x: 900, y: 500, width: 200, height: 20 },
            { x: 150, y: 350, width: 150, height: 20 },
            { x: 750, y: 300, width: 150, height: 20 }
        ];
    }

    /**
     * Get all platforms
     */
    getPlatforms() {
        return this.platforms;
    }

    /**
     * Check if a rectangle collides with any platform
     */
    checkPlatformCollision(rect, velocityY) {
        for (const platform of this.platforms) {
            // Only check platforms if falling (velocity > 0) and feet are above platform top
            if (velocityY >= 0 && 
                rect.x + rect.width > platform.x && 
                rect.x < platform.x + platform.width) {
                
                const rectBottom = rect.y + rect.height;
                const platformTop = platform.y;
                
                // Check if player is landing on platform
                if (rectBottom <= platformTop + 10 && rectBottom > platformTop - 10) {
                    return {
                        collided: true,
                        platform: platform,
                        landingY: platform.y - rect.height
                    };
                }
            }
        }
        return { collided: false };
    }

    /**
     * Draw the level
     */
    draw(ctx, cameraX = 0) {
        // Draw background
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#2C1A4A');
        gradient.addColorStop(0.5, '#3D2963');
        gradient.addColorStop(1, '#1A0F2E');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw platforms
        ctx.save();
        ctx.translate(-cameraX, 0);

        for (const platform of this.platforms) {
            // Platform shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(platform.x + 5, platform.y + 5, platform.width, platform.height);

            // Platform gradient
            const platformGradient = ctx.createLinearGradient(
                platform.x, platform.y,
                platform.x, platform.y + platform.height
            );
            platformGradient.addColorStop(0, '#5A4A6A');
            platformGradient.addColorStop(1, '#3A2A4A');
            ctx.fillStyle = platformGradient;
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

            // Platform border
            ctx.strokeStyle = '#7A6A8A';
            ctx.lineWidth = 2;
            ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);

            // Platform highlights
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(platform.x, platform.y, platform.width, 5);
        }

        ctx.restore();
    }
}
