/**
 * UI and HUD rendering
 */

class UI {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.bossWarningTime = 0;

        // Transient stage toast shown briefly at level start
        this._levelTitleUntil = 0;
        this._levelTitleText = '';
        this._levelNameText = '';
    }

    showLevelTitle(levelName, levelNumber) {
        try {
            this._levelTitleUntil = Date.now() + 3000;
            this._levelTitleText = `STAGE ${levelNumber}`;
            this._levelNameText = String(levelName || '');
        } catch (e) {
            // no-op
        }
    }

    drawMenu(ctx) {
        // Background overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.width, this.height);

        // Title
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // "SKUNKED:" in red
        ctx.fillStyle = '#FF0000';
        ctx.fillText('SKUNKED:', this.width / 2, this.height / 2 - 100);
        
        // "WAY OF THE SPRAY" in green
        ctx.fillStyle = '#00FF00';
        ctx.fillText('WAY OF THE SPRAY', this.width / 2, this.height / 2 - 40);

        // Subtitle
        ctx.font = '32px Arial';
        ctx.fillStyle = '#CCCCCC';
        ctx.fillText('Ninja Skunk', this.width / 2, this.height / 2 + 20);

        // Instructions
        ctx.font = '24px Arial';
        ctx.fillStyle = '#FFFFFF';
        
        let startY = this.height / 2 + 50;
        ctx.fillText('Press ENTER or Tap to Start', this.width / 2, startY);

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

    drawGameOver(ctx, score, gameStats = {}) {
        // Background overlay with gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, 'rgba(20, 0, 0, 0.85)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Title with shadow
        ctx.save();
        ctx.font = 'bold 64px Arial';
        ctx.fillStyle = '#FF4444';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 15;
        ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 160);
        ctx.restore();

        // Score - Large and prominent
        ctx.save();
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;
        ctx.fillText(`SCORE: ${score}`, this.width / 2, this.height / 2 - 80);
        ctx.restore();

        // Stats breakdown in a box
        const boxW = 500;
        const boxH = 240;
        const boxX = this.width / 2 - boxW / 2;
        const boxY = this.height / 2 - 30;

        // Stats box background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Stats title
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('PERFORMANCE', this.width / 2, boxY + 25);

        // Individual stats with icons and colors
        const statsStartY = boxY + 60;
        const lineHeight = 35;
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';

        const stats = [
            { label: '⚔️  Enemies Defeated', value: gameStats.enemiesDefeated || 0, color: '#FF6B6B' },
            { label: '⏱️  Time Survived', value: this.formatTime(gameStats.timeSurvived || 0), color: '#4ECDC4' },
            { label: '🔥 Max Combo', value: `x${gameStats.maxCombo || 0}`, color: '#FFD93D' },
            { label: '🎯 Accuracy', value: `${Math.floor((gameStats.accuracy || 0) * 100)}%`, color: '#95E1D3' },
            { label: '🏺 Idols Collected', value: gameStats.idolsCollected || 0, color: '#F38181' }
        ];

        stats.forEach((stat, index) => {
            const y = statsStartY + (index * lineHeight);
            
            // Label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillText(stat.label, boxX + 30, y);
            
            // Value - right aligned with color
            ctx.textAlign = 'right';
            ctx.fillStyle = stat.color;
            ctx.font = 'bold 20px Arial';
            ctx.fillText(String(stat.value), boxX + boxW - 30, y);
            ctx.textAlign = 'left';
            ctx.font = '20px Arial';
        });

        // Instructions
        ctx.save();
        ctx.font = '24px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        const instructY = boxY + boxH + 50;
        
        // Blinking effect
        if (Math.floor(Date.now() / 500) % 2 === 0) {
            ctx.fillText('Press ENTER or Tap to Restart', this.width / 2, instructY);
        }
        ctx.restore();
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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

    drawVictory(ctx, score, gameStats = {}) {
        // Background overlay with golden gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, 'rgba(40, 30, 0, 0.90)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Animated golden particles effect
        const time = Date.now() / 1000;
        ctx.save();
        for (let i = 0; i < 20; i++) {
            const x = (Math.sin(time + i * 0.5) * 0.3 + 0.5) * this.width;
            const y = ((time * 50 + i * 100) % this.height);
            const size = Math.sin(time * 2 + i) * 2 + 3;
            ctx.fillStyle = `rgba(255, 215, 0, ${0.3 + Math.sin(time * 3 + i) * 0.2})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Title with pulsing glow
        ctx.save();
        ctx.font = 'bold 72px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 20 + Math.sin(Date.now() / 200) * 10;
        ctx.fillText('MISSION ACCOMPLISHED!', this.width / 2, this.height / 2 - 180);
        ctx.restore();

        // Final Score - Large and prominent
        ctx.save();
        ctx.font = 'bold 52px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 15;
        ctx.fillText(`FINAL SCORE: ${score}`, this.width / 2, this.height / 2 - 100);
        ctx.restore();

        // Stats box
        const boxW = 600;
        const boxH = 200;
        const boxX = this.width / 2 - boxW / 2;
        const boxY = this.height / 2 - 40;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Victory stats
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText('FINAL STATISTICS', this.width / 2, boxY + 25);

        const statsY = boxY + 60;
        const col1X = boxX + 150;
        const col2X = boxX + 450;
        const lineH = 35;
        
        ctx.font = '18px Arial';
        ctx.textAlign = 'left';
        
        // Left column
        const leftStats = [
            { label: '⚔️  Total Kills', value: gameStats.enemiesDefeated || 0, color: '#FF6B6B' },
            { label: '⏱️  Time', value: this.formatTime(gameStats.timeSurvived || 0), color: '#4ECDC4' },
            { label: '🔥 Best Combo', value: `x${gameStats.maxCombo || 0}`, color: '#FFD93D' }
        ];
        
        leftStats.forEach((stat, i) => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillText(stat.label, col1X - 130, statsY + i * lineH);
            ctx.fillStyle = stat.color;
            ctx.font = 'bold 18px Arial';
            ctx.fillText(String(stat.value), col1X + 20, statsY + i * lineH);
            ctx.font = '18px Arial';
        });
        
        // Right column
        const rightStats = [
            { label: '🎯 Accuracy', value: `${Math.floor((gameStats.accuracy || 0) * 100)}%`, color: '#95E1D3' },
            { label: '🏺 Idols', value: `${gameStats.idolsCollected || 0}/30`, color: '#F38181' },
            { label: '💎 Sets', value: gameStats.idolSetsCompleted || 0, color: '#A8E6CF' }
        ];
        
        rightStats.forEach((stat, i) => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillText(stat.label, col2X - 130, statsY + i * lineH);
            ctx.fillStyle = stat.color;
            ctx.font = 'bold 18px Arial';
            ctx.fillText(String(stat.value), col2X + 20, statsY + i * lineH);
            ctx.font = '18px Arial';
        });

        // Footer messages
        ctx.save();
        ctx.font = '20px Arial';
        ctx.fillStyle = '#AAAAAA';
        ctx.textAlign = 'center';
        ctx.fillText('The Skunk Squad is safe... for now.', this.width / 2, boxY + boxH + 40);
        
        ctx.font = '24px Arial';
        ctx.fillStyle = '#FFFFFF';
        if (Math.floor(Date.now() / 500) % 2 === 0) {
            ctx.fillText('Press ENTER to Play Again', this.width / 2, boxY + boxH + 80);
        }
        ctx.restore();
    }

    drawHUD(ctx, player, score, combo, pulse, levelNumber = 1, objectiveInfo = null, lives = 1, idolStatus = null, levelTime = 0) {
        const padding = 12;

        // Level timer (top-left, below health bar area)
        try {
            const timerBoxW = 140;
            const timerBoxH = 32;
            const timerBoxX = padding;
            const timerBoxY = this.height - padding - timerBoxH; // Bottom-left corner

            ctx.save();
            
            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(timerBoxX, timerBoxY, timerBoxW, timerBoxH);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(timerBoxX, timerBoxY, timerBoxW, timerBoxH);

            // Timer icon and text
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            
            // Clock emoji/icon
            ctx.font = '16px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fillText('⏱️', timerBoxX + 8, timerBoxY + timerBoxH / 2);
            
            // Time display
            ctx.font = 'bold 18px Arial';
            ctx.fillStyle = '#4ECDC4'; // Cyan color
            const timeText = this.formatTime(levelTime);
            ctx.fillText(timeText, timerBoxX + 32, timerBoxY + timerBoxH / 2);
            
            ctx.restore();
        } catch (e) {}

        // Health bar (compact)
        const iconSize = 14;
        const iconGap = 8;
        const healthBarWidth = 210;
        const healthBarHeight = 16;
        const healthBarX = padding + iconSize + iconGap;
        const healthBarY = padding;

        // Health icon (simple heart)
        try {
            const cx = padding + iconSize * 0.5;
            const cy = healthBarY + healthBarHeight * 0.5;
            const s = iconSize;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.fillStyle = 'rgba(255,80,80,0.95)';
            ctx.beginPath();
            ctx.moveTo(0, s * 0.28);
            ctx.bezierCurveTo(-s * 0.5, -s * 0.15, -s * 0.55, s * 0.35, 0, s * 0.72);
            ctx.bezierCurveTo(s * 0.55, s * 0.35, s * 0.5, -s * 0.15, 0, s * 0.28);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        } catch (e) {}

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
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1;
        ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

        // Life icons (hearts) below health bar
        const lifeIconSize = 20;
        const lifeIconGap = 6;
        const lifeIconsY = healthBarY + healthBarHeight + 8;
        const maxDisplayLives = 9; // Don't crowd the UI
        const safeLives = Number.isFinite(lives) ? lives : 0;
        const livesToShow = Math.min(Math.max(0, safeLives), maxDisplayLives);
        
        for (let i = 0; i < livesToShow; i++) {
            const lifeX = healthBarX + (i * (lifeIconSize + lifeIconGap));
            
            // Try to use the extra_life sprite if available
            try {
                if (typeof spriteLoader !== 'undefined' && spriteLoader.getSprite) {
                    const lifeSprite = spriteLoader.getSprite('extra_life');
                    if (lifeSprite && lifeSprite.width) {
                        ctx.drawImage(lifeSprite, lifeX, lifeIconsY, lifeIconSize, lifeIconSize);
                        continue;
                    }
                }
            } catch (e) {}
            
            // Fallback: draw a simple heart icon
            const cx = lifeX + lifeIconSize * 0.5;
            const cy = lifeIconsY + lifeIconSize * 0.5;
            const s = lifeIconSize * 0.7;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.moveTo(0, s * 0.28);
            ctx.bezierCurveTo(-s * 0.5, -s * 0.15, -s * 0.55, s * 0.35, 0, s * 0.72);
            ctx.bezierCurveTo(s * 0.55, s * 0.35, s * 0.5, -s * 0.15, 0, s * 0.28);
            ctx.closePath();
            ctx.fill();
            // White outline
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        }

        // Golden idol counter (3 icons) below life hearts (same size/spacing)
        try {
            const idolIcons = Array.isArray(idolStatus) && idolStatus.length > 0 ? idolStatus : [false, false, false];
            const idolSize = lifeIconSize;
            const idolGap = lifeIconGap;
            const idolX = healthBarX;
            const idolY = lifeIconsY + lifeIconSize + 6;

            for (let i = 0; i < 3; i++) {
                const collected = !!idolIcons[i];
                ctx.save();
                ctx.globalAlpha = collected ? 1.0 : 0.35;
                const ix = idolX + i * (idolSize + idolGap);
                const iy = idolY;
                if (typeof Utils !== 'undefined' && Utils.drawGoldenIdol) {
                    Utils.drawGoldenIdol(ctx, ix, iy, idolSize);
                } else if (typeof spriteLoader !== 'undefined' && spriteLoader.getSprite) {
                    const idolSprite = spriteLoader.getSprite('golden_idol');
                    if (idolSprite && idolSprite.width) {
                        ctx.drawImage(idolSprite, ix, iy, idolSize, idolSize);
                    }
                }
                // Match heart outline styling for consistency
                ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                ctx.lineWidth = 1;
                ctx.strokeRect(ix, iy, idolSize, idolSize);
                ctx.restore();
            }
            
            // Buff indicators (below idol icons)
            try {
                const speedBonus = player && player.idolBonuses && typeof player.idolBonuses.speed === 'number'
                    ? player.idolBonuses.speed
                    : 0;
                const damageBonus = player && player.idolBonuses && typeof player.idolBonuses.damage === 'number'
                    ? player.idolBonuses.damage
                    : 0;
                const speedBoostMultiplier = player && player.speedBoost && typeof player.speedBoost.multiplier === 'number'
                    ? player.speedBoost.multiplier
                    : 1;
                const damageBoostMultiplier = player && player.damageBoost && typeof player.damageBoost.multiplier === 'number'
                    ? player.damageBoost.multiplier
                    : 1;
                const totalSpeedMultiplier = Math.max(0, speedBoostMultiplier) * (1 + Math.max(0, speedBonus));
                const totalDamageMultiplier = Math.max(0, damageBoostMultiplier) * (1 + Math.max(0, damageBonus));
                const speedPercent = Math.max(0, Math.round((totalSpeedMultiplier - 1) * 100));
                const damagePercent = Math.max(0, Math.round((totalDamageMultiplier - 1) * 100));
                const hasBuffs = speedPercent > 0 || damagePercent > 0;

                if (player && hasBuffs) {
                    const indicatorY = idolY + idolSize + 6;
                    const pillH = 18;
                    const pillPadX = 8;
                    const pillGap = 6;
                    const speedLabel = `⚡ +${speedPercent}%`;
                    const dmgLabel = `💥 +${damagePercent}%`;

                    const drawPill = (x, y, w, h, r) => {
                        const radius = Math.max(0, Math.min(r, h / 2, w / 2));
                        if (typeof ctx.roundRect === 'function') {
                            ctx.beginPath();
                            ctx.roundRect(x, y, w, h, radius);
                            return;
                        }
                        ctx.beginPath();
                        ctx.moveTo(x + radius, y);
                        ctx.lineTo(x + w - radius, y);
                        ctx.arcTo(x + w, y, x + w, y + radius, radius);
                        ctx.lineTo(x + w, y + h - radius);
                        ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
                        ctx.lineTo(x + radius, y + h);
                        ctx.arcTo(x, y + h, x, y + h - radius, radius);
                        ctx.lineTo(x, y + radius);
                        ctx.arcTo(x, y, x + radius, y, radius);
                    };

                    ctx.save();
                    ctx.font = 'bold 11px Arial';
                    ctx.textBaseline = 'middle';

                    const speedW = Math.ceil(ctx.measureText(speedLabel).width) + (pillPadX * 2);
                    const dmgW = Math.ceil(ctx.measureText(dmgLabel).width) + (pillPadX * 2);
                    let curX = idolX;

                    // Speed pill
                    if (speedPercent > 0) {
                        ctx.fillStyle = 'rgba(0, 200, 255, 0.22)';
                        ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
                        ctx.lineWidth = 1;
                        drawPill(curX, indicatorY, speedW, pillH, 8);
                        ctx.fill();
                        ctx.stroke();
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillText(speedLabel, curX + pillPadX, indicatorY + pillH / 2 + 1);
                        curX += speedW + pillGap;
                    }

                    // Damage pill
                    if (damagePercent > 0) {
                        ctx.fillStyle = 'rgba(255, 90, 90, 0.22)';
                        ctx.strokeStyle = 'rgba(255, 120, 120, 0.7)';
                        ctx.lineWidth = 1;
                        drawPill(curX, indicatorY, dmgW, pillH, 8);
                        ctx.fill();
                        ctx.stroke();
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillText(dmgLabel, curX + pillPadX, indicatorY + pillH / 2 + 1);
                    }

                    ctx.restore();
                }
            } catch (e) {}
        } catch (e) {}

        // Optional numeric HP (only when low, small + subtle)
        try {
            if ((player.health / player.maxHealth) <= 0.3) {
                ctx.font = '12px Arial';
                ctx.fillStyle = 'rgba(255,255,255,0.75)';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(`${Math.max(0, Math.floor(player.health))}/${player.maxHealth}`, healthBarX + 6, healthBarY + 2);
            }
        } catch (e) {}

        // Top-center progress bar (distance to boss/exit, or boss HP)
        try {
            if (objectiveInfo && (typeof objectiveInfo.progress === 'number' || typeof objectiveInfo.bossHpPct === 'number')) {
                const mode = String(objectiveInfo.mode || '');
                const iconSize = 14;
                const iconGap = 10;

                const barW = Math.min(Math.floor(this.width * 0.44), 520);
                const barH = 6;
                const totalW = barW + (iconSize * 2) + (iconGap * 2);
                const centerStartX = Math.floor((this.width - totalW) / 2);
                const minStartX = healthBarX + healthBarWidth + padding;
                const maxStartX = this.width - totalW - padding;
                const startX = Math.max(Math.min(centerStartX, maxStartX), minStartX);
                const iconY = padding + 1;
                const barX = startX + iconSize + iconGap;
                const barY = padding + 6;

                const drawIcon = (x, y, kind) => {
                    const s = iconSize;
                    ctx.save();
                    ctx.translate(x + s / 2, y + s / 2);
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = 'rgba(255,255,255,0.65)';

                    if (kind === 'start') {
                        // Tiny flag
                        ctx.beginPath();
                        ctx.moveTo(-s * 0.25, -s * 0.35);
                        ctx.lineTo(-s * 0.25, s * 0.35);
                        ctx.stroke();

                        ctx.fillStyle = 'rgba(255,255,255,0.85)';
                        ctx.beginPath();
                        ctx.moveTo(-s * 0.22, -s * 0.35);
                        ctx.lineTo(s * 0.35, -s * 0.2);
                        ctx.lineTo(-s * 0.22, 0);
                        ctx.closePath();
                        ctx.fill();
                    } else if (kind === 'boss') {
                        // Simple skull
                        ctx.fillStyle = 'rgba(255,255,255,0.85)';
                        ctx.beginPath();
                        ctx.arc(0, -s * 0.05, s * 0.35, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillRect(-s * 0.18, s * 0.1, s * 0.36, s * 0.26);

                        ctx.fillStyle = 'rgba(0,0,0,0.75)';
                        ctx.beginPath();
                        ctx.arc(-s * 0.14, -s * 0.08, s * 0.08, 0, Math.PI * 2);
                        ctx.arc(s * 0.14, -s * 0.08, s * 0.08, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (kind === 'exit') {
                        // Simple door
                        ctx.fillStyle = 'rgba(255,255,255,0.15)';
                        ctx.fillRect(-s * 0.28, -s * 0.35, s * 0.56, s * 0.7);
                        ctx.strokeRect(-s * 0.28, -s * 0.35, s * 0.56, s * 0.7);
                        ctx.fillStyle = 'rgba(255,255,255,0.8)';
                        ctx.beginPath();
                        ctx.arc(s * 0.12, 0, s * 0.05, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    ctx.restore();
                };

                // Background + fill
                ctx.save();
                ctx.fillStyle = 'rgba(0,0,0,0.45)';
                ctx.fillRect(barX, barY, barW, barH);
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 1;
                ctx.strokeRect(barX, barY, barW, barH);

                let p = null;
                let fill = '#39FF14';
                if (typeof objectiveInfo.bossHpPct === 'number') {
                    p = Math.max(0, Math.min(1, objectiveInfo.bossHpPct));
                    fill = '#ff4444';
                } else {
                    p = Math.max(0, Math.min(1, objectiveInfo.progress));
                    fill = '#39FF14';
                }
                ctx.fillStyle = fill;
                ctx.fillRect(barX, barY, Math.max(0, Math.floor(barW * p)), barH);

                // Icons: start (left), boss or exit (right)
                drawIcon(startX, iconY, 'start');
                if (mode === 'boss') drawIcon(startX + iconSize + iconGap + barW + iconGap, iconY, 'boss');
                else if (mode === 'toBoss') drawIcon(startX + iconSize + iconGap + barW + iconGap, iconY, 'boss');
                else drawIcon(startX + iconSize + iconGap + barW + iconGap, iconY, 'exit');

                // Skunk-head marker
                const mx = barX + Math.floor(barW * p);
                const my = barY + Math.floor(barH / 2);
                ctx.beginPath();
                ctx.fillStyle = 'rgba(0,0,0,0.9)';
                ctx.arc(mx, my, 7, 0, Math.PI * 2);
                ctx.fill();

                // White stripe
                ctx.save();
                ctx.translate(mx, my);
                ctx.rotate(-0.55);
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.fillRect(-1.5, -7, 3, 14);
                ctx.restore();

                // Little nose highlight
                ctx.beginPath();
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.arc(mx + 2, my - 2, 2.2, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
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

        // Score (top-right, simple + readable)
        try {
            const s = typeof score === 'number' ? String(score) : String(score || 0);
            const p = Math.max(0, Math.min(1, pulse || 0));
            const scorePadX = 10;
            const scorePadY = 8;

            const label = 'SCORE';
            ctx.save();
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';

            const labelFont = '12px Arial';
            const valueFont = 'bold 22px Arial';
            ctx.font = valueFont;
            const valueW = ctx.measureText(s).width;
            ctx.font = labelFont;
            const labelW = ctx.measureText(label).width;
            const boxW = Math.ceil(Math.max(valueW, labelW) + scorePadX * 2);
            const boxH = 34;
            const boxX = this.width - padding - boxW;
            const boxY = padding;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(boxX, boxY, boxW, boxH);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(boxX, boxY, boxW, boxH);

            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.font = labelFont;
            ctx.fillText(label, boxX + boxW - scorePadX, boxY + scorePadY - 2);

            // Pulse effect on score when increasing
            const pulseScale = 1 + (p * 0.15);
            ctx.save();
            if (p > 0) {
                const textX = boxX + boxW - scorePadX;
                const textY = boxY + scorePadY + 10;
                ctx.translate(textX, textY);
                ctx.scale(pulseScale, pulseScale);
                ctx.translate(-textX, -textY);
                ctx.fillStyle = '#FFD700'; // Gold when pulsing
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 8;
            } else {
                ctx.fillStyle = '#39FF14'; // Neon green normal
            }
            ctx.font = valueFont;
            ctx.fillText(s, boxX + boxW - scorePadX, boxY + scorePadY + 10);
            ctx.restore();

            ctx.restore();
        } catch (e) {}

        // Combo counter (below score, top-right area)
        try {
            if (combo && combo > 1) {
                const comboBoxW = 120;
                const comboBoxH = 28;
                const comboBoxX = this.width - padding - comboBoxW;
                const comboBoxY = padding + 40; // Below score

                ctx.save();
                
                // Animated background based on combo level
                const comboIntensity = Math.min(combo / 10, 1);
                const bgAlpha = 0.6 + (comboIntensity * 0.2);
                ctx.fillStyle = `rgba(255, ${Math.floor(100 * (1 - comboIntensity))}, 0, ${bgAlpha})`;
                ctx.fillRect(comboBoxX, comboBoxY, comboBoxW, comboBoxH);
                
                // Glowing border for high combos
                if (combo >= 5) {
                    ctx.strokeStyle = '#FF6600';
                    ctx.shadowColor = '#FF6600';
                    ctx.shadowBlur = 10 + Math.sin(Date.now() / 100) * 5;
                } else {
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                }
                ctx.lineWidth = 2;
                ctx.strokeRect(comboBoxX, comboBoxY, comboBoxW, comboBoxH);

                // Combo text
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 18px Arial';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 3;
                ctx.fillText(`COMBO x${combo}`, comboBoxX + comboBoxW / 2, comboBoxY + comboBoxH / 2);
                
                ctx.restore();
            }
        } catch (e) {}

        // (Removed) Attack cooldown debug bar
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
