class AudioManager {
    constructor() {
        // Web Audio Context for SFX (Low latency, high polyphony)
        // DEFER context creation until first user gesture to satisfy browser
        // autoplay policies (Oculus browser, Edge, Chrome, Safari all require
        // a user interaction before an AudioContext may start).
        // Pick a single AudioContext constructor — avoids ambiguity in Edge
        // which exposes both AudioContext and webkitAudioContext.
        this._AudioContextClass = null;
        try {
            if (typeof window.AudioContext === 'function') {
                this._AudioContextClass = window.AudioContext;
            } else if (typeof window.webkitAudioContext === 'function') {
                this._AudioContextClass = window.webkitAudioContext;
            }
        } catch (e) { /* no Web Audio support */ }
        this.audioCtx = null; // created lazily via _ensureContext()
        
        this.sfxBuffers = {}; // Stores decoded audio data
        this.musicElements = {}; // Stores HTML5 Audio elements
        
        this.currentMusic = null;
        this.soundEnabled = true;
        this.musicEnabled = true;

        // SFX voice management
        this.maxSfxVoices = (typeof Config !== 'undefined' && typeof Config.SFX_MAX_VOICES === 'number') ? Config.SFX_MAX_VOICES : 10;
        this.perSoundLimits = {
            footstep: 2,
            attack1: 2,
            attack2: 2,
            attack3: 2,
            enemy_hit: 3,
            enemy_death: 2,
            enemy_attack: 2,
            jump: 2,
            land: 2,
            shadow_strike: 1,
            shadow_strike_hit: 1,
            combo: 1,
            combo_level_up: 1,
            item_pickup: 2,
            coin_collect: 2,
            powerup: 1,
            level_complete: 1,
            player_hit: 1,
            player_death: 1,
            pause: 1,
            game_over: 1,
            menu_move: 2,
            menu_select: 2,
            ui_confirm: 2,
            ui_back: 2,
            victory: 1,
            skunk_spray: 2,
            dash: 2,
            double_jump: 2,
            shield_block: 2,
            health_restore: 1,
            achievement_unlock: 1,
            combo_break: 1,
            enemy_spawn: 2,
            kamikaze_explosion: 2,
            kamikaze_fuse: 1,
            teleport: 1,
            speed_boost: 1,
            damage_boost: 1,
            warning_alert: 1,
            critical_hit: 2,
            wall_bounce: 2,
            ui_hover: 2
        };
        this.soundCooldownsMs = {
            footstep: 120,
            attack1: 80,
            attack2: 80,
            attack3: 80,
            enemy_hit: 60,
            enemy_death: 120,
            enemy_attack: 180,
            jump: 120,
            land: 160,
            shadow_strike: 200,
            shadow_strike_hit: 140,
            combo: 200,
            combo_level_up: 250,
            item_pickup: 120,
            coin_collect: 80,
            powerup: 250,
            level_complete: 500,
            player_hit: 180,
            player_death: 500,
            pause: 250,
            game_over: 700,
            menu_move: 80,
            menu_select: 120,
            ui_confirm: 120,
            ui_back: 120,
            victory: 800,
            skunk_spray: 150,
            dash: 100,
            double_jump: 150,
            shield_block: 120,
            health_restore: 300,
            achievement_unlock: 500,
            combo_break: 200,
            enemy_spawn: 200,
            kamikaze_explosion: 150,
            kamikaze_fuse: 300,
            teleport: 250,
            speed_boost: 300,
            damage_boost: 300,
            warning_alert: 400,
            critical_hit: 100,
            wall_bounce: 80,
            ui_hover: 60
        };
        this._lastPlayTimes = {};
        this._activeSfx = [];
        this._gainPool = [];
        this._pannerPool = [];

        // Throttle _cleanupActiveSfx — once every 200ms max
        this._lastCleanup = 0;
        this._cleanupIntervalMs = 200;

        // Per-frame SFX budget to prevent burst stalls
        this._frameSfxCount = 0;
        this._frameSfxMax = 4;
        this._lastFrameTime = 0;

        // Scheduled SFX (setTimeout-based) for multi-stage cues
        this._scheduledSfx = {};

        // Music ducking
        this.duckTarget = 0.4;
        this.duckAttack = 0.02;
        this.duckRelease = 0.25;
        this._duckTimer = null;

        // Ambient sound layer (separate from music, loops underneath)
        this.ambientElements = {}; // name -> Audio element
        this.currentAmbient = null;
        this.ambientGainNode = null; // Routed through WebAudio when available
        this.ambientGain = 0.10; // Very subtle ambient — should barely be noticeable
        this._pendingAmbientVol = 0.10;
        
        // Gain Nodes for Volume Control (guard for environments without WebAudio)
        this.musicGain = 1.0; // fallback if WebAudio music routing not used
        // Gain nodes are created lazily in _ensureContext()
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGainNode = null;

        // Music transition state
        this._musicFadeInterval = null;
        this._isFading = false;
        this._fadeInTimer = null;  // tracks the outer setTimeout in playMusic
        this._fadeCleanupTimer = null; // tracks the inner cleanup setTimeout
        
        // Defaults
        this.setSoundVolume(0.7);
        this.setMusicVolume(0.5);

        // Detect OGG Vorbis support (prefer OGG over WAV for smaller files)
        this._canPlayOgg = false;
        try {
            const a = document.createElement('audio');
            this._canPlayOgg = !!(a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, ''));
        } catch (e) { /* fallback to WAV */ }

        // Visibility-based suspend/resume.
        // Only auto-resume audio if the game isn't paused; otherwise the game's
        // own unpause flow will call resume() / unpauseMusic() when appropriate.
        try {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.suspend();
                } else {
                    // Resume the AudioContext so SFX work when the tab comes back,
                    // but do NOT unpause music/ambient — that's the game's job
                    // (the user may still be on the pause screen).
                    try {
                        if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
                    } catch (e) { __err('audio', e); }
                }
            });
        } catch (e) { __err('audio', e); }
    }

    _now() {
        if (this.audioCtx && typeof this.audioCtx.currentTime === 'number') return this.audioCtx.currentTime;
        return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    }

    _cleanupActiveSfx(force) {
        const nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (!force && nowMs - this._lastCleanup < this._cleanupIntervalMs) return;
        this._lastCleanup = nowMs;
        const now = this._now();
        this._activeSfx = this._activeSfx.filter(entry => entry && entry.endTime && entry.endTime > now);
    }

    _getGainNode() {
        if (this._gainPool.length > 0) return this._gainPool.pop();
        return this.audioCtx ? this.audioCtx.createGain() : null;
    }

    _releaseGainNode(node) {
        if (!node) return;
        try { node.disconnect(); } catch (e) { __err('audio', e); }
        if (this._gainPool.length < 20) this._gainPool.push(node);
    }

    _getPannerNode() {
        if (this._pannerPool.length > 0) return this._pannerPool.pop();
        return (this.audioCtx && this.audioCtx.createStereoPanner) ? this.audioCtx.createStereoPanner() : null;
    }

    _releasePannerNode(node) {
        if (!node) return;
        try { node.disconnect(); } catch (e) { __err('audio', e); }
        if (this._pannerPool.length < 10) this._pannerPool.push(node);
    }

    _applyDuck() {
        if (!this.audioCtx || !this.musicGainNode) return;
        // Debounce: skip if already ducked within last 80ms
        const duckNow = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (this._lastDuckTime && duckNow - this._lastDuckTime < 80) {
            // Just extend the release timer
            if (this._duckTimer) { try { clearTimeout(this._duckTimer); } catch (e) { __err('audio', e); } }
            this._duckTimer = setTimeout(() => {
                if (!this.audioCtx || !this.musicGainNode) return;
                const t = this.audioCtx.currentTime;
                try {
                    this.musicGainNode.gain.cancelScheduledValues(t);
                    this.musicGainNode.gain.setValueAtTime(this.musicGainNode.gain.value, t);
                    this.musicGainNode.gain.linearRampToValueAtTime(this.musicGain, t + this.duckRelease);
                } catch (e) { __err('audio', e); }
            }, Math.max(50, Math.floor(this.duckRelease * 1000)));
            return;
        }
        this._lastDuckTime = duckNow;

        const now = this.audioCtx.currentTime;
        const target = Math.max(0, Math.min(1, this.duckTarget));
        try {
            this.musicGainNode.gain.cancelScheduledValues(now);
            this.musicGainNode.gain.setValueAtTime(this.musicGainNode.gain.value, now);
            this.musicGainNode.gain.linearRampToValueAtTime(target, now + this.duckAttack);
        } catch (e) { __err('audio', e); }

        if (this._duckTimer) {
            try { clearTimeout(this._duckTimer); } catch (e) { __err('audio', e); }
        }
        this._duckTimer = setTimeout(() => {
            if (!this.audioCtx || !this.musicGainNode) return;
            const t = this.audioCtx.currentTime;
            try {
                this.musicGainNode.gain.cancelScheduledValues(t);
                this.musicGainNode.gain.setValueAtTime(this.musicGainNode.gain.value, t);
                this.musicGainNode.gain.linearRampToValueAtTime(this.musicGain, t + this.duckRelease);
            } catch (e) { __err('audio', e); }
        }, Math.max(50, Math.floor(this.duckRelease * 1000)));
    }

    _cancelScheduledSfx(key) {
        if (!key) return;
        const id = this._scheduledSfx[key];
        if (id) {
            try { clearTimeout(id); } catch (e) { __err('audio', e); }
        }
        delete this._scheduledSfx[key];
    }

    cancelDeathSequence() {
        this._cancelScheduledSfx('death_followup');
    }

    /**
     * Play a two-stage “death” cue: immediate impact + delayed stinger.
     * Defaults use existing assets: player_death.wav then game_over.wav.
     */
    playDeathSequence(opts = {}) {
        try {
            this.cancelDeathSequence();
            const oof = (opts && typeof opts.oof === 'string') ? opts.oof : 'player_death';
            const follow = (opts && typeof opts.follow === 'string') ? opts.follow : 'game_over';
            const oofVolume = (opts && typeof opts.oofVolume === 'number') ? opts.oofVolume : 0.9;
            const followVolume = (opts && typeof opts.followVolume === 'number') ? opts.followVolume : 0.95;
            const delayMs = (opts && typeof opts.delayMs === 'number') ? opts.delayMs : 1000;

            // Immediate “oof”
            if (this.playSound) this.playSound(oof, oofVolume);

            // Delayed stinger (“sad trombone” / game-over style)
            this._scheduledSfx.death_followup = setTimeout(() => {
                try {
                    if (this.playSound) this.playSound(follow, followVolume);
                } catch (e) { __err('audio', e); }
                delete this._scheduledSfx.death_followup;
            }, Math.max(0, Math.floor(delayMs)));
        } catch (e) {
            // Fallback: at least play the initial sound
            try { this.playSound && this.playSound('player_death', 0.9); } catch (err) { __err('audio', err); }
        }
    }

    /**
     * Lazily create the AudioContext and gain nodes.
     * Safe to call multiple times — only creates once.
     */
    _ensureContext() {
        if (this.audioCtx) return true;
        if (!this._AudioContextClass) return false;
        try {
            this.audioCtx = new this._AudioContextClass();
            this.masterGain = this.audioCtx.createGain();
            this.sfxGain = this.audioCtx.createGain();
            this.musicGainNode = this.audioCtx.createGain();
            this.ambientGainNode = this.audioCtx.createGain();
            this.masterGain.connect(this.audioCtx.destination);
            this.sfxGain.connect(this.masterGain);
            this.musicGainNode.connect(this.masterGain);
            this.ambientGainNode.connect(this.masterGain);
            // Re-apply volumes that were set before context existed
            this.setSoundVolume(this._pendingSfxVol != null ? this._pendingSfxVol : 0.7);
            this.setMusicVolume(this._pendingMusicVol != null ? this._pendingMusicVol : 0.5);
            this.setAmbientVolume(this._pendingAmbientVol != null ? this._pendingAmbientVol : 0.10);
            return true;
        } catch (e) {
            if (typeof Config !== 'undefined' && Config.DEBUG) console.warn('AudioManager: WebAudio initialization failed', e);
            this.audioCtx = null;
            this.masterGain = null;
            this.sfxGain = null;
            this.musicGainNode = null;
            return false;
        }
    }

    /**
     * Call this on the FIRST user interaction (click/keydown)
     * to unlock the browser's audio engine.
     */
    async initialize() {
        if (typeof Config !== 'undefined' && Config.DEBUG) console.log('AudioManager: Initializing audio context...');
        this._ensureContext();
        if (this.audioCtx) {
            if (this.audioCtx.state === 'suspended') {
                try {
                    await this.audioCtx.resume();
                } catch (e) {
                    console.warn('AudioManager: resume() failed (will retry on next interaction)', e);
                }
                if (typeof Config !== 'undefined' && Config.DEBUG) console.log('AudioManager: Audio context resumed.');
            } else {
                if (typeof Config !== 'undefined' && Config.DEBUG) console.log('AudioManager: Audio context already running.');
            }
        } else {
            if (typeof Config !== 'undefined' && Config.DEBUG) console.log('AudioManager: WebAudio not available; running in fallback mode.');
        }

        // Decode any raw buffers that were fetched before the context was ready
        // (Edge blocks AudioContext creation until user gesture)
        await this._decodePendingBuffers();
    }

    /**
     * Decode raw ArrayBuffers that were stashed during loadSound() before
     * the AudioContext was available (common in Edge on first load).
     */
    async _decodePendingBuffers() {
        if (!this._pendingRawBuffers || !this.audioCtx) return;
        const pending = this._pendingRawBuffers;
        this._pendingRawBuffers = null;
        for (const name of Object.keys(pending)) {
            if (this.sfxBuffers[name]) continue; // already decoded
            try {
                const audioBuffer = await this.audioCtx.decodeAudioData(pending[name]);
                this.sfxBuffers[name] = audioBuffer;
            } catch (e) {
                if (typeof Config !== 'undefined' && Config.DEBUG) console.warn(`AudioManager: deferred decode failed for '${name}'`, e);
            }
        }
    }

    /**
     * Return the preferred audio path: try .ogg first (smaller), fall back to original.
     * @param {string} path - Original path (e.g. 'assets/audio/sfx/jump.wav')
     * @returns {string} Preferred path
     */
    _preferredPath(path) {
        if (!this._canPlayOgg) return path;
        if (path.endsWith('.ogg')) return path;
        // Replace .wav extension with .ogg
        return path.replace(/\.wav$/i, '.ogg');
    }

    /**
     * Load a short sound effect into memory (Web Audio API)
     * Automatically tries OGG first, falls back to WAV.
     */
    async loadSound(name, path) {
        try {
            // _ensureContext may fail before user gesture (Edge autoplay policy).
            // That's OK — we still fetch + decode; playback will work once
            // initialize() is called on the first interaction.
            try { this._ensureContext(); } catch (e) { /* deferred */ }

            const preferred = this._preferredPath(path);
            let response = null;
            try { response = await fetch(preferred); } catch (e) { /* network error */ }
            // If OGG fetch fails, fall back to original WAV path
            if ((!response || !response.ok) && preferred !== path) {
                try { response = await fetch(path); } catch (e) { /* network error */ }
            }
            if (!response || !response.ok) return null;
            const arrayBuffer = await response.arrayBuffer();
            // decodeAudioData requires a live AudioContext; if context is
            // missing (Edge before gesture) store the raw buffer and decode later.
            if (this.audioCtx) {
                try {
                    const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
                    this.sfxBuffers[name] = audioBuffer;
                    return audioBuffer;
                } catch (decodeErr) {
                    // Decoding can fail if context is suspended in strict browsers.
                    // Store raw buffer so we can retry after initialize().
                    if (!this._pendingRawBuffers) this._pendingRawBuffers = {};
                    this._pendingRawBuffers[name] = arrayBuffer;
                    return null;
                }
            } else {
                // No context yet — stash raw buffer for later decoding
                if (!this._pendingRawBuffers) this._pendingRawBuffers = {};
                this._pendingRawBuffers[name] = arrayBuffer;
                return null;
            }
        } catch (e) {
            if (typeof Config !== 'undefined' && Config.DEBUG) console.warn(`Failed to load sound: ${path}`, e);
            return null;
        }
    }

    /**
     * Load background music (HTML5 Audio - Streaming)
     * Automatically tries OGG first, falls back to WAV.
     */
    loadMusic(name, path) {
        return new Promise((resolve) => {
            this._ensureContext();
            const preferred = this._preferredPath(path);
            const audio = new Audio();
            let triedFallback = false;
            let resolved = false;

            const onReady = () => {
                // Guard: oncanplaythrough can fire multiple times in Edge/Chromium.
                // createMediaElementSource must only be called once per element.
                if (resolved) return;
                resolved = true;
                audio.oncanplaythrough = null; // prevent duplicate fires
                this.musicElements[name] = audio;
                try {
                    if (this.audioCtx && this.musicGainNode) {
                        const source = this.audioCtx.createMediaElementSource(audio);
                        source.connect(this.musicGainNode);
                        audio._audioConnected = true;
                    }
                } catch (e) {
                    if (typeof Config !== 'undefined' && Config.DEBUG) console.warn('AudioManager: media element routing failed', e);
                }
                resolve(audio);
            };

            audio.oncanplaythrough = onReady;
            audio.onerror = () => {
                // Fall back to WAV if OGG failed
                if (!triedFallback && preferred !== path) {
                    triedFallback = true;
                    audio.src = path;
                    audio.load();
                    return;
                }
                if (resolved) return;
                resolved = true;
                if (typeof Config !== 'undefined' && Config.DEBUG) console.warn(`Failed to load music: ${path}`);
                resolve(null);
            };
            audio.src = preferred;
            audio.load();
        });
    }

    /**
     * Load all assets (Accepts lists as arguments for reusability)
     */
    async loadAssets(soundList, musicList, onProgress = null) {
        if (typeof Config !== 'undefined' && Config.DEBUG) console.log('AudioManager: Loading audio assets...');

        const total = (soundList ? soundList.length : 0) + (musicList ? musicList.length : 0);
        let loaded = 0;
        const report = () => {
            try {
                if (typeof onProgress === 'function') onProgress(loaded, total);
            } catch (e) { __err('audio', e); }
        };
        report();

        const wrap = (p) => Promise.resolve(p).then((v) => {
            loaded++;
            report();
            return v;
        }).catch((e) => {
            // Still advance progress on failure so the loading UI doesn't hang.
            loaded++;
            report();
            return null;
        });

        const soundPromises = (soundList || []).map(([name, path]) => wrap(this.loadSound(name, path)));
        const musicPromises = (musicList || []).map(([name, path]) => wrap(this.loadMusic(name, path)));
        await Promise.all([...soundPromises, ...musicPromises]);
        if (typeof Config !== 'undefined' && Config.DEBUG) console.log('AudioManager: All audio assets loaded.');
    }

    /**
     * Play a SFX with low latency and automatic overlapping
     */
    playSound(name, volumeScale = 1.0) {
        if (!this.soundEnabled) return;
        const buffer = this.sfxBuffers[name];
        if (!buffer) return;
        if (!this.audioCtx) return;

        // Per-frame budget: reset counter on new frame, cap at _frameSfxMax
        const frameNow = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (frameNow - this._lastFrameTime > 12) { // ~1 frame at 60fps
            this._frameSfxCount = 0;
            this._lastFrameTime = frameNow;
        }
        if (this._frameSfxCount >= this._frameSfxMax) return;

        const nowMs = this._now() * 1000;
        const cooldown = this.soundCooldownsMs[name];
        if (typeof cooldown === 'number') {
            const last = this._lastPlayTimes[name] || 0;
            if (nowMs - last < cooldown) return;
            this._lastPlayTimes[name] = nowMs;
        }

        this._cleanupActiveSfx();
        const perLimit = this.perSoundLimits[name];
        if (typeof perLimit === 'number') {
            const activeForSound = this._activeSfx.filter(s => s && s.name === name).length;
            if (activeForSound >= perLimit) return;
        }
        if (this._activeSfx.length >= this.maxSfxVoices) {
            const oldest = this._activeSfx.shift();
            try { oldest && oldest.source && oldest.source.stop(); } catch (e) { __err('audio', e); }
        }

        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;

        const gainNode = this._getGainNode();
        if (!gainNode) return;

        // Support either a numeric volume scale OR an options object:
        //   playSound('jump', 0.8)
        //   playSound('jump', { volume: 0.8, pan: -0.2, rate: 1.02, detune: -50 })
        let vol = 1.0;
        let pan = null;
        let rate = null;
        let detune = null;
        if (volumeScale && typeof volumeScale === 'object') {
            vol = (typeof volumeScale.volume === 'number') ? volumeScale.volume : 1.0;
            pan = (typeof volumeScale.pan === 'number') ? volumeScale.pan : null;
            rate = (typeof volumeScale.rate === 'number') ? volumeScale.rate : null;
            detune = (typeof volumeScale.detune === 'number') ? volumeScale.detune : null;
        } else if (typeof volumeScale === 'number') {
            vol = volumeScale;
        }
        gainNode.gain.value = vol;

        try {
            if (rate !== null && Number.isFinite(rate)) source.playbackRate.value = Math.max(0.25, Math.min(4.0, rate));
            if (detune !== null && Number.isFinite(detune) && typeof source.detune !== 'undefined') {
                const safeDetune = (typeof Utils !== 'undefined' && Utils && typeof Utils.clamp === 'function')
                    ? Utils.clamp(detune, -2400, 2400)
                    : detune;
                source.detune.value = safeDetune;
            }
        } catch (e) { __err('audio', e); }

        // Optional panning support (pooled)
        let panner = null;
        if (pan !== null) {
            panner = this._getPannerNode();
            if (panner) {
                panner.pan.value = Math.max(-1, Math.min(1, pan));
                source.connect(panner);
                panner.connect(gainNode);
            }
        }

        if (!panner) source.connect(gainNode);
        gainNode.connect(this.sfxGain);

        const startTime = this.audioCtx.currentTime;
        const endTime = startTime + buffer.duration + 0.02;
        this._activeSfx.push({ name, source, endTime });

        source.onended = () => {
            this._releaseGainNode(gainNode);
            this._releasePannerNode(panner);
        };

        this._frameSfxCount++;
        source.start();

        // Duck music on impactful SFX
        if (name === 'player_hit' || name === 'enemy_hit' || name === 'boss_attack' || name === 'kamikaze_explosion') {
            this._applyDuck();
        }
    }

    /**
     * Play a SFX with automatic stereo panning based on world position.
     * Call this instead of playSound() when you have world coordinates and a camera.
     *
     * @param {string} name            - Sound buffer name
     * @param {number} worldX          - Source X position in world space
     * @param {number} cameraX         - Camera left edge in world space
     * @param {number} canvasWidth     - Visible canvas width in pixels
     * @param {object|number} opts     - Volume number or options { volume, rate, detune }
     */
    playSoundAt(name, worldX, cameraX, canvasWidth, opts = 1.0) {
        // Convert world position to screen-relative pan (-1 left .. +1 right)
        const screenX = worldX - cameraX;
        const normalised = (canvasWidth > 0) ? (screenX / canvasWidth) : 0.5; // 0..1
        const pan = Math.max(-1, Math.min(1, (normalised - 0.5) * 2));

        // Merge pan into options
        if (opts && typeof opts === 'object') {
            opts.pan = pan;
        } else {
            opts = { volume: (typeof opts === 'number') ? opts : 1.0, pan };
        }

        this.playSound(name, opts);
    }

    /**
     * Play a multi-layer compound sound for heavy impacts.
     * Plays the primary sound immediately and optional follow-up(s) after short delays.
     *
     * @param {Array<{name: string, delay?: number, volume?: number, rate?: number}>} layers
     */
    playCompoundSound(layers) {
        if (!layers || !Array.isArray(layers)) return;
        for (const layer of layers) {
            if (!layer || !layer.name) continue;
            const vol = (typeof layer.volume === 'number') ? layer.volume : 1.0;
            const rate = (typeof layer.rate === 'number') ? layer.rate : 1.0;
            const delay = (typeof layer.delay === 'number') ? Math.max(0, layer.delay) : 0;
            if (delay === 0) {
                this.playSound(layer.name, { volume: vol, rate });
            } else {
                setTimeout(() => {
                    try { this.playSound(layer.name, { volume: vol, rate }); } catch (e) { __err('audio', e); }
                }, delay);
            }
        }
    }

    playMusic(name, loop = true, opts = {}) {
        if (!this.musicEnabled) return;
        const audioEl = this.musicElements[name];
        if (!audioEl) {
            if (typeof Config !== 'undefined' && Config.DEBUG) console.warn(`AudioManager: music element missing '${name}'`);
            return;
        }

        if (this.currentMusic === audioEl && !this.currentMusic.paused) {
            return; // Already playing and not paused
        }

        if (this._isFading) {
            // If a fade is in progress, queue up the next track to play after.
            // This is a simple solution; a more complex one might blend three tracks.
            if (typeof Config !== 'undefined' && Config.DEBUG) console.log(`AudioManager: Fading in progress, queuing '${name}'`);
            this._queuedMusic = { name, loop, opts };
            return;
        }

        const fadeOutDuration = typeof opts.fadeOut === 'number' ? opts.fadeOut : 400;
        const fadeInDuration = typeof opts.fadeIn === 'number' ? opts.fadeIn : 400;

        // Stop any previously running fades
        if (this._musicFadeInterval) {
            clearInterval(this._musicFadeInterval);
            this._musicFadeInterval = null;
        }

        const oldMusic = this.currentMusic;
        this.currentMusic = audioEl;
        this.currentMusic.loop = loop;
        this.currentMusic.volume = 0;

        const playPromise = this.currentMusic.play();
        if (playPromise) {
            playPromise.catch(e => {
                if (typeof Config !== 'undefined' && Config.DEBUG) console.warn(`Auto-play blocked for music '${name}'`, e);
            });
        }

        this._isFading = true;

        if (this.audioCtx && this.musicGainNode) {
            // Web Audio API path (preferred)
            const now = this.audioCtx.currentTime;
            const currentGain = this.musicGainNode.gain.value;

            // Fade out old music (if any)
            if (oldMusic) {
                this.musicGainNode.gain.cancelScheduledValues(now);
                this.musicGainNode.gain.setValueAtTime(currentGain, now);
                this.musicGainNode.gain.linearRampToValueAtTime(0, now + fadeOutDuration / 1000);
            }

            // Fade in new music
            this._fadeInTimer = setTimeout(() => {
                this._fadeInTimer = null;
                // currentMusic may have been nulled (e.g. stopMusic() on touch)
                // between scheduling and firing — bail out safely.
                if (!this.currentMusic) {
                    this._isFading = false;
                    this._checkQueuedMusic();
                    return;
                }
                // Old music gain has reached 0 — stop it immediately to free
                // the decoder and avoid audible overlap through the shared gain node.
                if (oldMusic) {
                    try {
                        oldMusic.pause();
                        oldMusic.currentTime = 0;
                    } catch (e) { __err('audio', e); }
                }
                // Ensure the element is routed through the audio graph.
                // loadMusic() connects it during oncanplaythrough, but if the
                // AudioContext didn't exist yet (Edge before user gesture) the
                // element may not be connected.  Use a flag to track.
                if (!this.currentMusic._audioConnected) {
                    try {
                        const source = this.audioCtx.createMediaElementSource(this.currentMusic);
                        source.connect(this.musicGainNode);
                        this.currentMusic._audioConnected = true;
                    } catch (e) {
                        // Already connected or other error — safe to ignore
                    }
                }
                const nowFadeIn = this.audioCtx.currentTime;
                this.musicGainNode.gain.cancelScheduledValues(nowFadeIn);
                this.musicGainNode.gain.setValueAtTime(0, nowFadeIn);
                this.musicGainNode.gain.linearRampToValueAtTime(this.musicGain, nowFadeIn + fadeInDuration / 1000);

                this._fadeCleanupTimer = setTimeout(() => {
                    this._fadeCleanupTimer = null;
                    this._isFading = false;
                    this._checkQueuedMusic();
                }, fadeInDuration);

            }, oldMusic ? fadeOutDuration : 0);

        } else {
            // Fallback path (HTML5 Audio with requestAnimationFrame)
            let start = null;
            const fade = (timestamp) => {
                if (!start) start = timestamp;
                const elapsed = timestamp - start;

                // Bail if currentMusic was nulled during the fade (e.g. stopMusic)
                if (!this.currentMusic) {
                    if (oldMusic) {
                        try { oldMusic.pause(); oldMusic.currentTime = 0; } catch (e) { __err('audio', e); }
                    }
                    this._isFading = false;
                    this._checkQueuedMusic();
                    return;
                }

                // Fade out old music
                if (oldMusic && oldMusic.volume > 0) {
                    const fadeOutProgress = Math.min(1, elapsed / fadeOutDuration);
                    try { oldMusic.volume = this.musicGain * (1 - fadeOutProgress); } catch (e) { __err('audio', e); }
                    if (fadeOutProgress >= 1) {
                        try {
                            oldMusic.pause();
                            oldMusic.currentTime = 0;
                        } catch (e) { __err('audio', e); }
                    }
                }

                // Fade in new music
                const fadeInProgress = Math.min(1, elapsed / fadeInDuration);
                try { this.currentMusic.volume = this.musicGain * fadeInProgress; } catch (e) { __err('audio', e); }

                if (fadeInProgress < 1 || (oldMusic && oldMusic.volume > 0)) {
                    requestAnimationFrame(fade);
                } else {
                    this._isFading = false;
                    this._checkQueuedMusic();
                }
            };
            requestAnimationFrame(fade);
        }
        if (typeof Config !== 'undefined' && Config.DEBUG) console.log(`AudioManager: Playing music '${name}'`);
    }

    _checkQueuedMusic() {
        if (this._queuedMusic) {
            if (typeof Config !== 'undefined' && Config.DEBUG) console.log(`AudioManager: Dequeuing music: '${this._queuedMusic.name}'`);
            const { name, loop, opts } = this._queuedMusic;
            this._queuedMusic = null;
            this.playMusic(name, loop, opts);
        }
    }

    stopMusic(fadeOut = 300) {
        if (this._musicFadeInterval) {
            clearInterval(this._musicFadeInterval);
            this._musicFadeInterval = null;
        }
        // Cancel any in-flight fade timeouts from playMusic() to prevent
        // stale callbacks from operating on a null currentMusic.
        if (this._fadeInTimer) { clearTimeout(this._fadeInTimer); this._fadeInTimer = null; }
        if (this._fadeCleanupTimer) { clearTimeout(this._fadeCleanupTimer); this._fadeCleanupTimer = null; }
        if (this.currentMusic) {
            const toStop = this.currentMusic;
            this._isFading = true;

            if (this.audioCtx && this.musicGainNode) {
                const now = this.audioCtx.currentTime;
                this.musicGainNode.gain.cancelScheduledValues(now);
                this.musicGainNode.gain.setValueAtTime(this.musicGainNode.gain.value, now);
                this.musicGainNode.gain.linearRampToValueAtTime(0, now + fadeOut / 1000);
                setTimeout(() => {
                    try {
                        toStop.pause();
                        toStop.currentTime = 0;
                    } catch (e) { __err('audio', e); }
                    this._isFading = false;
                    this._checkQueuedMusic();
                }, fadeOut);
            } else {
                let start = null;
                const fadeOutFn = (timestamp) => {
                    if (!start) start = timestamp;
                    const elapsed = timestamp - start;
                    const progress = Math.min(1, elapsed / fadeOut);
                    toStop.volume = this.musicGain * (1 - progress);
                    if (progress < 1) {
                        requestAnimationFrame(fadeOutFn);
                    } else {
                        try {
                            toStop.pause();
                            toStop.currentTime = 0;
                        } catch (e) { __err('audio', e); }
                        this._isFading = false;
                        this._checkQueuedMusic();
                    }
                };
                requestAnimationFrame(fadeOutFn);
            }
            this.currentMusic = null;
        }
    }

    pauseMusic() {
        if (this.currentMusic && !this.currentMusic.paused) {
            this.currentMusic.pause();
        }
    }

    unpauseMusic() {
        if (this.currentMusic && this.currentMusic.paused) {
            const playPromise = this.currentMusic.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => console.warn('Auto-play blocked when unpausing music:', e));
            }
        }
    }

    toggleMute() {
        this.soundEnabled = !this.soundEnabled;
        this.musicEnabled = !this.musicEnabled;
        
        if (!this.musicEnabled) {
            this.stopMusic();
            this.stopAmbient();
        }
        // Web Audio mute
        if (this.audioCtx && this.masterGain) this.masterGain.gain.setValueAtTime(this.soundEnabled ? 1 : 0, this.audioCtx.currentTime);
    }

    suspend() {
        try {
            if (this.audioCtx && this.audioCtx.state === 'running') this.audioCtx.suspend();
        } catch (e) { __err('audio', e); }
        try { this.pauseMusic(); } catch (e) { __err('audio', e); }
        try { this.pauseAmbient(); } catch (e) { __err('audio', e); }
    }

    resume() {
        try {
            if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
        } catch (e) { __err('audio', e); }
        try { this.unpauseMusic(); } catch (e) { __err('audio', e); }
        try { this.unpauseAmbient(); } catch (e) { __err('audio', e); }
    }

    setSoundVolume(val) {
        // Clamp between 0 and 1
        const volume = Math.max(0, Math.min(1, val));
        this._pendingSfxVol = volume;
        if (this.audioCtx && this.sfxGain) this.sfxGain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
    }

    setMusicVolume(val) {
        const volume = Math.max(0, Math.min(1, val));
        this.musicGain = volume;
        this._pendingMusicVol = volume;
        if (this.audioCtx && this.musicGainNode) {
            this.musicGainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);
        } else if (this.currentMusic) {
            this.currentMusic.volume = volume;
        }
    }

    /**
     * Set music playback rate (speed)
     * @param {number} rate - Playback rate (1.0 = normal, 2.0 = double speed/BPM)
     */
    setMusicPlaybackRate(rate) {
        const clampedRate = Math.max(0.25, Math.min(4.0, rate)); // Clamp between 0.25x and 4x
        if (this.currentMusic) {
            this.currentMusic.playbackRate = clampedRate;
            if (typeof Config !== 'undefined' && Config.DEBUG) {
                console.log(`AudioManager: Music playback rate set to ${clampedRate}x`);
            }
        }
    }

    /**
     * Reset music playback rate to normal
     */
    resetMusicPlaybackRate() {
        this.setMusicPlaybackRate(1.0);
    }

    /**
     * Set ambient sound volume
     */
    setAmbientVolume(val) {
        const volume = Math.max(0, Math.min(1, val));
        this.ambientGain = volume;
        this._pendingAmbientVol = volume;
        if (this.audioCtx && this.ambientGainNode) {
            this.ambientGainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);
        } else if (this.currentAmbient) {
            this.currentAmbient.volume = volume;
        }
    }

    /**
     * Load an ambient sound (HTML5 Audio, streamed, looped)
     * Automatically tries OGG first, falls back to WAV.
     */
    loadAmbient(name, path) {
        return new Promise((resolve) => {
            this._ensureContext();
            const preferred = this._preferredPath(path);
            const audio = new Audio();
            let triedFallback = false;
            let resolved = false;

            const onReady = () => {
                // Guard: oncanplaythrough can fire multiple times in Edge/Chromium.
                if (resolved) return;
                resolved = true;
                audio.oncanplaythrough = null;
                this.ambientElements[name] = audio;
                try {
                    if (this.audioCtx && this.ambientGainNode) {
                        const source = this.audioCtx.createMediaElementSource(audio);
                        source.connect(this.ambientGainNode);
                        audio._audioConnected = true;
                    }
                } catch (e) {
                    if (typeof Config !== 'undefined' && Config.DEBUG) console.warn('AudioManager: ambient routing failed', e);
                }
                resolve(audio);
            };

            audio.oncanplaythrough = onReady;
            audio.onerror = () => {
                if (!triedFallback && preferred !== path) {
                    triedFallback = true;
                    audio.src = path;
                    audio.load();
                    return;
                }
                if (resolved) return;
                resolved = true;
                if (typeof Config !== 'undefined' && Config.DEBUG) console.warn(`Failed to load ambient: ${path}`);
                resolve(null);
            };
            audio.src = preferred;
            audio.load();
        });
    }

    /**
     * Play an ambient sound loop (crossfades with current)
     */
    playAmbient(name, opts = {}) {
        const audioEl = this.ambientElements[name];
        if (!audioEl) {
            if (typeof Config !== 'undefined' && Config.DEBUG) console.warn(`AudioManager: ambient element missing '${name}'`);
            return;
        }
        if (this.currentAmbient === audioEl) {
            if (this.currentAmbient.paused) this.currentAmbient.play().catch((e) => { __err('audio', e); });
            return;
        }

        const fadeOut = typeof opts.fadeOut === 'number' ? opts.fadeOut : 0.8;
        const fadeIn = typeof opts.fadeIn === 'number' ? opts.fadeIn : 1.0;
        this.stopAmbient(fadeOut);

        this.currentAmbient = audioEl;
        this.currentAmbient.loop = true;
        if (this.audioCtx && this.ambientGainNode) {
            const now = this.audioCtx.currentTime;
            this.ambientGainNode.gain.cancelScheduledValues(now);
            this.ambientGainNode.gain.setValueAtTime(0, now);
            this.ambientGainNode.gain.linearRampToValueAtTime(this.ambientGain, now + fadeIn);
            this.currentAmbient.play().catch((e) => { __err('audio', e); });
        } else {
            this.currentAmbient.volume = 0;
            this.currentAmbient.play().catch((e) => { __err('audio', e); });
            try {
                const stepMs = 16;
                const start = Date.now();
                const target = this.ambientGain;
                const timer = setInterval(() => {
                    const t = (Date.now() - start) / (fadeIn * 1000);
                    const v = Math.min(1, Math.max(0, t)) * target;
                    this.currentAmbient.volume = v;
                    if (t >= 1) clearInterval(timer);
                }, stepMs);
            } catch (e) { __err('audio', e); }
        }
    }

    /**
     * Stop ambient sound
     */
    stopAmbient(fadeOut = 0.5) {
        if (this.currentAmbient) {
            const toStop = this.currentAmbient;
            if (this.audioCtx && this.ambientGainNode) {
                const now = this.audioCtx.currentTime;
                this.ambientGainNode.gain.cancelScheduledValues(now);
                this.ambientGainNode.gain.setValueAtTime(this.ambientGainNode.gain.value, now);
                this.ambientGainNode.gain.linearRampToValueAtTime(0, now + fadeOut);
                setTimeout(() => {
                    try { toStop.pause(); toStop.currentTime = 0; } catch (e) { __err('audio', e); }
                }, Math.max(0, fadeOut * 1000));
            } else {
                try { toStop.pause(); toStop.currentTime = 0; } catch (e) { __err('audio', e); }
            }
            this.currentAmbient = null;
        }
    }

    pauseAmbient() {
        if (this.currentAmbient && !this.currentAmbient.paused) {
            this.currentAmbient.pause();
        }
    }

    unpauseAmbient() {
        if (this.currentAmbient && this.currentAmbient.paused) {
            this.currentAmbient.play().catch((e) => { __err('audio', e); });
        }
    }
}