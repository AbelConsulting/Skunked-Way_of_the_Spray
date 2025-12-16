/**
 * Main game entry point
 */

class GameApp {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingProgress = document.getElementById('loading-progress');
        this.loadingText = document.getElementById('loading-text');
        
        this.game = null;
        this.audioManager = null;
        this.lastTime = 0;
        this.lastRenderTime = 0;
        this.running = false;
        this._accumulator = 0;

        this.init();
    }

    adjustCanvasForMobile() {
        const isMobileDevice = this.isMobile || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const dpr = window.devicePixelRatio || 1;
        // Cap devicePixelRatio on mobile to avoid excessive rendering cost
        const maxDPR = isMobileDevice ? 1 : 1.5;
        const finalDpr = Math.min(dpr, maxDPR);

        // Reduce effective resolution more aggressively on small devices
        const scaleReduction = isMobileDevice ? 0.7 : 1.0;
        const pixelScale = finalDpr * scaleReduction;

        // Compute CSS size so the canvas fits within the current viewport
        // Use the smaller scale between width and height to preserve aspect ratio
        // Read safe-area insets exposed as CSS variables (values like '20px')
        const cs = getComputedStyle(document.documentElement);
        const safeTop = parseFloat(cs.getPropertyValue('--safe-top')) || 0;
        const safeBottom = parseFloat(cs.getPropertyValue('--safe-bottom')) || 0;
        const safeLeft = parseFloat(cs.getPropertyValue('--safe-left')) || 0;
        const safeRight = parseFloat(cs.getPropertyValue('--safe-right')) || 0;

        // Available viewport area excluding safe-area insets
        const vw = (window.innerWidth || document.documentElement.clientWidth) - (safeLeft + safeRight);
        const vh = (window.innerHeight || document.documentElement.clientHeight) - (safeTop + safeBottom);
        const cssScale = Math.min(vw / Config.SCREEN_WIDTH, vh / Config.SCREEN_HEIGHT, 1);
        const cssWidth = Math.max(1, Math.floor(Config.SCREEN_WIDTH * cssScale));
        const cssHeight = Math.max(1, Math.floor(Config.SCREEN_HEIGHT * cssScale));

        // Set CSS size so the canvas visually fits the viewport (prevents cutoff)
        // Account for any on-screen touch UI that may occlude the bottom area.
        let overlayH = 0;
        try {
            const tc = document.getElementById('touch-controls');
            if (tc && getComputedStyle(tc).display !== 'none') {
                overlayH = tc.offsetHeight || 0;
            } else if (tc) {
                // If controls are hidden but buttons exist, estimate overlay height
                const btn = tc.querySelector('.touch-btn');
                if (btn && btn.offsetHeight) overlayH = btn.offsetHeight + 32; // button + padding
            }
        } catch (e) {
            overlayH = 0;
        }

        // Subtract overlay height from visible CSS height so logical viewport
        // excludes the area covered by UI controls.
        const effectiveCssHeight = Math.max(1, cssHeight - overlayH);

        // Prevent the overlay estimate from shrinking the viewport excessively
        // on very small mobile screens: cap the overlay height to a fraction
        // of the available CSS height and enforce a minimum visible fraction
        // so field-of-view remains usable on phones.
        const maxOverlayFraction = 0.35; // at most 35% of height
        const cappedOverlayH = Math.min(overlayH, Math.floor(cssHeight * maxOverlayFraction));
        const minViewFraction = 0.60; // at least 60% of cssHeight must remain visible
        const minEffective = Math.floor(cssHeight * minViewFraction);
        const finalEffectiveCssHeight = Math.max(Math.max(1, cssHeight - cappedOverlayH), minEffective);

        // Log adjustments for diagnostics (non-intrusive)
        try { window && window.logTouchControlEvent && window.logTouchControlEvent('adjustCanvas_mobile_viewClamp', { cssHeight, overlayH, cappedOverlayH, finalEffectiveCssHeight }); } catch (e) {}

        // Keep the visual CSS size of the canvas unchanged to avoid
        // interfering with layout/asset code that expects the normal
        // CSS dimensions. Only adjust the logical `viewHeight` we pass
        // into the game so camera/clamping avoids the overlay area.
        this.canvas.style.width = cssWidth + 'px';
        this.canvas.style.height = cssHeight + 'px';

        // Set internal pixel buffer according to CSS size and capped DPR
        this.canvas.width = Math.floor(cssWidth * pixelScale);
        this.canvas.height = Math.floor(cssHeight * pixelScale);

        const ctx = this.canvas.getContext('2d');
        if (ctx) ctx.imageSmoothingEnabled = false;

        // Inform game about the visible logical viewport so camera clamping
        // can be computed correctly when the canvas is scaled down on mobile.
        if (this.game) {
            // Allow mobile to expand the logical horizontal viewport so more
            // of the level is visible without changing the CSS canvas size.
            // Use `Config.MOBILE_VIEW_SCALE` when running on mobile devices.
            const mobileScale = (this.isMobile && (typeof Config !== 'undefined')) ? (Config.MOBILE_VIEW_SCALE || 1.0) : 1.0;
            this.game.viewWidth = Math.max(1, Math.floor(cssWidth * mobileScale));
            this.game.viewHeight = (typeof finalEffectiveCssHeight !== 'undefined') ? finalEffectiveCssHeight : effectiveCssHeight;
            // Ensure camera recenters immediately for mobile UX changes
            try { if (typeof this.game.centerCameraOnPlayer === 'function') this.game.centerCameraOnPlayer(); } catch (e) {}
        }
    }

    // Simple debounce helper used for resize/orientation handlers
    debounce(func, wait = 150) {
        let timeout = null;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    async init() {
        try {
            // Load all assets
            await this.loadAssets();

            // Hide loading screen
            this.loadingScreen.classList.add('hidden');

            // Detect mobile early and apply mobile-friendly settings
            const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            this.isMobile = isMobileDevice;

            // Lower target FPS on mobile to save CPU/battery
            if (isMobileDevice) {
                Config.FPS = Math.min(Config.FPS || 60, 45);
            }

            // Create game instance (pass mobile flag)
            this.game = new Game(this.canvas, this.audioManager, this.isMobile);
            // Expose for diagnostic tests and external tooling
            try { window.game = this.game; window.gameApp = this; } catch (e) { /* ignore in strict contexts */ }

            // Mobile-friendly adjustments (debounced resize)
            this.adjustCanvasForMobile();
            const debouncedAdjust = this.debounce(() => this.adjustCanvasForMobile(), 150);
            window.addEventListener('resize', debouncedAdjust);

            // Create on-screen touch UI if available. Don't instantiate the
            // TouchControls class if there's already a declared `#touch-controls`
            // element (index.html may have inserted a static one to avoid race
            // conditions during load). This prevents duplicate elements and
            // broken event wiring on mobile.
            try {
                if (this.isMobile && window.TouchControls && !document.getElementById('touch-controls')) {
                    this.touchControls = new TouchControls({ enabled: true, sensitivity: Config.TOUCH_UI.sensitivity });
                }

                // Apply sensitivity changes globally when available
                window.addEventListener('touchSensitivityChanged', (e) => {
                    const s = e.detail && e.detail.sensitivity ? e.detail.sensitivity : 1.0;
                    Config.TOUCH_UI.sensitivity = s;
                    // let player code adapt if needed via event
                    window.dispatchEvent(new CustomEvent('globalTouchSensitivity', { detail: { sensitivity: s } }));
                });
            } catch (e) {
                if (typeof Config !== 'undefined' && Config.DEBUG) console.warn('TouchControls init failed', e);
            }

            // Pause the main loop when page hidden to save battery/CPU
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.stop();
                } else {
                    if (!this.running) {
                        this.running = true;
                        this.lastTime = performance.now();
                        this.gameLoop(this.lastTime);
                    }
                }
            });
            // Mark game as ready for UI layers (mobile start, restart, etc.) and notify listeners
            window.gameReady = true;
            window.dispatchEvent(new Event('gameReady'));

            // Start game loop
            this.running = true;
            this.lastTime = performance.now();
            this.gameLoop(this.lastTime);

        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.loadingText.textContent = 'Error loading game. Please refresh.';
            window.gameReady = false;
        }
    }

    async loadAssets() {
        // Update loading text
        this.loadingText.textContent = 'Loading sprites...';

        // Load sprites
        await spriteLoader.loadAllSprites();

        // Update progress
        this.updateLoadingProgress(50);
        this.loadingText.textContent = 'Loading audio...';


        // Load audio (SFX only for now; defer music until gameplay starts)
        this.audioManager = new AudioManager();
        const soundList = [
            ['jump', 'assets/audio/sfx/jump.wav'],
            ['attack1', 'assets/audio/sfx/attack1.wav'],
            ['attack2', 'assets/audio/sfx/attack2.wav'],
            ['attack3', 'assets/audio/sfx/attack3.wav'],
            ['shadow_strike', 'assets/audio/sfx/shadow_strike.wav'],
            ['player_hit', 'assets/audio/sfx/player_hit.wav'],
            ['land', 'assets/audio/sfx/land.wav'],
            ['enemy_hit', 'assets/audio/sfx/enemy_hit.wav'],
            ['enemy_death', 'assets/audio/sfx/enemy_death.wav'],
            ['menu_select', 'assets/audio/sfx/menu_select.wav'],
            ['menu_move', 'assets/audio/sfx/menu_move.wav'],
            ['pause', 'assets/audio/sfx/pause.wav'],
            ['combo', 'assets/audio/sfx/combo.wav'],
            ['game_over', 'assets/audio/sfx/game_over.wav'],
            ['metal_pad', 'assets/audio/sfx/metal_pad.wav']
        ];
        // Defer music loading until game start to reduce initial bandwidth and decoding on mobile
        const musicList = [];

        // Enable audio on first user interaction (required by browsers)
        window.addEventListener('keydown', () => this.audioManager.initialize(), { once: true });
        window.addEventListener('mousedown', () => this.audioManager.initialize(), { once: true });

        await this.audioManager.loadAssets(soundList, musicList);

        // Update progress
        this.updateLoadingProgress(100);
        this.loadingText.textContent = 'Ready!';

        // Small delay to show completion
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    updateLoadingProgress(percent) {
        this.loadingProgress.style.width = `${percent}%`;
    }

    gameLoop(currentTime) {
        if (!this.running) return;

        // Throttle to target FPS to save CPU on mobile
        const step = 1 / Config.FPS;
        const rawDt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Accumulate time and run fixed-step updates. Render once per RAF.
        this._accumulator += rawDt;

        // Prevent spiral of death by capping steps per frame
        const maxSteps = 5;
        let steps = 0;
        while (this._accumulator >= step && steps < maxSteps) {
            if (this.game) this.game.update(step);
            this._accumulator -= step;
            steps++;
        }

        // Render once with the current state. Throttle renders on mobile to
        // reduce CPU/GPU load (keep updates running at fixed-step so
        // gameplay remains deterministic).
        if (this.game) {
            const now = currentTime; // ms
            const renderFps = (this.isMobile) ? Math.min(30, Config.FPS || 30) : (Config.FPS || 60);
            const minRenderDt = 1000 / renderFps; // ms
            if (!this.lastRenderTime || (now - this.lastRenderTime) >= minRenderDt) {
                this.game.render();
                this.lastRenderTime = now;
            }
        }

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    stop() {
        this.running = false;
    }
}

// Start the game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    const gameApp = new GameApp();
    // `gameReady` will be dispatched by GameApp when initialization completes
});
