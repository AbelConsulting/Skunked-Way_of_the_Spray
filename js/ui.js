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

    drawHUD(ctx, player, score, combo, pulse, levelNumber = 1, objectiveInfo = null, lives = 1, idolStatus = null) {
        const padding = 12;

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
        const livesToShow = Math.min(lives || 1, maxDisplayLives);
        
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

            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(boxX, boxY, boxW, boxH);
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 1;
            ctx.strokeRect(boxX, boxY, boxW, boxH);

            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.font = labelFont;
            ctx.fillText(label, boxX + boxW - scorePadX, boxY + scorePadY - 2);

            ctx.fillStyle = p > 0 ? '#7CFF6B' : '#39FF14';
            ctx.font = valueFont;
            ctx.fillText(s, boxX + boxW - scorePadX, boxY + scorePadY + 10);

            ctx.restore();
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
