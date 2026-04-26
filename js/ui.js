/*!
 * Skunked: Way of the Spray
 * Copyright (c) 2026 Mephitideus Interactive. All Rights Reserved.
 * Proprietary and confidential — unauthorized copying, distribution, or use
 * of this file, via any medium, is strictly prohibited. See LICENSE for terms.
 */
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

        // Safe-area insets for notched / cutout devices (read from CSS env())
        this.safeTop = 0;
        this.safeBottom = 0;
        this.safeLeft = 0;
        this.safeRight = 0;
        this._refreshSafeAreaInsets();

        // Title-screen particle field (lazy-initialised on first drawMenu call)
        this._menuParticles = null;

        // Game-over scroll state (canvas-based virtual scroll)
        this._goScrollY = 0;       // current scroll offset (px, 0 = top)
        this._goScrollVel = 0;     // momentum velocity
        this._goTouchStartY = null;
        this._goTouchLastY = null;
        this._goContentH = 0;      // total content height (computed each frame)
        this._goScrollBound = false;
    }

    /**
     * Bind scroll input (wheel + touch drag) to the game canvas for game-over scrolling.
     * Called lazily on first game-over render.
     */
    _bindGameOverScroll() {
        if (this._goScrollBound) return;
        this._goScrollBound = true;

        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;

        // Mouse wheel
        canvas.addEventListener('wheel', (e) => {
            if (!window.game || window.game.state !== 'GAME_OVER') return;
            e.preventDefault();
            this._goScrollY += e.deltaY * 0.8;
            this._goScrollVel = 0; // kill momentum on direct wheel
            this._clampGameOverScroll();
        }, { passive: false });

        // Touch drag
        canvas.addEventListener('touchstart', (e) => {
            if (!window.game || window.game.state !== 'GAME_OVER') return;
            if (e.touches.length !== 1) return;
            this._goTouchStartY = e.touches[0].clientY;
            this._goTouchLastY = e.touches[0].clientY;
            this._goScrollVel = 0;
        }, { passive: true });

        canvas.addEventListener('touchmove', (e) => {
            if (!window.game || window.game.state !== 'GAME_OVER') return;
            if (this._goTouchLastY === null) return;
            const touch = e.touches[0];
            // Convert screen delta to canvas-logical delta (account for CSS scaling)
            const rect = canvas.getBoundingClientRect();
            const scale = canvas.height / rect.height;
            const dy = (this._goTouchLastY - touch.clientY) * scale;
            this._goScrollY += dy;
            this._goScrollVel = dy * 12; // rough velocity for momentum
            this._goTouchLastY = touch.clientY;
            this._clampGameOverScroll();
            // Prevent page scroll when we're scrolling game-over content
            if (Math.abs(this._goScrollY) > 2) {
                e.preventDefault();
            }
        }, { passive: false });

        canvas.addEventListener('touchend', () => {
            this._goTouchStartY = null;
            this._goTouchLastY = null;
        }, { passive: true });
    }

    /** Clamp scroll offset to valid range. */
    _clampGameOverScroll() {
        // Reserve bottom strip for the pinned restart prompt (must match
        // pinnedPromptH used in drawGameOver).
        const pinnedPromptH = 92;
        const usableH = Math.max(120, this.height - pinnedPromptH);
        const maxScroll = Math.max(0, this._goContentH - usableH + 30);
        this._goScrollY = Math.max(0, Math.min(maxScroll, this._goScrollY));
    }

    /** Update momentum scrolling (call each frame while in GAME_OVER). */
    _updateGameOverScroll(dt) {
        if (this._goTouchLastY !== null) return; // dragging — skip momentum
        if (Math.abs(this._goScrollVel) > 0.5) {
            this._goScrollY += this._goScrollVel * dt;
            this._goScrollVel *= 0.92; // friction
            this._clampGameOverScroll();
        } else {
            this._goScrollVel = 0;
        }
    }

    /**
     * Read CSS safe-area-inset env() values exposed as custom properties on :root.
     * Call once on construction and again if the viewport changes (orientation, resize).
     */
    _refreshSafeAreaInsets() {
        try {
            const style = getComputedStyle(document.documentElement);
            const parse = (prop) => parseInt(style.getPropertyValue(prop), 10) || 0;
            this.safeTop = parse('--safe-top');
            this.safeBottom = parse('--safe-bottom');
            this.safeLeft = parse('--safe-left');
            this.safeRight = parse('--safe-right');
        } catch (e) {
            // Fallback: no insets (desktop / older WebView)
        }
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
        const cx = this.width / 2;
        const cy = this.height / 2;
        const now = Date.now();

        // Deep dark gradient background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
        bgGrad.addColorStop(0,   'rgba(0, 0, 22, 0.94)');
        bgGrad.addColorStop(0.5, 'rgba(8, 0, 28, 0.90)');
        bgGrad.addColorStop(1,   'rgba(0, 12, 4, 0.94)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // ── Animated particle field ─────────────────────────────────
        const PARTICLE_COUNT = 60;
        const PALETTE = ['#00FF77', '#FFFFFF', '#FFD700', '#FF8844', '#AAFFCC', '#88CCFF'];
        if (!this._menuParticles) {
            this._menuParticles = Array.from({ length: PARTICLE_COUNT }, () => ({
                x:     Math.random() * this.width,
                y:     Math.random() * this.height,
                r:     0.6 + Math.random() * 2.2,
                vy:    0.18 + Math.random() * 0.55,
                vx:    (Math.random() - 0.5) * 0.18,
                color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
                phase: Math.random() * Math.PI * 2,   // twinkle phase offset
                speed: 280 + Math.random() * 320,     // twinkle speed (ms per cycle)
            }));
        }
        ctx.save();
        for (const p of this._menuParticles) {
            // Drift
            p.x += p.vx;
            p.y += p.vy;
            if (p.y > this.height + 4) { p.y = -4; p.x = Math.random() * this.width; }
            if (p.x < -4)  p.x = this.width + 4;
            if (p.x > this.width + 4) p.x = -4;
            // Twinkle
            const alpha = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(now / p.speed + p.phase));
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            // Add a soft cross-hair sparkle on larger particles
            if (p.r > 1.8) {
                ctx.globalAlpha = alpha * 0.35;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 0.6;
                const arm = p.r * 2.2;
                ctx.beginPath();
                ctx.moveTo(p.x - arm, p.y); ctx.lineTo(p.x + arm, p.y);
                ctx.moveTo(p.x, p.y - arm); ctx.lineTo(p.x, p.y + arm);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        // Title text and controls are rendered by the HTML #start-menu-overlay.
        // Only draw them on the canvas if the HTML overlay has been dismissed
        // (e.g. on GAME_OVER→MENU transition where overlay may re-appear, the
        // canvas background still looks nice).
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

    drawGameOver(ctx, score, gameStats = {}, lockoutRemaining = 0, extra = {}) {
        const now = Date.now();
        const cx = this.width / 2;
        const elapsed = extra.elapsed || 0; // seconds since game over started

        // ── Scroll setup ──
        this._bindGameOverScroll();
        // Reset scroll at the start of a new game over
        if (elapsed < 0.05) {
            this._goScrollY = 0;
            this._goScrollVel = 0;
        }
        this._updateGameOverScroll(1 / 60); // approximate dt

        // ── Animated vignette background — fades in over the first ~0.7s
        // so the GameOverAnimation particle burst can pop visibly first. ──
        const vignetteFade = Math.min(1, Math.max(0, (elapsed - 0.05) / 0.7));
        const gradient = ctx.createRadialGradient(cx, this.height * 0.3, 0, cx, this.height * 0.5, this.height);
        gradient.addColorStop(0, `rgba(60, 0, 0, ${0.75 * vignetteFade})`);
        gradient.addColorStop(0.5, `rgba(15, 0, 0, ${0.92 * vignetteFade})`);
        gradient.addColorStop(1, `rgba(0, 0, 0, ${0.97 * vignetteFade})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Faint horizontal scan-lines for grit (also fade in)
        if (vignetteFade > 0.4) {
            ctx.save();
            ctx.globalAlpha = 0.04 * vignetteFade;
            for (let y = 0; y < this.height; y += 4) {
                ctx.fillStyle = '#000';
                ctx.fillRect(0, y, this.width, 2);
            }
            ctx.restore();
        }

        // ── Apply scroll offset for all content below ──
        // The bottom strip is reserved for the always-visible restart prompt
        // so the player never has to scroll to find how to continue.
        const pinnedPromptH = 92;
        const scrollViewH = Math.max(120, this.height - pinnedPromptH);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, this.width, scrollViewH);
        ctx.clip();
        ctx.translate(0, -this._goScrollY);

        // ── Title with pulsing glow (slides down from top) ──
        const titleTargetY = this.height * 0.13;
        const titleSlide = Math.min(1, elapsed / 0.6);
        const titleEased = 1 - Math.pow(1 - titleSlide, 3); // ease-out cubic
        const titleY = -40 + (titleTargetY + 40) * titleEased;
        const titlePulse = 12 + Math.sin(now / 300) * 10;
        ctx.save();
        ctx.font = "bold 68px 'Bangers', 'Arial Black', Impact, sans-serif";
        ctx.fillStyle = '#FF2222';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#FF0000';
        ctx.shadowBlur = titlePulse;
        ctx.letterSpacing = '0.06em';
        ctx.fillText('GAME OVER', cx, titleY);
        // Double-draw for extra intensity
        ctx.shadowBlur = titlePulse * 2.5;
        ctx.globalAlpha = 0.35;
        ctx.fillText('GAME OVER', cx, titleY);
        ctx.restore();

        // ── Level reached subtitle (fades in after title) ──
        const levelReached = extra.levelReached || 0;
        const levelName = extra.levelName || '';
        if (levelReached > 0) {
            const levelFade = Math.max(0, Math.min(1, (elapsed - 0.4) / 0.5));
            if (levelFade > 0) {
                ctx.save();
                ctx.globalAlpha = levelFade * 0.8;
                ctx.font = "bold 16px 'Press Start 2P', monospace";
                ctx.fillStyle = '#AAAACC';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const levelText = levelName ? `STAGE ${levelReached} \u2022 ${levelName.toUpperCase()}` : `STAGE ${levelReached}`;
                ctx.fillText(levelText, cx, titleY + 40);
                ctx.restore();
            }
        }

        // ── Decorative divider ──
        const divY = titleY + 58;
        const divGrad = ctx.createLinearGradient(cx - 200, 0, cx + 200, 0);
        divGrad.addColorStop(0, 'transparent');
        divGrad.addColorStop(0.3, 'rgba(255,80,80,0.6)');
        divGrad.addColorStop(0.7, 'rgba(255,80,80,0.6)');
        divGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = divGrad;
        ctx.fillRect(cx - 200, divY, 400, 2);

        // ── Score with count-up animation ──
        const scoreY = divY + 36;
        const scoreCountDuration = 1.8; // seconds for the count-up
        const scoreStart = 0.5; // delay before count starts
        const scoreProgress = Math.max(0, Math.min(1, (elapsed - scoreStart) / scoreCountDuration));
        // Ease-out for satisfying deceleration
        const scoreEased = 1 - Math.pow(1 - scoreProgress, 3);
        const displayScore = Math.floor(score * scoreEased);

        // Play a satisfying ding when score count-up finishes
        if (scoreProgress >= 1 && !this._scoreCountDingPlayed && score > 0) {
            this._scoreCountDingPlayed = true;
            try {
                if (window.game && window.game.audioManager && window.game.audioManager.playSound) {
                    window.game.audioManager.playSound('ui_confirm', 0.4);
                }
            } catch (e) { /* audio unavailable */ }
        }
        // Reset ding flag when a new game over starts
        if (elapsed < 0.1) this._scoreCountDingPlayed = false;

        // Score text with satisfying scale pop when count finishes
        const scorePop = scoreProgress >= 1 ? 1 + Math.max(0, 0.08 * Math.sin((elapsed - scoreStart - scoreCountDuration) * 8) * Math.exp(-(elapsed - scoreStart - scoreCountDuration) * 4)) : 1;
        ctx.save();
        ctx.translate(cx, scoreY);
        ctx.scale(scorePop, scorePop);
        ctx.font = "bold 44px 'Bangers', 'Arial Black', sans-serif";
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 14;
        ctx.letterSpacing = '0.03em';
        ctx.fillText(`SCORE: ${displayScore.toLocaleString()}`, 0, 0);
        ctx.restore();

        // ── NEW HIGH SCORE flash ──
        if (extra.isHighScore && elapsed > scoreStart + scoreCountDuration * 0.7) {
            const hsFade = Math.min(1, (elapsed - (scoreStart + scoreCountDuration * 0.7)) / 0.4);
            const hsPulse = 0.7 + Math.sin(now / 200) * 0.3;
            ctx.save();
            ctx.globalAlpha = hsFade * hsPulse;
            ctx.font = "bold 18px 'Press Start 2P', monospace";
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#FFAA00';
            ctx.shadowBlur = 16;
            ctx.fillText('\u2B50 NEW HIGH SCORE! \u2B50', cx, scoreY + 32);
            ctx.restore();
        }

        // ── Stats panel with staggered reveal ──
        // Stats list is defined before the panel so we can size the panel to fit.
        const stats = [
            { label: '\u2694\uFE0F  Enemies Defeated', value: gameStats.enemiesDefeated || 0, color: '#FF6B6B' },
            { label: '\u23F1\uFE0F  Time Survived', value: this.formatTime(gameStats.timeSurvived || 0), color: '#4ECDC4' },
            { label: '\uD83D\uDD25 Max Combo', value: `x${gameStats.maxCombo || 0}`, color: '#FFD93D' },
            { label: '\uD83D\uDCA5 Best Multiplier', value: `${(gameStats.bestMultiplier || 1.0).toFixed(1)}x`, color: '#FF9500' },
            { label: '\uD83C\uDFAF Accuracy', value: `${Math.floor((gameStats.accuracy || 0) * 100)}%`, color: '#95E1D3' },
            { label: '\uD83C\uDFFA Idols Collected', value: gameStats.idolsCollected || 0, color: '#F38181' }
        ];

        const lineHeight = 30;
        const boxW = Math.min(520, this.width - 60);
        // Dynamic height: header(34) + separator + stats + bottom padding
        const boxH = 55 + stats.length * lineHeight + 14;
        const boxX = cx - boxW / 2;
        const boxY = scoreY + (extra.isHighScore ? 52 : 28);

        // Panel background with improved contrast
        const panelFade = Math.max(0, Math.min(1, (elapsed - 0.8) / 0.4));
        ctx.save();
        ctx.globalAlpha = panelFade;
        const panelGrad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
        panelGrad.addColorStop(0, 'rgba(15, 5, 20, 0.82)');
        panelGrad.addColorStop(0.5, 'rgba(8, 2, 12, 0.88)');
        panelGrad.addColorStop(1, 'rgba(15, 5, 20, 0.82)');
        ctx.fillStyle = panelGrad;
        ctx.strokeStyle = 'rgba(255, 80, 80, 0.30)';
        ctx.lineWidth = 1.5;
        const r = 10;
        // Rounded rect
        ctx.beginPath();
        ctx.moveTo(boxX + r, boxY);
        ctx.lineTo(boxX + boxW - r, boxY); ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + r, r);
        ctx.lineTo(boxX + boxW, boxY + boxH - r); ctx.arcTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH, r);
        ctx.lineTo(boxX + r, boxY + boxH); ctx.arcTo(boxX, boxY + boxH, boxX, boxY + boxH - r, r);
        ctx.lineTo(boxX, boxY + r); ctx.arcTo(boxX, boxY, boxX + r, boxY, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Panel header
        ctx.save();
        ctx.globalAlpha = panelFade;
        ctx.font = "bold 20px 'Bangers', 'Arial Black', sans-serif";
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.textAlign = 'center';
        ctx.letterSpacing = '0.08em';
        ctx.fillText('PERFORMANCE', cx, boxY + 24);
        ctx.restore();

        // Thin separator under header
        ctx.save();
        ctx.globalAlpha = panelFade;
        const sepGrad = ctx.createLinearGradient(boxX + 20, 0, boxX + boxW - 20, 0);
        sepGrad.addColorStop(0, 'transparent');
        sepGrad.addColorStop(0.3, 'rgba(255,255,255,0.12)');
        sepGrad.addColorStop(0.7, 'rgba(255,255,255,0.12)');
        sepGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = sepGrad;
        ctx.fillRect(boxX + 20, boxY + 34, boxW - 40, 1);
        ctx.restore();

        // Stats — each row slides in and fades with a stagger
        const statsStartY = boxY + 55;
        const staggerDelay = 0.15; // seconds between each stat appearing
        const statsBaseDelay = 1.6; // seconds after game over before first stat (lets death anim breathe)
        const statAnimDuration = 0.35; // each stat's entrance duration

        stats.forEach((stat, index) => {
            const statDelay = statsBaseDelay + index * staggerDelay;
            const statProgress = Math.max(0, Math.min(1, (elapsed - statDelay) / statAnimDuration));
            if (statProgress <= 0) return; // not visible yet

            const statEased = 1 - Math.pow(1 - statProgress, 2); // ease-out quad
            const slideOffset = (1 - statEased) * 30; // slide in from right
            const y = statsStartY + (index * lineHeight);

            ctx.save();
            ctx.globalAlpha = statEased;
            ctx.font = "15px 'Press Start 2P', monospace";
            ctx.textBaseline = 'middle';

            // Label
            ctx.textAlign = 'left';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(stat.label, boxX + 24 - slideOffset, y);

            // Value
            ctx.textAlign = 'right';
            ctx.fillStyle = stat.color;
            ctx.shadowColor = stat.color;
            ctx.shadowBlur = 4;
            ctx.fillText(String(stat.value), boxX + boxW - 24 + slideOffset, y);
            ctx.restore();
        });

        // ── Achievement badges (shown below stats if any were unlocked) ──
        const newAchievements = extra.newAchievements || [];
        let achieveEndY = boxY + boxH;
        if (newAchievements.length > 0) {
            const achDelay = statsBaseDelay + stats.length * staggerDelay + 0.3;
            const achHeaderProgress = Math.max(0, Math.min(1, (elapsed - achDelay) / 0.45));
            if (achHeaderProgress > 0) {
                const achHeaderEased = 1 - Math.pow(1 - achHeaderProgress, 3);
                const achHeaderY = boxY + boxH + 18;

                // ── "ACHIEVEMENTS UNLOCKED" header with shimmer ──
                ctx.save();
                ctx.globalAlpha = achHeaderEased;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Shimmer highlight sweeps across the text
                const shimmerCycle = ((now % 3000) / 3000); // 0→1 over 3s
                const shimmerX = cx - 140 + shimmerCycle * 280;
                const headerGrad = ctx.createLinearGradient(shimmerX - 40, 0, shimmerX + 40, 0);
                headerGrad.addColorStop(0, '#FFD700');
                headerGrad.addColorStop(0.5, '#FFFFFF');
                headerGrad.addColorStop(1, '#FFD700');

                ctx.font = "bold 12px 'Press Start 2P', monospace";
                ctx.fillStyle = headerGrad;
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 10;
                ctx.fillText('ACHIEVEMENTS UNLOCKED', cx, achHeaderY);
                ctx.shadowBlur = 0;
                ctx.restore();

                // ── Decorative separator under header ──
                const achSepY = achHeaderY + 12;
                const achSepGrad = ctx.createLinearGradient(cx - 100, 0, cx + 100, 0);
                achSepGrad.addColorStop(0, 'transparent');
                achSepGrad.addColorStop(0.3, 'rgba(255,215,0,0.35)');
                achSepGrad.addColorStop(0.7, 'rgba(255,215,0,0.35)');
                achSepGrad.addColorStop(1, 'transparent');
                ctx.save();
                ctx.globalAlpha = achHeaderEased;
                ctx.fillStyle = achSepGrad;
                ctx.fillRect(cx - 100, achSepY, 200, 1);
                ctx.restore();

                // ── Badge cards ──
                const badgeCardW = 110;
                const badgeCardH = 72;
                const badgeGap = 12;
                const maxPerRow = Math.max(1, Math.floor((boxW - 20) / (badgeCardW + badgeGap)));
                const badgeStagger = 0.18; // seconds between each badge pop-in
                const badgeAnimDuration = 0.4;
                const badgeBaseDelay = achDelay + 0.35;

                // Layout: center badges, wrap to multiple rows if needed
                const rows = [];
                for (let ri = 0; ri < newAchievements.length; ri += maxPerRow) {
                    rows.push(newAchievements.slice(ri, ri + maxPerRow));
                }

                let currentRowY = achSepY + 14;
                let badgeIndex = 0;

                for (const row of rows) {
                    const rowWidth = row.length * badgeCardW + (row.length - 1) * badgeGap;
                    const rowStartX = cx - rowWidth / 2;

                    for (let i = 0; i < row.length; i++) {
                        const ach = row[i];
                        const thisBadgeDelay = badgeBaseDelay + badgeIndex * badgeStagger;
                        const badgeProgress = Math.max(0, Math.min(1, (elapsed - thisBadgeDelay) / badgeAnimDuration));
                        badgeIndex++;

                        if (badgeProgress <= 0) continue;

                        // Pop-in: scale from 0.3→1 + fade
                        const popEased = 1 - Math.pow(1 - badgeProgress, 3); // ease-out cubic
                        const badgeScale = 0.3 + 0.7 * popEased;
                        const badgeAlpha = popEased;

                        // Subtle float after fully popped in
                        const floatOffset = badgeProgress >= 1 ? Math.sin(now / 800 + badgeIndex * 1.2) * 2 : 0;

                        const cardX = rowStartX + i * (badgeCardW + badgeGap);
                        const cardCX = cardX + badgeCardW / 2;
                        const cardCY = currentRowY + badgeCardH / 2 + floatOffset;

                        ctx.save();
                        ctx.globalAlpha = badgeAlpha;
                        ctx.translate(cardCX, cardCY);
                        ctx.scale(badgeScale, badgeScale);

                        // Card background — dark with golden glow border
                        const cardLeft = -badgeCardW / 2;
                        const cardTop = -badgeCardH / 2;
                        const cr = 8;

                        // Outer glow
                        ctx.shadowColor = '#FFD700';
                        ctx.shadowBlur = 12 * badgeAlpha;

                        // Gradient card fill
                        const cardGrad = ctx.createLinearGradient(cardLeft, cardTop, cardLeft, cardTop + badgeCardH);
                        cardGrad.addColorStop(0, 'rgba(50, 40, 10, 0.85)');
                        cardGrad.addColorStop(0.5, 'rgba(30, 25, 5, 0.90)');
                        cardGrad.addColorStop(1, 'rgba(20, 15, 0, 0.85)');
                        ctx.fillStyle = cardGrad;

                        // Card border
                        ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
                        ctx.lineWidth = 1.5;

                        // Draw rounded rect
                        ctx.beginPath();
                        ctx.moveTo(cardLeft + cr, cardTop);
                        ctx.lineTo(cardLeft + badgeCardW - cr, cardTop);
                        ctx.arcTo(cardLeft + badgeCardW, cardTop, cardLeft + badgeCardW, cardTop + cr, cr);
                        ctx.lineTo(cardLeft + badgeCardW, cardTop + badgeCardH - cr);
                        ctx.arcTo(cardLeft + badgeCardW, cardTop + badgeCardH, cardLeft + badgeCardW - cr, cardTop + badgeCardH, cr);
                        ctx.lineTo(cardLeft + cr, cardTop + badgeCardH);
                        ctx.arcTo(cardLeft, cardTop + badgeCardH, cardLeft, cardTop + badgeCardH - cr, cr);
                        ctx.lineTo(cardLeft, cardTop + cr);
                        ctx.arcTo(cardLeft, cardTop, cardLeft + cr, cardTop, cr);
                        ctx.closePath();
                        ctx.fill();
                        ctx.shadowBlur = 0;
                        ctx.stroke();

                        // Icon — centered, large
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.font = '26px sans-serif';
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillText(ach.icon || '\uD83C\uDFC6', 0, -12);

                        // Achievement name
                        ctx.font = "bold 8px 'Press Start 2P', monospace";
                        ctx.fillStyle = '#FFD700';
                        ctx.fillText(ach.name || '', 0, 12);

                        // Description — dimmer, smaller
                        if (ach.desc) {
                            ctx.font = "7px 'Press Start 2P', monospace";
                            ctx.fillStyle = 'rgba(255, 220, 150, 0.6)';
                            // Truncate long descriptions to fit card width
                            let descText = ach.desc;
                            if (ctx.measureText(descText).width > badgeCardW - 12) {
                                while (descText.length > 3 && ctx.measureText(descText + '...').width > badgeCardW - 12) {
                                    descText = descText.slice(0, -1);
                                }
                                descText += '...';
                            }
                            ctx.fillText(descText, 0, 26);
                        }

                        ctx.restore();
                    }

                    currentRowY += badgeCardH + badgeGap;
                }

                achieveEndY = currentRowY;
            }
        }

        // ── Continue prompt is rendered OUTSIDE the scroll transform so the
        // player always sees the restart instructions and lockout countdown
        // even if the stats panel is scrolled. (Drawn after ctx.restore below.)
        const instructY = achieveEndY + 28;

        // ── Track total content height for scroll clamping ──
        // Only stats/achievements live in the scroll region now; prompt is pinned.
        const contentBottomY = achieveEndY + 12;
        this._goContentH = contentBottomY;
        this._clampGameOverScroll();

        ctx.restore(); // end of scroll translate + clip

        // ── Pinned restart prompt strip (always visible at bottom) ──
        const pinnedCenterY = this.height - pinnedPromptH / 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Subtle gradient backdrop so the pinned strip reads on busy art
        const stripGrad = ctx.createLinearGradient(0, this.height - pinnedPromptH, 0, this.height);
        stripGrad.addColorStop(0, 'rgba(0,0,0,0)');
        stripGrad.addColorStop(0.4, 'rgba(0,0,0,0.55)');
        stripGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = stripGrad;
        ctx.fillRect(0, this.height - pinnedPromptH, this.width, pinnedPromptH);

        if (lockoutRemaining > 0) {
            // Animated circular countdown
            const lockoutTotal = (typeof window !== 'undefined' && window.game && typeof window.game._gameOverLockoutMs === 'number')
                ? (window.game._gameOverLockoutMs / 1000)
                : ((typeof Config !== 'undefined' && typeof Config.GAME_OVER_LOCKOUT === 'number')
                    ? Config.GAME_OVER_LOCKOUT : 3.0);
            const progress = 1 - (lockoutRemaining / lockoutTotal);
            const ringRadius = 22;
            const ringX = cx;
            const ringY = pinnedCenterY;

            // Background ring
            ctx.beginPath();
            ctx.arc(ringX, ringY, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.18)';
            ctx.lineWidth = 4;
            ctx.stroke();

            // Progress arc
            ctx.beginPath();
            ctx.arc(ringX, ringY, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
            ctx.strokeStyle = 'rgba(255,255,255,0.75)';
            ctx.lineWidth = 4;
            ctx.stroke();

            // Countdown number inside ring
            const secs = Math.ceil(lockoutRemaining);
            ctx.font = "bold 18px 'Press Start 2P', monospace";
            ctx.fillStyle = 'rgba(255,255,255,0.65)';
            ctx.fillText(String(secs), ringX, ringY + 1);

            // Tip text below ring
            const tips = this._getGameOverTip(extra.levelReached || 0, gameStats);
            if (tips) {
                ctx.globalAlpha = 0.55;
                ctx.font = "10px 'Press Start 2P', monospace";
                ctx.fillStyle = '#AABBCC';
                ctx.fillText(tips, cx, ringY + ringRadius + 16);
                ctx.globalAlpha = 1;
            }
        } else {
            // ── Encouraging tip ──
            const tips = this._getGameOverTip(extra.levelReached || 0, gameStats);
            if (tips) {
                ctx.save();
                ctx.globalAlpha = 0.6;
                ctx.font = "10px 'Press Start 2P', monospace";
                ctx.fillStyle = '#AABBCC';
                ctx.fillText(tips, cx, pinnedCenterY - 22);
                ctx.restore();
            }

            // "Watch Ad to Revive" option (only on native Android with ads available)
            const adAvailable = window.AdManager && AdManager.canShowRewarded && AdManager.canShowRewarded();
            if (adAvailable) {
                // Revive button — pulsing green
                const revivePulse = Math.sin(now / 350) * 0.3 + 0.7;
                ctx.globalAlpha = revivePulse;
                ctx.font = "bold 16px 'Press Start 2P', monospace";
                ctx.fillStyle = '#44FF44';
                ctx.shadowColor = '#44FF44';
                ctx.shadowBlur = 10;
                ctx.fillText('\u25B6 WATCH AD TO REVIVE', cx, pinnedCenterY);
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;

                // Restart + ESC option compact
                const blink = Math.sin(now / 400) * 0.3 + 0.5;
                ctx.globalAlpha = blink;
                ctx.font = "10px 'Press Start 2P', monospace";
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.fillText('ENTER / TAP \u2192 RESTART     \u2022     ESC \u2192 MENU', cx, pinnedCenterY + 22);
            } else {
                // Standard restart prompt — pulsing
                const blink = Math.sin(now / 400) * 0.4 + 0.6;
                ctx.globalAlpha = blink;
                ctx.font = "16px 'Press Start 2P', monospace";
                ctx.fillStyle = '#FFFFFF';
                ctx.shadowColor = '#FFFFFF';
                ctx.shadowBlur = 6;
                ctx.fillText('ENTER / TAP \u2192 RESTART', cx, pinnedCenterY - 4);
                ctx.shadowBlur = 0;

                // Return to menu hint
                ctx.globalAlpha = 0.45;
                ctx.font = "9px 'Press Start 2P', monospace";
                ctx.fillStyle = 'rgba(200,200,220,0.7)';
                ctx.fillText('ESC \u2192 MENU', cx, pinnedCenterY + 22);
            }
        }
        ctx.restore(); // end of pinned prompt strip

        // ── Scroll indicators (drawn outside scroll transform) ──
        const usableH = Math.max(120, this.height - pinnedPromptH);
        const maxScroll = Math.max(0, this._goContentH - usableH + 30);
        if (maxScroll > 5) {
            // Bottom fade + arrow when content is below — sits ABOVE pinned strip
            if (this._goScrollY < maxScroll - 2) {
                const fadePulse = 0.4 + Math.sin(now / 600) * 0.2;
                const fadeBottom = this.height - pinnedPromptH;
                const botGrad = ctx.createLinearGradient(0, fadeBottom - 36, 0, fadeBottom);
                botGrad.addColorStop(0, 'rgba(0,0,0,0)');
                botGrad.addColorStop(1, 'rgba(0,0,0,0.7)');
                ctx.fillStyle = botGrad;
                ctx.fillRect(0, fadeBottom - 36, this.width, 36);
                ctx.save();
                ctx.globalAlpha = fadePulse;
                ctx.font = "bold 16px 'Press Start 2P', monospace";
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('\u25BC', cx, fadeBottom - 10);
                ctx.restore();
            }
            // Top fade + arrow when scrolled down
            if (this._goScrollY > 2) {
                const fadePulse = 0.4 + Math.sin(now / 600) * 0.2;
                const topGrad = ctx.createLinearGradient(0, 0, 0, 40);
                topGrad.addColorStop(0, 'rgba(0,0,0,0.7)');
                topGrad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = topGrad;
                ctx.fillRect(0, 0, this.width, 40);
                ctx.save();
                ctx.globalAlpha = fadePulse;
                ctx.font = "bold 18px 'Press Start 2P', monospace";
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('\u25B2', cx, 16);
                ctx.restore();
            }
            // Thin scroll track on the right edge (within scrollable region only)
            const trackTop = 10;
            const trackH = usableH - 20;
            const thumbH = Math.max(30, trackH * (usableH / this._goContentH));
            const thumbY = trackTop + (trackH - thumbH) * (this._goScrollY / maxScroll);
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(this.width - 6, thumbY, 3, thumbH);
            ctx.restore();
        }
    }

    /**
     * Returns a contextual encouragement tip based on player performance.
     */
    _getGameOverTip(levelReached, stats) {
        if (!stats) return null;
        const combo = stats.maxCombo || 0;
        const accuracy = stats.accuracy || 0;
        const enemies = stats.enemiesDefeated || 0;
        const time = stats.timeSurvived || 0;

        // Select a tip based on what could improve
        if (levelReached <= 1 && enemies < 5) return '\uD83D\uDCA1 TIP: Time your attacks to build combos!';
        if (combo < 3 && enemies > 0) return '\uD83D\uDD25 Chain attacks on enemies for big combo bonuses!';
        if (accuracy < 0.3 && enemies > 3) return '\uD83C\uDFAF Land more hits to boost your accuracy score!';
        if (time < 30) return '\u26A1 Stay mobile! Jump and dodge to survive longer.';
        if (levelReached >= 3) return '\uD83C\uDFC6 Great run! You made it to Stage ' + levelReached + '!';
        if (combo >= 5) return '\uD83D\uDD25 Nice combos! Keep that momentum going!';
        return '\uD83D\uDCAA Keep going \u2014 every run makes you stronger!';
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    drawLevelComplete(ctx, levelNum) {
        const cx = this.width / 2;
        const cy = this.height / 2;
        const now = Date.now();

        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
        ctx.fillRect(0, 0, this.width, this.height);

        // Title with green neon glow
        const glow = 14 + Math.sin(now / 250) * 8;
        ctx.save();
        ctx.font = "bold 62px 'Bangers', 'Arial Black', Impact, sans-serif";
        ctx.fillStyle = '#00FF77';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#00FF77';
        ctx.shadowBlur = glow;
        ctx.letterSpacing = '0.04em';
        ctx.fillText('STAGE CLEAR!', cx, cy - 32);
        ctx.restore();

        // Decorative divider
        const divGrad = ctx.createLinearGradient(cx - 160, 0, cx + 160, 0);
        divGrad.addColorStop(0, 'transparent');
        divGrad.addColorStop(0.3, 'rgba(0,255,120,0.5)');
        divGrad.addColorStop(0.7, 'rgba(0,255,120,0.5)');
        divGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = divGrad;
        ctx.fillRect(cx - 160, cy + 6, 320, 2);

        // Subtitle
        ctx.save();
        ctx.font = "28px 'Bangers', 'Arial Black', sans-serif";
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = '0.03em';
        ctx.fillText(`Proceeding to Stage ${levelNum + 1}...`, cx, cy + 40);
        ctx.restore();
    }

    drawVictory(ctx, score, gameStats = {}) {
        const now = Date.now();
        const cx = this.width / 2;

        // ── Golden radial background ──
        const gradient = ctx.createRadialGradient(cx, this.height * 0.25, 0, cx, this.height * 0.5, this.height);
        gradient.addColorStop(0, 'rgba(60, 45, 0, 0.8)');
        gradient.addColorStop(0.5, 'rgba(10, 8, 0, 0.93)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.97)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // ── Golden particle field ──
        ctx.save();
        const time = now / 1000;
        for (let i = 0; i < 50; i++) {
            const x = (Math.sin(time * 0.5 + i * 0.3) * 0.4 + 0.5) * this.width;
            const y = ((time * 30 + i * 50) % this.height);
            const size = Math.sin(time * 2 + i) * 2.5 + 3.5;
            const alpha = 0.15 + Math.sin(time * 2 + i) * 0.25;
            ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // ── Achievement calculations (same logic) ──
        const completionTime = gameStats.completionTime || 0;
        const damageTaken = gameStats.damageTaken || 0;
        const perfectLevels = gameStats.perfectLevels || 0;
        const achievements = [];
        if (damageTaken === 0) achievements.push({ text: '\uD83E\uDD77 FLAWLESS VICTORY', color: '#00FFFF' });
        if (completionTime > 0 && completionTime <= 600) achievements.push({ text: '\u26A1 SPEEDRUN MASTER', color: '#FFD700' });
        else if (completionTime > 0 && completionTime <= 900) achievements.push({ text: '\uD83D\uDCA8 SPEED DEMON', color: '#FF9500' });
        if ((gameStats.idolSetsCompleted || 0) >= 10) achievements.push({ text: '\uD83D\uDC51 MASTER COLLECTOR', color: '#FFD700' });
        if (perfectLevels >= 5) achievements.push({ text: '\uD83D\uDEE1\uFE0F UNTOUCHABLE', color: '#00FF00' });

        // ── Title with pulsing golden glow ──
        const titleY = 80;
        const titlePulse = 18 + Math.sin(now / 200) * 12;
        ctx.save();
        ctx.font = "bold 72px 'Bangers', 'Arial Black', Impact, sans-serif";
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = titlePulse;
        ctx.letterSpacing = '0.04em';
        ctx.fillText('MISSION ACCOMPLISHED!', cx, titleY);
        ctx.shadowBlur = titlePulse * 2;
        ctx.globalAlpha = 0.25;
        ctx.fillText('MISSION ACCOMPLISHED!', cx, titleY);
        ctx.restore();

        // ── Achievement banners ──
        let nextY = titleY + 50;
        if (achievements.length > 0) {
            ctx.save();
            achievements.forEach((ach, idx) => {
                const y = nextY + idx * 32;
                ctx.font = "bold 20px 'Press Start 2P', monospace";
                ctx.fillStyle = ach.color;
                ctx.textAlign = 'center';
                ctx.shadowColor = ach.color;
                ctx.shadowBlur = 12;
                ctx.fillText(ach.text, cx, y);
            });
            ctx.restore();
            nextY += achievements.length * 32 + 10;
        }

        // ── Divider ──
        const divGrad = ctx.createLinearGradient(cx - 250, 0, cx + 250, 0);
        divGrad.addColorStop(0, 'transparent');
        divGrad.addColorStop(0.25, 'rgba(255,215,0,0.5)');
        divGrad.addColorStop(0.75, 'rgba(255,215,0,0.5)');
        divGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = divGrad;
        ctx.fillRect(cx - 250, nextY, 500, 2);
        nextY += 12;

        // ── Final Score ──
        ctx.save();
        ctx.font = "bold 50px 'Bangers', 'Arial Black', sans-serif";
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 16;
        ctx.letterSpacing = '0.03em';
        ctx.fillText(`FINAL SCORE: ${score.toLocaleString()}`, cx, nextY + 14);
        ctx.restore();
        nextY += 36;

        // ── Completion time + rank ──
        if (completionTime > 0) {
            nextY += 10;
            const minutes = Math.floor(completionTime / 60);
            const seconds = Math.floor(completionTime % 60);
            const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            let rank = 'D', rankColor = '#808080';
            if (completionTime <= 600) { rank = 'S'; rankColor = '#FFD700'; }
            else if (completionTime <= 900) { rank = 'A'; rankColor = '#00FFFF'; }
            else if (completionTime <= 1200) { rank = 'B'; rankColor = '#00FF00'; }
            else if (completionTime <= 1800) { rank = 'C'; rankColor = '#FFFF00'; }

            ctx.save();
            ctx.font = "bold 26px 'Bangers', 'Arial Black', sans-serif";
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.fillText(`Completion Time: ${timeText}`, cx - 50, nextY);
            // Rank badge
            ctx.font = "bold 42px 'Bangers', 'Arial Black', sans-serif";
            ctx.fillStyle = rankColor;
            ctx.shadowColor = rankColor;
            ctx.shadowBlur = 16;
            ctx.fillText(rank, cx + 110, nextY);
            ctx.restore();
            nextY += 14;

            // NEW RECORD
            try {
                const prevBest = parseFloat(localStorage.getItem('fastestCompletion')) || Infinity;
                if (completionTime < prevBest || (prevBest === Infinity && completionTime > 0)) {
                    const pulse = Math.sin(now / 150) * 0.18 + 1;
                    ctx.save();
                    ctx.translate(cx, nextY + 18);
                    ctx.scale(pulse, pulse);
                    ctx.font = "bold 18px 'Press Start 2P', monospace";
                    ctx.fillStyle = '#FFD700';
                    ctx.textAlign = 'center';
                    ctx.shadowColor = '#FFD700';
                    ctx.shadowBlur = 12;
                    ctx.fillText('\u2B50 NEW BEST TIME! \u2B50', 0, 0);
                    ctx.restore();
                    nextY += 26;
                }
            } catch (e) { __err('ui', e); }
        }

        // ── Stats panel ──
        nextY += 16;
        const boxW = Math.min(700, this.width - 40);
        const boxH = 230;
        const boxX = cx - boxW / 2;
        const boxY = nextY;
        const r = 12;

        // Rounded rect background
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(boxX + r, boxY);
        ctx.lineTo(boxX + boxW - r, boxY); ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + r, r);
        ctx.lineTo(boxX + boxW, boxY + boxH - r); ctx.arcTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH, r);
        ctx.lineTo(boxX + r, boxY + boxH); ctx.arcTo(boxX, boxY + boxH, boxX, boxY + boxH - r, r);
        ctx.lineTo(boxX, boxY + r); ctx.arcTo(boxX, boxY, boxX + r, boxY, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Panel header
        ctx.save();
        ctx.font = "bold 22px 'Bangers', 'Arial Black', sans-serif";
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.letterSpacing = '0.06em';
        ctx.fillText('FINAL STATISTICS', cx, boxY + 26);
        ctx.restore();

        // Separator
        const sepGrad = ctx.createLinearGradient(boxX + 20, 0, boxX + boxW - 20, 0);
        sepGrad.addColorStop(0, 'transparent');
        sepGrad.addColorStop(0.3, 'rgba(255,215,0,0.15)');
        sepGrad.addColorStop(0.7, 'rgba(255,215,0,0.15)');
        sepGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = sepGrad;
        ctx.fillRect(boxX + 20, boxY + 36, boxW - 40, 1);

        const statsY = boxY + 56;
        const halfW = boxW / 2;
        const col1X = boxX + 20;
        const col2X = boxX + halfW + 10;
        const lineH = 28;

        const drawStatCol = (stats, startX, colW) => {
            stats.forEach((stat, i) => {
                const y = statsY + i * lineH;
                ctx.save();
                ctx.font = "13px 'Press Start 2P', monospace";
                ctx.textBaseline = 'middle';
                // Label
                ctx.textAlign = 'left';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillText(stat.label, startX, y);
                // Value
                ctx.textAlign = 'right';
                ctx.fillStyle = stat.color;
                ctx.shadowColor = stat.color;
                ctx.shadowBlur = 4;
                ctx.fillText(String(stat.value), startX + colW - 10, y);
                ctx.restore();
            });
        };

        // Left column
        const leftStats = [
            { label: '\u2694\uFE0F  Enemies', value: (gameStats.enemiesDefeated || 0).toLocaleString(), color: '#FF6B6B' },
            { label: '\uD83D\uDCA5 Damage Dealt', value: (gameStats.totalDamage || 0).toLocaleString(), color: '#FF4500' },
            { label: '\uD83D\uDD25 Best Combo', value: `x${gameStats.maxCombo || 0}`, color: '#FFD93D' },
            { label: '\u26A1 Multiplier', value: `${(gameStats.bestMultiplier || 1.0).toFixed(1)}x`, color: '#FF9500' },
            { label: '\uD83D\uDC80 Dmg Taken', value: damageTaken === 0 ? 'NONE!' : damageTaken, color: damageTaken === 0 ? '#00FFFF' : '#FF6B6B' },
            { label: '\uD83C\uDFC1 Levels', value: `${gameStats.levelsCompleted || 0}/10`, color: '#A8E6CF' }
        ];
        drawStatCol(leftStats, col1X, halfW - 10);

        // Right column
        const rightStats = [
            { label: '\uD83C\uDFAF Accuracy', value: `${Math.floor((gameStats.accuracy || 0) * 100)}%`, color: '#95E1D3' },
            { label: '\uD83D\uDDFF Idols', value: `${gameStats.idolsCollected || 0}/30`, color: '#F38181' },
            { label: '\uD83D\uDC8E Sets', value: `${gameStats.idolSetsCompleted || 0}/10`, color: '#A8E6CF' },
            { label: '\u2728 Perfect Lvls', value: perfectLevels, color: perfectLevels > 0 ? '#FFD700' : '#808080' },
            { label: '\uD83C\uDFB2 Multi-Kills', value: gameStats.multiKills || 0, color: '#FF6B9D' }
        ];
        drawStatCol(rightStats, col2X, halfW - 20);

        // ── Flavor text ──
        let flavorText = 'The Skunk Squad is safe... for now.';
        if (damageTaken === 0 && completionTime <= 900) flavorText = 'A LEGENDARY performance! You are truly The One!';
        else if (damageTaken === 0) flavorText = 'FLAWLESS! A shadow master walks among us!';
        else if (completionTime <= 600) flavorText = 'INCREDIBLE SPEED! A true speedrunner!';
        else if ((gameStats.idolSetsCompleted || 0) >= 10) flavorText = 'Every relic recovered! A true collector!';

        ctx.save();
        ctx.font = "italic 18px 'Bangers', 'Arial Black', sans-serif";
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 8;
        ctx.fillText(flavorText, cx, boxY + boxH + 30);
        ctx.restore();

        // ── Blinking continue prompt ──
        const blink = Math.sin(now / 400) * 0.4 + 0.6;
        ctx.save();
        ctx.globalAlpha = blink;
        ctx.font = "16px 'Press Start 2P', monospace";
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('PRESS ENTER TO CONTINUE', cx, boxY + boxH + 65);
        ctx.restore();
    }

    drawHUD(ctx, player, score, combo, pulse, levelNumber = 1, objectiveInfo = null, lives = 1, idolStatus = null, levelTime = 0, bossInfo = null) {
        // Refresh safe-area insets (cheap — just reads cached CSS vars)
        this._refreshSafeAreaInsets();

        // Base padding + safe-area offsets so HUD elements avoid notches/cutouts
        const basePad = 12;
        const padTop = basePad + this.safeTop;
        const padBottom = basePad + this.safeBottom;
        const padLeft = basePad + this.safeLeft;
        const padRight = basePad + this.safeRight;
        const padding = padLeft; // legacy alias used by existing layout code

        // Level timer (top-left, below health bar area)
        try {
            const timerBoxW = 140;
            const timerBoxH = 32;
            const timerBoxX = padLeft;
            const timerBoxY = this.height - padBottom - timerBoxH; // Bottom-left corner

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
        } catch (e) { __err('ui', e); }

        // Health bar (compact)
        const iconSize = 14;
        const iconGap = 8;
        const healthBarWidth = 210;
        const healthBarHeight = 16;
        const healthBarX = padLeft + iconSize + iconGap;
        const healthBarY = padTop;

        // Health icon (simple heart)
        try {
            const cx = padLeft + iconSize * 0.5;
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
        } catch (e) { __err('ui', e); }

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
            } catch (e) { __err('ui', e); }
            
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
            } catch (e) { __err('ui', e); }
            
            // Skunk ammo counter (below buff indicators)
            try {
                if (player && player.skunkAmmo > 0) {
                    const ammoY = idolY + idolSize + (player.idolBonuses && (player.idolBonuses.speed > 0 || player.idolBonuses.damage > 0) ? 30 : 6);
                    const ammoIconSize = 18;
                    const ammoGap = 4;
                    const ammoX = idolX;
                    
                    ctx.save();
                    
                    // Draw background pill
                    const ammoPillW = Math.min(player.skunkAmmo, 9) * (ammoIconSize + ammoGap) + 8;
                    const ammoPillH = ammoIconSize + 6;
                    
                    ctx.fillStyle = 'rgba(40, 200, 40, 0.25)';
                    ctx.strokeStyle = 'rgba(80, 255, 80, 0.6)';
                    ctx.lineWidth = 2;
                    
                    // Rounded rectangle
                    const radius = 8;
                    ctx.beginPath();
                    ctx.moveTo(ammoX + radius, ammoY);
                    ctx.lineTo(ammoX + ammoPillW - radius, ammoY);
                    ctx.arcTo(ammoX + ammoPillW, ammoY, ammoX + ammoPillW, ammoY + radius, radius);
                    ctx.lineTo(ammoX + ammoPillW, ammoY + ammoPillH - radius);
                    ctx.arcTo(ammoX + ammoPillW, ammoY + ammoPillH, ammoX + ammoPillW - radius, ammoY + ammoPillH, radius);
                    ctx.lineTo(ammoX + radius, ammoY + ammoPillH);
                    ctx.arcTo(ammoX, ammoY + ammoPillH, ammoX, ammoY + ammoPillH - radius, radius);
                    ctx.lineTo(ammoX, ammoY + radius);
                    ctx.arcTo(ammoX, ammoY, ammoX + radius, ammoY, radius);
                    ctx.fill();
                    ctx.stroke();
                    
                    // Draw ammo icons
                    const maxDisplay = 9;
                    const displayCount = Math.min(player.skunkAmmo, maxDisplay);
                    
                    for (let i = 0; i < displayCount; i++) {
                        const ix = ammoX + 4 + i * (ammoIconSize + ammoGap);
                        const iy = ammoY + 3;
                        
                        // Draw skunk emoji
                        ctx.font = `${ammoIconSize}px Arial`;
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'top';
                        ctx.fillStyle = '#000000'; // Reset to full black for emojis
                        ctx.fillText('🦨', ix, iy);
                    }
                    
                    // If more than 9, show "+X" text
                    if (player.skunkAmmo > maxDisplay) {
                        ctx.font = 'bold 14px Arial';
                        ctx.fillStyle = '#40FF40';
                        ctx.textAlign = 'left';
                        ctx.fillText(`+${player.skunkAmmo - maxDisplay}`, ammoX + ammoPillW + 6, ammoY + ammoPillH / 2 - 7);
                    }
                    
                    ctx.restore();
                }
            } catch (e) { __err('ui', e); }
        } catch (e) { __err('ui', e); }

        // Optional numeric HP (only when low, small + subtle)
        try {
            if ((player.health / player.maxHealth) <= 0.3) {
                ctx.font = '12px Arial';
                ctx.fillStyle = 'rgba(255,255,255,0.75)';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(`${Math.max(0, Math.floor(player.health))}/${player.maxHealth}`, healthBarX + 6, healthBarY + 2);
            }
        } catch (e) { __err('ui', e); }

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
                const minStartX = healthBarX + healthBarWidth + padLeft;
                const maxStartX = this.width - totalW - padRight;
                const startX = Math.max(Math.min(centerStartX, maxStartX), minStartX);
                const iconY = padTop + 1;
                const barX = startX + iconSize + iconGap;
                const barY = padTop + 6;

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
        } catch (e) { __err('ui', e); }

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

            // Show boss name if available
            if (this._bossWarningName) {
                ctx.fillStyle = '#FF4444';
                ctx.font = 'bold 32px Arial';
                ctx.shadowColor = '#FF0000';
                ctx.shadowBlur = 15;
                ctx.fillText(this._bossWarningName, this.width / 2, this.height / 2 + 100);
                if (this._bossWarningTitle) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.font = '18px Arial';
                    ctx.shadowBlur = 0;
                    ctx.fillText(this._bossWarningTitle, this.width / 2, this.height / 2 + 130);
                }
            }
            ctx.restore();
        }

        // Boss Defeated celebration banner
        if (this._bossDefeatedUntil && this._bossDefeatedUntil > Date.now()) {
            const remaining = this._bossDefeatedUntil - Date.now();
            const fadeAlpha = remaining < 500 ? remaining / 500 : 1.0;
            const bossName = this._bossDefeatedName || 'BOSS';

            ctx.save();
            ctx.globalAlpha = fadeAlpha;

            // Dimmed background strip
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, this.height / 2 - 80, this.width, 160);

            // Gold border lines
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, this.height / 2 - 80);
            ctx.lineTo(this.width, this.height / 2 - 80);
            ctx.moveTo(0, this.height / 2 + 80);
            ctx.lineTo(this.width, this.height / 2 + 80);
            ctx.stroke();

            // Main text with glow
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 56px Arial';
            ctx.fillText('BOSS DEFEATED', this.width / 2, this.height / 2 - 20);

            // Boss name
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 28px Arial';
            ctx.fillText(bossName + ' ELIMINATED', this.width / 2, this.height / 2 + 30);

            // Pulsing glow on the text
            const pulse = 0.6 + Math.sin(Date.now() * 0.005) * 0.4;
            ctx.globalAlpha = fadeAlpha * pulse * 0.3;
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 60px Arial';
            ctx.fillText('BOSS DEFEATED', this.width / 2, this.height / 2 - 20);

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
            const boxX = this.width - padRight - boxW;
            const boxY = padTop;

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
        } catch (e) { __err('ui', e); }

        // Combo counter (below score, top-right area)
        try {
            if (combo && combo > 1) {
                // ── Determine combo tier for color/style ──
                const comboTiers = (typeof Config !== 'undefined' && Config.COMBO && Config.COMBO.TIERS) || [];
                let tierColor = '#FFD93D';
                let tierLabel = '';
                for (const t of comboTiers) {
                    if (combo >= t.threshold) { tierColor = t.color; tierLabel = t.label; }
                }

                // Scale the box for higher combos
                const comboScale = Math.min(1.0 + (combo - 1) * 0.02, 1.4);
                const comboBoxW = Math.floor(140 * comboScale);
                const comboBoxH = Math.floor(34 * comboScale);
                const comboBoxX = this.width - padRight - comboBoxW;
                const comboBoxY = padTop + 40; // Below score

                ctx.save();
                
                // Animated background based on combo level
                const comboIntensity = Math.min(combo / 30, 1);
                const bgAlpha = 0.6 + (comboIntensity * 0.3);

                // Background gradient for high combos
                if (combo >= 10) {
                    const grad = ctx.createLinearGradient(comboBoxX, comboBoxY, comboBoxX + comboBoxW, comboBoxY + comboBoxH);
                    grad.addColorStop(0, `rgba(255, 50, 0, ${bgAlpha})`);
                    grad.addColorStop(0.5, `rgba(255, 150, 0, ${bgAlpha})`);
                    grad.addColorStop(1, `rgba(255, 50, 0, ${bgAlpha})`);
                    ctx.fillStyle = grad;
                } else {
                    ctx.fillStyle = `rgba(255, ${Math.floor(100 * (1 - comboIntensity))}, 0, ${bgAlpha})`;
                }
                ctx.fillRect(comboBoxX, comboBoxY, comboBoxW, comboBoxH);
                
                // Glowing border — escalates with combo
                if (combo >= 20) {
                    ctx.strokeStyle = tierColor;
                    ctx.shadowColor = tierColor;
                    ctx.shadowBlur = 15 + Math.sin(Date.now() / 80) * 8;
                    ctx.lineWidth = 3;
                } else if (combo >= 10) {
                    ctx.strokeStyle = tierColor;
                    ctx.shadowColor = tierColor;
                    ctx.shadowBlur = 12 + Math.sin(Date.now() / 100) * 6;
                    ctx.lineWidth = 2.5;
                } else if (combo >= 5) {
                    ctx.strokeStyle = '#FF6600';
                    ctx.shadowColor = '#FF6600';
                    ctx.shadowBlur = 10 + Math.sin(Date.now() / 100) * 5;
                    ctx.lineWidth = 2;
                } else {
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                    ctx.lineWidth = 2;
                }
                ctx.strokeRect(comboBoxX, comboBoxY, comboBoxW, comboBoxH);

                // Combo count text
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = tierColor;
                const fontSize = Math.floor(18 * comboScale);
                ctx.font = `bold ${fontSize}px Arial`;
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 4;
                ctx.fillText(`COMBO x${combo}`, comboBoxX + comboBoxW / 2, comboBoxY + comboBoxH * 0.38);

                // Multiplier line underneath
                try {
                    const cfg = (typeof Config !== 'undefined' && Config.COMBO) || {};
                    const base = cfg.SCORE_MULTIPLIER_BASE || 1.0;
                    const perStack = cfg.SCORE_MULTIPLIER_PER_STACK || 0.25;
                    const max = cfg.SCORE_MULTIPLIER_MAX || 10.0;
                    const mult = Math.min(base + (combo - 1) * perStack, max);
                    if (mult > 1.0) {
                        ctx.font = `bold ${Math.floor(12 * comboScale)}px Arial`;
                        ctx.fillStyle = '#FFFFFF';
                        ctx.globalAlpha = 0.85;
                        ctx.fillText(`SCORE ${mult.toFixed(1)}x`, comboBoxX + comboBoxW / 2, comboBoxY + comboBoxH * 0.75);
                    }
                } catch (e) { __err('ui', e); }

                ctx.restore();

                // Tier label below the combo box (e.g., "AWESOME!", "LEGENDARY!")
                if (tierLabel && combo >= 5) {
                    ctx.save();
                    const labelPulse = 1.0 + Math.sin(Date.now() / 150) * 0.1;
                    const labelSize = Math.floor(16 * comboScale * labelPulse);
                    ctx.font = `bold ${labelSize}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillStyle = tierColor;
                    ctx.shadowColor = tierColor;
                    ctx.shadowBlur = 8;
                    ctx.fillText(tierLabel, comboBoxX + comboBoxW / 2, comboBoxY + comboBoxH + 4);
                    ctx.restore();
                }
            }
        } catch (e) { __err('ui', e); }

        // Level title display (shown for 3 seconds at level start)
        try {
            const now = Date.now();
            if (this._levelTitleUntil > 0 && now < this._levelTitleUntil) {
                const remaining = this._levelTitleUntil - now;
                const fadeTime = 500; // Fade out in last 500ms
                const alpha = remaining < fadeTime ? remaining / fadeTime : 1.0;
                
                ctx.save();
                ctx.globalAlpha = alpha;
                
                // Background panel
                const panelW = 500;
                const panelH = 120;
                const panelX = (this.width - panelW) / 2;
                const panelY = (this.height - panelH) / 2 - 50;
                
                // Semi-transparent background with border
                ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                ctx.fillRect(panelX, panelY, panelW, panelH);
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 3;
                ctx.strokeRect(panelX, panelY, panelW, panelH);
                
                // Stage number (e.g., "STAGE 1")
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 28px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(this._levelTitleText, panelX + panelW / 2, panelY + 20);
                
                // Level name (e.g., "Forest Outskirts")
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 36px Arial';
                ctx.textBaseline = 'top';
                ctx.fillText(this._levelNameText, panelX + panelW / 2, panelY + 55);
                
                ctx.restore();
            }
        } catch (e) { __err('ui', e); }

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

    showBossWarning(bossName = null, bossTitle = null) {
        this.bossWarningTime = Date.now() + 3000;
        this._bossWarningName = bossName || null;
        this._bossWarningTitle = bossTitle || null;
    }

    /**
     * Draw a large boss health bar at the bottom of the screen with name + phase indicator.
     */
    drawBossBar(ctx, bossInfo) {
        if (!bossInfo || typeof bossInfo.hpPct !== 'number') return;

        const barW = Math.min(Math.floor(this.width * 0.45), 420);
        const barH = 10;
        const barX = Math.floor((this.width - barW) / 2);
        const barY = 22 + this.safeTop;
        const hpPct = Math.max(0, Math.min(1, bossInfo.hpPct));
        const name = bossInfo.name || 'BOSS';
        const phase = bossInfo.phase || 1;

        ctx.save();

        // Compact background panel
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(barX - 8, barY - 14, barW + 16, barH + 18);
        ctx.strokeStyle = phase >= 3 ? '#FF2200' : phase >= 2 ? '#FF8800' : '#666666';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX - 8, barY - 14, barW + 16, barH + 18);

        // Boss name + phase label inline
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = phase >= 3 ? '#FF4444' : phase >= 2 ? '#FFaa44' : '#FFFFFF';
        ctx.font = 'bold 10px Arial';
        let label = name;
        if (phase >= 3) {
            const desperateFlash = Math.floor(Date.now() / 300) % 2 === 0;
            label += desperateFlash ? ' ⚡ DESPERATE' : ' 💀 DESPERATE';
        } else if (phase >= 2) {
            label += ' 🔥 ENRAGED';
        }
        ctx.fillText(label, this.width / 2, barY - 2);

        // Health bar background
        ctx.fillStyle = 'rgba(80, 0, 0, 0.8)';
        ctx.fillRect(barX, barY, barW, barH);

        // Health bar fill with gradient
        if (hpPct > 0) {
            let fillGrad;
            if (phase >= 3) {
                const pulse = 0.8 + Math.sin(Date.now() * 0.008) * 0.2;
                fillGrad = ctx.createLinearGradient(barX, barY, barX + barW * hpPct, barY);
                fillGrad.addColorStop(0, `rgba(255, ${Math.floor(40 * pulse)}, 0, 1)`);
                fillGrad.addColorStop(1, '#FF0000');
            } else if (phase >= 2) {
                fillGrad = ctx.createLinearGradient(barX, barY, barX + barW * hpPct, barY);
                fillGrad.addColorStop(0, '#FF6600');
                fillGrad.addColorStop(1, '#FF2200');
            } else {
                fillGrad = ctx.createLinearGradient(barX, barY, barX + barW * hpPct, barY);
                fillGrad.addColorStop(0, '#FF4444');
                fillGrad.addColorStop(0.5, '#CC2222');
                fillGrad.addColorStop(1, '#AA0000');
            }
            ctx.fillStyle = fillGrad;
            ctx.fillRect(barX, barY, Math.max(0, barW * hpPct), barH);
        }

        // Phase notches at 50% and 25%
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(barX + Math.floor(barW * 0.5), barY, 1, barH);
        ctx.fillRect(barX + Math.floor(barW * 0.25), barY, 1, barH);

        // Bar border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        // HP percentage text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`${Math.ceil(hpPct * 100)}%`, barX + barW - 3, barY + 1);

        ctx.restore();
    }
}
