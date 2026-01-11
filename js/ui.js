/**
 * UI and HUD rendering
 */

class UI {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.bossWarningTime = 0;
    }

    drawMenu(ctx, savedLevelIndex = 0) {
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
        
        let startY = this.height / 2 + 50;
        ctx.fillText('Press ENTER to Start New Game', this.width / 2, startY);
        
        // Show Continue option if available
        if (savedLevelIndex > 0) {
            startY += 40;
            ctx.fillStyle = '#FFFF00';
            ctx.fillText(`Press C to Continue (Stage ${savedLevelIndex + 1})`, this.width / 2, startY);
            ctx.fillStyle = '#FFFFFF'; // Reset
        }

        // Controls
        ctx.font = '18px Arial';
        ctx.fillStyle = '#AAAAAA';
        ctx.textAlign = 'left';
        const ctrlX = this.width / 2 - 200;
        const ctrlY = startY + 70;
        const lineHeight = 25;

        ctx.fillText('Controls:', ctrlX, ctrlY);
        ctx.fillText('Arrow Keys / A,D - Move', ctrlX, ctrlY + lineHeight);
        ctx.fillText('Spacebar - Jump', ctrlX, ctrlY + lineHeight * 2);
        ctx.fillText('X - Attack', ctrlX, ctrlY + lineHeight * 3);
        ctx.fillText('Z - Shadow Strike', ctrlX, ctrlY + lineHeight * 4);
        ctx.fillText('ESC - Pause', ctrlX, ctrlY + lineHeight * 5);
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

    drawLevelComplete(ctx, levelNum) {
        // Background overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.font = 'bold 64px Arial';
        ctx.fillStyle = '#44FF44'; // Green for success
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('STAGE CLEAR!', this.width / 2, this.height / 2 - 40);

        ctx.font = '32px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`Proceeding to Stage ${levelNum + 1}...`, this.width / 2, this.height / 2 + 30);
    }

    drawVictory(ctx, score) {
        // Background overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.font = 'bold 72px Arial';
        ctx.fillStyle = '#FFD700'; // Gold
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('MISSION ACCOMPLISHED!', this.width / 2, this.height / 2 - 60);

        ctx.font = '36px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`Final Score: ${score}`, this.width / 2, this.height / 2 + 20);
        
        ctx.font = '24px Arial';
        ctx.fillStyle = '#AAAAAA';
        ctx.fillText('The Skunk Squad is safe... for now.', this.width / 2, this.height / 2 + 80);
        ctx.fillText('Press ENTER to Play Again', this.width / 2, this.height / 2 + 130);
    }

    drawHUD(ctx, player, score, combo, pulse, levelNumber = 1) {
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

        // Stage Indicator
        try {
            ctx.save();
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.font = 'bold 24px Arial';
            ctx.fillText(`STAGE ${levelNumber}`, this.width / 2, padding + 10);
            ctx.restore();
        } catch (e) {}

        // Boss Warning Overlay
        if (this.bossWarningTime > Date.now()) {
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; // Dim bg slightly
            ctx.fillRect(0, this.height/2 - 100, this.width, 200);

            // Flashing effect
            if (Math.floor(Date.now() / 200) % 2 === 0) {
                ctx.fillStyle = '#FF0000';
            } else {
                ctx.fillStyle = '#FFFFFF';
            }
            
            ctx.font = 'bold 80px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 10;
            ctx.fillText('WARNING', this.width / 2, this.height / 2 - 20);
            
            ctx.fillStyle = '#FFDD00';
            ctx.font = 'bold 40px Arial';
            ctx.shadowBlur = 0;
            ctx.fillText('BOSS APPROACHING', this.width / 2, this.height / 2 + 50);
            ctx.restore();
        }

        // Score (neon number with pulse animation)
        try {
            const s = typeof score === 'number' ? String(score) : String(score || 0);
            const scoreX = this.width - padding;
            const scoreY = padding;
            const p = Math.max(0, Math.min(1, pulse || 0));
            const scale = 1 + p * 0.28;

            ctx.save();
            ctx.translate(scoreX, scoreY);
            ctx.scale(scale, scale);
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';

            // Small label
            ctx.font = '12px Arial';
            ctx.fillStyle = '#cfe';
            ctx.fillText('SCORE', 0, 0);

            // Neon number with glow
            const numY = 16;
            ctx.font = 'bold 28px Arial';
            ctx.fillStyle = '#39FF14';
            ctx.shadowColor = '#39FF14';
            ctx.shadowBlur = 10 + p * 18;
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.strokeText(s, 0, numY);
            ctx.fillText(s, 0, numY);

            // reset
            ctx.shadowBlur = 0;
            ctx.restore();
        } catch (e) {}

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

    drawTransition(ctx, alpha, text = "") {
        if (alpha <= 0) return;
        
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(0, 0, this.width, this.height);

        if (text && alpha > 0.5) {
            ctx.save();
            ctx.globalAlpha = (alpha - 0.5) * 2; // Fade text in later
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, this.width / 2, this.height / 2);
            ctx.restore();
        }
    }

    showBossWarning() {
        this.bossWarningTime = Date.now() + 3000;
    }
}
