/**
 * UI and HUD rendering
 */

class UI {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }

    drawMenu(ctx) {
        // Background overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.width, this.height);

        // Title
        ctx.font = 'bold 72px Arial';
        ctx.fillStyle = '#FF0000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillText('SKUNK FU', this.width / 2, this.height / 2 - 100);

        // Subtitle
        ctx.font = '32px Arial';
        ctx.fillStyle = '#CCCCCC';
        ctx.fillText('Ninja Skunk', this.width / 2, this.height / 2 - 40);

        // Instructions
        ctx.font = '24px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Press ENTER to Start', this.width / 2, this.height / 2 + 50);

        // Controls
        ctx.font = '18px Arial';
        ctx.fillStyle = '#AAAAAA';
        ctx.textAlign = 'left';
        const startX = this.width / 2 - 200;
        const startY = this.height / 2 + 120;
        const lineHeight = 25;

        ctx.fillText('Controls:', startX, startY);
        ctx.fillText('Arrow Keys / A,D - Move', startX, startY + lineHeight);
        ctx.fillText('Spacebar - Jump', startX, startY + lineHeight * 2);
        ctx.fillText('X - Attack', startX, startY + lineHeight * 3);
        ctx.fillText('Z - Shadow Strike', startX, startY + lineHeight * 4);
        ctx.fillText('ESC - Pause', startX, startY + lineHeight * 5);
    }

    drawPauseMenu(ctx) {
        // Background overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, this.width, this.height);

        // Title
        ctx.font = 'bold 64px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PAUSED', this.width / 2, this.height / 2);

        // Instructions
        ctx.font = '24px Arial';
        ctx.fillText('Press ESC to Resume', this.width / 2, this.height / 2 + 60);
    }

    drawGameOver(ctx, score, enemiesDefeated) {
        // Background overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.width, this.height);

        // Title
        ctx.font = 'bold 64px Arial';
        ctx.fillStyle = '#FF4444';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 80);

        // Stats
        ctx.font = '32px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`Score: ${score}`, this.width / 2, this.height / 2);
        ctx.fillText(`Enemies Defeated: ${enemiesDefeated}`, this.width / 2, this.height / 2 + 50);

        // Instructions
        ctx.font = '24px Arial';
        ctx.fillText('Press ENTER to Restart', this.width / 2, this.height / 2 + 120);
    }

    drawHUD(ctx, player, score, combo) {
        const padding = 20;

        // Health bar
        const healthBarWidth = 300;
        const healthBarHeight = 30;
        const healthBarX = padding;
        const healthBarY = padding;

        // Health bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

        // Health bar fill
        const healthPercent = player.health / player.maxHealth;
        const healthColor = healthPercent > 0.5 ? '#00FF00' : 
                           healthPercent > 0.25 ? '#FFFF00' : '#FF0000';
        
        ctx.fillStyle = healthColor;
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);

        // Health bar border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

        // Health text
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`HP: ${Math.max(0, Math.floor(player.health))} / ${player.maxHealth}`, 
                     healthBarX + 10, healthBarY + 6);

        // Score
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`Score: ${score}`, this.width - padding, padding);

        // Combo counter
        if (combo > 1) {
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFD700';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            const comboX = this.width / 2;
            const comboY = 100;
            
            ctx.strokeText(`${combo}x COMBO!`, comboX, comboY);
            ctx.fillText(`${combo}x COMBO!`, comboX, comboY);
        }

        // Special ability cooldown indicator
        if (player.attackCooldownTimer > 0) {
            const cooldownBarWidth = 200;
            const cooldownBarHeight = 10;
            const cooldownBarX = padding;
            const cooldownBarY = healthBarY + healthBarHeight + 10;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(cooldownBarX, cooldownBarY, cooldownBarWidth, cooldownBarHeight);
            
            const cooldownPercent = 1 - (player.attackCooldownTimer / player.attackCooldown);
            ctx.fillStyle = '#00CCFF';
            ctx.fillRect(cooldownBarX, cooldownBarY, cooldownBarWidth * cooldownPercent, cooldownBarHeight);
            
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.strokeRect(cooldownBarX, cooldownBarY, cooldownBarWidth, cooldownBarHeight);
        }
    }
}
