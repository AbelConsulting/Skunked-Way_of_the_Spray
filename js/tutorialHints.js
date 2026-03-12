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
                duration: 8,
                kb:    ['← → to Move  •  SPACE to Jump',
                        'Double-tap SPACE for a double jump!'],
                touch: ['Use ⟸ ⟹ to Move  •  ⤒ to Jump',
                        'Tap Jump twice for a double jump!']
            },
            attack: {
                id: 'attack',
                duration: 7,
                kb:    ['Press X to Attack enemies!',
                        'Chain hits within 2s for combos!'],
                touch: ['Tap 🗡 to Attack enemies!',
                        'Chain hits within 2s for combos!']
            },
            shadow_strike: {
                id: 'shadow_strike',
                duration: 7,
                kb:    ['Press Z for Shadow Strike!',
                        'Dash through attacks — invincible!'],
                touch: ['Tap 💥 for Shadow Strike!',
                        'Dash through attacks — invincible!']
            },
            skunk_shot: {
                id: 'skunk_shot',
                duration: 7,
                kb:    ['Press C to fire Skunk Shot!',
                        'Ranged spray that stuns enemies.'],
                touch: ['Tap 🦨 for Skunk Shot!',
                        'Ranged spray that stuns enemies.']
            },
            golden_idol: {
                id: 'golden_idol',
                duration: 7,
                kb:    ['✦ Golden Idol spotted!',
                        'Collect all 3 per stage for boosts!'],
                touch: ['✦ Golden Idol spotted!',
                        'Collect all 3 per stage for boosts!']
            },
            boss_encounter: {
                id: 'boss_encounter',
                duration: 8,
                kb:    ['⚔ Boss Incoming!',
                        'Attack after they strike.',
                        'At 50% HP they enrage — stay alert!'],
                touch: ['⚔ Boss Incoming!',
                        'Attack after they strike.',
                        'At 50% HP they enrage — stay alert!']
            },
            exit_portal: {
                id: 'exit_portal',
                duration: 6,
                kb:    ['🌀 Exit Portal opened!',
                        'Head right to complete the stage.'],
                touch: ['🌀 Exit Portal opened!',
                        'Head right to complete the stage.']
            },
            objective: {
                id: 'objective',
                duration: 8,
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
        if (this._seen[id]) return;

        // If a hint is already active, queue this one
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
    }

    /** Dismiss the current hint immediately (called on key/tap) */
    dismiss() {
        if (this._active && !this._active.dismissed) {
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

        // Fade in (0-0.7s), hold, fade out (last 1.0s)
        const fadeIn = 0.7;
        const fadeOut = 1.0;
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
        const lineCount = h.lines.length;
        // Scale text for smaller viewports
        const scale = Math.max(0.75, Math.min(1, viewWidth / 600));
        const titleSize = Math.round(17 * scale);
        const bodySize = Math.round(14 * scale);
        const dismissSize = Math.round(11 * scale);
        const lineHeight = Math.round(26 * scale);
        const padding = Math.round(18 * scale);
        const boxHeight = lineCount * lineHeight + padding * 2;
        const boxWidth = Math.min(viewWidth - 30, 560);
        // Position: upper-center, below HUD but not blocking action
        const boxX = (viewWidth - boxWidth) / 2;
        const boxY = Math.round(65 * scale);

        ctx.save();
        ctx.globalAlpha = h.alpha * 0.95;

        // Background pill
        const r = 14;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
        ctx.beginPath();
        ctx.moveTo(boxX + r, boxY);
        ctx.lineTo(boxX + boxWidth - r, boxY);
        ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + r);
        ctx.lineTo(boxX + boxWidth, boxY + boxHeight - r);
        ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - r, boxY + boxHeight);
        ctx.lineTo(boxX + r, boxY + boxHeight);
        ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - r);
        ctx.lineTo(boxX, boxY + r);
        ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
        ctx.closePath();
        ctx.fill();

        // Pulsing cyan border to draw attention
        const pulse = 0.35 + 0.25 * Math.sin(h.timer * 3.5);
        ctx.strokeStyle = `rgba(80, 255, 244, ${pulse.toFixed(2)})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Text
        ctx.globalAlpha = h.alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < lineCount; i++) {
            const y = boxY + padding + lineHeight * i + lineHeight / 2;
            if (i === 0) {
                ctx.font = `bold ${titleSize}px 'Press Start 2P', 'Courier New', monospace`;
                ctx.fillStyle = '#50FFF4';
            } else {
                ctx.font = `${bodySize}px 'Press Start 2P', 'Courier New', monospace`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            }
            ctx.fillText(h.lines[i], viewWidth / 2, y);
        }

        // Dismiss hint — brighter and larger
        ctx.font = `${dismissSize}px 'Press Start 2P', 'Courier New', monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        const dismissText = this.isMobile ? 'TAP TO DISMISS' : 'PRESS ANY KEY TO DISMISS';
        ctx.fillText(dismissText, viewWidth / 2, boxY + boxHeight + Math.round(18 * scale));

        ctx.restore();
    }
}

try { if (typeof Config !== 'undefined' && Config.DEBUG) console.log('TutorialHints class defined'); } catch (e) { __err('tutorialHints', e); }
