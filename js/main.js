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

        // Gamepad state tracking (VR/Oculus controllers)
        this._gamepadKeys = {};
        this._gamepadConfirmLast = false; // rising-edge tracker for start/confirm
        this._gamepadLast = {
            left: { left: false, right: false, trigger: false },
            right: { a: false, b: false, trigger: false }
        };

        // VR controller enable/prime hooks
        this._vrHooksReady = false;
        this._gamepadPrimeTimer = null;
        this._primeGamepadDeadline = 0;
        this._wireVrControllerHooks();

        this.init();
    }

    _wireVrControllerHooks() {
        if (this._vrHooksReady) return;
        this._vrHooksReady = true;

        const prime = (reason) => {
            try {
                if (typeof window !== 'undefined' && window._vrControllersEnabled === true) {
                    this._primeGamepadInput(reason);
                }
            } catch (e) { __err('main', e); }
        };

        try {
            window.setVrControllersEnabled = (enabled) => {
                const isOn = !!enabled;
                try { window._vrControllersEnabled = isOn; } catch (e) { __err('main', e); }
                try { localStorage.setItem('vrControllers', isOn ? '1' : '0'); } catch (e) { __err('main', e); }
                if (isOn) prime('enable');
                else this._clearGamepadKeys();
                // Reset debug flag so we can see the state change in console
                try { this._vrDebugOnce = null; } catch (e) { __err('main', e); }
                try {
                    window.dispatchEvent(new CustomEvent('vrControllersToggle', { detail: { enabled: isOn } }));
                } catch (e) { __err('main', e); }
                return isOn;
            };
            window.primeVrControllers = () => prime('manual');
        } catch (e) { __err('main', e); }

        try {
            window.addEventListener('gamepadconnected', (e) => {
                prime('gamepadconnected');
                // Auto-enable when an Oculus/Quest controller connects
                try {
                    const gp = e.gamepad;
                    if (gp && gp.id && this._isOculusGamepad(gp.id)) {
                        if (!window._vrControllersEnabled) {
                            console.log('[VR] Oculus/Quest controller connected – auto-enabling:', gp.id);
                            window._vrControllersEnabled = true;
                            try { localStorage.setItem('vrControllers', '1'); } catch (e) { __err('main', e); }
                            this._disableTouchControlsForVr();
                        }
                    }
                } catch (ex) { __err('main', ex); }
            });
            window.addEventListener('gamepaddisconnected', () => {
                // Release any stuck keys when a controller disconnects
                this._clearGamepadKeys();
            });
        } catch (e) { __err('main', e); }

        // On Quest browser, DON'T auto-enable gamepad mode eagerly.
        // In 2D browsing mode the controllers act as laser-pointers and
        // are NOT exposed through navigator.getGamepads().  Enabling VR
        // mode prematurely causes the touch-control UI to be hidden,
        // leaving the player with no way to interact.
        // Instead we flag the Quest browser so we can try the WebXR
        // gamepad bridge on first user gesture.
        try {
            if (this._isQuestBrowser()) {
                console.log('[VR] Meta Quest browser detected – deferring controller mode until gamepads confirmed');
                window._questBrowserDetected = true;
                // Don't set _vrControllersEnabled here
                // Don't disable touch controls
                // Attempt the WebXR gamepad bridge after a user gesture
                this._tryWebXRGamepadBridge();
            }
        } catch (e) { __err('main', e); }
    }

    /** Detect Meta Quest / Oculus browser from user agent */
    _isQuestBrowser() {
        try {
            const ua = navigator.userAgent || '';
            return /OculusBrowser|Quest/i.test(ua);
        } catch (e) { return false; }
    }

    /** Check if a gamepad ID string belongs to an Oculus/Meta controller */
    _isOculusGamepad(id) {
        if (!id) return false;
        const lower = id.toLowerCase();
        return lower.includes('oculus') || lower.includes('meta') || lower.includes('quest');
    }

    /** Disable touch controls when VR controllers are active */
    _disableTouchControlsForVr() {
        // Safety: only disable touch controls if we have CONFIRMED gamepad
        // input (i.e., at least one non-null gamepad in navigator.getGamepads).
        // On Quest browser in 2D mode the Gamepad API returns nothing useful
        // so we must keep the touch UI for the laser pointer.
        try {
            const pads = (navigator.getGamepads && navigator.getGamepads()) ? Array.from(navigator.getGamepads()) : [];
            const hasRealPad = pads.some(p => !!p);
            if (!hasRealPad) {
                console.log('[VR] Skipping touch-control disable – no gamepad in navigator.getGamepads()');
                return;
            }
        } catch (e) { __err('main', e); }

        try { window._vrTouchControlsDisabled = true; } catch (e) { __err('main', e); }
        try {
            const tc = document.getElementById('touch-controls');
            if (tc) {
                try { window._forceTouchControls = false; } catch (e) { __err('main', e); }
                try { window._touchControlsLockUntil = 0; } catch (e) { __err('main', e); }
                try { window._touchControlsVisibilityCount = 0; } catch (e) { __err('main', e); }
                tc.classList.remove('visible');
                tc.style.pointerEvents = 'none';
                tc.style.display = 'none';
            }
        } catch (e) { __err('main', e); }
    }

    // ── WebXR Gamepad Bridge ──────────────────────────────────────
    // On Quest browser in 2D mode the standard Gamepad API does NOT
    // expose the VR controllers.  We can get button / axis access by
    // requesting an 'inline' (or 'immersive-ar' dom-overlay) XR session.
    // This bridge polls XRInputSource.gamepad each frame and converts
    // it to the same synthetic key events the normal gamepad path uses.
    _tryWebXRGamepadBridge() {
        if (this._xrBridgeAttempted) return;
        this._xrBridgeAttempted = true;

        if (typeof navigator === 'undefined' || !navigator.xr) {
            console.log('[VR-XR] WebXR not available');
            return;
        }

        // We'll attempt to start an inline session once the user makes a
        // gesture (click / pointerdown anywhere).  Inline sessions don't
        // require user activation on all browsers, but it's safest.
        const attemptSession = async () => {
            try {
                // Try 'inline' first (no rendering change required)
                const supported = await navigator.xr.isSessionSupported('inline').catch(() => false);
                if (!supported) {
                    console.log('[VR-XR] inline session not supported');
                    return;
                }
                const session = await navigator.xr.requestSession('inline');
                console.log('[VR-XR] Inline XR session started – polling input sources');
                this._xrSession = session;

                session.addEventListener('end', () => {
                    console.log('[VR-XR] XR session ended');
                    this._xrSession = null;
                });

                // Poll input sources inside the existing game loop
                // (see _handleGamepadInput which now also calls _pollXRInputSources)
            } catch (e) {
                console.log('[VR-XR] Failed to start inline session:', String(e).slice(0, 200));
            }
        };

        // Fire on first user gesture
        const onGesture = () => {
            window.removeEventListener('click', onGesture, true);
            window.removeEventListener('pointerdown', onGesture, true);
            window.removeEventListener('touchstart', onGesture, true);
            attemptSession();
        };
        window.addEventListener('click', onGesture, true);
        window.addEventListener('pointerdown', onGesture, true);
        window.addEventListener('touchstart', onGesture, true);
    }

    /** Poll XRInputSource gamepads when an inline XR session is active */
    _pollXRInputSources() {
        if (!this._xrSession) return false;
        try {
            const sources = this._xrSession.inputSources;
            if (!sources || sources.length === 0) return false;

            let anyButton = false;
            for (const src of sources) {
                if (!src.gamepad) continue;
                const gp = src.gamepad;
                const hand = (src.handedness || '').toLowerCase();

                // We found a real gamepad through WebXR!
                if (!window._vrControllersEnabled) {
                    console.log('[VR-XR] Controller found via WebXR – enabling VR mode, hand:', hand);
                    window._vrControllersEnabled = true;
                    try { localStorage.setItem('vrControllers', '1'); } catch (e) { __err('main', e); }
                    this._disableTouchControlsForVr();
                }

                // Process the gamepad buttons/axes using the same logic
                // as the standard gamepad path.
                const isXr = (gp.mapping === 'xr-standard' || gp.mapping === '');

                if (hand === 'left' || (!hand && sources.length === 1)) {
                    const axisX = (gp.axes && gp.axes.length > 2) ? gp.axes[2] : (gp.axes ? gp.axes[0] : 0);
                    this._setKeyState('ArrowLeft', axisX < -0.25);
                    this._setKeyState('ArrowRight', axisX > 0.25);
                    // Trigger = skunk shot
                    const trigger = this._getButtonPressed(gp, 0);
                    this._setKeyState('c', trigger);
                }
                if (hand === 'right' || (!hand && sources.length === 1)) {
                    // A / primary button
                    const aBtn = isXr ? this._getButtonPressed(gp, 4) || this._getButtonPressed(gp, 3) : this._getButtonPressed(gp, 0);
                    // B / secondary
                    const bBtn = isXr ? this._getButtonPressed(gp, 5) || this._getButtonPressed(gp, 2) : this._getButtonPressed(gp, 1);
                    // Trigger
                    const trig = this._getButtonPressed(gp, 0);
                    this._setKeyState(' ', aBtn);
                    this._setKeyState('x', trig);
                    this._setKeyState('z', bBtn);
                    if (aBtn || bBtn || trig) anyButton = true;
                }
            }

            // Rising-edge confirm to start/restart game (same logic as
            // standard gamepad path)
            const xrConfirmPrev = !!this._xrConfirmLast;
            this._xrConfirmLast = anyButton;
            if (anyButton && !xrConfirmPrev) {
                try {
                    if (this.game) {
                        const st = this.game.state;
                        if (st === 'MENU' || st === 'VICTORY') {
                            try { this.game.audioManager && this.game.audioManager.playSound && this.game.audioManager.playSound('ui_confirm'); } catch (e) { __err('main', e); }
                            this.game.startGame(0);
                            try { this.game.dispatchGameStateChange && this.game.dispatchGameStateChange(); } catch (e) { __err('main', e); }
                        } else if (st === 'GAME_OVER') {
                            if (typeof this.game._isGameOverLocked !== 'function' || !this.game._isGameOverLocked()) {
                                try { this.game.audioManager && this.game.audioManager.playSound && this.game.audioManager.playSound('ui_confirm'); } catch (e) { __err('main', e); }
                                this.game.startGame(0);
                                try { this.game.dispatchGameStateChange && this.game.dispatchGameStateChange(); } catch (e) { __err('main', e); }
                            }
                        }
                    }
                } catch (e) { __err('main', e); }
            }

            return anyButton;
        } catch (e) {
            return false;
        }
    }

    _primeGamepadInput(reason) {
        if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
        try {
            const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            this._primeGamepadDeadline = now + 3000;
            if (this._gamepadPrimeTimer) {
                clearInterval(this._gamepadPrimeTimer);
                this._gamepadPrimeTimer = null;
            }

            const tick = () => {
                const t = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                const pads = (navigator.getGamepads && navigator.getGamepads()) ? Array.from(navigator.getGamepads()) : [];
                const anyPad = pads.some(p => !!p);
                if (anyPad) {
                    try { window._vrControllersDetected = true; } catch (e) { __err('main', e); }
                    if (this._gamepadPrimeTimer) {
                        clearInterval(this._gamepadPrimeTimer);
                        this._gamepadPrimeTimer = null;
                    }
                    return;
                }
                if (t > this._primeGamepadDeadline) {
                    if (this._gamepadPrimeTimer) {
                        clearInterval(this._gamepadPrimeTimer);
                        this._gamepadPrimeTimer = null;
                    }
                }
            };

            tick();
            this._gamepadPrimeTimer = setInterval(tick, 250);
        } catch (e) {
            if (this._gamepadPrimeTimer) {
                clearInterval(this._gamepadPrimeTimer);
                this._gamepadPrimeTimer = null;
            }
        }
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
        const isMobileDevice = (() => {
            if (this.isMobile) return true;
            const ua = navigator.userAgent;
            if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
            // Modern iPad detection
            if (/Macintosh/i.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1) return true;
            if (navigator.maxTouchPoints > 1 && window.screen.width < 1366) return true;
            return false;
        })();
        const dpr = window.devicePixelRatio || 1;
        // Cap devicePixelRatio on mobile to avoid excessive rendering cost
        const maxDPR = isMobileDevice ? 1 : 1.5;
        let finalDpr = Math.min(dpr, maxDPR);
        // Respect any forced DPR from the Game instance (e.g., iPad Safari heuristic)
        try {
            if (this.game && this.game._forcedDpr) {
                finalDpr = Math.max(1, Math.min(finalDpr, this.game._forcedDpr));
            }
        } catch (e) { __err('main', e); }

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
        try { window && window.logTouchControlEvent && window.logTouchControlEvent('adjustCanvas_mobile_viewClamp', { cssHeight, overlayH, cappedOverlayH, finalEffectiveCssHeight }); } catch (e) { __err('main', e); }

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
            } catch (e) { __err('main', e); }
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

                        try { console.log('FPS probe result', { fps: Math.round(fps), avgDt, frames, samples: samples.length }); } catch (e) { __err('main', e); }
                        try { window && window.logTouchControlEvent && window.logTouchControlEvent('mobileFpsProbe', { fps: Math.round(fps), mode }); } catch (e) { __err('main', e); }
                        // Apply mode only when forced or when no persisted pref set
                        try {
                            const pm = localStorage.getItem('mobilePerfMode');
                            if (force || !pm) {
                                try { window.setMobilePerformanceMode(mode); } catch (e) { __err('main', e); }
                            }
                        } catch (e) { __err('main', e); }
                        resolve(mode);
                        return;
                    }
                    rafId = requestAnimationFrame(onFrame);
                };
                rafId = requestAnimationFrame(onFrame);
                // timeout safety
                setTimeout(() => { try { if (rafId) cancelAnimationFrame(rafId); } catch (e) { __err('main', e); }; resolve(null); }, duration + 1200);
            } catch (e) { resolve(null); }
        });
    }

    _sendKeyEvent(key, type) {
        try {
            if (typeof window.triggerKeyEvent === 'function') {
                window.triggerKeyEvent(key, type);
                return;
            }
        } catch (e) { __err('main', e); }
        try {
            const event = new KeyboardEvent(type, { key, bubbles: true, cancelable: true });
            window.dispatchEvent(event);
        } catch (e) { __err('main', e); }
    }

    _setKeyState(key, isDown) {
        const k = String(key || '');
        const prev = !!this._gamepadKeys[k];
        if (prev === isDown) return;
        this._gamepadKeys[k] = isDown;
        this._sendKeyEvent(k, isDown ? 'keydown' : 'keyup');
    }

    _clearGamepadKeys() {
        try {
            const keys = Object.keys(this._gamepadKeys || {});
            for (const k of keys) {
                if (this._gamepadKeys[k]) {
                    this._gamepadKeys[k] = false;
                    this._sendKeyEvent(k, 'keyup');
                }
            }
        } catch (e) { __err('main', e); }
    }

    _getButtonPressed(gamepad, index) {
        if (!gamepad || !gamepad.buttons || !gamepad.buttons[index]) return false;
        const btn = gamepad.buttons[index];
        return !!(btn && (btn.pressed || btn.value > 0.5));
    }

    _getAxisX(gamepad) {
        if (!gamepad || !gamepad.axes || gamepad.axes.length === 0) return 0;
        const a0 = typeof gamepad.axes[0] === 'number' ? gamepad.axes[0] : 0;
        const a2 = typeof gamepad.axes[2] === 'number' ? gamepad.axes[2] : 0;
        // Prefer axis[2] when it has stronger signal (common for XR standard mapping)
        if (Math.abs(a2) > Math.abs(a0) + 0.05) return a2;
        return a0;
    }

    _pickGamepads() {
        const pads = (navigator.getGamepads && navigator.getGamepads()) ? Array.from(navigator.getGamepads()) : [];
        let leftPad = null;
        let rightPad = null;

        for (const gp of pads) {
            if (!gp) continue;
            const hand = (gp.hand || gp.handedness || '').toLowerCase();
            if (hand === 'left') leftPad = gp;
            if (hand === 'right') rightPad = gp;
        }

        if (!leftPad || !rightPad) {
            for (const gp of pads) {
                if (!gp || !gp.id) continue;
                const id = gp.id.toLowerCase();
                if (!leftPad && id.includes('left')) leftPad = gp;
                if (!rightPad && id.includes('right')) rightPad = gp;
            }
        }

        // Fallback: if still missing, use first two gamepads in order
        if (!leftPad && pads[0]) leftPad = pads[0];
        if (!rightPad && pads[1]) rightPad = pads[1];

        return { leftPad, rightPad };
    }

    _handleGamepadInput() {
        if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
        const pads = (navigator.getGamepads && navigator.getGamepads()) ? Array.from(navigator.getGamepads()) : [];
        const hasXboxPad = pads.some((gp) => {
            if (!gp || !gp.id) return false;
            const id = gp.id.toLowerCase();
            return id.includes('xbox') || id.includes('xinput');
        });

        // Check for Oculus/Meta Quest controllers by gamepad ID
        const hasOculusPad = pads.some((gp) => gp && gp.id && this._isOculusGamepad(gp.id));
        
        // Check if VR controllers are explicitly enabled or disabled
        let vrEnabled = false;
        let vrExplicitlySet = false;
        try {
            if (typeof window !== 'undefined') {
                if (window._vrControllersEnabled === true) {
                    vrEnabled = true;
                    vrExplicitlySet = true;
                } else if (window._vrControllersEnabled === false) {
                    vrEnabled = false;
                    vrExplicitlySet = true;
                } else if (typeof localStorage !== 'undefined') {
                    const stored = localStorage.getItem('vrControllers');
                    if (stored === '1') {
                        vrEnabled = true;
                        vrExplicitlySet = true;
                    } else if (stored === '0') {
                        vrEnabled = false;
                        vrExplicitlySet = true;
                    }
                }
            }
        } catch (e) { __err('main', e); }
        
        // If VR was explicitly disabled, don't process gamepad input at all
        if (vrExplicitlySet && !vrEnabled) {
            try { if (this._vrDebugOnce !== 'disabled') { console.log('[VR] Controllers explicitly disabled - ignoring gamepad input'); this._vrDebugOnce = 'disabled'; } } catch (e) { __err('main', e); }
            return;
        }
        
        // Check if we have any gamepads connected
        const { leftPad, rightPad } = this._pickGamepads();
        if (!leftPad && !rightPad) {
            return;
        }
        
        // Auto-enable if we detect any recognized controller type
        if (!vrExplicitlySet) {
            const hasVrController = !!(leftPad && (leftPad.mapping === 'xr-standard' || leftPad.hand)) ||
                                   !!(rightPad && (rightPad.mapping === 'xr-standard' || rightPad.hand));
            const isQuestBrowser = this._isQuestBrowser();
            if (hasVrController || hasXboxPad || hasOculusPad || isQuestBrowser) {
                try {
                    vrEnabled = true;
                    window._vrControllersEnabled = true;
                    if (this._vrDebugOnce !== 'auto-enabled') {
                        console.log('[VR] Auto-enabled controller support - VR:', hasVrController, 'Xbox:', hasXboxPad, 'Oculus:', hasOculusPad, 'Quest browser:', isQuestBrowser);
                        this._vrDebugOnce = 'auto-enabled';
                    }
                    // Auto-disable touch controls when VR controllers take over
                    this._disableTouchControlsForVr();
                } catch (e) { __err('main', e); }
            } else {
                return;
            }
        }
        
        // Proceed with processing gamepad input
        try { 
            if (this._vrDebugOnce !== 'enabled' && this._vrDebugOnce !== 'auto-enabled') { 
                console.log('[VR] Processing gamepad input - vrEnabled:', vrEnabled, 'hasXboxPad:', hasXboxPad, 'hasOculusPad:', hasOculusPad); 
                this._vrDebugOnce = 'enabled'; 
            } 
        } catch (e) { __err('main', e); }

        const movePad = leftPad || rightPad;
        const actionPad = rightPad || leftPad;
        const leftIsXr = !!(leftPad && leftPad.mapping === 'xr-standard');
        const rightIsXr = !!(actionPad && actionPad.mapping === 'xr-standard');
        const isStandard = !!(actionPad && actionPad.mapping === 'standard');

        // Left controller thumbstick: move left/right
        const axisX = this._getAxisX(movePad);
        const leftDown = axisX < -0.25;
        const rightDown = axisX > 0.25;
        this._setKeyState('ArrowLeft', leftDown);
        this._setKeyState('ArrowRight', rightDown);

        // Left trigger: skunk shot (KeyC)
        const leftTrigger = leftIsXr
            ? (this._getButtonPressed(leftPad, 0) || this._getButtonPressed(leftPad, 1))
            : (this._getButtonPressed(leftPad, 6) || this._getButtonPressed(leftPad, 4));
        
        // Left bumper: pause (Escape)
        // For VR: grip button on left controller
        // For Xbox: left bumper (button 4)
        const leftBumper = leftIsXr
            ? this._getButtonPressed(leftPad, 1)
            : this._getButtonPressed(leftPad, 4);

        // Right controller buttons
        const aPressed = rightIsXr
            ? this._getButtonPressed(actionPad, 3)
            : this._getButtonPressed(actionPad, 0);
        const bPressed = rightIsXr
            ? this._getButtonPressed(actionPad, 2)
            : this._getButtonPressed(actionPad, 1);
        const rightTrigger = rightIsXr
            ? this._getButtonPressed(actionPad, 0)
            : (this._getButtonPressed(actionPad, 7) || this._getButtonPressed(actionPad, 5));

        // Xbox (standard mapping) extra buttons
        const xPressed = isStandard ? this._getButtonPressed(actionPad, 2) : false;
        const yPressed = isStandard ? this._getButtonPressed(actionPad, 3) : false;
        
        // Right grip/shoulder button: skunk shot (KeyC)
        // For VR: grip button (button 1 on right controller)
        // For Xbox: right bumper (button 5)
        const rightGrip = rightIsXr
            ? this._getButtonPressed(actionPad, 1)
            : this._getButtonPressed(actionPad, 5);

        // A: jump (Space)
        this._setKeyState(' ', aPressed);
        // Right trigger + X button: regular attack (KeyX)
        this._setKeyState('x', rightTrigger || xPressed);
        // Left trigger + right bumper: skunk shot (KeyC)
        this._setKeyState('c', leftTrigger || rightGrip);
        // B button + Y: special attack (KeyZ)
        const specialPressed = bPressed || (isStandard && yPressed);
        this._setKeyState('z', specialPressed);
        // Left bumper: pause (Escape)
        this._setKeyState('Escape', leftBumper);

        // ── Gamepad-driven game start / Enter ──────────────────────────
        // Any face button or trigger can start the game from non-playing
        // states.  We track an aggregate "confirm" flag and detect the
        // rising edge so the action fires exactly once per press.
        const confirmNow = aPressed || bPressed || rightTrigger || xPressed || yPressed;
        const confirmPrev = !!this._gamepadConfirmLast;
        this._gamepadConfirmLast = confirmNow;

        if (confirmNow && !confirmPrev) {
            // Send a synthetic Enter keydown so any UI listener that
            // relies on Enter (high-score entry, overlays, etc.) works.
            this._sendKeyEvent('Enter', 'keydown');

            // Directly start / restart the game if we are in a startable
            // state.  This avoids relying on the keyboard handler path
            // which may not fire on the Oculus in-browser gamepad API.
            try {
                if (this.game) {
                    const st = this.game.state;
                    if (st === 'MENU' || st === 'VICTORY') {
                        try { this.game.audioManager && this.game.audioManager.playSound && this.game.audioManager.playSound('ui_confirm'); } catch (e) { __err('main', e); }
                        this.game.startGame(0);
                        try { this.game.dispatchGameStateChange && this.game.dispatchGameStateChange(); } catch (e) { __err('main', e); }
                        try { this.game.dispatchScoreChange && this.game.dispatchScoreChange(); } catch (e) { __err('main', e); }
                    } else if (st === 'GAME_OVER') {
                        if (typeof this.game._isGameOverLocked !== 'function' || !this.game._isGameOverLocked()) {
                            try { this.game.audioManager && this.game.audioManager.playSound && this.game.audioManager.playSound('ui_confirm'); } catch (e) { __err('main', e); }
                            this.game.startGame(0);
                            try { this.game.dispatchGameStateChange && this.game.dispatchGameStateChange(); } catch (e) { __err('main', e); }
                            try { this.game.dispatchScoreChange && this.game.dispatchScoreChange(); } catch (e) { __err('main', e); }
                        }
                    }
                }
            } catch (e) {
                try { console.warn('[Gamepad] startGame from controller failed', e); } catch (ex) { __err('main', ex); }
            }
        }
        // Release the synthetic Enter on falling edge
        if (!confirmNow && confirmPrev) {
            this._sendKeyEvent('Enter', 'keyup');
        }
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
                            try { console.log('User opted to start anyway on file:// (audio may be disabled)'); } catch (e) { __err('main', e); }
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
                    try { console.warn('Running from file:// — audio and some assets may not load. You can click "Start Anyway" to continue in a degraded mode.'); } catch (e) { __err('main', e); }
                } catch (e) { __err('main', e); }
            }

            // Load all assets
            await this.loadAssets();

            // Hide loading screen
            this.loadingScreen.classList.add('hidden');

            // Detect mobile early and apply mobile-friendly settings
            // Enhanced detection for modern iPads (iPadOS 13+ reports as Macintosh)
            const isMobileDevice = (() => {
                const ua = navigator.userAgent;
                // Standard mobile detection
                if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
                // Modern iPad detection: Macintosh + touch support
                if (/Macintosh/i.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1) return true;
                // Additional check: touch-enabled device with small/medium screen
                if (navigator.maxTouchPoints > 1 && window.screen.width < 1366) return true;
                return false;
            })();
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
                        if (typeof Config !== 'undefined' && Config.DEBUG) console.log('setMobilePerformanceMode: not mobile, still applying settings');
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
                        try { this.adjustCanvasForMobile(); } catch (e) { __err('main', e); }
                    }
                    try { if (typeof Config !== 'undefined' && Config.DEBUG) console.log('Mobile performance mode set to', mode, { MOBILE_FPS: Config.MOBILE_FPS, MOBILE_DPR_SCALE_REDUCTION: Config.MOBILE_DPR_SCALE_REDUCTION }); } catch (e) { __err('main', e); }
                    try { localStorage.setItem('mobilePerfMode', mode); } catch (e) { __err('main', e); }
                    return true;
                } catch (e) { console.warn('setMobilePerformanceMode failed', e); return false; }
            };

            // Apply persisted mobile performance preset if present
            try {
                const pm = localStorage.getItem('mobilePerfMode');
                if (pm && typeof window.setMobilePerformanceMode === 'function') {
                    window.setMobilePerformanceMode(pm);
                }
            } catch (e) { __err('main', e); }

            // Create game instance (pass mobile flag)
            this.game = new Game(this.canvas, this.audioManager, this.isMobile);
            // Expose for diagnostic tests and external tooling
            try { window.game = this.game; window.gameApp = this; } catch (e) { /* ignore in strict contexts */ }

            // Defensive: mark game ready once the Game instance exists so
            // automated tests don't hang if later optional steps fail.
            try {
                if (typeof window.gameReady === 'undefined') window.gameReady = true;
            } catch (e) { __err('main', e); }

            // Load extra SFX after the game is live to smooth startup.
            this.loadDeferredAudio();

            // --- Wire up Volume Sliders in Pause Menu ---
            try {
                const sfxSlider = document.getElementById('sfx-volume');
                const musicSlider = document.getElementById('music-volume');
                const sfxValSpan = document.getElementById('sfx-volume-value');
                const musicValSpan = document.getElementById('music-volume-value');
                const am = this.audioManager;

                // Restore persisted volume preferences
                const savedSfx = localStorage.getItem('sfxVolume');
                const savedMusic = localStorage.getItem('musicVolume');
                if (savedSfx !== null) {
                    const v = parseInt(savedSfx, 10);
                    if (!isNaN(v)) {
                        if (sfxSlider) sfxSlider.value = v;
                        if (sfxValSpan) sfxValSpan.textContent = v + '%';
                        am.setSoundVolume && am.setSoundVolume(v / 100);
                    }
                }
                if (savedMusic !== null) {
                    const v = parseInt(savedMusic, 10);
                    if (!isNaN(v)) {
                        if (musicSlider) musicSlider.value = v;
                        if (musicValSpan) musicValSpan.textContent = v + '%';
                        am.setMusicVolume && am.setMusicVolume(v / 100);
                    }
                }

                if (sfxSlider) {
                    sfxSlider.addEventListener('input', (e) => {
                        const val = parseInt(e.target.value, 10);
                        if (sfxValSpan) sfxValSpan.textContent = val + '%';
                        am.setSoundVolume && am.setSoundVolume(val / 100);
                        localStorage.setItem('sfxVolume', val);
                    });
                }
                if (musicSlider) {
                    musicSlider.addEventListener('input', (e) => {
                        const val = parseInt(e.target.value, 10);
                        if (musicValSpan) musicValSpan.textContent = val + '%';
                        am.setMusicVolume && am.setMusicVolume(val / 100);
                        // Also adjust ambient volume to match music volume
                        am.setAmbientVolume && am.setAmbientVolume(val / 100 * 0.20);
                        localStorage.setItem('musicVolume', val);
                    });
                }
            } catch (e) { console.warn('Volume slider wiring failed:', e); }

            // --- Wire up UI Hover Sounds on Menu Buttons ---
            try {
                const hoverButtons = document.querySelectorAll('.menu-btn, #pause-overlay button, #pause-overlay .menu-btn');
                const am = this.audioManager;
                hoverButtons.forEach(btn => {
                    btn.addEventListener('mouseenter', () => {
                        am.playSound && am.playSound('ui_hover', 0.4);
                    });
                });
            } catch (e) { __err('main', e); }

            // --- Start Menu Music ---
            try {
                if (this.game && this.game.playMenuMusic) {
                    this.game.playMenuMusic();
                }
            } catch (e) { console.warn('Menu music failed:', e); }

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
                        try { window.setMobilePerformanceMode('mid'); } catch (e) { __err('main', e); }
                    }
                    try { console.log('Applied iPad-Safari conservative DPR/FPS settings', { forcedDpr: this.game._forcedDpr, MOBILE_DPR_SCALE_REDUCTION: Config.MOBILE_DPR_SCALE_REDUCTION, MOBILE_FPS: Config.MOBILE_FPS }); } catch (e) { __err('main', e); }
                }
            } catch (e) { __err('main', e); }

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
                } catch (e) { __err('main', e); }
                return null;
            })();
            if (initMobileParallax !== null && this.isMobile) {
                try { Config.BACKGROUND_PARALLAX_MOBILE = initMobileParallax; console.log('Applied mobileParallax override from URL/localStorage', initMobileParallax); } catch (e) { __err('main', e); }
            }

            // Optionally apply mobile performance preset from URL: ?mobilePerf=low|mid|high
            try {
                const params = new URLSearchParams(location.search);
                const mp = params.get('mobilePerf');
                if (mp && this.isMobile && typeof window.setMobilePerformanceMode === 'function') {
                    try { window.setMobilePerformanceMode(mp); console.log('Applied mobile performance preset from URL', mp); } catch (e) { __err('main', e); }
                }
            } catch (e) { __err('main', e); }

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
                    } catch (e) { __err('main', e); }
                    return false;
                };
                const pm = localStorage.getItem('mobilePerfMode');
                let autoAppliedLow = false;
                if (this.isMobile && !pm && detectLowEndDevice()) {
                    try { window.setMobilePerformanceMode('low'); console.log('Auto-applied mobilePerf=low based on device heuristics'); autoAppliedLow = true; } catch (e) { __err('main', e); }
                }
                // If on mobile and no preset persisted and heuristics didn't auto-apply, run a short FPS probe
                try {
                    const params = new URLSearchParams(location.search);
                    const forceProbe = params.get('forceProbe') === '1';
                    if (this.isMobile && !pm && !autoAppliedLow) {
                        // Delay probe slightly so rendering has stabilized
                        setTimeout(() => {
                            try { this.runMobileFpsProbe(forceProbe).then(mode => { if (mode) console.log('Probe selected mode', mode); }).catch((e)=>{ __err('main', e); }); } catch (e) { __err('main', e); }
                        }, 200);
                    }
                } catch (e) { __err('main', e); }
            } catch (e) { __err('main', e); }

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
                                try { window.game = this.game; window.gameApp = this; } catch (e) { __err('main', e); }
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
            try { computeAndSetProgress(); } catch (e) { __err('main', e); }
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
            ['shadow_strike_hit', 'assets/audio/sfx/shadow_strike_hit.wav'],
            ['player_hit', 'assets/audio/sfx/player_hit.wav'],
            ['player_death', 'assets/audio/sfx/player_death.wav'],
            ['land', 'assets/audio/sfx/land.wav'],
            ['enemy_hit', 'assets/audio/sfx/enemy_hit.wav'],
            ['enemy_death', 'assets/audio/sfx/enemy_death.wav'],
            ['menu_select', 'assets/audio/sfx/menu_select.wav'],
            ['menu_move', 'assets/audio/sfx/menu_move.wav'],
            ['ui_confirm', 'assets/audio/sfx/ui_confirm.wav'],
            ['ui_back', 'assets/audio/sfx/ui_back.wav'],
            ['pause', 'assets/audio/sfx/pause.wav'],
            ['game_over', 'assets/audio/sfx/game_over.wav'],
            ['combo', 'assets/audio/sfx/combo.wav']
        ];

        // Loaded after startup to reduce initial load time.
        this._deferredSoundList = [
            ['metal_pad', 'assets/audio/sfx/metal_pad.wav'],
            // Optional cues with dedicated generated files or specific mappings:
            ['boss_spawn', 'assets/audio/sfx/boss_spawn_gen.wav'],
            ['boss_defeat', 'assets/audio/sfx/boss_defeat_gen.wav'],
            ['boss_attack', 'assets/audio/sfx/attack3.wav'],
            ['boss_hurt', 'assets/audio/sfx/enemy_hit.wav'],
            ['boss2_spawn', 'assets/audio/sfx/boss2_spawn.wav'],
            ['boss2_defeat', 'assets/audio/sfx/boss2_defeat.wav'],
            ['boss2_attack', 'assets/audio/sfx/boss2_attack.wav'],
            ['boss2_hurt', 'assets/audio/sfx/boss2_hurt.wav'],
            ['level_complete', 'assets/audio/sfx/level_complete.wav'],
            ['victory', 'assets/audio/sfx/victory.wav'],
            ['powerup', 'assets/audio/sfx/powerup.wav'],
            ['item_pickup', 'assets/audio/sfx/item_pickup.wav'],
            ['combo_level_up', 'assets/audio/sfx/combo_level_up.wav'],
            ['parry_success', 'assets/audio/sfx/parry_success.wav'],
            ['coin_collect', 'assets/audio/sfx/coin_collect.wav'],
            ['footstep', 'assets/audio/sfx/footstep.wav'],
            ['enemy_attack', 'assets/audio/sfx/enemy_attack_gen.wav'],
            // New gameplay sound effects
            ['skunk_spray', 'assets/audio/sfx/skunk_spray.wav'],
            ['dash', 'assets/audio/sfx/dash.wav'],
            ['double_jump', 'assets/audio/sfx/double_jump.wav'],
            ['shield_block', 'assets/audio/sfx/shield_block.wav'],
            ['health_restore', 'assets/audio/sfx/health_restore.wav'],
            ['achievement_unlock', 'assets/audio/sfx/achievement_unlock.wav'],
            ['combo_break', 'assets/audio/sfx/combo_break.wav'],
            ['enemy_spawn', 'assets/audio/sfx/enemy_spawn.wav'],
            ['teleport', 'assets/audio/sfx/teleport.wav'],
            ['speed_boost', 'assets/audio/sfx/speed_boost.wav'],
            ['damage_boost', 'assets/audio/sfx/damage_boost.wav'],
            ['warning_alert', 'assets/audio/sfx/warning_alert.wav'],
            ['critical_hit', 'assets/audio/sfx/critical_hit.wav'],
            ['wall_bounce', 'assets/audio/sfx/wall_bounce.wav'],
            ['ui_hover', 'assets/audio/sfx/ui_hover.wav']
        ];
        // Defer music loading until game start to reduce initial bandwidth and decoding on mobile
        const musicList = [];
        audioTotal = (soundList ? soundList.length : 0) + (musicList ? musicList.length : 0);
        audioLoaded = 0;
        computeAndSetProgress();

        // If running from file://, skip audio loading (browsers often block it) unless user clicked "Start Anyway"
        if (window._fileProtocol && !window._allowFileStart) {
            try { console.warn('File protocol detected: skipping audio asset loading. Click "Start Anyway" to attempt enabling audio.'); } catch (e) { __err('main', e); }
            // Treat skipped audio as "done" for progress purposes
            audioLoaded = audioTotal;
            computeAndSetProgress();
        } else {
            // Enable audio on first user interaction (required by browsers)
            const initAudio = () => { try { this.audioManager.initialize(); } catch (e) { __err('main', e); } };
            window.addEventListener('keydown', initAudio, { once: true });
            window.addEventListener('mousedown', initAudio, { once: true });
            // Mobile / touch devices may never emit mousedown/keydown.
            // Use pointer/touch hooks so iOS Safari and Android unlock audio reliably.
            window.addEventListener('pointerdown', initAudio, { once: true });
            window.addEventListener('touchstart', initAudio, { once: true, passive: true });
            // On Oculus Quest / VR headsets the first input is a controller button,
            // which fires as a gamepad event, not a keyboard/pointer event. Hook
            // the gamepadconnected event so audio unlocks when the controller wakes.
            window.addEventListener('gamepadconnected', initAudio, { once: true });

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
        } catch (e) { __err('main', e); }
        try {
            if (this.game && typeof this.game.pause === 'function') this.game.pause();
        } catch (e) { __err('main', e); }
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

        // Poll gamepads once per frame before update
        try { this._handleGamepadInput(); } catch (e) { __err('main', e); }
        // Also poll XR input sources if the WebXR bridge is active
        try { this._pollXRInputSources(); } catch (e) { __err('main', e); }

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
