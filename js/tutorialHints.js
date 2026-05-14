/*!
 * Skunked: Way of the Spray
 * Copyright (c) 2026 Mephitideus Interactive. All Rights Reserved.
 * Proprietary and confidential — unauthorized copying, distribution, or use
 * of this file, via any medium, is strictly prohibited. See LICENSE for terms.
 */
/**
 * TutorialHints — contextual in-game hints that teach controls and objectives
 * without pausing gameplay.  Each hint fires once (tracked in localStorage)
 * and auto-dismisses.  Players can tap/press any key to dismiss early.
 * A "Reset Hints" option in Settings lets players replay the tutorial.
 */

try { if (typeof Config !== 'undefined' && Config.DEBUG) console.log('tutorialHints.js loaded'); } catch (e) { __err('tutorialHints', e); }

class TutorialHints {
    constructor(isMobile = false) {
        this.isMobile = isMobile;
        this.STORAGE_KEY = 'skunkfu_tutorial_seen_v1';
        this.DONE_KEY = 'skunkfu_tutorial_done';
        this.RUNS_KEY = 'skunkfu_run_count';

        // Load seen hints from localStorage
        this._seen = {};
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) this._seen = JSON.parse(raw);
        } catch (e) { this._seen = {}; }

        // Track whether the tutorial is permanently complete.
        // Once the player finishes the game or plays enough runs,
        // all future hints are suppressed until manually reset.
        this._done = false;
        try { this._done = localStorage.getItem(this.DONE_KEY) === '1'; } catch (e) {}

        // Track number of game starts — after a few runs we consider the
        // player experienced enough to suppress remaining hints.
        this._runCount = 0;
        try { this._runCount = parseInt(localStorage.getItem(this.RUNS_KEY) || '0', 10); } catch (e) {}

        // Currently displayed hint
        this._active = null;   // { id, lines, timer, duration, alpha, dismissed }
        // Queue of pending hints (so two events don't stomp each other)
        this._queue = [];
        // Initial delay gate — suppress hints for the first N seconds of a run
        this._initialDelay = 0;
        // Cooldown between consecutive hints to prevent hint fatigue
        this._interHintDelay = 0;
        // One-shot flag: enemy attack hint already checked this run
        this._enemyHintFired = false;

        // ── Hint definitions ──
        // Each hint has a unique id, display lines, and duration in seconds.
        // Keyboard and touch versions are provided; the correct one is chosen
        // based on isMobile at trigger time.
        this.HINTS = {
            move_jump: {
                id: 'move_jump',
                duration: 12,
                kb:    ['← → to Move  •  SPACE to Jump',
                        'Double-tap SPACE for a double jump!'],
                touch: ['Use ⟸ ⟹ to Move  •  ⤒ to Jump',
                        'Tap Jump twice for a double jump!']
            },
            attack: {
                id: 'attack',
                duration: 10,
                kb:    ['Press X to Attack enemies!',
                        'Chain hits within 2s for combos!'],
                touch: ['Tap 🗡 to Attack enemies!',
                        'Chain hits within 2s for combos!']
            },
            attack_pity: {
                id: 'attack_pity',
                duration: 14,
                kb:    ['You can ATTACK enemies!',
                        'Press X — they can\'t hurt you if they\'re down.'],
                touch: ['You can ATTACK enemies!',
                        'Tap 🗡 — they can\'t hurt you if they\'re down.']
            },
            shadow_strike: {
                id: 'shadow_strike',
                duration: 10,
                kb:    ['Press Z for Shadow Strike!',
                        'Dash through attacks — invincible!'],
                touch: ['Tap 💥 for Shadow Strike!',
                        'Dash through attacks — invincible!']
            },
            skunk_shot: {
                id: 'skunk_shot',
                duration: 10,
                kb:    ['Press C to fire Skunk Shot!',
                        'Ranged spray that stuns enemies.'],
                touch: ['Tap 🦨 for Skunk Shot!',
                        'Ranged spray that stuns enemies.']
            },
            golden_idol: {
                id: 'golden_idol',
                duration: 10,
                kb:    ['✦ Golden Idol spotted!',
                        'Collect all 3 per stage for boosts!'],
                touch: ['✦ Golden Idol spotted!',
                        'Collect all 3 per stage for boosts!']
            },
            boss_encounter: {
                id: 'boss_encounter',
                duration: 12,
                kb:    ['⚔ Boss Incoming!',
                        'Attack after they strike.',
                        'At 50% HP they enrage — stay alert!'],
                touch: ['⚔ Boss Incoming!',
                        'Attack after they strike.',
                        'At 50% HP they enrage — stay alert!']
            },
            exit_portal: {
                id: 'exit_portal',
                duration: 9,
                kb:    ['🌀 Exit Portal opened!',
                        'Head right to complete the stage.'],
                touch: ['🌀 Exit Portal opened!',
                        'Head right to complete the stage.']
            },
            objective: {
                id: 'objective',
                duration: 12,
                kb:    ['OBJECTIVE: Defeat enemies & boss,',
                        'then reach the Exit Portal!'],
                touch: ['OBJECTIVE: Defeat enemies & boss,',
                        'then reach the Exit Portal!']
            }
        };
    }

    /** Check if a hint has already been seen (or tutorial is done) */
    hasSeen(id) {
        return this._done || !!this._seen[id];
    }

    /** Mark a hint as seen and persist */
    _markSeen(id) {
        this._seen[id] = true;
        try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._seen)); } catch (e) { /* quota */ }
    }

    /**
     * Mark the entire tutorial as permanently complete.
     * Called when the player finishes the game or accumulates enough runs.
     */
    markDone() {
        if (this._done) return;
        this._done = true;
        try { localStorage.setItem(this.DONE_KEY, '1'); } catch (e) {}
        // Analytics: tutorial complete
        try {
            if (typeof Analytics !== 'undefined') {
                Analytics.trackTutorialComplete({
                    stepsSeen: Object.keys(this._seen || {}).length,
                    runs: this._runCount || 0
                });
            }
        } catch (e) { /* */ }
    }

    /**
     * Increment the run counter.  After 3 game starts the tutorial is
     * considered done — the player has had enough exposure to the controls.
     */
    trackRun() {
        this._runCount++;
        try { localStorage.setItem(this.RUNS_KEY, String(this._runCount)); } catch (e) {}
        if (this._runCount >= 3) {
            this.markDone();
        }
    }

    /** Reset all seen hints and the "done" flag (called from Settings) */
    resetAll() {
        this._seen = {};
        this._done = false;
        this._runCount = 0;
        this._active = null;
        this._queue = [];
        this._interHintDelay = 0;
        this._enemyHintFired = false;
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            localStorage.removeItem(this.DONE_KEY);
            localStorage.removeItem(this.RUNS_KEY);
        } catch (e) { /* ignore */ }
    }

    /**
     * Begin a new run — sets the initial delay gate so hints don't
     * flash before the player has oriented themselves.
     */
    startRun() {
        this._initialDelay = 2.0; // seconds before first hint can appear
        this._interHintDelay = 0;
        this._enemyHintFired = false;
        this._active = null;
        this._queue = [];
        this.trackRun();
    }

    /**
     * Trigger a hint by id. Ignored if tutorial is done, already seen,
     * or still within the initial delay window.
     */
    trigger(id) {
        if (this._done) return;
        const def = this.HINTS[id];
        if (!def) return;
        if (this._seen[id]) return;        // If a hint is already active, queue this one
        if (this._active && !this._active.dismissed) {
            // Don't queue duplicates
            if (this._active.id === id) return;
            if (this._queue.some(q => q === id)) return;
            this._queue.push(id);
            return;
        }

        // Respect initial delay — queue instead of showing immediately
        if (this._initialDelay > 0) {
            if (!this._queue.some(q => q === id)) {
                this._queue.push(id);
            }
            return;
        }

        this._show(def);
    }

    /**
     * Enable pulsing tutorial labels on the on-screen touch buttons.
     * Each pulse stays until the matching input fires once, then auto-removes.
     * Idempotent: safe to call repeatedly.
     */
    enableButtonGlyphs() {
        if (this._done) return;
        if (!this.isMobile) return;
        if (this._glyphsActive) return;
        this._glyphsActive = true;

        const KEY = 'skunkfu_glyphs_seen_v1';
        let seen = {};
        try { seen = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { seen = {}; }

        const map = [
            { id: 'btn-left',   label: 'MOVE',   actions: ['left'] },
            { id: 'btn-right',  label: 'MOVE',   actions: ['right'] },
            { id: 'btn-jump',   label: 'JUMP',   actions: ['jump'] },
            { id: 'btn-attack', label: 'ATTACK', actions: ['attack'] }
        ];

        const cleared = {};
        const applyTo = [];
        for (const m of map) {
            if (seen[m.id]) continue;
            const el = document.getElementById(m.id);
            if (!el) continue;
            el.setAttribute('data-pulse-label', m.label);
            el.classList.add('tutorial-pulse');
            applyTo.push(Object.assign({}, m, { el }));
        }
        if (applyTo.length === 0) {
            this._glyphsActive = false;
            return;
        }

        const self = this;
        const clearOne = (entry) => {
            if (cleared[entry.id]) return;
            cleared[entry.id] = true;
            seen[entry.id] = true;
            entry.el.classList.remove('tutorial-pulse');
            entry.el.removeAttribute('data-pulse-label');
            try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch (_) {}
        };

        // Attach a one-shot direct press listener per button. This works for
        // both the TouchControls class and the static HTML fallback.
        const perBtnHandlers = [];
        for (const entry of applyTo) {
            const handler = () => clearOne(entry);
            entry.el.addEventListener('pointerdown', handler, { once: true });
            entry.el.addEventListener('touchstart', handler, { once: true, passive: true });
            perBtnHandlers.push({ entry, handler });
        }

        // Also listen for the synthesized `touchcontrol` event in case the
        // input arrives from a non-press path (e.g. swipe-to-attack).
        const onTouchControl = (e) => {
            try {
                const action = e && e.detail && e.detail.action;
                if (!action) return;
                for (const m of applyTo) {
                    if (!cleared[m.id] && m.actions.indexOf(action) !== -1) clearOne(m);
                }
                if (applyTo.every(m => cleared[m.id])) {
                    window.removeEventListener('touchcontrol', onTouchControl);
                    self._glyphsActive = false;
                }
            } catch (_) { /* ignore */ }
        };
        window.addEventListener('touchcontrol', onTouchControl);

        // Auto-clear after 30s so the UI doesn't pulse forever.
        setTimeout(() => {
            try {
                for (const m of applyTo) {
                    m.el.classList.remove('tutorial-pulse');
                    m.el.removeAttribute('data-pulse-label');
                }
                window.removeEventListener('touchcontrol', onTouchControl);
                self._glyphsActive = false;
            } catch (_) {}
        }, 30000);
    }

    /**
     * Force-show a hint even if it has been seen (but still respect _done).
     * Used by pity prompts (e.g. player died in level 1 without attacking).
     */
    forceShow(id) {
        if (this._done) return;
        const def = this.HINTS[id];
        if (!def) return;
        // Bypass the initial delay and replace any active hint.
        this._initialDelay = 0;
        this._interHintDelay = 0;
        if (this._active && !this._active.dismissed) {
            this._active.dismissed = true;
            this._active.alpha = 0;
            this._active = null;
        }
        // Clear seen so it can replay
        delete this._seen[id];
        try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._seen)); } catch (e) {}
        this._show(def);
    }

    /** Internal: activate a hint definition */
    _show(def) {
        const lines = this.isMobile ? def.touch : def.kb;
        this._active = {
            id: def.id,
            lines: lines,
            timer: 0,
            duration: def.duration,
            alpha: 0,
            dismissed: false
        };
        this._markSeen(def.id);
        try { Analytics.trackTutorialStep(def.id); } catch(e) {}
    }

    /** Dismiss the current hint (called on key/tap).
     *  Ignored during the first 2s so gameplay keys don't skip the hint. */
    dismiss() {
        if (this._active && !this._active.dismissed && this._active.timer >= 2.0) {
            this._active.dismissed = true;
        }
    }

    /**
     * Update hint timer. Call every frame with delta-time in seconds.
     */
    update(dt) {
        // Tick down the initial delay gate
        if (this._initialDelay > 0) {
            this._initialDelay -= dt;
            if (this._initialDelay <= 0) {
                this._initialDelay = 0;
                // Now try to show any queued hints that were waiting
                this._dequeue();
            }
            return;
        }

        // Tick down inter-hint cooldown (breathing room between hints)
        if (this._interHintDelay > 0) {
            this._interHintDelay -= dt;
            if (this._interHintDelay <= 0) {
                this._interHintDelay = 0;
                this._dequeue();
            }
            return;
        }

        if (!this._active) {
            this._dequeue();
            return;
        }

        const h = this._active;

        if (h.dismissed) {
            // Fade out quickly
            h.alpha -= dt * 4;
            if (h.alpha <= 0) {
                this._active = null;
                // Add a 1.2s breather before the next hint
                this._interHintDelay = 1.2;
            }
            return;
        }

        h.timer += dt;

        // Fade in (0-0.8s), hold, fade out (last 1.5s)
        const fadeIn = 0.8;
        const fadeOut = 1.5;
        if (h.timer < fadeIn) {
            h.alpha = h.timer / fadeIn;
        } else if (h.timer > h.duration - fadeOut) {
            h.alpha = Math.max(0, (h.duration - h.timer) / fadeOut);
        } else {
            h.alpha = 1;
        }

        if (h.timer >= h.duration) {
            this._active = null;
            // Add a 1.2s breather before the next hint
            this._interHintDelay = 1.2;
        }
    }

    /** Pull next hint from queue */
    _dequeue() {
        if (this._done) { this._queue = []; return; }
        while (this._queue.length > 0) {
            const nextId = this._queue.shift();
            if (!this._seen[nextId] && this.HINTS[nextId]) {
                this._show(this.HINTS[nextId]);
                return;
            }
        }
    }

    _drawRoundedRect(ctx, x, y, width, height, radius) {
        const r = Math.max(0, Math.min(radius, width / 2, height / 2));
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(x, y, width, height, r);
            return;
        }
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.arcTo(x + width, y, x + width, y + r, r);
        ctx.lineTo(x + width, y + height - r);
        ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
        ctx.lineTo(x + r, y + height);
        ctx.arcTo(x, y + height, x, y + height - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }

    _wrapHintLine(ctx, text, maxWidth) {
        if (!text) return [''];
        const words = text.split(' ');
        const lines = [];
        let current = words[0] || '';

        for (let i = 1; i < words.length; i++) {
            const next = `${current} ${words[i]}`;
            if (ctx.measureText(next).width <= maxWidth) {
                current = next;
            } else {
                lines.push(current);
                current = words[i];
            }
        }

        if (current) lines.push(current);
        return lines;
    }

    _getHintTheme(id) {
        switch (id) {
            case 'move_jump':
                return { label: 'MOVEMENT', accent: '#58F3FF', accentSoft: 'rgba(88, 243, 255, 0.18)', accentGlow: 'rgba(88, 243, 255, 0.35)' };
            case 'attack':
                return { label: 'COMBAT', accent: '#FF8F6B', accentSoft: 'rgba(255, 143, 107, 0.18)', accentGlow: 'rgba(255, 143, 107, 0.34)' };
            case 'attack_pity':
                return { label: 'TIP', accent: '#FFB347', accentSoft: 'rgba(255, 179, 71, 0.20)', accentGlow: 'rgba(255, 179, 71, 0.40)' };
            case 'shadow_strike':
                return { label: 'ABILITY', accent: '#B98BFF', accentSoft: 'rgba(185, 139, 255, 0.18)', accentGlow: 'rgba(185, 139, 255, 0.34)' };
            case 'skunk_shot':
                return { label: 'RANGED', accent: '#75F0A8', accentSoft: 'rgba(117, 240, 168, 0.18)', accentGlow: 'rgba(117, 240, 168, 0.34)' };
            case 'golden_idol':
                return { label: 'LOOT', accent: '#FFD36A', accentSoft: 'rgba(255, 211, 106, 0.20)', accentGlow: 'rgba(255, 211, 106, 0.34)' };
            case 'boss_encounter':
                return { label: 'DANGER', accent: '#FF6E88', accentSoft: 'rgba(255, 110, 136, 0.18)', accentGlow: 'rgba(255, 110, 136, 0.34)' };
            case 'exit_portal':
                return { label: 'OBJECTIVE', accent: '#78B8FF', accentSoft: 'rgba(120, 184, 255, 0.18)', accentGlow: 'rgba(120, 184, 255, 0.34)' };
            case 'objective':
                return { label: 'MISSION', accent: '#7BC9FF', accentSoft: 'rgba(123, 201, 255, 0.18)', accentGlow: 'rgba(123, 201, 255, 0.34)' };
            default:
                return { label: 'TUTORIAL', accent: '#50FFF4', accentSoft: 'rgba(80, 255, 244, 0.18)', accentGlow: 'rgba(80, 255, 244, 0.34)' };
        }
    }

    /**
     * Draw the active hint on the canvas.
     * Call after drawHUD so hints appear on top.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} viewWidth  - logical viewport width
     * @param {number} viewHeight - logical viewport height
     */
    draw(ctx, viewWidth, viewHeight) {
        if (!this._active || this._active.alpha <= 0) return;

        const h = this._active;
        const theme = this._getHintTheme(h.id);
        const tutorialFont = "'Space Grotesk', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
        const scale = Math.max(0.75, Math.min(1, viewWidth / 600));
        const titleSize = Math.round(20 * scale);
        const bodySize = Math.round(15 * scale);
        const eyebrowSize = Math.round(11 * scale);
        const dismissSize = Math.round(11 * scale);
        const titleLineHeight = Math.round(26 * scale);
        const bodyLineHeight = Math.round(22 * scale);
        const horizontalPadding = Math.round(22 * scale);
        const topPadding = Math.round(18 * scale);
        const bottomPadding = Math.round(16 * scale);
        const badgeHeight = Math.round(24 * scale);
        const dismissHeight = Math.round(22 * scale);
        const sectionGap = Math.round(12 * scale);
        const cardMaxWidth = Math.min(viewWidth - Math.round(26 * scale), Math.round(520 * scale));
        const textMaxWidth = cardMaxWidth - horizontalPadding * 2;
        const enterOffset = Math.round((1 - h.alpha) * 10);

        ctx.save();
        ctx.font = `700 ${titleSize}px ${tutorialFont}`;
        const titleLines = this._wrapHintLine(ctx, h.lines[0], textMaxWidth);
        ctx.font = `500 ${bodySize}px ${tutorialFont}`;
        const bodyLines = h.lines.slice(1).flatMap(line => this._wrapHintLine(ctx, line, textMaxWidth));
        ctx.letterSpacing = '0.08em';
        ctx.font = `700 ${eyebrowSize}px ${tutorialFont}`;
        const badgeText = theme.label;
        const badgeWidth = Math.ceil(ctx.measureText(badgeText).width) + Math.round(20 * scale);
        ctx.letterSpacing = '0';
        ctx.font = `500 ${dismissSize}px ${tutorialFont}`;
        const dismissText = this.isMobile ? 'Tap anywhere to close' : 'Press any key to close';
        const dismissWidth = Math.ceil(ctx.measureText(dismissText).width) + Math.round(18 * scale);

        ctx.font = `700 ${titleSize}px ${tutorialFont}`;
        const titleWidth = titleLines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
        ctx.font = `500 ${bodySize}px ${tutorialFont}`;
        const bodyWidth = bodyLines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
        const contentWidth = Math.max(titleWidth, bodyWidth, badgeWidth, dismissWidth);
        const boxWidth = Math.min(cardMaxWidth, Math.ceil(contentWidth) + horizontalPadding * 2);
        const titleHeight = titleLines.length * titleLineHeight;
        const bodyHeight = bodyLines.length * bodyLineHeight;
        const boxHeight = topPadding + badgeHeight + sectionGap + titleHeight + (bodyLines.length ? Math.round(8 * scale) + bodyHeight : 0) + sectionGap + dismissHeight + bottomPadding;
        const boxX = Math.round((viewWidth - boxWidth) / 2);
        const boxY = Math.round(Math.max(58 * scale, Math.min(viewHeight * 0.18, 96 * scale)) + enterOffset);
        const progress = Math.max(0, 1 - (h.timer / Math.max(h.duration, 0.001)));

        ctx.globalAlpha = h.alpha * 0.98;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.34)';
        ctx.shadowBlur = Math.round(28 * scale);
        ctx.shadowOffsetY = Math.round(10 * scale);
        this._drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, Math.round(20 * scale));
        ctx.fillStyle = 'rgba(8, 12, 18, 0.84)';
        ctx.fill();

        ctx.shadowColor = 'transparent';
        this._drawRoundedRect(ctx, boxX + 1, boxY + 1, boxWidth - 2, boxHeight - 2, Math.round(19 * scale));
        const bgGradient = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxHeight);
        bgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.065)');
        bgGradient.addColorStop(1, 'rgba(255, 255, 255, 0.015)');
        ctx.fillStyle = bgGradient;
        ctx.fill();

        this._drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, Math.round(20 * scale));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = theme.accentSoft;
        this._drawRoundedRect(ctx, boxX + Math.round(14 * scale), boxY + Math.round(14 * scale), Math.round(6 * scale), boxHeight - Math.round(28 * scale), Math.round(6 * scale));
        ctx.fill();

        const pulse = 0.65 + 0.2 * Math.sin(h.timer * 3.5);
        ctx.fillStyle = theme.accentGlow.replace(/0\.\d+\)$/, `${pulse.toFixed(2)})`);
        this._drawRoundedRect(ctx, boxX + Math.round(30 * scale), boxY + Math.round(16 * scale), badgeWidth, badgeHeight, Math.round(999 * scale));
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        this._drawRoundedRect(ctx, boxX + boxWidth - dismissWidth - Math.round(18 * scale), boxY + boxHeight - dismissHeight - Math.round(14 * scale), dismissWidth, dismissHeight, Math.round(999 * scale));
        ctx.fill();

        const progressTrackX = boxX + Math.round(30 * scale);
        const progressTrackY = boxY + boxHeight - Math.round(9 * scale);
        const progressTrackW = boxWidth - Math.round(60 * scale);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        this._drawRoundedRect(ctx, progressTrackX, progressTrackY, progressTrackW, Math.max(3, Math.round(4 * scale)), Math.round(999 * scale));
        ctx.fill();
        if (progress > 0) {
            const progressGradient = ctx.createLinearGradient(progressTrackX, 0, progressTrackX + progressTrackW, 0);
            progressGradient.addColorStop(0, theme.accent);
            progressGradient.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
            this._drawRoundedRect(ctx, progressTrackX, progressTrackY, Math.max(Math.round(10 * scale), progressTrackW * progress), Math.max(3, Math.round(4 * scale)), Math.round(999 * scale));
            ctx.fillStyle = progressGradient;
            ctx.fill();
        }

        ctx.globalAlpha = h.alpha;
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = '0.08em';
        ctx.font = `700 ${eyebrowSize}px ${tutorialFont}`;
        ctx.fillStyle = theme.accent;
        ctx.textAlign = 'center';
        ctx.fillText(badgeText, boxX + Math.round(30 * scale) + badgeWidth / 2, boxY + Math.round(28 * scale));

        ctx.letterSpacing = '0';
        ctx.textAlign = 'left';
        let textY = boxY + topPadding + badgeHeight + sectionGap;

        ctx.font = `700 ${titleSize}px ${tutorialFont}`;
        ctx.fillStyle = '#F7FBFF';
        for (let i = 0; i < titleLines.length; i++) {
            const y = textY + titleLineHeight * i + titleLineHeight / 2;
            ctx.fillText(titleLines[i], boxX + Math.round(30 * scale), y);
        }
        textY += titleHeight;

        if (bodyLines.length) {
            textY += Math.round(8 * scale);
            ctx.font = `500 ${bodySize}px ${tutorialFont}`;
            ctx.fillStyle = 'rgba(226, 236, 245, 0.88)';
            for (let i = 0; i < bodyLines.length; i++) {
                const y = textY + bodyLineHeight * i + bodyLineHeight / 2;
                ctx.fillText(bodyLines[i], boxX + Math.round(30 * scale), y);
            }
        }

        ctx.font = `500 ${dismissSize}px ${tutorialFont}`;
        ctx.fillStyle = 'rgba(236, 242, 248, 0.72)';
        ctx.textAlign = 'center';
        ctx.fillText(dismissText, boxX + boxWidth - Math.round(18 * scale) - dismissWidth / 2, boxY + boxHeight - dismissHeight / 2 - Math.round(14 * scale));

        ctx.letterSpacing = '0';

        ctx.restore();
    }
}

try { if (typeof Config !== 'undefined' && Config.DEBUG) console.log('TutorialHints class defined'); } catch (e) { __err('tutorialHints', e); }
