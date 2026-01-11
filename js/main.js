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

        // Non-essential audio gets loaded after startup to keep the
        // loading screen snappy (especially on mobile).
        this._deferredSoundList = null;

        this.init();
    }

    // Load extra SFX in small chunks after the game starts.
    // This avoids a big upfront fetch/decode burst during the loading screen.
    loadDeferredAudio() {
        try {
            if (!this.audioManager || !this._deferredSoundList || this._deferredSoundList.length === 0) return;
            if (window._fileProtocol && !window._allowFileStart) return;

            const list = this._deferredSoundList.slice();
            this._deferredSoundList = null;

            const chunkSize = 4;
            const runner = async () => {
                for (let i = 0; i < list.length; i += chunkSize) {
                    const chunk = list.slice(i, i + chunkSize);
                    try {
                        await this.audioManager.loadAssets(chunk, []);
                    } catch (e) {
                        // Don't block gameplay on optional sounds
                    }
                    // Yield to the browser between chunks
                    await new Promise(r => setTimeout(r, 0));
                }
            };

            const schedule = (fn) => {
                if (typeof requestIdleCallback === 'function') requestIdleCallback(() => fn(), { timeout: 1500 });
                else setTimeout(fn, 250);
            };

            schedule(runner);
        } catch (e) {
            // no-op
        }
    }

    adjustCanvasForMobile() {
        const isMobileDevice = this.isMobile || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const dpr = window.devicePixelRatio || 1;
        // Cap devicePixelRatio on mobile to avoid excessive rendering cost
        const maxDPR = isMobileDevice ? 1 : 1.5;
        let finalDpr = Math.min(dpr, maxDPR);
        // Respect any forced DPR from the Game instance (e.g., iPad Safari heuristic)
        try {
            if (this.game && this.game._forcedDpr) {
                finalDpr = Math.max(1, Math.min(finalDpr, this.game._forcedDpr));
            }
        } catch (e) {}

        // Reduce effective resolution more aggressively on small devices
        const scaleReduction = isMobileDevice ? (Config.MOBILE_DPR_SCALE_REDUCTION || 0.7) : 1.0;
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
            // Respect configured mobile scale, but clamp it to sane bounds to
            // avoid making the logical viewport too large on tiny phones.
            let mobileScale = (this.isMobile && (typeof Config !== 'undefined')) ? (Config.MOBILE_VIEW_SCALE || 1.0) : 1.0;
            if (typeof Config !== 'undefined') {
                const min = Config.MOBILE_VIEW_SCALE_MIN || 1.0;
                const max = Config.MOBILE_VIEW_SCALE_MAX || Math.max(min, mobileScale);
                mobileScale = Math.max(min, Math.min(max, mobileScale));
            }
            this.game.viewWidth = Math.max(1, Math.floor(cssWidth * mobileScale));
            this.game.viewHeight = (typeof finalEffectiveCssHeight !== 'undefined') ? finalEffectiveCssHeight : effectiveCssHeight;

            // Ensure the level/world is wider than the visible viewport so
            // horizontal camera panning is possible on narrow mobile viewports.
            // If the level is too narrow, increase its width and extend any
            // floor/platforms that span the bottom of the level.
            try {
                if (this.game.level) {
                    const minWorldWidth = (this.game.viewWidth || cssWidth) + 240; // allow room to pan
                    if (this.game.level.width < minWorldWidth) {
                        this.game.level.width = minWorldWidth;
                        for (const p of this.game.level.platforms) {
                            // If platform is the floor or reaches bottom, extend it
                            if (p.y + p.height >= this.game.level.height - 8) {
                                p.width = Math.max(p.width, this.game.level.width - p.x);
                            }
                        }
                        console.log('Adjusted level.width to allow horizontal panning', { levelWidth: this.game.level.width, viewWidth: this.game.viewWidth });
                    }
                }
            } catch (e) {
                console.warn('Failed to adjust level width for mobile panning', e);
            }
            // Re-render static layer if available (platform tiles etc.)
            try {
                if (this.game.level && typeof this.game.level.renderStaticLayer === 'function') {
                    const now = performance.now();
                    this._lastStaticRender = this._lastStaticRender || 0;
                    // Throttle static re-renders to avoid expensive redraws during rapid resize/orientation changes
                    if (now - this._lastStaticRender > 500) {
                        this.game.level.renderStaticLayer(this.game.viewWidth, this.game.viewHeight);
                        this._lastStaticRender = now;
                    }
                }
            } catch (e) {}
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

    // Run a short FPS probe using requestAnimationFrame to determine device capability
    runMobileFpsProbe(force = false) {
        return new Promise((resolve) => {
            try {
                const duration = (typeof Config !== 'undefined' && typeof Config.MOBILE_FPS_PROBE_DURATION === 'number') ? Config.MOBILE_FPS_PROBE_DURATION : 1000;
                const t0 = performance.now();
                let last = t0;
                let frames = 0;
                const samples = [];
                let rafId = null;
                const onFrame = (ts) => {
                    const dt = ts - last;
                    last = ts;
                    frames++;
                    samples.push(dt);
                    if (ts - t0 >= duration) {
                        if (rafId) cancelAnimationFrame(rafId);
                        // compute avg fps
                        const avgDt = samples.reduce((a,b)=>a+b,0)/samples.length;
                        const fps = 1000 / avgDt;
                        // Determine mode
                        const low = (typeof Config !== 'undefined' && typeof Config.MOBILE_FPS_PROBE_LOW === 'number') ? Config.MOBILE_FPS_PROBE_LOW : 22;
                        const mid = (typeof Config !== 'undefined' && typeof Config.MOBILE_FPS_PROBE_MID === 'number') ? Config.MOBILE_FPS_PROBE_MID : 36;
                        let mode = 'high';
                        if (fps < low) mode = 'low';
                        else if (fps < mid) mode = 'mid';

                        try { console.log('FPS probe result', { fps: Math.round(fps), avgDt, frames, samples: samples.length }); } catch (e) {}
                        try { window && window.logTouchControlEvent && window.logTouchControlEvent('mobileFpsProbe', { fps: Math.round(fps), mode }); } catch (e) {}
                        // Apply mode only when forced or when no persisted pref set
                        try {
                            const pm = localStorage.getItem('mobilePerfMode');
                            if (force || !pm) {
                                try { window.setMobilePerformanceMode(mode); } catch (e) {}
                            }
                        } catch (e) {}
                        resolve(mode);
                        return;
                    }
                    rafId = requestAnimationFrame(onFrame);
                };
                rafId = requestAnimationFrame(onFrame);
                // timeout safety
                setTimeout(() => { try { if (rafId) cancelAnimationFrame(rafId); } catch (e) {}; resolve(null); }, duration + 1200);
            } catch (e) { resolve(null); }
        });
    }

    async init() {
        try {
            // Warn if opened via file:// — audio and some assets may fail due to browser restrictions
            if (location && location.protocol === 'file:') {
                try {
                    // Prefer the friendly file-protocol overlay with a "Start Anyway" option
                    const fileOverlay = document.getElementById('file-protocol-overlay');
                    if (fileOverlay) {
                        fileOverlay.style.display = 'block';
                        // Attach handlers for the overlay buttons
                        const closeBtn = document.getElementById('file-overlay-close');
                        if (closeBtn) closeBtn.addEventListener('click', () => { fileOverlay.style.display = 'none'; });
                        const startBtn = document.getElementById('file-overlay-start');
                        if (startBtn) startBtn.addEventListener('click', () => {
                            window._allowFileStart = true;
                            fileOverlay.style.display = 'none';
                            try { console.log('User opted to start anyway on file:// (audio may be disabled)'); } catch (e) {}
                        });
                    } else {
                        // Fallback to showing error-overlay if file-protocol overlay isn't present
                        const overlay = document.getElementById('error-overlay');
                        const content = document.getElementById('error-content');
                        if (overlay && content) {
                            overlay.style.display = 'block';
                            content.textContent = 'Detected file:// protocol. Please serve the project over HTTP (e.g. run `python -m http.server 8000` from the project root and open http://localhost:8000) to avoid CORS and fetch errors.';
                        }
                    }

                    // Set a flag so later asset-loading can gracefully skip audio
                    window._fileProtocol = true;
                    try { console.warn('Running from file:// — audio and some assets may not load. You can click "Start Anyway" to continue in a degraded mode.'); } catch (e) {}
                } catch (e) {}
            }

            // Load all assets
            await this.loadAssets();

            // Hide loading screen
            this.loadingScreen.classList.add('hidden');

            // Detect mobile early and apply mobile-friendly settings
            const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            this.isMobile = isMobileDevice;

            // Hazards are globally disabled in the game; URL-based hazard toggles have been removed.

            // Lower target FPS on mobile to save CPU/battery (configurable)
            if (isMobileDevice) {
                Config.FPS = Math.min(Config.FPS || 60, Config.MOBILE_FPS || 30);
            }

            // Runtime mobile performance presets: 'low' | 'mid' | 'high'
            window.setMobilePerformanceMode = (mode) => {
                try {
                    if (!this.isMobile) {
                        console.log('setMobilePerformanceMode: not mobile, still applying settings');
                    }
                    if (mode === 'low') {
                        Config.MOBILE_FPS = 20;
                        Config.MOBILE_DPR_SCALE_REDUCTION = 0.5;
                        Config.MOBILE_MAX_PARTICLES = 0;
                        Config.MOBILE_MAX_DAMAGE_NUMBERS = 0;
                        Config.BACKGROUND_PARALLAX_MOBILE = 0.08;
                    } else if (mode === 'mid') {
                        Config.MOBILE_FPS = 30;
                        Config.MOBILE_DPR_SCALE_REDUCTION = 0.6;
                        Config.MOBILE_MAX_PARTICLES = 1;
                        Config.MOBILE_MAX_DAMAGE_NUMBERS = 1;
                        Config.BACKGROUND_PARALLAX_MOBILE = 0.2;
                    } else {
                        // high / default
                        Config.MOBILE_FPS = 40;
                        Config.MOBILE_DPR_SCALE_REDUCTION = 0.7;
                        Config.MOBILE_MAX_PARTICLES = 2;
                        Config.MOBILE_MAX_DAMAGE_NUMBERS = 2;
                        Config.BACKGROUND_PARALLAX_MOBILE = 0.3;
                    }
                    // Apply immediate changes
                    if (this.isMobile) {
                        Config.FPS = Math.min(Config.FPS || 60, Config.MOBILE_FPS || 30);
                        try { this.adjustCanvasForMobile(); } catch (e) {}
                    }
                    try { console.log('Mobile performance mode set to', mode, { MOBILE_FPS: Config.MOBILE_FPS, MOBILE_DPR_SCALE_REDUCTION: Config.MOBILE_DPR_SCALE_REDUCTION }); } catch (e) {}
                    try { localStorage.setItem('mobilePerfMode', mode); } catch (e) {}
                    return true;
                } catch (e) { console.warn('setMobilePerformanceMode failed', e); return false; }
            };

            // Apply persisted mobile performance preset if present
            try {
                const pm = localStorage.getItem('mobilePerfMode');
                if (pm && typeof window.setMobilePerformanceMode === 'function') {
                    window.setMobilePerformanceMode(pm);
                }
            } catch (e) {}

            // Create game instance (pass mobile flag)
            this.game = new Game(this.canvas, this.audioManager, this.isMobile);
            // Expose for diagnostic tests and external tooling
            try { window.game = this.game; window.gameApp = this; } catch (e) { /* ignore in strict contexts */ }

            // Load extra SFX after the game is live to smooth startup.
            this.loadDeferredAudio();

            // Create a mobile score badge outside the canvas so score remains visible
            try {
                if (this.isMobile) {
                    let badge = document.getElementById('mobile-score-badge');
                    const container = document.getElementById('game-container') || document.body;
                    if (!badge) {
                        badge = document.createElement('div');
                        badge.id = 'mobile-score-badge';
                        container.appendChild(badge);

                        // Inject compact neon styles for the badge and pulse animation
                        try {
                            const css = `
                                #mobile-score-badge { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index:1200; display:none; pointer-events:none; font-family: sans-serif; }
                                #mobile-score-badge .badge-inner { background: rgba(0,0,0,0.45); padding:6px 12px; border-radius:12px; display:inline-block; box-shadow: 0 0 16px rgba(57,255,20,0.08); }
                                #mobile-score-badge .label { color:#cfe; font-size:12px; display:block; text-align:center; opacity:0.85; }
                                #mobile-score-badge .value { color: #39FF14; font-weight:700; font-size:18px; text-align:center; display:block; text-shadow: 0 0 6px rgba(57,255,20,0.85), 0 0 12px rgba(0,255,255,0.18); }
                                @keyframes score-pop { 0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(57,255,20,0)); } 50% { transform: scale(1.15); filter: drop-shadow(0 0 18px rgba(57,255,20,0.85)); } 100% { transform: scale(1); filter: drop-shadow(0 0 6px rgba(57,255,20,0.35)); } }
                                #mobile-score-badge.pop .badge-inner { animation: score-pop 360ms ease-out; }
                            `;
                            const s = document.createElement('style'); s.setAttribute('data-generated','mobile-score-badge'); s.appendChild(document.createTextNode(css)); document.head.appendChild(s);
                        } catch (e) {}
                    }

                    const updateBadge = (score) => {
                        try {
                            const val = (typeof score === 'number') ? score : (this.game && this.game.score || 0);
                            badge.innerHTML = `<div class="badge-inner"><span class="label">SCORE</span><span class="value">${val}</span></div>`;
                            badge.style.display = 'block';
                            // Pulse animation
                            try { badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop'); setTimeout(()=> badge.classList.remove('pop'), 520); } catch (e) {}
                        } catch (e) {}
                    };

                    window.addEventListener('scoreChange', (ev) => {
                        try { updateBadge(ev && ev.detail && typeof ev.detail.score !== 'undefined' ? ev.detail.score : (this.game && this.game.score)); } catch (e) {}
                    });

                    window.addEventListener('gameStateChange', (ev) => {
                        try {
                            const s = ev && ev.detail && ev.detail.state;
                            if (s === 'PLAYING') badge.style.display = 'block';
                            else if (s === 'MENU') badge.style.display = 'none';
                            else if (s === 'PAUSED') badge.style.display = 'block';
                            else if (s === 'GAME_OVER') badge.style.display = 'block';
                        } catch (e) {}
                    });

                    // Initialize with current game score/state
                    try { updateBadge(this.game && this.game.score || 0); if (this.game && this.game.state === 'PLAYING') badge.style.display = 'block'; } catch (e) {}
                }
            } catch (e) { console.warn('Failed to create mobile score badge', e); }

            // If the Game instance indicated a forced DPR (iPad Safari), apply
            // conservative mobile performance defaults to reduce FPS and DPR
            // pressure. This avoids visible jank on iPad Safari caused by large
            // texture uploads and decoding.
            try {
                if (this.game && this.game._forcedDpr) {
                    // Lower DPR scale reduction so backing store matches forced DPR
                    Config.MOBILE_DPR_SCALE_REDUCTION = Math.min(Config.MOBILE_DPR_SCALE_REDUCTION || 1, (this.game._forcedDpr / (window.devicePixelRatio || 1)) || 0.7);
                    // Prefer a moderate FPS target on iPad Safari
                    Config.MOBILE_FPS = Math.min(Config.MOBILE_FPS || 40, 30);
                    // Apply now if mobile mode already active
                    if (this.isMobile && typeof window.setMobilePerformanceMode === 'function') {
                        try { window.setMobilePerformanceMode('mid'); } catch (e) {}
                    }
                    try { console.log('Applied iPad-Safari conservative DPR/FPS settings', { forcedDpr: this.game._forcedDpr, MOBILE_DPR_SCALE_REDUCTION: Config.MOBILE_DPR_SCALE_REDUCTION, MOBILE_FPS: Config.MOBILE_FPS }); } catch (e) {}
                }
            } catch (e) {}

            // Instantiate LevelEditor (if available) so designers can pick tiles per platform
            try {
                if (window.LevelEditor) {
                    this.levelEditor = new LevelEditor(this.game);
                }
            } catch (e) { console.warn('LevelEditor init failed', e); }

            // Allow overriding mobile parallax via URL or runtime change for quick tuning.
            // URL: ?mobileParallax=0.2  (applies when app initializes)
            const initMobileParallax = (() => {
                try {
                    const params = new URLSearchParams(location.search);
                    const v = params.get('mobileParallax');
                    if (v !== null) {
                        const num = parseFloat(v);
                        if (!Number.isNaN(num)) return num;
                    }
                    const stored = localStorage.getItem('mobileParallax');
                    if (stored !== null) {
                        const snum = parseFloat(stored);
                        if (!Number.isNaN(snum)) return snum;
                    }
                } catch (e) {}
                return null;
            })();
            if (initMobileParallax !== null && this.isMobile) {
                try { Config.BACKGROUND_PARALLAX_MOBILE = initMobileParallax; console.log('Applied mobileParallax override from URL/localStorage', initMobileParallax); } catch (e) {}
            }

            // Optionally apply mobile performance preset from URL: ?mobilePerf=low|mid|high
            try {
                const params = new URLSearchParams(location.search);
                const mp = params.get('mobilePerf');
                if (mp && this.isMobile && typeof window.setMobilePerformanceMode === 'function') {
                    try { window.setMobilePerformanceMode(mp); console.log('Applied mobile performance preset from URL', mp); } catch (e) {}
                }
            } catch (e) {}

            // Auto-detect low-end mobile devices and apply conservative presets
            try {
                const detectLowEndDevice = () => {
                    try {
                        const hw = navigator.hardwareConcurrency || 4;
                        const dm = navigator.deviceMemory || 4;
                        const dpr = window.devicePixelRatio || 1;
                        const sw = Math.min(window.screen.width, window.screen.height) || 0;
                        // Heuristic: low-end if <=2 logical cores or <=2GB RAM or small screen or low DPR
                        if (hw <= 2 || dm <= 2 || sw <= 360 || dpr <= 1) return true;
                    } catch (e) {}
                    return false;
                };
                const pm = localStorage.getItem('mobilePerfMode');
                let autoAppliedLow = false;
                if (this.isMobile && !pm && detectLowEndDevice()) {
                    try { window.setMobilePerformanceMode('low'); console.log('Auto-applied mobilePerf=low based on device heuristics'); autoAppliedLow = true; } catch (e) {}
                }
                // If on mobile and no preset persisted and heuristics didn't auto-apply, run a short FPS probe
                try {
                    const params = new URLSearchParams(location.search);
                    const forceProbe = params.get('forceProbe') === '1';
                    if (this.isMobile && !pm && !autoAppliedLow) {
                        // Delay probe slightly so rendering has stabilized
                        setTimeout(() => {
                            try { this.runMobileFpsProbe(forceProbe).then(mode => { if (mode) console.log('Probe selected mode', mode); }).catch(()=>{}); } catch (e) {}
                        }, 200);
                    }
                } catch (e) {}
            } catch (e) {}

            // Expose helpers to change mobile parallax at runtime and persist choice
            window.setMobileParallax = (val, persist = true) => {
                try {
                    const v = parseFloat(val);
                    if (Number.isNaN(v)) return false;
                    Config.BACKGROUND_PARALLAX_MOBILE = v;
                    if (window.game && window.game.level) window.game.level.backgroundParallax = v;
                    if (persist) localStorage.setItem('mobileParallax', String(v));
                    console.log('Mobile parallax set to', v);
                    return true;
                } catch (e) { console.warn('setMobileParallax failed', e); return false; }
            };

            window.cycleMobileParallax = () => {
                const choices = [0.2, 0.3, 0.4];
                const curr = typeof Config !== 'undefined' ? (Config.BACKGROUND_PARALLAX_MOBILE || 0.3) : 0.3;
                let idx = choices.indexOf(curr);
                idx = (idx + 1) % choices.length;
                window.setMobileParallax(choices[idx], true);
                return choices[idx];
            };

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
                        this.start();
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

            // Show error overlay if available and include a "Start Anyway" button
            try {
                const overlay = document.getElementById('error-overlay');
                const content = document.getElementById('error-content');
                if (overlay && content) {
                    overlay.style.display = 'block';
                    content.textContent = `Failed to initialize game. Error: ${String(error)}\n\nYou can attempt to 'Start Anyway' to bypass asset loading (useful for debugging visuals).`;

                    const startAnyway = document.createElement('button');
                    startAnyway.textContent = 'Start Anyway';
                    startAnyway.style.marginLeft = '8px';
                    startAnyway.style.padding = '8px 12px';
                    startAnyway.style.borderRadius = '6px';
                    startAnyway.addEventListener('click', async () => {
                        try {
                            // Create a Game instance if not present
                            if (!this.game) {
                                this.game = new Game(this.canvas, this.audioManager, this.isMobile);
                                try { window.game = this.game; window.gameApp = this; } catch (e) {}
                            }

                            // Hide overlay and loading screen
                            overlay.style.display = 'none';
                            this.loadingScreen.classList.add('hidden');

                            // Start the game loop if not running
                            if (!this.running) {
                                this.running = true;
                                this.lastTime = performance.now();
                                this.gameLoop(this.lastTime);
                            }

                            // If game has a startGame method, call it
                            if (this.game && typeof this.game.startGame === 'function') {
                                await this.game.startGame();
                            } else {
                                // Fallback: dispatch playing state event
                                window.dispatchEvent(new CustomEvent('gameStateChange', { detail: { state: 'PLAYING' } }));
                            }
                        } catch (e) {
                            console.error('Start Anyway failed', e);
                            alert('Start Anyway failed: ' + e);
                        }
                    });

                    const controls = overlay.querySelector('div');
                    if (controls) controls.appendChild(startAnyway);
                }
            } catch (e) { console.warn('Failed to show start-anyway UI', e); }
        }
    }

    async loadAssets() {
        // Update loading text
        this.loadingText.textContent = 'Loading sprites...';

        // Progress tracking: reflect real asset loads (sprites + initial audio)
        let audioLoaded = 0;
        let audioTotal = 0;
        const computeAndSetProgress = () => {
            const spriteLoaded = (spriteLoader && typeof spriteLoader.loadedCount === 'number') ? spriteLoader.loadedCount : 0;
            const spriteTotal = (spriteLoader && typeof spriteLoader.totalAssets === 'number') ? spriteLoader.totalAssets : 0;
            const total = spriteTotal + audioTotal;
            const loaded = spriteLoaded + audioLoaded;
            const pct = total > 0 ? Math.max(0, Math.min(100, Math.floor((loaded / total) * 100))) : 0;
            this.updateLoadingProgress(pct);
        };

        // Load sprites, while polling SpriteLoader counters to keep the bar moving
        const spritePromise = spriteLoader.loadAllSprites();
        const spritePoll = setInterval(() => {
            try { computeAndSetProgress(); } catch (e) {}
        }, 50);
        await spritePromise;
        clearInterval(spritePoll);
        computeAndSetProgress();

        this.loadingText.textContent = 'Loading audio...';


        // Load audio (SFX only for now; defer music until gameplay starts)
        this.audioManager = new AudioManager();

        // Keep initial load to the “core” sounds.
        // Additional/rare sounds will be loaded in the background.
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
            ['game_over', 'assets/audio/sfx/game_over.wav'],
            ['combo', 'assets/audio/sfx/combo.wav']
        ];

        // Loaded after startup to reduce initial load time.
        this._deferredSoundList = [
            ['metal_pad', 'assets/audio/sfx/metal_pad.wav'],
            ['boss_spawn', 'assets/audio/sfx/boss_spawn.wav'],
            ['boss_defeat', 'assets/audio/sfx/boss_defeat.wav'],
            ['boss_attack', 'assets/audio/sfx/boss_attack.wav'],
            ['boss_hurt', 'assets/audio/sfx/boss_hurt.wav'],
            ['level_complete', 'assets/audio/sfx/level_complete.wav'],
            ['powerup', 'assets/audio/sfx/powerup.wav'],
            ['coin_collect', 'assets/audio/sfx/coin_collect.wav'],
            ['footstep', 'assets/audio/sfx/footstep.wav']
        ];
        // Defer music loading until game start to reduce initial bandwidth and decoding on mobile
        const musicList = [];
        audioTotal = (soundList ? soundList.length : 0) + (musicList ? musicList.length : 0);
        audioLoaded = 0;
        computeAndSetProgress();

        // If running from file://, skip audio loading (browsers often block it) unless user clicked "Start Anyway"
        if (window._fileProtocol && !window._allowFileStart) {
            try { console.warn('File protocol detected: skipping audio asset loading. Click "Start Anyway" to attempt enabling audio.'); } catch (e) {}
            // Treat skipped audio as "done" for progress purposes
            audioLoaded = audioTotal;
            computeAndSetProgress();
        } else {
            // Enable audio on first user interaction (required by browsers)
            window.addEventListener('keydown', () => this.audioManager.initialize(), { once: true });
            window.addEventListener('mousedown', () => this.audioManager.initialize(), { once: true });

            try {
                await this.audioManager.loadAssets(soundList, musicList, (loaded, total) => {
                    audioLoaded = (typeof loaded === 'number') ? loaded : audioLoaded;
                    audioTotal = (typeof total === 'number') ? total : audioTotal;
                    computeAndSetProgress();
                });
            } catch (e) {
                console.warn('Audio loading failed; continuing without audio.', e);
                // Don't stall the progress bar if audio fails
                audioLoaded = audioTotal;
                computeAndSetProgress();
            }
        }

        // Ensure we end at 100%
        this.updateLoadingProgress(100);
        this.loadingText.textContent = 'Ready!';

        // Small delay to show completion
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    updateLoadingProgress(percent) {
        this.loadingProgress.style.width = `${percent}%`;
    }

    stop() {
        this.running = false;
        try {
            if (this.audioManager && typeof this.audioManager.pause === 'function') this.audioManager.pause();
        } catch (e) {}
        try {
            if (this.game && typeof this.game.pause === 'function') this.game.pause();
        } catch (e) {}
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }

    // Alias for backwards compatibility
    resume() {
        this.start();
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
            try {
                // Place any code that might throw here, or remove try if not needed
            } catch (e) {
                console.error('Error during game update:', e);
            }
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
}

// Start the game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    const gameApp = new GameApp();
    // `gameReady` will be dispatched by GameApp when initialization completes
});
