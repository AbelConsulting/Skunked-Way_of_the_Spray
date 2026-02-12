/**
 * Game class - Main game controller
 */

try { if (typeof Config !== 'undefined' && Config.DEBUG) console.log('game.js loaded'); } catch (e) { __err('game', e); }

class Game {
    constructor(canvas, audioManager, isMobile = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = Config.SCREEN_WIDTH;
        this.height = Config.SCREEN_HEIGHT;
        // The viewport size (logical) - may be smaller than world on mobile
        this.viewWidth = this.width;
        this.viewHeight = this.height;

        // Mobile flag (passed from GameApp)
        this.isMobile = !!isMobile;

        // Detect iPad Safari (touch-capable iPadOS often reports Macintosh)
        // Treat as mobile to enable existing mobile optimizations and reduce
        // rendering/devicePixelRatio to avoid GPU/memory pressure on Safari.
        try {
            const ua = (navigator && navigator.userAgent) || '';
            const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Edg|Chrome/.test(ua);
            const isTouch = (typeof document !== 'undefined' && ('ontouchend' in document)) || (navigator && navigator.maxTouchPoints > 0);
            const isiPadLike = /iPad|Macintosh/.test(ua) && isTouch;
            const isiPadSafari = isiPadLike && isSafari;
            if (isiPadSafari) {
                this.isMobile = true;
                // Reduce DPR slightly to lower memory/texture pressure (keep >=1)
                const baseDpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
                // Use a conservative scale factor to avoid blurry UI while reducing load
                const reduced = Math.max(1, Math.round(baseDpr * 0.7 * 100) / 100);
                this._forcedDpr = reduced;
                try {
                    if (this.canvas) {
                        // Keep CSS size as logical view size, but lower backing store resolution
                        this.canvas.style.width = (this.viewWidth || this.width) + 'px';
                        this.canvas.style.height = (this.viewHeight || this.height) + 'px';
                        this.canvas.width = Math.max(1, Math.floor((this.viewWidth || this.width) * reduced));
                        this.canvas.height = Math.max(1, Math.floor((this.viewHeight || this.height) * reduced));
                    }
                } catch (e) { __err('game', e); }
            }
        } catch (e) { __err('game', e); }

        // Initialize audio (use provided AudioManager if available)
        this.audioManager = audioManager || new AudioManager();
        this.achievements = null;
        try {
            if (typeof Achievements !== 'undefined') {
                this.achievements = new Achievements(this.audioManager);
            }
        } catch (e) {
            try { if (typeof Config !== 'undefined' && Config.DEBUG) console.warn('Achievements init failed', e); } catch (err) { __err('game', err); }
            this.achievements = null;
        }


        // Game state
        this.state = "MENU"; // MENU, PLAYING, PAUSED, GAME_OVER
        this.score = 0;
        this.lives = 3;

        // Game Over lockout: timestamp (ms) when GAME_OVER was entered.
        // Input is blocked until GAME_OVER_LOCKOUT seconds have elapsed.
        this._gameOverTime = 0;

        // Respawn/death flow
        this.isRespawning = false;
        this.respawnTimer = 0;
        this._pendingRespawn = null;

        // Game statistics for high scores and achievements
        this.gameStats = {
            startTime: 0,
            timeSurvived: 0,
            enemiesDefeated: 0,
            maxCombo: 0,
            currentCombo: 0,
            comboMultiplier: 1.0,
            bestMultiplier: 1.0,
            multiKills: 0,
            totalDamage: 0,
            attacksAttempted: 0,
            attacksHit: 0,
            accuracy: 0,
            // New achievement tracking
            damageTaken: 0,
            levelsCompleted: 0,
            perfectLevels: 0,
            levelDamageTaken: 0,  // Reset per level
            idolsCollected: 0,
            idolSetsCompleted: 0,
            totalIdolsCollected: 0,  // Across all runs
            gameCompleted: false,
            completionTime: 0,  // Time to beat entire game
            fastestCompletion: Infinity  // Best speedrun time
        };

        // Level timer
        this.levelStartTime = 0;
        this.levelTime = 0;

        // Visual effects
        this.screenShake = null;
        this.hitPauseTimer = 0;
        this.damageNumbers = [];
        this.hitSparks = [];
        this._scorePulse = 0;
        this.movementFX = new MovementFX();

        // Initialize game components
        this.player = new Player(100, 500, this.audioManager);
        this.level = new Level(this.width, this.height);
        // Keep a flag so Level can reduce visual complexity on mobile
        this.level.useMobileOptimizations = this.isMobile;
        // Set background parallax based on mobile/desktop
        this.level.backgroundParallax = this.isMobile ? (Config.BACKGROUND_PARALLAX_MOBILE || 0.25) : (Config.BACKGROUND_PARALLAX || 0.5);
        // Prefer tile-based platform rendering if tile assets are available
        this.level.tileMode = 'tiles';

        // Initialize Level logic
        this.currentLevelIndex = 0;
        // Arcade is short (6 levels): no continue/progress system.
        this.savedLevelIndex = 0;
        
        // Load the first level
        // (LEVEL_CONFIGS is defined in levelData.js)
        if (typeof LEVEL_CONFIGS !== 'undefined' && LEVEL_CONFIGS.length > 0) {
            this.loadLevel(this.currentLevelIndex);
        } else {
            console.warn('LEVEL_CONFIGS not found, falling back to default level.');
            // Fallback default level data
            const worldWidth = Math.max(this.width * 2, 1920);
            const levelData = {
                width: worldWidth,
                height: this.height,
                background: 'bg_forest',
                backgroundLayers: [],
                spawnPoints: [ { x: 'right', y: 300 }, { x: Math.floor(worldWidth / 2), y: 300 }, { x: 'left', y: 300 } ],
                platforms: [
                    { x: 0, y: 700, width: worldWidth, height: 40, type: 'static', tile: 'ground_tile' },
                    { x: 120, y: 584, width: 220, height: 24, type: 'static', tile: 'platform_tile' }
                ]
            };
            this.level.loadLevel(levelData);
        }

        this.enemyManager = new EnemyManager(this.audioManager);
        this.itemManager = new ItemManager(this.audioManager);
        // Link itemManager to enemyManager for item drops
        if (this.enemyManager) this.enemyManager.itemManager = this.itemManager;
        this.ui = new UI(this.width, this.height);

        // Golden idol collection tracking (per-run)
        this.idolProgress = {};
        this.currentLevelId = null;

        // If the first level was loaded before itemManager existed, spawn its idols now
        try {
            if (typeof LEVEL_CONFIGS !== 'undefined' && LEVEL_CONFIGS[this.currentLevelIndex]) {
                const config = LEVEL_CONFIGS[this.currentLevelIndex];
                this.currentLevelId = config.id || `level_${this.currentLevelIndex + 1}`;
                const idolSpawns = Array.isArray(config.idols) ? config.idols : [];
                if (!this.idolProgress[this.currentLevelId]) {
                    this.idolProgress[this.currentLevelId] = idolSpawns.map(() => false);
                }
                if (this.itemManager && typeof this.itemManager.spawnGoldenIdol === 'function') {
                    idolSpawns.forEach((spawn, idx) => {
                        const alreadyCollected = this.idolProgress[this.currentLevelId] && this.idolProgress[this.currentLevelId][idx];
                        if (!alreadyCollected && spawn && typeof spawn.x === 'number' && typeof spawn.y === 'number') {
                            this.itemManager.spawnGoldenIdol(spawn.x, spawn.y, idx, this.currentLevelId);
                        }
                    });
                    
                    // Spawn speed boost power-ups
                    const speedBoostSpawns = Array.isArray(config.speedBoosts) ? config.speedBoosts : [];
                    speedBoostSpawns.forEach((spawn) => {
                        if (spawn && typeof spawn.x === 'number' && typeof spawn.y === 'number') {
                            this.itemManager.spawnSpeedBoost(spawn.x, spawn.y);
                        }
                    });
                    
                    // Spawn damage boost power-ups
                    const damageBoostSpawns = Array.isArray(config.damageBoosts) ? config.damageBoosts : [];
                    damageBoostSpawns.forEach((spawn) => {
                        if (spawn && typeof spawn.x === 'number' && typeof spawn.y === 'number') {
                            this.itemManager.spawnDamageBoost(spawn.x, spawn.y);
                        }
                    });
                    
                    // Spawn skunk power-ups
                    const skunkPowerupSpawns = Array.isArray(config.skunkPowerups) ? config.skunkPowerups : [];
                    skunkPowerupSpawns.forEach((spawn) => {
                        if (spawn && typeof spawn.x === 'number' && typeof spawn.y === 'number') {
                            this.itemManager.spawnSkunkPowerup(spawn.x, spawn.y);
                        }
                    });
                }
            }
        } catch (e) { __err('game', e); }

        // Camera
        this.cameraX = 0;
        this.cameraY = 0;

        // Expose a minimal pan helper for debugging/manual pan
        if (typeof window !== 'undefined') {
            try {
                window.gamePan = (dx) => { this.panCamera(dx); };
                window.toggleGamePause = () => { try { this.togglePause(); } catch (e) { __err('game', e); } };
            } catch (e) {
                // ignore strict contexts
            }
        }

        // Input handling
        this._touchKeys = new Set();
        this.setupInput();

        // Debug helpers
        this.debugOverlay = false;
        this.levelDebugVisuals = false; // show spawn visuals
        if (typeof window !== 'undefined') {
            try {
                window.snapCameraToRight = () => { this.cameraX = Math.max(0, this.level.width - (this.viewWidth || this.width)); };
                window.snapCameraToLeft = () => { this.cameraX = 0; };
                window.toggleCameraDebug = () => { this.debugOverlay = !this.debugOverlay; };
                window.rebuildStaticLayer = () => { try { if (this.level && typeof this.level.renderStaticLayer === 'function') this.level.renderStaticLayer(this.viewWidth, this.viewHeight); } catch (e) { console.warn('rebuildStaticLayer failed', e); } };

                window.toggleHitboxes = (enable) => {
                    try {
                        if (typeof Config === 'undefined') return;
                        if (typeof enable === 'boolean') Config.SHOW_HITBOXES = enable;
                        else Config.SHOW_HITBOXES = !Config.SHOW_HITBOXES;
                        try { localStorage.setItem('hitboxes', Config.SHOW_HITBOXES ? '1' : '0'); } catch (e) { __err('game', e); }
                        console.log('SHOW_HITBOXES =', !!Config.SHOW_HITBOXES);
                    } catch (e) { console.warn('toggleHitboxes failed', e); }
                };

                window.toggleLevelDebugVisuals = (enable) => {
                    try {
                        if (typeof enable === 'boolean') this.levelDebugVisuals = enable;
                        else this.levelDebugVisuals = !this.levelDebugVisuals;
                        console.log('levelDebugVisuals =', this.levelDebugVisuals);
                    } catch (e) { console.warn('toggleLevelDebugVisuals failed', e); }
                };

                // Debug: spawn health regen item at player location
                window.spawnHealthRegen = (x, y) => {
                    try {
                        if (!this.itemManager) return console.warn('itemManager not initialized');
                        const px = (typeof x === 'number') ? x : (this.player ? this.player.x : 100);
                        const py = (typeof y === 'number') ? y : (this.player ? this.player.y : 300);
                        this.itemManager.spawnHealthRegen(px, py);
                        console.log('Spawned health regen at', px, py);
                    } catch (e) { console.warn('spawnHealthRegen failed', e); }
                };

                // Debug: spawn extra life at player location
                window.spawnExtraLife = (x, y) => {
                    try {
                        if (!this.itemManager) return console.warn('itemManager not initialized');
                        const px = (typeof x === 'number') ? x : (this.player ? this.player.x : 100);
                        const py = (typeof y === 'number') ? y : (this.player ? this.player.y : 300);
                        this.itemManager.spawnExtraLife(px, py);
                        console.log('Spawned extra life at', px, py);
                    } catch (e) { console.warn('spawnExtraLife failed', e); }
                };
                
                // Debug: spawn skunk power-up at player location
                window.spawnSkunkPowerup = (x, y) => {
                    try {
                        if (!this.itemManager) return console.warn('itemManager not initialized');
                        const px = (typeof x === 'number') ? x : (this.player ? this.player.x : 100);
                        const py = (typeof y === 'number') ? y : (this.player ? this.player.y : 300);
                        this.itemManager.spawnSkunkPowerup(px, py);
                        console.log('Spawned skunk power-up at', px, py);
                    } catch (e) { console.warn('spawnSkunkPowerup failed', e); }
                };
            } catch (e) { __err('game', e); }
        }
    }

    _clearAllInput() {
        try {
            // Clear any active touch keys from the split-screen touch controls
            if (this._touchKeys && this._touchKeys.clear) this._touchKeys.clear();
        } catch (e) { __err('game', e); }

        try {
            if (this.player) {
                if (typeof this.player.clearInputState === 'function') this.player.clearInputState();
                // Stop any lingering movement immediately (prevents "auto-run")
                this.player.targetVelocityX = 0;
                this.player.velocityX = 0;
            }
        } catch (e) { __err('game', e); }
    }

    
        setupInput() {
            // Normalize input and use consistent keys (use event.code when available)
            const normalize = (ev) => {
                // Prefer event.code (hardware key) when present; fall back to event.key.
                const code = (ev.code || '').toLowerCase();
                const key = (ev.key || '').toLowerCase();
                if (code) return code;
                // Normalize space key variants (' ', 'Spacebar') to 'space'
                if (key === ' ' || key === 'spacebar' || key === 'space') return 'space';
                // Keep named keys like 'arrowleft' etc.
                return key;
            };

            // Key down handler
            window.addEventListener('keydown', (event) => {
                const key = normalize(event);
                try { if (typeof Config !== 'undefined' && Config.DEBUG && typeof console !== 'undefined' && console.log) console.log('Game.keydown', { key, state: this.state }); } catch (e) { __err('game', e); }

                // Prevent default for primary game keys
                if (['space', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
                    event.preventDefault();
                }

                // Global controls
                    if (key === 'escape') {
                        this.togglePause();
                    } else if (key === 'enter' || key === 'space') {
                    // Enter or Space can start/restart the game (Space
                    // enables A-button on gamepads to initiate gameplay
                    // without requiring a keyboard or touch input).
                    if (this.state === 'MENU' || this.state === 'VICTORY') {
                        this.audioManager.playSound && this.audioManager.playSound('ui_confirm');
                        this.startGame(0);
                        this.dispatchGameStateChange();
                        try { this.dispatchScoreChange && this.dispatchScoreChange(); } catch (e) { __err('game', e); }
                    } else if (this.state === 'GAME_OVER') {
                        // Respect lockout period so player can see game over stats
                        if (this._isGameOverLocked()) return;
                        this.audioManager.playSound && this.audioManager.playSound('ui_confirm');
                        this.startGame(0);
                        this.dispatchGameStateChange();
                        try { this.dispatchScoreChange && this.dispatchScoreChange(); } catch (e) { __err('game', e); }
                    }
                }

                // Gameplay controls
                if (this.state === 'PLAYING') {
                    this.player.handleInput(key, true);
                }

                // Debug shortcuts (always active)
                if (key === 'bracketright') {
                    // snap camera to right
                    this.cameraX = Math.max(0, this.level.width - (this.viewWidth || this.width));
                } else if (key === 'bracketleft') {
                    this.cameraX = 0;
                } else if (key === 'keyo') {
                    this.debugOverlay = !this.debugOverlay;
                } else if (key === 'keyh') {
                    // Toggle hitbox visualization without enabling all debug logging
                    try {
                        if (typeof Config !== 'undefined') {
                            Config.SHOW_HITBOXES = !Config.SHOW_HITBOXES;
                            try { localStorage.setItem('hitboxes', Config.SHOW_HITBOXES ? '1' : '0'); } catch (e) { __err('game', e); }
                            console.log('SHOW_HITBOXES =', !!Config.SHOW_HITBOXES);
                        }
                    } catch (e) { __err('game', e); }
                }
            });

            // If the window loses focus, keyup events may never fire.
            // Clear input to avoid stuck movement when returning.
            window.addEventListener('blur', () => {
                this._clearAllInput();
            });

            // Also clear input when the tab is hidden.
            document.addEventListener('visibilitychange', () => {
                try {
                    if (document.hidden) this._clearAllInput();
                } catch (e) { __err('game', e); }
            });

            // Listen for on-screen touch UI events
            window.addEventListener('touchcontrol', (ev) => {
                if (!ev || !ev.detail) return;
                const { action, down } = ev.detail;
                // Map actions to expected keys handled by Player
                if (action === 'left') {
                    this.player.handleInput('arrowleft', down);
                } else if (action === 'right') {
                    this.player.handleInput('arrowright', down);
                } else if (action === 'jump') {
                    if (down) this.player.handleInput('space', true);
                    else this.player.handleInput('space', false);
                } else if (action === 'attack') {
                    if (down) this.player.handleInput('keyx', true);
                    else this.player.handleInput('keyx', false);
                } else if (action === 'special') {
                    if (down) this.player.handleInput('keyz', true);
                    else this.player.handleInput('keyz', false);
                } else if (action === 'pause') {
                    // Toggle pause on button down (single press)
                    if (down) this.togglePause();
                }
                else if (action === 'restart') {
                    if (down && this.state === 'GAME_OVER') {
                        // Respect lockout period
                        if (this._isGameOverLocked()) return;
                        // Restart the game
                        this.startGame();
                        // Hide any overlays if present
                        const overlay = document.getElementById('mobile-restart-overlay');
                        if (overlay) overlay.style.display = 'none';
                    }
                }
            });

            // Key up handler
            window.addEventListener('keyup', (event) => {
                const key = normalize(event);
                if (this.state === 'PLAYING') {
                    this.player.handleInput(key, false);
                }
            });

            // Touch controls for mobile: simple split-area controls
            const setTouchKey = (k, down) => {
                if (down) {
                    this._touchKeys.add(k);
                    this.player.handleInput(k, true);
                } else {
                    if (this._touchKeys.has(k)) {
                        this._touchKeys.delete(k);
                        this.player.handleInput(k, false);
                    }
                }
            };

            const onTouchStart = (ev) => {
                if (!ev) return;
                ev.preventDefault();
                
                // Allow tapping to start/restart in non-playing states
                if (this.state === 'MENU' || this.state === 'VICTORY') {
                    this.audioManager.playSound && this.audioManager.playSound('ui_confirm');
                    this.startGame(0);
                    return;
                }
                if (this.state === 'GAME_OVER') {
                    // Respect lockout period
                    if (this._isGameOverLocked()) return;
                    this.audioManager.playSound && this.audioManager.playSound('ui_confirm');
                    this.startGame(0);
                    return;
                }

                const rect = this.canvas.getBoundingClientRect();
                const touches = Array.from(ev.touches || []);

                if (touches.length >= 2) {
                    // Two-finger = attack
                    setTouchKey('keyx', true);
                    return;
                }

                for (const t of touches) {
                    const x = t.clientX - rect.left;
                    const w = rect.width;
                    if (x < w * 0.33) {
                        setTouchKey('arrowleft', true);
                    } else if (x > w * 0.66) {
                        setTouchKey('arrowright', true);
                    } else {
                        setTouchKey('space', true); // jump
                    }
                }
            };

            const onTouchMove = (ev) => {
                if (!ev) return;
                ev.preventDefault();
                const rect = this.canvas.getBoundingClientRect();
                const touches = Array.from(ev.touches || []);
                // Clear directional touch keys first
                setTouchKey('arrowleft', false);
                setTouchKey('arrowright', false);
                setTouchKey('space', false);

                if (touches.length >= 2) {
                    setTouchKey('keyx', true);
                    return;
                }

                for (const t of touches) {
                    const x = t.clientX - rect.left;
                    const w = rect.width;
                    if (x < w * 0.33) {
                        setTouchKey('arrowleft', true);
                    } else if (x > w * 0.66) {
                        setTouchKey('arrowright', true);
                    } else {
                        setTouchKey('space', true);
                    }
                }
            };

            const clearTouchKeys = () => {
                for (const k of Array.from(this._touchKeys)) {
                    setTouchKey(k, false);
                }
            };

            this.canvas.addEventListener('touchstart', onTouchStart, { passive: false });
            this.canvas.addEventListener('touchmove', onTouchMove, { passive: false });
            this.canvas.addEventListener('touchend', (e) => { e.preventDefault(); clearTouchKeys(); }, { passive: false });
            this.canvas.addEventListener('touchcancel', (e) => { e.preventDefault(); clearTouchKeys(); }, { passive: false });

            // Also listen for click / pointerdown on the canvas.
            // On Meta Quest / Oculus, the VR controllers act as laser
            // pointers that generate pointer & click events (NOT touch
            // events).  Without this handler the laser click on the canvas
            // does nothing in MENU / GAME_OVER states.
            const onCanvasClick = (ev) => {
                if (!ev) return;
                // Start / restart in non-playing states
                if (this.state === 'MENU' || this.state === 'VICTORY') {
                    this.audioManager.playSound && this.audioManager.playSound('ui_confirm');
                    this.startGame(0);
                    this.dispatchGameStateChange();
                    try { this.dispatchScoreChange && this.dispatchScoreChange(); } catch (e) { __err('game', e); }
                    return;
                }
                if (this.state === 'GAME_OVER') {
                    if (this._isGameOverLocked()) return;
                    this.audioManager.playSound && this.audioManager.playSound('ui_confirm');
                    this.startGame(0);
                    this.dispatchGameStateChange();
                    try { this.dispatchScoreChange && this.dispatchScoreChange(); } catch (e) { __err('game', e); }
                    return;
                }
            };
            this.canvas.addEventListener('click', onCanvasClick);
            this.canvas.addEventListener('pointerdown', (ev) => {
                // Only handle primary button (trigger on VR laser)
                if (ev.button !== 0) return;
                // For playing state, map pointer position to left/right/jump
                if (this.state === 'PLAYING') {
                    const rect = this.canvas.getBoundingClientRect();
                    const x = ev.clientX - rect.left;
                    const w = rect.width;
                    if (x < w * 0.33) {
                        setTouchKey('arrowleft', true);
                    } else if (x > w * 0.66) {
                        setTouchKey('arrowright', true);
                    } else {
                        setTouchKey('space', true);
                    }
                }
            });
            this.canvas.addEventListener('pointerup', () => {
                // Release any keys set via pointer
                clearTouchKeys();
            });
            }

        // Start or restart the game (New Game)
        async startGame(levelIndex = 0) {
            if (typeof Config !== 'undefined' && Config.DEBUG) console.log('Game.startGame() called, level:', levelIndex);

            // Prevent delayed death stingers from a previous run bleeding into a new start.
            try { this.audioManager && this.audioManager.cancelDeathSequence && this.audioManager.cancelDeathSequence(); } catch (e) { __err('game', e); }
            
            // Start with a fade in
            this.transitionState = 'FADE_IN';
            this.transitionAlpha = 1.0;
            this.transitionTimer = 0;
            this.transitionDuration = 1.0;
            
            // If starting a new game (level 0), reset progress unless this logic is handled elsewhere
            // But we want to allow replaying unlocked levels? For now, standard arcade: unlocked levels are checkpoints.
            
            this.state = 'PLAYING';
            this.score = 0;
            this.lives = 3;
            this._gameOverTime = 0; // Clear lockout from previous game over
            
            // Set a game-level grace period timestamp - player cannot die before this time
            this._gameStartTime = Date.now();
            this._gracePeriodMs = 2500; // 2.5 seconds of absolute invincibility
            
            // Notify UI immediately so touch controls can show without waiting on async music.
            this.dispatchGameStateChange();
            
            // Boss state
            this.bossEncountered = false;
            this.bossDefeated = false;
            this.isRespawning = false;
            this.respawnTimer = 0;
            this._pendingRespawn = null;
            
            // Reset game statistics
            this.gameStats = {
                startTime: Date.now() / 1000, // Convert to seconds
                timeSurvived: 0,
                enemiesDefeated: 0,
                maxCombo: 0,
                currentCombo: 0,
                comboMultiplier: 1.0,
                bestMultiplier: 1.0,
                multiKills: 0,
                totalDamage: 0,
                attacksAttempted: 0,
                attacksHit: 0,
                accuracy: 0,
                damageTaken: 0,
                levelsCompleted: 0,
                perfectLevels: 0,
                levelDamageTaken: 0,
                idolsCollected: 0,
                idolSetsCompleted: 0,
                totalIdolsCollected: parseInt(localStorage.getItem('totalIdolsCollected') || '0'),
                gameCompleted: false,
                completionTime: 0,
                fastestCompletion: parseFloat(localStorage.getItem('fastestCompletion')) || Infinity
            };

            // Reset idol tracking for a new run
            this.idolProgress = {};
            this.currentLevelId = null;
            
            if (this.player && typeof this.player.reset === 'function') this.player.reset();
            if (this.enemyManager && typeof this.enemyManager.reset === 'function') this.enemyManager.reset();
            if (this.itemManager && typeof this.itemManager.reset === 'function') this.itemManager.reset();
            this.damageNumbers = [];
            this.hitSparks = [];
            
            // Give player brief invulnerability on game start to prevent spawn collision bugs
            if (this.player) {
                this.player.invulnerableTimer = 1.5;
            }

            // Load the level after resets so idol spawns are preserved
            this.loadLevel(levelIndex);
            // Place player at a spawn point near the level start.
            // (Previous logic spawned on the rightmost platform on desktop, which can
            // unintentionally drop you into the boss arena on long levels.)
            if (this.level && this.level.platforms && this.level.platforms.length > 0) {
                let spawnPlatform = null;
                try {
                    const nonGroundPlatforms = this.level.platforms.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.width === 'number' && !(p.y >= this.level.height - 40 && p.width >= this.level.width * 0.8));
                    if (nonGroundPlatforms.length > 0) {
                        // Prefer an early platform within the first ~20% of the level.
                        const earlyLimit = Math.max(800, Math.floor(this.level.width * 0.2));
                        const earlyPlatforms = nonGroundPlatforms.filter(p => p && typeof p.x === 'number' && p.x >= 0 && p.x <= earlyLimit);
                        const pool = (earlyPlatforms.length > 0) ? earlyPlatforms : nonGroundPlatforms;
                        if (pool.length > 0) {
                            spawnPlatform = pool.reduce((a, b) => (b.x < a.x ? b : a), pool[0]);
                        }
                    }
                } catch (e) {
                    console.warn('Error finding spawn platform:', e);
                    spawnPlatform = null;
                }
                
                // Only set spawn position if we found a valid platform
                if (spawnPlatform && typeof spawnPlatform.x === 'number' && typeof spawnPlatform.y === 'number' && typeof spawnPlatform.width === 'number') {
                    const spawnX = Math.floor(spawnPlatform.x + (spawnPlatform.width - this.player.width) / 2);
                    const spawnY = spawnPlatform.y - this.player.height - 8;
                    this.player.x = spawnX;
                    this.player.y = spawnY;
                    if (typeof Config !== 'undefined' && Config.DEBUG) console.log('Spawn placed on platform at', this.player.x, this.player.y, 'platform:', spawnPlatform.x, spawnPlatform.y, spawnPlatform.width, spawnPlatform.height);
                } else {
                    // Fallback if no suitable platform found
                    this.player.x = 100;
                    this.player.y = Math.max(100, this.height - this.player.height - 100);
                    if (typeof Config !== 'undefined' && Config.DEBUG) console.log('Using fallback spawn position:', this.player.x, this.player.y);
                }
            } else {
                // No platforms available - use safe fallback
                this.player.x = 100;
                this.player.y = Math.max(100, this.height - this.player.height - 100);
                if (typeof Config !== 'undefined' && Config.DEBUG) console.log('No platforms found, using fallback spawn:', this.player.x, this.player.y);
            }
            // Validate player state after initialization
            if (!this.player || typeof this.player.x !== 'number' || typeof this.player.y !== 'number' || isNaN(this.player.x) || isNaN(this.player.y)) {
                console.error('Player position is invalid after startGame!', { x: this.player?.x, y: this.player?.y });
                // Force safe position
                if (this.player) {
                    this.player.x = 100;
                    this.player.y = 300;
                }
            }
            if (this.player && (typeof this.player.health !== 'number' || this.player.health <= 0 || isNaN(this.player.health))) {
                console.error('Player health is invalid after startGame!', { health: this.player.health, maxHealth: this.player.maxHealth });
                // Force valid health
                this.player.health = this.player.maxHealth || 80;
            }
            
            // Log detailed game start state
            console.log('=== GAME START DEBUG ===');
            console.log('Player state:', { 
                pos: { x: this.player.x, y: this.player.y }, 
                health: this.player.health,
                maxHealth: this.player.maxHealth,
                invulnerable: this.player.invulnerableTimer,
                isDying: this.player.isDying
            });
            console.log('Enemy state:', {
                count: this.enemyManager.enemies.length,
                spawningEnabled: this.enemyManager.spawningEnabled,
                spawnTimer: this.enemyManager.spawnTimer,
                spawnInterval: this.enemyManager.spawnInterval
            });
            console.log('Level:', { 
                width: this.level.width, 
                height: this.level.height,
                platforms: this.level.platforms?.length || 0
            });
            console.log('======================');
        
            // Stop menu music before starting level music
            this.stopMenuMusic();
            this.audioManager && this.audioManager.stopAmbient && this.audioManager.stopAmbient();
            await this.ensureLevelMusic();
            this.dispatchGameStateChange();
            // Ensure camera centers on player immediately after starting
            try { if (typeof this.centerCameraOnPlayer === 'function') this.centerCameraOnPlayer(); } catch (e) { __err('game', e); }
            // Pre-render static layer (platform tiles) so visuals are ready
            try { if (this.level && typeof this.level.renderStaticLayer === 'function') this.level.renderStaticLayer(this.viewWidth, this.viewHeight); } catch (e) { __err('game', e); }
        }

        // Key up handler
        handleKeyUp(event) {
            // console debug for input handling
            // console.log('handleKeyUp', event.key);
            const key = event.key;
            if (this.state === 'PLAYING') {
                this.player.handleInput(key, false);
            }
        }

        // Notify UI layers about state change
        dispatchGameStateChange() {
            const event = new CustomEvent('gameStateChange', { detail: { state: this.state } });
            window.dispatchEvent(event);
        }

        // Notify UI layers about score updates
        dispatchScoreChange() {
            try {
                const ev = new CustomEvent('scoreChange', { detail: { score: this.score } });
                window.dispatchEvent(ev);
            } catch (e) { /* ignore */ }
        }

        togglePause() {
            if (this.state === 'PLAYING') {
                this.state = 'PAUSED';
                try { window && window.logTouchControlEvent && window.logTouchControlEvent('togglePause', { from: 'PLAYING', to: 'PAUSED' }); } catch (e) { __err('game', e); }
                this.audioManager.playSound && this.audioManager.playSound('pause');
                this.audioManager.pauseMusic && this.audioManager.pauseMusic();
                this.audioManager.pauseAmbient && this.audioManager.pauseAmbient();
                // Show pause overlay when available (keeps gameplay UI clean; hosts pause actions)
                const overlay = document.getElementById('pause-overlay');
                if (overlay) overlay.style.display = 'flex';
                // Sync volume sliders with current values
                try {
                    const sfxSlider = document.getElementById('sfx-volume');
                    const musicSlider = document.getElementById('music-volume');
                    if (sfxSlider) sfxSlider.value = Math.round((this.audioManager._pendingSfxVol != null ? this.audioManager._pendingSfxVol : 0.7) * 100);
                    if (musicSlider) musicSlider.value = Math.round((this.audioManager._pendingMusicVol != null ? this.audioManager._pendingMusicVol : 0.5) * 100);
                    const sfxVal = document.getElementById('sfx-volume-value');
                    const musicVal = document.getElementById('music-volume-value');
                    if (sfxVal && sfxSlider) sfxVal.textContent = sfxSlider.value + '%';
                    if (musicVal && musicSlider) musicVal.textContent = musicSlider.value + '%';
                } catch (e) { __err('game', e); }
                this.dispatchGameStateChange();
            } else if (this.state === 'PAUSED') {
                this.state = 'PLAYING';
                try { window && window.logTouchControlEvent && window.logTouchControlEvent('togglePause', { from: 'PAUSED', to: 'PLAYING' }); } catch (e) { __err('game', e); }
                this.audioManager.playSound && this.audioManager.playSound('ui_back');
                this.audioManager.unpauseMusic && this.audioManager.unpauseMusic();
                this.audioManager.unpauseAmbient && this.audioManager.unpauseAmbient();
                // Hide pause overlay
                const overlay = document.getElementById('pause-overlay');
                if (overlay) overlay.style.display = 'none';
                this.dispatchGameStateChange();
            }
        }

        async ensureLevelMusic() {
            if (!this.audioManager) return;
            
            // Get music options from level config, default to gameplay
            const config = LEVEL_CONFIGS[this.currentLevelIndex];
            const musicOptions = (config && Array.isArray(config.music) && config.music.length > 0)
                ? config.music
                : ['gameplay'];
            
            // Randomly select a track from available options
            const musicName = musicOptions[Math.floor(Math.random() * musicOptions.length)];
            const musicPath = `assets/audio/music/${musicName}.wav`;

            if (!this.audioManager.musicElements[musicName]) {
                try {
                    await this.audioManager.loadMusic(musicName, musicPath);
                } catch (e) {
                    console.warn('Failed to load music:', musicName, e);
                }
            }

            this.audioManager.playMusic && this.audioManager.playMusic(musicName, true);

            // Load and play ambient sound based on level background type
            this._ensureLevelAmbient();
        }

        /** Determine and play appropriate ambient sound for the current level */
        async _ensureLevelAmbient() {
            if (!this.audioManager || !this.audioManager.playAmbient) return;
            const config = LEVEL_CONFIGS[this.currentLevelIndex];
            if (!config) return;

            // Map background types to ambient tracks
            const bgType = (config.background || '').toLowerCase();
            let ambientName = null;
            if (bgType.includes('forest') || bgType.includes('grass') || bgType.includes('park')) {
                ambientName = 'ambient_forest';
            } else if (bgType.includes('cave') || bgType.includes('dungeon') || bgType.includes('underground')) {
                ambientName = 'ambient_cave_deep';
            } else if (bgType.includes('city') || bgType.includes('urban') || bgType.includes('street') || bgType.includes('rooftop') || bgType.includes('neon')) {
                ambientName = 'ambient_city';
            } else if (bgType.includes('mountain') || bgType.includes('dojo')) {
                ambientName = 'ambient_forest';
            }
            // Also check level music array for hints
            if (!ambientName && config.music) {
                const musicStr = config.music.join(' ').toLowerCase();
                if (musicStr.includes('cave') || musicStr.includes('ambient_cave')) ambientName = 'ambient_cave_deep';
                else if (musicStr.includes('city')) ambientName = 'ambient_city';
                else if (musicStr.includes('forest')) ambientName = 'ambient_forest';
            }
            // Default to forest for early levels, city for later
            if (!ambientName) {
                ambientName = (this.currentLevelIndex >= 7) ? 'ambient_city' : 'ambient_forest';
            }

            const ambientPath = `assets/audio/music/${ambientName}.wav`;
            try {
                await this.audioManager.loadAmbient(ambientName, ambientPath);
                this.audioManager.playAmbient(ambientName, true);
            } catch (e) {
                console.warn('Failed to load ambient:', ambientName, e);
            }
        }

        /** Load and play the menu theme music */
        async playMenuMusic() {
            if (!this.audioManager) return;
            try {
                if (!this.audioManager.musicElements['menu_theme']) {
                    await this.audioManager.loadMusic('menu_theme', 'assets/audio/music/menu_theme.wav');
                }
                this.audioManager.playMusic('menu_theme', true);
            } catch (e) {
                console.warn('Failed to load menu music:', e);
            }
        }

        /** Stop menu music (called when game starts) */
        stopMenuMusic() {
            if (!this.audioManager) return;
            this.audioManager.stopMusic && this.audioManager.stopMusic();
        }

        /**
         * Load a specific level by index from LEVEL_CONFIGS
         * @param {number} index 
         */
        loadLevel(index) {
            if (typeof LEVEL_CONFIGS === 'undefined' || !LEVEL_CONFIGS[index]) {
                console.error('Level not found:', index);
                return;
            }

            const config = LEVEL_CONFIGS[index];
            if (typeof Config !== 'undefined' && Config.DEBUG) console.log(`Loading Level ${index + 1}: ${config.name}`);
            
            this.level.loadLevel(config);
            this.currentLevelIndex = index;
            this.currentLevelId = config.id || `level_${index + 1}`;

            if (!this.idolProgress) this.idolProgress = {};

            // Reset items on level load and spawn golden idols
            if (this.itemManager && typeof this.itemManager.reset === 'function') {
                this.itemManager.reset();
            }

            const idolSpawns = Array.isArray(config.idols) ? config.idols : [];
            if (!this.idolProgress[this.currentLevelId]) {
                this.idolProgress[this.currentLevelId] = idolSpawns.map(() => false);
            }

            if (this.itemManager && typeof this.itemManager.spawnGoldenIdol === 'function') {
                idolSpawns.forEach((spawn, idx) => {
                    const alreadyCollected = this.idolProgress[this.currentLevelId] && this.idolProgress[this.currentLevelId][idx];
                    if (!alreadyCollected && spawn && typeof spawn.x === 'number' && typeof spawn.y === 'number') {
                        this.itemManager.spawnGoldenIdol(spawn.x, spawn.y, idx, this.currentLevelId);
                    }
                });
                
                // Spawn speed boost power-ups
                const speedBoostSpawns = Array.isArray(config.speedBoosts) ? config.speedBoosts : [];
                speedBoostSpawns.forEach((spawn) => {
                    if (spawn && typeof spawn.x === 'number' && typeof spawn.y === 'number') {
                        this.itemManager.spawnSpeedBoost(spawn.x, spawn.y);
                    }
                });
                
                // Spawn damage boost power-ups
                const damageBoostSpawns = Array.isArray(config.damageBoosts) ? config.damageBoosts : [];
                damageBoostSpawns.forEach((spawn) => {
                    if (spawn && typeof spawn.x === 'number' && typeof spawn.y === 'number') {
                        this.itemManager.spawnDamageBoost(spawn.x, spawn.y);
                    }
                });
                
                // Spawn skunk power-ups
                const skunkPowerupSpawns = Array.isArray(config.skunkPowerups) ? config.skunkPowerups : [];
                skunkPowerupSpawns.forEach((spawn) => {
                    if (spawn && typeof spawn.x === 'number' && typeof spawn.y === 'number') {
                        this.itemManager.spawnSkunkPowerup(spawn.x, spawn.y);
                    }
                });
            }

            // Boss state is per-level; always reset when loading a new level.
            this.bossEncountered = false;
            this.bossDefeated = false;
            if (this.enemyManager) this.enemyManager.bossInstance = null;
            this.isRespawning = false;
            this.respawnTimer = 0;
            this._pendingRespawn = null;
            
            // Reset level timer
            this.levelStartTime = 0;
            this.levelTime = 0;
            
            // Reset level damage tracking
            try {
                this.gameStats.levelDamageTaken = 0;
            } catch (e) { __err('game', e); }
            
            // Reset music playback rate when loading new level
            if (this.audioManager && this.audioManager.resetMusicPlaybackRate) {
                this.audioManager.resetMusicPlaybackRate();
            }
            // Swap music based on level when transitioning.
            try { this.ensureLevelMusic(); } catch (e) { __err('game', e); }

            // Update Enemy settings
            if (this.enemyManager && config.enemyConfig) {
                this.enemyManager.spawnInterval = config.enemyConfig.spawnInterval || 3.0;
                this.enemyManager.maxEnemies = config.enemyConfig.maxEnemies || 5;
                // Update allowed types
                this.enemyManager.allowedEnemyTypes = config.enemyConfig.allowedTypes || null;
                this.enemyManager.spawningEnabled = true;
            }
            
            // Reset player position safely
            if (this.player) {
                this.player.x = 100;
                this.player.y = 500;
                this.player.velocityX = 0;
                this.player.velocityY = 0;
                this._clearAllInput();
                
                // Reset idol bonuses when starting a new level
                // (They are level-specific and should start fresh each level)
                this.player.idolBonuses = null;
            }

            // Show level toast if UI available
            // (Assumes UI has been updated to support this, or we can just log for now)
            try {
                if (this.ui && this.ui.showLevelTitle) {
                    this.ui.showLevelTitle(config.name, index + 1);
                }
            } catch (e) { __err('game', e); }
        }

        completeLevel() {
            if (this.state === 'LEVEL_COMPLETE') return;
            
            this.state = 'LEVEL_COMPLETE';
            if (typeof Config !== 'undefined' && Config.DEBUG) console.log('Level Complete!');
            this.audioManager.playSound && this.audioManager.playSound('level_complete', 0.8);
            
            // Track level completion and perfect runs
            try {
                this.gameStats.levelsCompleted++;
                if (this.gameStats.levelDamageTaken === 0) {
                    this.gameStats.perfectLevels++;
                }
            } catch (e) { __err('game', e); }
            
            // No progress/continue system: always play straight through.

            // Wait then transition
            setTimeout(() => {
                // Trigger Fade Out transition
               this.transitionState = 'FADE_OUT';
               this.transitionTimer = 0;
               this.transitionAlpha = 0;
               this.transitionDuration = 1.0;
            }, 2000);
        }

        victory() {
            this.state = 'VICTORY'; // Handle this in draw
            if (typeof Config !== 'undefined' && Config.DEBUG) console.log('GAME VICTORY!');

            // Mark completion for achievements
            try {
                this.gameStats.gameCompleted = true;
                this.gameStats.completionTime = (Date.now() / 1000) - this.gameStats.startTime;
                // Update fastest time
                try {
                    const savedFastest = parseFloat(localStorage.getItem('fastestCompletion')) || Infinity;
                    if (this.gameStats.completionTime < savedFastest) {
                        localStorage.setItem('fastestCompletion', this.gameStats.completionTime);
                        this.gameStats.fastestCompletion = this.gameStats.completionTime;
                    } else {
                        this.gameStats.fastestCompletion = savedFastest;
                    }
                } catch (e) { __err('game', e); }
            } catch (e) { __err('game', e); }

            // Check for completion achievement
            try {
                if (window.Highscores && typeof Highscores.checkAchievements === 'function') {
                    Highscores.checkAchievements(this.gameStats);
                }
            } catch (e) { __err('game', e); }

            // Stop gameplay music and play victory jingle if available
            try {
                if (this.audioManager) {
                    this.audioManager.stopMusic && this.audioManager.stopMusic();
                    if (this.audioManager.playSound) {
                        // Prefer a dedicated victory sound if present; falls back silently otherwise
                        try { this.audioManager.playSound('victory', 1.0); } catch (e) { __err('game', e); }
                    }
                }
            } catch (e) { __err('game', e); }

            // Notify any external UI
            try { this.dispatchGameStateChange && this.dispatchGameStateChange(); } catch (e) { __err('game', e); }

            // Finalize end-of-run statistics (mirrors GAME_OVER handling)
            try {
                this.gameStats.timeSurvived = (Date.now() / 1000) - this.gameStats.startTime;
                this.gameStats.enemiesDefeated = this.enemyManager.enemiesDefeated || 0;
                this.gameStats.maxCombo = Math.max(this.gameStats.maxCombo, this.player.comboCount || 0);
                this.gameStats.score = this.score;
            } catch (e) { __err('game', e); }

            // Achievement checks on successful clear
            try {
                if (window.Highscores && typeof Highscores.checkAchievements === 'function') {
                    const newAchievements = Highscores.checkAchievements(this.gameStats);
                    if (newAchievements && newAchievements.length > 0) {
                        if (typeof Config !== 'undefined' && Config.DEBUG) console.log('New achievements unlocked (victory):', newAchievements);
                    }
                }
            } catch (e) { console.warn('Achievement check (victory) failed', e); }

            // High score flow at campaign completion
            try {
                if (window.Highscores && typeof Highscores.isHighScore === 'function' && Highscores.isHighScore(this.score)) {
                    try {
                        Highscores.promptForInitials(this.score, this.gameStats, (updated) => {
                            try { this.dispatchScoreChange && this.dispatchScoreChange(); } catch (e) { __err('game', e); }
                            // If a DOM target exists, show the scoreboard there
                            try {
                                const target = document.getElementById('score-container') || document.getElementById('highscore-overlay');
                                if (target) {
                                    const board = Highscores.renderScoreboard(null, true);
                                    target.innerHTML = '';
                                    target.appendChild(board);
                                } else {
                                    if (typeof Config !== 'undefined' && Config.DEBUG) console.log('Highscores updated (victory)', updated);
                                }
                            } catch (e) { console.warn('Failed to render scoreboard (victory)', e); }
                        });
                    } catch (e) { console.warn('Highscores prompt (victory) failed', e); }
                }
            } catch (e) { /* ignore highscores errors */ }
        }

        update(dt) {
            // Handle transitions
            if (this.transitionState) {
                this.transitionTimer += dt;
                const progress = Math.min(1.0, this.transitionTimer / this.transitionDuration);
                
                if (this.transitionState === 'FADE_IN') {
                    // Fade from black (1.0) to transparent (0.0)
                    this.transitionAlpha = 1.0 - progress;
                    if (progress >= 1.0) {
                        this.transitionState = null;
                        this.transitionAlpha = 0;
                    }
                } else if (this.transitionState === 'FADE_OUT') {
                    // Fade from transparent (0.0) to black (1.0)
                    this.transitionAlpha = progress;
                    if (progress >= 1.0) {
                        this.transitionState = 'FADE_IN'; // Start fading in next frame
                        this.transitionTimer = 0;
                        this.transitionAlpha = 1.0;
                        
                        // Execute level switch
                        const nextIndex = this.currentLevelIndex + 1;
                        if (typeof LEVEL_CONFIGS !== 'undefined' && nextIndex < LEVEL_CONFIGS.length) {
                            this.loadLevel(nextIndex);
                            this.state = 'PLAYING';
                            if (this.enemyManager) this.enemyManager.spawnTimer = 0;
                        } else {
                            this.victory();
                            this.transitionState = null; // No fade in for victory screen
                        }
                    }
                }
                
                // If fading out, we might still want to update logic or pause it.
                // For now, let's allow logic to run but maybe freeze player input?
            }

            if (this.state !== "PLAYING") {
                if (this.state === "GAME_OVER" && this.player && typeof this.player.updateDeath === 'function') {
                    this.player.updateDeath(dt);
                }
                return;
            }

            // Boss Trigger Logic
            if (!this.bossEncountered && this.level.bossConfig && this.level.completionConfig) {
                const triggerX = this.level.completionConfig.bossTriggerX;
                if (this.player.x > triggerX) {
                    this.bossEncountered = true;
                    // Stop spawning regular enemies to focus on boss
                    if (this.enemyManager) {
                        this.enemyManager.spawningEnabled = false;
                        this.enemyManager.clearNonBossEnemies && this.enemyManager.clearNonBossEnemies();
                        this.enemyManager.spawnBoss(this.level.bossConfig, this.level);
                    }
                    
                    // Visual/Audio cue
                    try {
                        if (this.ui.showBossWarning) this.ui.showBossWarning();
                        // Boss spawn sound
                        if (this.audioManager && this.audioManager.playSound) {
                            const bossType = (this.enemyManager && this.enemyManager.bossInstance && this.enemyManager.bossInstance.enemyType)
                                || (this.level && this.level.bossConfig && this.level.bossConfig.type)
                                || 'BOSS';
                            const spawnSound = (bossType === 'BOSS2' || bossType === 'BOSS3' || bossType === 'BOSS4') ? 'boss2_spawn' : 'boss_spawn';
                            this.audioManager.playSound(spawnSound, 0.8);
                        }
                        // Switch to boss battle music
                        if (this.audioManager) {
                            (async () => {
                                try {
                                    if (!this.audioManager.musicElements['boss_battle']) {
                                        await this.audioManager.loadMusic('boss_battle', 'assets/audio/music/boss_battle.wav');
                                    }
                                    this.audioManager.playMusic('boss_battle', true);
                                    // Also increase playback rate for extra intensity
                                    if (this.audioManager.setMusicPlaybackRate) this.audioManager.setMusicPlaybackRate(1.5);
                                } catch (e) {
                                    // Fallback: just speed up current music
                                    if (this.audioManager.setMusicPlaybackRate) this.audioManager.setMusicPlaybackRate(2.0);
                                }
                            })();
                        }
                    } catch (e) { __err('game', e); }
                }
            }

            // Boss Defeat Logic
            if (this.bossEncountered && !this.bossDefeated) {
                // Check if boss instance is dead
                if (this.enemyManager.bossInstance && (this.enemyManager.bossInstance.health <= 0 || this.enemyManager.enemies.indexOf(this.enemyManager.bossInstance) === -1)) {
                     this.bossDefeated = true;
                         if (typeof Config !== 'undefined' && Config.DEBUG) console.log('Boss Defeated! Exit Unlocked.');
                     // Boss defeat sound
                     if (this.audioManager && this.audioManager.playSound) {
                         const bossType = (this.enemyManager && this.enemyManager.bossInstance && this.enemyManager.bossInstance.enemyType)
                             || (this.level && this.level.bossConfig && this.level.bossConfig.type)
                             || 'BOSS';
                        const defeatSound = (bossType === 'BOSS2' || bossType === 'BOSS3' || bossType === 'BOSS4') ? 'boss2_defeat' : 'boss_defeat';
                         this.audioManager.playSound(defeatSound, 0.9);
                     }
                            if (this.enemyManager) {
                                this.enemyManager.spawningEnabled = true;
                                this.enemyManager.bossInstance = null;
                                this.enemyManager.spawnTimer = 0;
                            // Reset music BPM and restore level music after boss defeat
                            if (this.audioManager && this.audioManager.resetMusicPlaybackRate) {
                                this.audioManager.resetMusicPlaybackRate();
                            }
                            // Switch back to level music
                            this.ensureLevelMusic();
                            }
                }
                
                // Arena Constraint: Prevent leaving until boss is defeated
                if (!this.bossDefeated && this.level.completionConfig) {
                    if (this.player.x > this.level.completionConfig.exitX) {
                        this.player.x = this.level.completionConfig.exitX;
                    }
                }
            }

            // Check Level Completion
            let exitX = this.level.width - 100;
            if (this.level.completionConfig) exitX = this.level.completionConfig.exitX;

            if (this.player.x > exitX) {
                // Double check boss (redundant with clamp, but safe)
                if (this.level.bossConfig && !this.bossDefeated) {
                    // Blocked
                } else {
                    this.completeLevel();
                    return;
                }
            }

            // Update game statistics
            // Start level timer on first frame of gameplay
            if (this.levelStartTime === 0) {
                this.levelStartTime = Date.now() / 1000;
            }
            this.levelTime = (Date.now() / 1000) - this.levelStartTime;
            
            this.gameStats.timeSurvived += dt;

            // Update screen shake
            if (this.screenShake) {
                this.screenShake.update(dt);
                if (!this.screenShake.isActive()) {
                    this.screenShake = null;
                }
            }

        // If player is in death animation waiting to respawn, update only death
        // animation and delay the rest of the frame.
        if (this.isRespawning) {
            try {
                if (this.player && typeof this.player.updateDeath === 'function') {
                    this.player.updateDeath(dt);
                }
            } catch (e) { __err('game', e); }

            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this._performRespawn();
            } else {
                return;
            }
        }

        // Update hit pause
        // Shadow Strike should not freeze the whole game loop on hits; it makes
        // the special feel sluggish and can tank perceived performance.
        if (this.hitPauseTimer > 0) {
            this.hitPauseTimer -= dt;
            if (!(this.player && this.player.isShadowStriking)) {
                return; // Pause game during hit pause
            }
        }

        // Update damage numbers and effects
        this.damageNumbers = this.damageNumbers.filter(dn => dn && typeof dn.isAlive === 'function' && dn.isAlive());
        for (const dn of this.damageNumbers) {
            if (dn && typeof dn.update === 'function') {
                dn.update(dt);
            }
        }

        this.hitSparks = this.hitSparks.filter(hs => hs.isAlive());
        for (const hs of this.hitSparks) {
            hs.update(dt);
        }
        if (this.movementFX && typeof this.movementFX.update === 'function') {
            this.movementFX.update(dt);
        }

        // Update player
        const prevOnGround = !!this.player.onGround;
        const prevVY = this.player.velocityY;
        this.player.update(dt, this.level);

        // Movement-based environmental effects
        try {
            if (this.movementFX && typeof this.movementFX.emitFromPlayer === 'function') {
                this.movementFX.emitFromPlayer(this.player, this.level, dt, { prevOnGround, prevVY });
            }
        } catch (e) { __err('game', e); }

        // Hazard collision checks disabled: hazards and related damage are removed.
        try {
            if (this.level && this.level.hazards && this.level.hazards.length > 0) {
                if (typeof Config !== 'undefined' && Config.DEBUG && typeof console !== 'undefined' && console.log) console.log('Clearing hazards at runtime before collision checks (hazards disabled).');
                this.level.hazards = [];
            }
        } catch (e) { /* ignore hazard check errors */ }

        // Update enemies
        this.enemyManager.update(dt, this.player, this.level);

        // Update item manager
        if (this.itemManager) {
            this.itemManager.update(dt);
            // Check item collection
            const collected = this.itemManager.checkPlayerCollision(this.player);
            for (const item of collected) {
                const result = this.itemManager.applyItemEffect(this.player, item);
                
                // Add visual effect for extra life collection
                if (result && result.type === 'EXTRA_LIFE' && result.success) {
                    // Create golden sparkle burst
                    const burst = new HitSpark(item.x, item.y, {
                        particleCount: 16,
                        speedMin: 120,
                        speedMax: 250
                    });
                    // Override particle colors for golden effect
                    for (const particle of burst.particles) {
                        particle.color = Math.random() > 0.5 ? '#FFD700' : '#FFF700';
                        particle.size = Utils.randomFloat(3, 6);
                    }
                    this.hitSparks.push(burst);
                }
                
                // Add visual effect for golden idol collection
                if (result && result.type === 'GOLDEN_IDOL' && result.success) {
                    // Create divine light burst with more particles
                    const burst = new HitSpark(item.x, item.y, {
                        particleCount: 20,
                        speedMin: 100,
                        speedMax: 300
                    });
                    // Override particle colors for divine golden effect
                    for (const particle of burst.particles) {
                        const colorChoice = Math.random();
                        if (colorChoice > 0.7) {
                            particle.color = '#FFFFFF'; // Bright white
                        } else if (colorChoice > 0.4) {
                            particle.color = '#FFD700'; // Gold
                        } else {
                            particle.color = '#FFB700'; // Amber gold
                        }
                        particle.size = Utils.randomFloat(3, 7);
                    }
                    this.hitSparks.push(burst);
                }
                
                // Add visual effect for damage boost collection
                if (result && result.type === 'DAMAGE_BOOST' && result.success) {
                    // Create aggressive red/orange burst
                    const burst = new HitSpark(item.x, item.y, {
                        particleCount: 18,
                        speedMin: 140,
                        speedMax: 280
                    });
                    // Override particle colors for damage boost effect
                    for (const particle of burst.particles) {
                        const colorChoice = Math.random();
                        if (colorChoice > 0.6) {
                            particle.color = '#FF2222'; // Bright red
                        } else if (colorChoice > 0.3) {
                            particle.color = '#FF4444'; // Red
                        } else {
                            particle.color = '#FF6600'; // Orange-red
                        }
                        particle.size = Utils.randomFloat(4, 8);
                    }
                    this.hitSparks.push(burst);
                }
                
                // Grant extra life if applicable
                if (result && result.type === 'EXTRA_LIFE' && result.success) {
                    this.lives = Math.min(this.lives + (result.lives || 1), 9);
                } else if (result && result.type === 'GOLDEN_IDOL' && result.success) {
                    if (!this.idolProgress) this.idolProgress = {};
                    const levelId = result.levelId || this.currentLevelId || 'level_unknown';
                    if (!this.idolProgress[levelId]) this.idolProgress[levelId] = [false, false, false];
                    const idx = (typeof result.idolIndex === 'number') ? result.idolIndex : null;
                    if (idx !== null && idx >= 0 && idx < this.idolProgress[levelId].length && this.idolProgress[levelId][idx] !== true) {
                        this.idolProgress[levelId][idx] = true;
                        this.gameStats.idolsCollected = (this.gameStats.idolsCollected || 0) + 1;
                        this.score += (Config.IDOL_SCORE || 250);
                        try { this.dispatchScoreChange && this.dispatchScoreChange(); } catch (e) { __err('game', e); }
                        try { this._scorePulse = 1.0; } catch (e) { __err('game', e); }
                        
                        // Track total idols across all runs
                        try {
                            this.gameStats.totalIdolsCollected = (this.gameStats.totalIdolsCollected || 0) + 1;
                            const totalIdols = parseInt(localStorage.getItem('totalIdolsCollected') || '0') + 1;
                            localStorage.setItem('totalIdolsCollected', totalIdols);
                            this.gameStats.totalIdolsCollected = totalIdols;
                        } catch (e) { __err('game', e); }

                        // INSTANT REWARDS on idol pickup:
                        // 1. Restore health
                        const healthRestore = Config.IDOL_HEALTH_RESTORE || 30;
                        this.player.health = Math.min(this.player.health + healthRestore, this.player.maxHealth);
                        
                        // 2. Grant temporary invulnerability
                        const invulnDuration = Config.IDOL_INVULNERABLE_DURATION || 2.0;
                        this.player.invulnerableTimer = Math.max(this.player.invulnerableTimer, invulnDuration);
                        
                        // 3. Add floating text showing rewards
                        const idolNum = idx + 1;
                        const collectedCount = this.idolProgress[levelId].filter(Boolean).length;
                        this.damageNumbers.push(new FloatingText(
                            item.x,
                            item.y - 30,
                            `+${healthRestore} HP`,
                            { color: '#FFD700', lifetime: 1.2, velocityY: -80, font: 'bold 20px Arial' }
                        ));
                        this.damageNumbers.push(new FloatingText(
                            item.x,
                            item.y - 50,
                            `IDOL ${idolNum}/3`,
                            { color: '#FFFFFF', lifetime: 1.5, velocityY: -60, font: 'bold 20px Arial' }
                        ));

                        // PROGRESSIVE BONUSES: tiered speed/damage buffs by collected count
                        // These persist for the entire level
                        if (!this.player.idolBonuses) {
                            this.player.idolBonuses = { speed: 0, damage: 0, count: 0 };
                        }
                        const tiers = (typeof Config !== 'undefined' && Array.isArray(Config.IDOL_BONUS_TIERS) && Config.IDOL_BONUS_TIERS.length)
                            ? Config.IDOL_BONUS_TIERS
                            : [
                                { count: 1, speed: 0.05, damage: 0.05 },
                                { count: 2, speed: 0.10, damage: 0.10 },
                                { count: 3, speed: 0.25, damage: 0.30 }
                            ];
                        let tier = tiers.find((t) => t && t.count === collectedCount);
                        if (!tier) tier = tiers[tiers.length - 1] || { speed: 0, damage: 0 };
                        this.player.idolBonuses.speed = tier.speed || 0;
                        this.player.idolBonuses.damage = tier.damage || 0;
                        this.player.idolBonuses.count = collectedCount;

                        // Show progressive bonus text
                        const speedPercent = Math.round(this.player.idolBonuses.speed * 100);
                        const damagePercent = Math.round(this.player.idolBonuses.damage * 100);
                        this.damageNumbers.push(new FloatingText(
                            item.x,
                            item.y - 70,
                            `+${speedPercent}% SPD +${damagePercent}% DMG`,
                            { color: '#00FFFF', lifetime: 1.8, velocityY: -40, font: 'bold 18px Arial' }
                        ));

                        // If all idols in the level are collected, grant a set bonus
                        const allCollected = this.idolProgress[levelId].every(Boolean);
                        if (allCollected && !this.idolProgress[levelId]._bonusGranted) {
                            this.idolProgress[levelId]._bonusGranted = true;
                            this.gameStats.idolSetsCompleted = (this.gameStats.idolSetsCompleted || 0) + 1;
                            this.score += (Config.IDOL_SET_BONUS || 2000);
                            try { this.dispatchScoreChange && this.dispatchScoreChange(); } catch (e) { __err('game', e); }
                            try { this._scorePulse = 1.0; } catch (e) { __err('game', e); }
                            try { this.audioManager && this.audioManager.playSound && this.audioManager.playSound('powerup', 0.7); } catch (e) { __err('game', e); }
                            
                            // Full set bonus: Extra life!
                            this.lives = Math.min(this.lives + 1, 9);
                            this.damageNumbers.push(new FloatingText(
                                item.x,
                                item.y - 90,
                                'FULL SET! +1 LIFE!',
                                { color: '#FF00FF', lifetime: 2.5, velocityY: -100, font: 'bold 22px Arial' }
                            ));
                        }

                        // Check achievements mid-run
                        try {
                            if (window.Highscores && typeof Highscores.checkAchievements === 'function') {
                                Highscores.checkAchievements(this.gameStats);
                            }
                        } catch (e) { __err('game', e); }
                    }
                }
            }
        }

        // Track attack attempts once per attack (instead of per-frame)
        try {
            if (this.player && this.player._attackJustStarted) {
                this.gameStats.attacksAttempted++;
                this.player._attackJustStarted = false;
            }
        } catch (e) { __err('game', e); }

        // Check player attacks hitting enemies
        const attackResult = this.enemyManager.checkPlayerAttack(this.player);
        if (attackResult.hit) {
            // Increment combo on successful hit (1 stack per attack, multi-hit bonus handled separately)
            if (typeof this.player.incrementCombo === 'function') {
                this.player.incrementCombo();
            }

            // Track attack statistics (count hits once per attack)
            try {
                if (this.player && !this.player._attackDidHit) {
                    this.gameStats.attacksHit++;
                    this.player._attackDidHit = true;
                }
            } catch (e) { __err('game', e); }
            this.gameStats.totalDamage += attackResult.totalDamage;

            // â”€â”€ Multi-enemy hit bonus â”€â”€
            // Grants extra combo stacks + bonus score for cleaving 2+ enemies
            if (attackResult.enemiesHit > 1 && typeof this.player.registerMultiHit === 'function') {
                this.player.registerMultiHit(attackResult.enemiesHit);

                const bonusPts = ((Config.COMBO && Config.COMBO.MULTI_HIT_BONUS_POINTS) || 150) * (attackResult.enemiesHit - 1);
                this.score += bonusPts;

                // Show "MULTI HIT" floating text
                try {
                    const firstEnemy = this.enemyManager.getEnemies().find(e => this.player.hitEnemies.has(e));
                    if (firstEnemy) {
                        this.damageNumbers.push(new FloatingText(
                            firstEnemy.x + (firstEnemy.width || 48) / 2,
                            firstEnemy.y - 40,
                            `MULTI x${attackResult.enemiesHit}! +${bonusPts}`,
                            { color: '#00FFFF', lifetime: 1.5, velocityY: -120, font: 'bold 22px Arial' }
                        ));
                    }
                } catch (e) { __err('game', e); }
            }

            // â”€â”€ Combo score multiplier â”€â”€
            const comboMult = (typeof this.player.getComboMultiplier === 'function')
                ? this.player.getComboMultiplier() : 1.0;
            const baseScore = attackResult.totalDamage * 10;
            this.score += Math.floor(baseScore * comboMult);

            try { this.dispatchScoreChange && this.dispatchScoreChange(); } catch (e) { __err('game', e); }
            // trigger score pulse animation
            try { this._scorePulse = 1.0; } catch (e) { __err('game', e); }

            // Show multiplier text when above 1x
            if (comboMult > 1.0) {
                try {
                    const firstEnemy = this.enemyManager.getEnemies().find(e => this.player.hitEnemies.has(e));
                    if (firstEnemy && (!this.isMobile || this.damageNumbers.length < ((Config.MOBILE_MAX_DAMAGE_NUMBERS || 1) + 2))) {
                        this.damageNumbers.push(new FloatingText(
                            firstEnemy.x + (firstEnemy.width || 48) / 2,
                            firstEnemy.y - 70,
                            `x${comboMult.toFixed(1)}`,
                            { color: '#FFD700', lifetime: 0.8, velocityY: -80, font: 'bold 18px Arial' }
                        ));
                    }
                } catch (e) { __err('game', e); }
            }
            
            // Create visual feedback (limit on mobile)
            if (attackResult.enemiesHit > 0) {
                for (const enemy of this.enemyManager.getEnemies()) {
                    if (this.player.hitEnemies.has(enemy)) {
                        // Limit damage numbers to reduce overdraw on mobile
                        try {
                            const maxDn = (this.isMobile && typeof Config !== 'undefined' && typeof Config.MOBILE_MAX_DAMAGE_NUMBERS === 'number') ? Config.MOBILE_MAX_DAMAGE_NUMBERS : Infinity;
                            if (!this.isMobile || this.damageNumbers.length < maxDn) {
                                const damagePerEnemy = Math.floor(attackResult.totalDamage / attackResult.enemiesHit);
                                this.damageNumbers.push(new DamageNumber(
                                    enemy.x + enemy.width / 2,
                                    enemy.y,
                                    damagePerEnemy,
                                    this.player.isShadowStriking
                                ));
                            }
                        } catch (e) { 
                            const damagePerEnemy = Math.floor(attackResult.totalDamage / attackResult.enemiesHit);
                            this.damageNumbers.push(new DamageNumber(enemy.x + enemy.width / 2, enemy.y, damagePerEnemy, this.player.isShadowStriking)); 
                        }

                        // Spawn hit sparks only if allowed by mobile config
                        try {
                            const maxParticles = (this.isMobile && typeof Config !== 'undefined' && typeof Config.MOBILE_MAX_PARTICLES === 'number') ? Config.MOBILE_MAX_PARTICLES : Infinity;
                            if (!this.isMobile || (maxParticles > 0 && this.hitSparks.length < maxParticles)) {
                                const isShadow = !!this.player.isShadowStriking;
                                this.hitSparks.push(new HitSpark(
                                    enemy.x + enemy.width / 2,
                                    enemy.y + enemy.height / 2,
                                    isShadow ? { particleCount: 14, speedMin: 140, speedMax: 260 } : null
                                ));
                            }
                        } catch (e) { /* ignore particle spawn errors */ }

                    }
                }
            }

            // â”€â”€ Combo tier milestones â”€â”€
            // Show milestone text and screen shake when hitting a new tier threshold
            try {
                const tier = (typeof this.player.getComboTier === 'function') ? this.player.getComboTier() : null;
                if (tier && tier.threshold > (this.player._lastComboTier || 0)) {
                    this.player._lastComboTier = tier.threshold;
                    // Milestone floating text
                    this.damageNumbers.push(new FloatingText(
                        this.player.x + (this.player.width || 48) / 2,
                        this.player.y - 60,
                        `ðŸ”¥ ${tier.label} x${this.player.comboCount}`,
                        { color: tier.color, lifetime: 2.0, velocityY: -130, font: 'bold 26px Arial' }
                    ));
                    // Tier screen shake
                    const shakeDur = (Config.COMBO && Config.COMBO.SHAKE_DURATION) || 0.12;
                    this.screenShake = new ScreenShake(shakeDur, tier.shake || 5);
                    this.audioManager.playSound('combo', 0.8 + Math.min(this.player.comboCount * 0.02, 0.2));
                    // Higher tiers get the level-up fanfare layered in
                    if (tier.threshold >= 10) {
                        this.audioManager.playSound('combo_level_up', { volume: 0.65, rate: 1.0 + (tier.threshold - 10) * 0.02 });
                    }
                }
            } catch (e) { __err('game', e); }

            // Screen shake and hit pause for impactful hits
            if (this.player.isShadowStriking) {
                // Shadow Strike: no screen shake, no hit-pause (keeps the dash snappy)
                this.screenShake = null;
                this.hitPauseTimer = 0;
            } else if (this.player.comboCount >= 3 && !(this.player._lastComboTier > (this.player._prevMilestoneTier || 0))) {
                // Only do generic shake if we didn't just trigger a milestone shake
            }
        }

        // Reset milestone tracking each frame (milestone fires once per tier crossing)
        try { this.player._prevMilestoneTier = this.player._lastComboTier || 0; } catch (e) { __err('game', e); }

        // Sync stats from other systems
        this.gameStats.enemiesDefeated = this.enemyManager.enemiesDefeated || 0;
        this.gameStats.maxCombo = Math.max(this.gameStats.maxCombo, this.player.comboCount || 0);
        this.gameStats.currentCombo = this.player.comboCount || 0;
        this.gameStats.comboMultiplier = (typeof this.player.getComboMultiplier === 'function') ? this.player.getComboMultiplier() : 1.0;
        this.gameStats.bestMultiplier = Math.max(this.gameStats.bestMultiplier || 1.0, this.gameStats.comboMultiplier);
        if (attackResult && attackResult.enemiesHit > 1) {
            this.gameStats.multiKills = (this.gameStats.multiKills || 0) + 1;
        }
        
        // Calculate accuracy
        if (this.gameStats.attacksAttempted > 0) {
            this.gameStats.accuracy = this.gameStats.attacksHit / this.gameStats.attacksAttempted;
        }

        // Check enemy attacks hitting player
        const playerHit = this.enemyManager.checkEnemyAttacks(this.player);
        if (playerHit && playerHit.hit) {
            // Track damage taken
            try {
                this.gameStats.damageTaken += playerHit.damage;
                this.gameStats.levelDamageTaken += playerHit.damage;
            } catch (e) { __err('game', e); }
        }
        
        // Check skunk projectile collisions with enemies
        if (this.player && this.player.skunkProjectiles) {
            for (let i = this.player.skunkProjectiles.length - 1; i >= 0; i--) {
                const proj = this.player.skunkProjectiles[i];
                const projRect = {
                    x: proj.x - proj.width / 2,
                    y: proj.y - proj.height / 2,
                    width: proj.width,
                    height: proj.height
                };
                
                let hitAnyEnemy = false;
                
                // Check direct collision with enemies
                for (const enemy of this.enemyManager.getEnemies()) {
                    const enemyRect = enemy.getRect();
                    
                    if (Utils.rectCollision(projRect, enemyRect)) {
                        hitAnyEnemy = true;
                        break; // Found a hit, no need to check more
                    }
                }
                
                // If projectile hit an enemy, create spray cloud and remove projectile
                if (hitAnyEnemy) {
                    this.player.createSprayCloud(proj.x, proj.y);
                    this.player.skunkProjectiles.splice(i, 1);
                }
            }
        }
        
        // Check spray cloud collisions with enemies
        if (this.player && this.player.skunkSprays) {
            for (const spray of this.player.skunkSprays) {
                for (const enemy of this.enemyManager.getEnemies()) {
                    // Skip if already hit by this spray
                    if (spray.hitEnemies.has(enemy)) continue;
                    
                    // Skip if already skunked
                    if (enemy.isSkunked) continue;
                    
                    const enemyRect = enemy.getRect();
                    const enemyCenterX = enemyRect.x + enemyRect.width / 2;
                    const enemyCenterY = enemyRect.y + enemyRect.height / 2;
                    const dx = spray.x - enemyCenterX;
                    const dy = spray.y - enemyCenterY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Hit if within spray radius
                    if (distance <= spray.radius) {
                        // Mark enemy as hit by this spray
                        spray.hitEnemies.add(enemy);
                        
                        // Apply skunk effect
                        enemy.isSkunked = true;
                        enemy.skunkTimer = enemy.skunkDuration;
                        enemy.skunkParticles = [];
                        
                        // Visual feedback - green burst
                        try {
                            const burst = new HitSpark(enemyCenterX, enemyCenterY, {
                                particleCount: 8,
                                speedMin: 80,
                                speedMax: 160
                            });
                            // Override colors for green skunk effect
                            for (const particle of burst.particles) {
                                particle.color = Math.random() > 0.5 ? '#40FF40' : '#80FF80';
                                particle.size = Utils.randomFloat(2, 5);
                            }
                            this.hitSparks.push(burst);
                        } catch (e) { __err('game', e); }
                        
                        // Play sound (quieter for spray effect)
                        if (this.audioManager) {
                            this.audioManager.playSound('enemy_hit', { volume: 0.5, rate: 0.85 });
                        }
                        
                        // Show floating text
                        this.damageNumbers.push(new FloatingText(
                            enemy.x + enemy.width / 2,
                            enemy.y - 10,
                            'SKUNKED!',
                            { color: '#40FF40', lifetime: 1.5, velocityY: -60, font: 'bold 18px Arial' }
                        ));
                    }
                }
            }
        }
        
        // Falling out of level bounds should count as a death
        // But only if player has valid coordinates and not during initial spawn invulnerability
        const fellOut = this.player && this.level && 
                       typeof this.player.y === 'number' && !isNaN(this.player.y) &&
                       this.player.invulnerableTimer <= 0 &&
                       (this.player.y > (this.level.height + 120));

        // Check kamikaze explosion AoE damage to player
        let explosionHitPlayer = false;
        if (this.enemyManager._pendingExplosions && this.enemyManager._pendingExplosions.length > 0 && this.player) {
            const playerRect = this.player.getRect();
            const pcx = playerRect.x + playerRect.width / 2;
            const pcy = playerRect.y + playerRect.height / 2;

            for (const explosion of this.enemyManager._pendingExplosions) {
                const dx = explosion.x - pcx;
                const dy = explosion.y - pcy;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < explosion.radius) {
                    const falloff = 1 - (dist / explosion.radius);
                    const damage = Math.floor(explosion.playerDamage * falloff);
                    // Check invulnerableTimer, not undefined isInvulnerable property
                    if (damage > 0 && this.player.invulnerableTimer <= 0) {
                        // Apply explosion damage
                        const result = this.player.takeDamage(damage);
                        if (result) explosionHitPlayer = true;
                        // Track damage
                        try {
                            this.gameStats.damageTaken += damage;
                            this.gameStats.levelDamageTaken += damage;
                        } catch (e) { __err('game', e); }

                        // Heavy screen shake for explosion (scales with damage)
                        const shakeIntensity = 6 + Math.floor(falloff * 8);
                        this.screenShake = new ScreenShake(0.3, shakeIntensity);

                        // Dramatic floating damage text
                        try {
                            this.damageNumbers.push(new FloatingText(
                                pcx, playerRect.y - 20,
                                'ðŸ’¥ BOOM! -' + damage,
                                { color: '#FF2200', lifetime: 2.0, velocityY: -100, font: 'bold 24px Arial' }
                            ));
                        } catch (e) { __err('game', e); }

                        // Explosion hit spark burst
                        try {
                            const burst = new HitSpark(explosion.x, explosion.y, {
                                particleCount: 24, speedMin: 150, speedMax: 350
                            });
                            for (const particle of burst.particles) {
                                particle.color = Math.random() > 0.3 ? '#FF6600' : (Math.random() > 0.5 ? '#FFAA00' : '#FF2200');
                                particle.size = Utils.randomFloat(3, 7);
                            }
                            this.hitSparks.push(burst);
                        } catch (e) { __err('game', e); }
                    }
                }
            }

            // Screen shake for every explosion regardless of player damage (cinematic impact)
            if (!this.screenShake) {
                this.screenShake = new ScreenShake(0.15, 5);
            }
        }

        // Log death triggers
        if ((playerHit && playerHit.hit) || fellOut || explosionHitPlayer) {
            console.log('=== DEATH TRIGGER ===', {
                playerHit: playerHit ? playerHit.hit : false,
                fellOut,
                explosionHitPlayer,
                playerY: this.player.y,
                levelHeight: this.level.height
            });
        }

        if ((playerHit && playerHit.hit) || fellOut || explosionHitPlayer) {
            this._handlePlayerDeath();
        }

        // Update camera to follow player
        this.updateCamera();
        // decay score pulse over time
        try { this._scorePulse = Math.max(0, (this._scorePulse || 0) - dt * 2.5); } catch (e) { __err('game', e); }
    }

    _handlePlayerDeath() {
        if (this.isRespawning || !this.player || this.player.isDying || this.state !== 'PLAYING') return;
        
        // Absolute grace period - cannot die within first 2.5 seconds of game start
        if (this._gameStartTime && this._gracePeriodMs) {
            const elapsed = Date.now() - this._gameStartTime;
            if (elapsed < this._gracePeriodMs) {
                console.log('=== DEATH BLOCKED - GRACE PERIOD ===');
                console.log('Grace period remaining:', ((this._gracePeriodMs - elapsed) / 1000).toFixed(2), 'seconds');
                console.log('Player health:', this.player.health);
                // Restore health if somehow damaged during grace period
                if (this.player.health < this.player.maxHealth) {
                    this.player.health = this.player.maxHealth;
                }
                return;
            }
        }
        
        // Prevent death during initial spawn invulnerability window
        // BUT if health is already <= 0 the player IS dead â€” don't block it.
        if (this.player.invulnerableTimer > 0 && this.player.health > 0) {
            console.log('=== DEATH BLOCKED - INVULNERABLE ===');
            console.log('Invulnerability time remaining:', this.player.invulnerableTimer);
            console.log('Player health:', this.player.health);
            return;
        }
        
        console.log('=== PLAYER DEATH TRIGGERED ===');
        console.log('Player state:', {
            health: this.player.health,
            pos: { x: this.player.x, y: this.player.y },
            invulnerable: this.player.invulnerableTimer
        });
        console.log('Reason unknown - check takeDamage logs above');

        // Player died - check for remaining lives
        this.lives--;

        if (this.lives >= 0) {
            // Trigger death animation first, then respawn after delay
            try {
                if (this.player && typeof this.player.startDeath === 'function') {
                    this.player.startDeath();
                }
            } catch (e) { __err('game', e); }

            this.isRespawning = true;
            const baseDeath = (this.player && typeof this.player.deathDuration === 'number') ? this.player.deathDuration : 0.8;
            this.respawnTimer = baseDeath + 1.0;
            this._pendingRespawn = { deathX: this.player ? this.player.x : 100 };
        } else {
            // Game Over
            try {
                if (this.player && typeof this.player.startDeath === 'function') {
                    this.player.startDeath();
                }
            } catch (e) { __err('game', e); }
            this.state = "GAME_OVER";
            this._gameOverTime = Date.now();
            this.audioManager.stopMusic();
            // NOTE: game_over stinger is played by the death sequence (delayed).
            // Notify UI layers (mobile touch controls) about state change
            try { this.dispatchGameStateChange && this.dispatchGameStateChange(); } catch (e) { __err('game', e); }

            // Finalize game statistics
            this.gameStats.timeSurvived = (Date.now() / 1000) - this.gameStats.startTime;
            this.gameStats.enemiesDefeated = this.enemyManager.enemiesDefeated || 0;
            this.gameStats.maxCombo = Math.max(this.gameStats.maxCombo, this.player.comboCount || 0);
            this.gameStats.score = this.score; // Add score to stats for achievements

            // Check for new achievements
            let newAchievements = [];
            try {
                if (window.Highscores && typeof Highscores.checkAchievements === 'function') {
                    newAchievements = Highscores.checkAchievements(this.gameStats);
                    if (newAchievements.length > 0) {
                        if (typeof Config !== 'undefined' && Config.DEBUG) console.log('New achievements unlocked:', newAchievements);
                        // Could show achievement notification here
                    }
                }
            } catch (e) { console.warn('Achievement check failed', e); }

            // Delay high score prompt to allow player to see game over screen
            const hsDelay = (typeof Config !== 'undefined' && typeof Config.GAME_OVER_HIGHSCORE_DELAY === 'number')
                ? Config.GAME_OVER_HIGHSCORE_DELAY * 1000 : 5000;
            setTimeout(() => {
                // Only show high score prompt if still in game over state
                if (this.state !== 'GAME_OVER') return;
                
                // High score flow: prompt for initials if this score qualifies
                try {
                    if (window.Highscores && typeof Highscores.isHighScore === 'function' && Highscores.isHighScore(this.score)) {
                        try {
                            Highscores.promptForInitials(this.score, this.gameStats, (updated) => {
                                try { this.dispatchScoreChange && this.dispatchScoreChange(); } catch (e) { __err('game', e); }
                                // If a DOM target exists, show the scoreboard there
                                try {
                                    const target = document.getElementById('score-container') || document.getElementById('highscore-overlay');
                                    if (target) {
                                        // renderScoreboard mutates the passed target; if we then append the
                                        // returned node (which is the target), DOM throws HierarchyRequestError.
                                        const board = Highscores.renderScoreboard(null, true);
                                        target.innerHTML = '';
                                        target.appendChild(board);
                                    } else {
                                        if (typeof Config !== 'undefined' && Config.DEBUG) console.log('Highscores updated', updated);
                                    }
                                } catch (e) { console.warn('Failed to render scoreboard', e); }
                            });
                        } catch (e) { console.warn('Highscores prompt failed', e); }
                    }
                } catch (e) { /* ignore highscores errors */ }
            }, hsDelay);
        }
    }

    /**
     * Returns true if GAME_OVER input lockout is still active.
     * During lockout, restart / high-score input is blocked so the
     * player can read the game-over screen.
     */
    _isGameOverLocked() {
        if (this.state !== 'GAME_OVER') return false;
        const lockout = (typeof Config !== 'undefined' && typeof Config.GAME_OVER_LOCKOUT === 'number')
            ? Config.GAME_OVER_LOCKOUT * 1000 : 3000;
        return (Date.now() - this._gameOverTime) < lockout;
    }

    /**
     * Returns how many seconds remain in the game-over lockout (0 if expired).
     */
    _gameOverLockoutRemaining() {
        if (this.state !== 'GAME_OVER') return 0;
        const lockout = (typeof Config !== 'undefined' && typeof Config.GAME_OVER_LOCKOUT === 'number')
            ? Config.GAME_OVER_LOCKOUT * 1000 : 3000;
        return Math.max(0, (lockout - (Date.now() - this._gameOverTime)) / 1000);
    }

    _performRespawn() {
        if (!this._pendingRespawn || !this.player) {
            this.isRespawning = false;
            this.respawnTimer = 0;
            this._pendingRespawn = null;
            return;
        }

        // Restore player state
        this.player.health = this.player.maxHealth;
        this.player.invulnerableTimer = 2.0; // 2 seconds of invulnerability
        this.player.hitStunTimer = 0;
        this.player.velocityX = 0;
        this.player.velocityY = 0;
        this.player.targetVelocityX = 0;
        this.player.isDying = false;
        this.player.deathTimer = 0;
        this.player.isAttacking = false;
        this.player.isShadowStriking = false;
        try { this.player.clearInputState && this.player.clearInputState(); } catch (e) { __err('game', e); }

        // Respawn slightly behind death position
        const deathX = this._pendingRespawn.deathX;
        const backtrack = Math.max(220, Math.floor((this.level && this.level.width ? this.level.width : 10000) * 0.03));
        const targetX = Math.max(80, Math.floor(deathX - backtrack));

        if (this.level && this.level.platforms && this.level.platforms.length > 0) {
            const platforms = this.level.platforms;
            const nonGroundPlatforms = platforms.filter(p => !(p.y >= this.level.height - 40 && p.width >= this.level.width * 0.8));
            const candidatePool = nonGroundPlatforms.length > 0 ? nonGroundPlatforms : platforms;

            // Choose the closest platform whose left edge is at or before targetX
            const leftPlatforms = candidatePool.filter(p => typeof p.x === 'number' && p.x <= targetX);
            const spawnPlatform = (leftPlatforms.length > 0)
                ? leftPlatforms.reduce((a, b) => (b.x > a.x ? b : a), leftPlatforms[0])
                : candidatePool[0];

            const maxX = spawnPlatform.x + spawnPlatform.width - this.player.width;
            this.player.x = Utils.clamp(targetX, spawnPlatform.x, maxX);
            this.player.y = spawnPlatform.y - this.player.height - 8;
        } else {
            this.player.x = targetX;
            this.player.y = 300;
        }

        try { this.player.updateAnimation && this.player.updateAnimation(0); } catch (e) { __err('game', e); }

        // Play respawn sound
        try { this.audioManager && this.audioManager.playSound && this.audioManager.playSound('powerup', 0.5); } catch (e) { __err('game', e); }

        this.isRespawning = false;
        this.respawnTimer = 0;
        this._pendingRespawn = null;
    }

    centerCameraOnPlayer() {
        // Centers the camera on the player immediately, respecting logical view size
        const viewW = this.viewWidth || this.width;
        const viewH = this.viewHeight || this.height;
        const playerCenterX = this.player.x + (this.player.width || 0) * 0.5;
        const playerCenterY = this.player.y + (this.player.height || 0) * 0.5;
        this.cameraX = Utils.clamp(playerCenterX - viewW * 0.5, 0, Math.max(0, this.level.width - viewW));
        this.cameraY = Utils.clamp(playerCenterY - viewH * 0.5, 0, Math.max(0, this.level.height - viewH));
    }

    updateCamera() {
        // Centered horizontal follow â€” snap camera to keep player centered.
        // Snapping avoids the player running off-screen on narrow/mobile viewports.
        const viewW = this.viewWidth || this.width;
        const playerCenterX = this.player.x + (this.player.width || 0) * 0.5;
        const targetCameraX = playerCenterX - viewW * 0.5;
        // Clamp camera to level bounds
        const clampMaxX = Math.max(0, this.level.width - viewW);
        this.cameraX = Utils.clamp(targetCameraX, 0, clampMaxX);

        // Short diagnostics on first frames while playing
        if (!this._camDiagInitialized) {
            this._camDiagInitialized = true;
            this._camDiagCount = 0;
        }
        if (this.state === 'PLAYING' && this._camDiagCount < 20) {
            if (typeof Config !== 'undefined' && Config.DEBUG) {
                console.log('CameraX trace', {
                    frame: this._camDiagCount,
                    playerX: this.player.x,
                    playerCenterX,
                    cameraX: this.cameraX,
                    targetCameraX,
                    clampMaxX,
                    viewWidth: this.viewWidth,
                    levelWidth: this.level.width
                });
            }
            this._camDiagCount++;
            if (this._camDiagCount === 20 && clampMaxX === 0) {
                if (typeof Config !== 'undefined' && Config.DEBUG) console.warn('No horizontal room to pan: level.width <= viewWidth', { levelWidth: this.level.width, viewWidth: this.viewWidth });
            }
        }
        // Vertical camera follow to keep player visible on short viewports.
        // Use a slightly smaller bias on mobile so the camera stays lower (more floor visible).
        const verticalBias = this.isMobile ? 0.35 : 0.45;
        const targetCameraY = this.player.y - this.viewHeight * verticalBias;
        this.cameraY = Utils.lerp(this.cameraY || 0, targetCameraY, 0.1);
        this.cameraY = Utils.clamp(this.cameraY, 0, Math.max(0, this.level.height - this.viewHeight));
        // If the player is very close to the bottom of the level, ensure the camera
        // snaps to show the floor (avoid small offsets that can hide the floor on some devices).
        const nearFloorThreshold = 32;
        if (this.player.y + this.player.height >= this.level.height - nearFloorThreshold) {
            this.cameraY = Math.max(this.cameraY, Math.max(0, this.level.height - this.viewHeight));
        }
        // Log first computed cameraY for diagnostics
        if (!this._loggedCameraY && this.state === 'PLAYING') {
            this._loggedCameraY = true;
            if (typeof Config !== 'undefined' && Config.DEBUG) console.log('CameraY diagnostic', { cameraY: this.cameraY, targetCameraY, viewHeight: this.viewHeight, levelHeight: this.level.height });
        }

    }

    panCamera(deltaX) {
        // Simple pan helper â€” moves camera by delta and clamps to level bounds
        const cur = this.cameraX || 0;
        const maxX = Math.max(0, this.level.width - (this.viewWidth || this.width));
        const next = Utils.clamp(cur + (deltaX || 0), 0, maxX);
        this.cameraX = next;
    }

    render() {
        // Clear screen using actual canvas pixel buffer (handles mobile scaling)
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // Compute scale so we can render the game in logical coordinates and map
        // them to the (possibly smaller) canvas size used on mobile devices.
            const scaleX = this.ctx.canvas.width / this.viewWidth;
            const scaleY = this.ctx.canvas.height / this.viewHeight;

        // Render game world in a scaled transform so world coordinates stay consistent
        this.ctx.save();
        this.ctx.scale(scaleX, scaleY);

        // Apply screen shake (in logical/world coordinates)
        if (this.screenShake && this.screenShake.isActive()) {
            this.ctx.save();
            this.ctx.translate(this.screenShake.offsetX, this.screenShake.offsetY);
        }

        // Render game world (level, player, enemies) using logical coordinates
        this.level.draw(this.ctx, this.cameraX, this.cameraY, this.viewWidth, this.viewHeight);
        this.enemyManager.draw(this.ctx, this.cameraX, this.cameraY);

        // Draw items
        if (this.itemManager) {
            this.itemManager.draw(this.ctx, this.cameraX, this.cameraY);
        }

        this.player.draw(this.ctx, this.cameraX, this.cameraY);
        
        // Draw skunk projectiles
        if (this.player && typeof this.player.drawProjectiles === 'function') {
            this.player.drawProjectiles(this.ctx, this.cameraX, this.cameraY);
        }

        // Render visual effects
        this.ctx.save();
        this.ctx.translate(-this.cameraX, -this.cameraY);
        if (this.movementFX && typeof this.movementFX.draw === 'function') {
            this.movementFX.draw(this.ctx);
        }
        for (const dn of this.damageNumbers) {
            if (dn && typeof dn.draw === 'function') {
                dn.draw(this.ctx);
            }
        }
        for (const hs of this.hitSparks) {
            hs.draw(this.ctx);
        }

        // Level debug visuals: spawn points and hazard bounds
        if (this.levelDebugVisuals && this.level) {
            try {
                const ctx = this.ctx;
                ctx.save();
                ctx.translate(-this.cameraX, -this.cameraY);
                // Spawn points
                if (Array.isArray(this.level.spawnPoints)) {
                    for (const sp of this.level.spawnPoints) {
                        let sx = (typeof sp.x === 'number') ? sp.x : (sp.x === 'left' ? 16 : this.level.width - 16);
                        const sy = (typeof sp.y === 'number') ? sp.y : 300;
                        ctx.fillStyle = 'rgba(0,255,0,0.9)';
                        ctx.beginPath();
                        ctx.moveTo(sx - 8, sy + 12);
                        ctx.lineTo(sx + 8, sy + 12);
                        ctx.lineTo(sx, sy - 6);
                        ctx.closePath();
                        ctx.fill();
                        ctx.fillStyle = '#000'; ctx.font = '10px monospace'; ctx.fillText('SP', sx + 10, sy + 4);
                    }
                }

                // Hazards removed: nothing to draw here.

                // Editor overlays (selection / hover) â€” draw in world coordinates
                // Only draw if editor panel is actually visible
                const editorPanel = document.getElementById('level-editor-panel');
                const editorVisible = editorPanel && editorPanel.style.display !== 'none';
                if (this._editorOverlay && editorVisible) {
                    try {
                        const overlay = this._editorOverlay;
                        const drawOverlay = (idx, style) => {
                            const p = (this.level.platforms || [])[idx];
                            if (!p) return;
                            ctx.save();
                            ctx.fillStyle = style.fill || 'rgba(255,255,0,0.12)';
                            ctx.strokeStyle = style.stroke || 'rgba(255,255,0,0.9)';
                            ctx.lineWidth = style.lineWidth || 2;
                            ctx.fillRect(p.x, p.y, p.width, p.height);
                            ctx.strokeRect(p.x, p.y, p.width, p.height);
                            ctx.restore();
                        };

                        if (typeof overlay.hoveredIndex === 'number') {
                            drawOverlay(overlay.hoveredIndex, { stroke: 'rgba(255,255,0,0.95)', fill: 'rgba(255,255,0,0.08)' });
                        }
                        if (typeof overlay.selectedIndex === 'number') {
                            drawOverlay(overlay.selectedIndex, { stroke: 'rgba(0,255,0,0.95)', fill: 'rgba(0,255,0,0.06)', lineWidth: 3 });
                        }
                    } catch (e) { __err('game', e); }
                }

                ctx.restore();
            } catch (e) { __err('game', e); }
        }
        this.ctx.restore();

        // Restore after screen shake
        if (this.screenShake && this.screenShake.isActive()) {
            this.ctx.restore();
        }
        // Restore scale transform
        this.ctx.restore();
        // Render UI (always on top, no camera offset)
        // Draw UI in logical coordinates by reusing the same scale transform used for the world.
        // This prevents misalignment/cutoff on mobile/high-DPR canvases where the backing
        // store size differs from the logical view size.
        try {
            this.ui.width = this.viewWidth || this.width;
            this.ui.height = this.viewHeight || this.height;
        } catch (e) { __err('game', e); }

        this.ctx.save();
        this.ctx.scale(scaleX, scaleY);

        if (this.state === "PLAYING") {
            // Pass structured progress info to HUD (rendered as a thin progress bar)
            let objectiveInfo = null;
            try {
                const cc = this.level && this.level.completionConfig ? this.level.completionConfig : null;
                const hasBoss = !!(this.level && this.level.bossConfig && cc && typeof cc.bossTriggerX === 'number');
                const exitX = (cc && typeof cc.exitX === 'number') ? cc.exitX : (this.level.width - 100);

                if (hasBoss) {
                    const bossTriggerX = cc.bossTriggerX;
                    if (!this.bossEncountered) {
                        const progress = bossTriggerX > 0 ? Utils.clamp(this.player.x / bossTriggerX, 0, 1) : 0;
                        objectiveInfo = { mode: 'toBoss', progress };
                    } else if (!this.bossDefeated) {
                        let bossHpPct = null;
                        try {
                            const b = this.enemyManager && this.enemyManager.bossInstance ? this.enemyManager.bossInstance : null;
                            if (b && typeof b.health === 'number' && typeof b.maxHealth === 'number' && b.maxHealth > 0) {
                                bossHpPct = Math.max(0, Math.min(1, b.health / b.maxHealth));
                            }
                        } catch (e) { __err('game', e); }
                        objectiveInfo = { mode: 'boss', bossHpPct };
                    } else {
                        const progress = exitX > 0 ? Utils.clamp(this.player.x / exitX, 0, 1) : 0;
                        objectiveInfo = { mode: 'toExit', progress };
                    }
                } else {
                    const progress = exitX > 0 ? Utils.clamp(this.player.x / exitX, 0, 1) : 0;
                    objectiveInfo = { mode: 'toExit', progress };
                }
            } catch (e) {
                objectiveInfo = null;
            }

            const idolStatus = (this.currentLevelId && this.idolProgress[this.currentLevelId]) ? this.idolProgress[this.currentLevelId] : null;
            this.ui.drawHUD(this.ctx, this.player, this.score, this.player.comboCount, this._scorePulse || 0, this.currentLevelIndex + 1, objectiveInfo, this.lives, idolStatus, this.levelTime);
        } else if (this.state === "LEVEL_COMPLETE") {
            // Draw Level Complete screen
            if (this.ui && typeof this.ui.drawLevelComplete === 'function') {
                this.ui.drawLevelComplete(this.ctx, this.currentLevelIndex + 1);
            }
        } else if (this.state === "VICTORY") {
             if (this.ui && typeof this.ui.drawVictory === 'function') {
                this.ui.drawVictory(this.ctx, this.score, this.gameStats);
             }
        } else if (this.state === "MENU") {
            this.ui.drawMenu(this.ctx);
        } else if (this.state === "PAUSED" && !this.isMobile) {
            // Only show drawn pause menu on desktop when no touch controls
            const hasTouchControls = document.getElementById('touch-controls') || document.getElementById('btn-pause');
            if (!hasTouchControls) {
                this.ui.drawPauseMenu(this.ctx);
            }
        } else if (this.state === "GAME_OVER") {
            this.ui.drawGameOver(this.ctx, this.score, this.gameStats, this._gameOverLockoutRemaining());
        }

        this.ctx.restore();

        // Draw Transition Overlay (always on top)
        if ((this.transitionState || this.transitionAlpha > 0) && this.ui && typeof this.ui.drawTransition === 'function') {
            this.ui.drawTransition(this.ctx, this.transitionAlpha);
        }

        // Debug overlay (render in screen coordinates)
        if (this.debugOverlay) {
            try {
                const ctx = this.ctx;
                ctx.save();
                // reset any transforms so we draw in canvas pixel space
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(8, 8, 320, 110);
                ctx.fillStyle = '#0f0';
                ctx.font = '12px monospace';
                const allowedTypesText = (this.enemyManager && Array.isArray(this.enemyManager.allowedEnemyTypes) && this.enemyManager.allowedEnemyTypes.length > 0)
                    ? this.enemyManager.allowedEnemyTypes.join(',')
                    : 'default';
                let b = 0, f = 0, s = 0;
                try {
                    const enemies = (this.enemyManager && Array.isArray(this.enemyManager.enemies)) ? this.enemyManager.enemies : [];
                    for (const e of enemies) {
                        if (!e || !e.enemyType) continue;
                        if (e.enemyType === 'BASIC') b++;
                        else if (e.enemyType === 'FAST_BASIC') f++;
                        else if (e.enemyType === 'SECOND_BASIC') s++;
                    }
                } catch (e) { __err('game', e); }
                const lines = [
                        `cameraX: ${this.cameraX.toFixed(1)}`,
                    `player.x: ${this.player.x.toFixed(1)}`,
                    `level.width: ${this.level.width}`,
                    `viewWidth: ${this.viewWidth}`,
                    `cameraMax: ${Math.max(0, this.level.width - (this.viewWidth || this.width)).toFixed(1)}`,
                    `state: ${this.state}`,
                    `enemy.allowed: ${allowedTypesText}`,
                    `enemies B/F/S: ${b}/${f}/${s}`,
                    `levelVisuals: ${this.levelDebugVisuals ? 'ON' : 'OFF'}`
                ];
                for (let i = 0; i < lines.length; i++) {
                    ctx.fillText(lines[i], 16, 26 + i * 16);
                }
                ctx.fillStyle = '#fff';
                ctx.font = '11px monospace';
                ctx.fillText('Keys: [ ] snap L/R, O toggle overlay', 16, 26 + lines.length * 16);
                ctx.restore();
            } catch (e) { __err('game', e); }
        }
    }
}

try { if (typeof Config !== 'undefined' && Config.DEBUG) console.log('Game class defined'); } catch (e) { __err('game', e); }
