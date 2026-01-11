/**
 * Game class - Main game controller
 */

try { if (typeof Config !== 'undefined' && Config.DEBUG) console.log('game.js loaded'); } catch (e) {}

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
                } catch (e) {}
            }
        } catch (e) {}

        // Initialize audio (use provided AudioManager if available)
        this.audioManager = audioManager || new AudioManager();

        // Game state
        this.state = "MENU"; // MENU, PLAYING, PAUSED, GAME_OVER
        this.score = 0;
        this.lives = 3;

        // Game statistics for high scores
        this.gameStats = {
            startTime: 0,
            timeSurvived: 0,
            enemiesDefeated: 0,
            maxCombo: 0,
            currentCombo: 0,
            totalDamage: 0,
            attacksAttempted: 0,
            attacksHit: 0,
            accuracy: 0
        };

        // Visual effects
        this.screenShake = null;
        this.hitPauseTimer = 0;
        this.damageNumbers = [];
        this.hitSparks = [];
        this._scorePulse = 0;

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
        // Arcade is short (3 levels): no continue/progress system.
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
        this.ui = new UI(this.width, this.height);

        // Camera
        this.cameraX = 0;
        this.cameraY = 0;

        // Expose a minimal pan helper for debugging/manual pan
        if (typeof window !== 'undefined') {
            try {
                window.gamePan = (dx) => { this.panCamera(dx); };
                window.toggleGamePause = () => { try { this.togglePause(); } catch (e) {} };
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
                        try { localStorage.setItem('hitboxes', Config.SHOW_HITBOXES ? '1' : '0'); } catch (e) {}
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
            } catch (e) {}
        }
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
                try { if (typeof Config !== 'undefined' && Config.DEBUG && typeof console !== 'undefined' && console.log) console.log('Game.keydown', { key, state: this.state }); } catch (e) {}

                // Prevent default for primary game keys
                if (['space', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
                    event.preventDefault();
                }

                // Global controls
                    if (key === 'escape') {
                        this.togglePause();
                    } else if (key === 'enter') {
                    if (this.state === 'MENU' || this.state === 'GAME_OVER') {
                        this.audioManager.playSound && this.audioManager.playSound('menu_select');
                        this.startGame(0); // Restart from level 1
                        this.dispatchGameStateChange();
                            try { this.dispatchScoreChange && this.dispatchScoreChange(); } catch(e) {}
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
                            try { localStorage.setItem('hitboxes', Config.SHOW_HITBOXES ? '1' : '0'); } catch (e) {}
                            console.log('SHOW_HITBOXES =', !!Config.SHOW_HITBOXES);
                        }
                    } catch (e) {}
                }
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
                } else if (action === 'pause') {
                    // Toggle pause on button down (single press)
                    if (down) this.togglePause();
                }
                else if (action === 'restart') {
                    if (down && this.state === 'GAME_OVER') {
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
            }

        // Start or restart the game (New Game)
        async startGame(levelIndex = 0) {
            if (typeof Config !== 'undefined' && Config.DEBUG) console.log('Game.startGame() called, level:', levelIndex);
            
            // Start with a fade in
            this.transitionState = 'FADE_IN';
            this.transitionAlpha = 1.0;
            this.transitionTimer = 0;
            this.transitionDuration = 1.0;
            
            // If starting a new game (level 0), reset progress unless this logic is handled elsewhere
            // But we want to allow replaying unlocked levels? For now, standard arcade: unlocked levels are checkpoints.
            
            this.loadLevel(levelIndex);
            this.state = 'PLAYING';
            this.score = 0;
            this.lives = 3;
            
            // Boss state
            this.bossEncountered = false;
            this.bossDefeated = false;
            
            // Reset game statistics
            this.gameStats = {
                startTime: Date.now() / 1000, // Convert to seconds
                timeSurvived: 0,
                enemiesDefeated: 0,
                maxCombo: 0,
                currentCombo: 0,
                totalDamage: 0,
                attacksAttempted: 0,
                attacksHit: 0,
                accuracy: 0
            };
            
            if (this.player && typeof this.player.reset === 'function') this.player.reset();
            if (this.enemyManager && typeof this.enemyManager.reset === 'function') this.enemyManager.reset();
            this.damageNumbers = [];
            this.hitSparks = [];
            // Place player at a spawn point near the level start.
            // (Previous logic spawned on the rightmost platform on desktop, which can
            // unintentionally drop you into the boss arena on long levels.)
            if (this.level.platforms && this.level.platforms.length > 0) {
                let spawnPlatform;
                const nonGroundPlatforms = this.level.platforms.filter(p => !(p.y >= this.level.height - 40 && p.width >= this.level.width * 0.8));
                if (nonGroundPlatforms.length > 0) {
                    // Prefer an early platform within the first ~20% of the level.
                    const earlyLimit = Math.max(800, Math.floor(this.level.width * 0.2));
                    const earlyPlatforms = nonGroundPlatforms.filter(p => typeof p.x === 'number' && p.x >= 0 && p.x <= earlyLimit);
                    const pool = (earlyPlatforms.length > 0) ? earlyPlatforms : nonGroundPlatforms;
                    spawnPlatform = pool.reduce((a, b) => (b.x < a.x ? b : a), pool[0]);
                }
                const spawnX = Math.floor(spawnPlatform.x + (spawnPlatform.width - this.player.width) / 2);
                const spawnY = spawnPlatform.y - this.player.height - 8;
                this.player.x = spawnX;
                this.player.y = spawnY;
                if (typeof Config !== 'undefined' && Config.DEBUG) console.log('Spawn placed on platform at', this.player.x, this.player.y, 'platform:', spawnPlatform.x, spawnPlatform.y, spawnPlatform.width, spawnPlatform.height);
            } else {
                this.player.x = 100;
                this.player.y = this.height - this.player.height - 8;
            }
        
                // Ensure gameplay music is loaded (deferred for mobile performance)
                if (this.audioManager && !this.audioManager.musicElements['gameplay']) {
                    try {
                        await this.audioManager.loadMusic('gameplay', 'assets/audio/music/gameplay.wav');
                    } catch (e) {
                        console.warn('Failed to load gameplay music:', e);
                    }
                }
        
                if (this.audioManager) this.audioManager.playMusic && this.audioManager.playMusic('gameplay', true);
            this.dispatchGameStateChange();
            // Ensure camera centers on player immediately after starting
            try { if (typeof this.centerCameraOnPlayer === 'function') this.centerCameraOnPlayer(); } catch (e) {}
            // Pre-render static layer (platform tiles) so visuals are ready
            try { if (this.level && typeof this.level.renderStaticLayer === 'function') this.level.renderStaticLayer(this.viewWidth, this.viewHeight); } catch (e) {}
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
                this.audioManager.playSound && this.audioManager.playSound('pause');
                this.audioManager.pauseMusic && this.audioManager.pauseMusic();
                // Show pause overlay on mobile or when touch controls are present
                const hasTouchControls = document.getElementById('touch-controls') || document.getElementById('btn-pause');
                if (this.isMobile || hasTouchControls) {
                    const overlay = document.getElementById('pause-overlay');
                    if (overlay) overlay.style.display = 'flex';
                }
                this.dispatchGameStateChange();
            } else if (this.state === 'PAUSED') {
                this.state = 'PLAYING';
                this.audioManager.unpauseMusic && this.audioManager.unpauseMusic();
                // Hide pause overlay
                const overlay = document.getElementById('pause-overlay');
                if (overlay) overlay.style.display = 'none';
                this.dispatchGameStateChange();
            }
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

            // Boss state is per-level; always reset when loading a new level.
            this.bossEncountered = false;
            this.bossDefeated = false;
            if (this.enemyManager) this.enemyManager.bossInstance = null;
            // Reset music playback rate when loading new level
            if (this.audioManager && this.audioManager.resetMusicPlaybackRate) {
                this.audioManager.resetMusicPlaybackRate();
            }

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
            }

            // Show level toast if UI available
            // (Assumes UI has been updated to support this, or we can just log for now)
            try {
                if (this.ui && this.ui.showLevelTitle) {
                    this.ui.showLevelTitle(config.name, index + 1);
                }
            } catch(e) {}
        }

        completeLevel() {
            if (this.state === 'LEVEL_COMPLETE') return;
            
            this.state = 'LEVEL_COMPLETE';
            if (typeof Config !== 'undefined' && Config.DEBUG) console.log('Level Complete!');
            this.audioManager.playSound && this.audioManager.playSound('level_complete', 0.8);
            
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
                            this.audioManager.playSound('boss_spawn', 0.8);
                        }
                        // Double music BPM for boss encounter
                        if (this.audioManager && this.audioManager.setMusicPlaybackRate) {
                            this.audioManager.setMusicPlaybackRate(2.0);
                        }
                    } catch(e) {}
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
                         this.audioManager.playSound('boss_defeat', 0.9);
                     }
                            if (this.enemyManager) {
                                this.enemyManager.spawningEnabled = true;
                                this.enemyManager.bossInstance = null;
                                this.enemyManager.spawnTimer = 0;
                            // Reset music BPM to normal after boss defeat
                            if (this.audioManager && this.audioManager.resetMusicPlaybackRate) {
                                this.audioManager.resetMusicPlaybackRate();
                            }
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
            this.gameStats.timeSurvived += dt;

            // Update screen shake
            if (this.screenShake) {
                this.screenShake.update(dt);
                if (!this.screenShake.isActive()) {
                    this.screenShake = null;
                }
            }

        // Update hit pause
        if (this.hitPauseTimer > 0) {
            this.hitPauseTimer -= dt;
            return; // Pause game during hit pause
        }

        // Update damage numbers and effects
        this.damageNumbers = this.damageNumbers.filter(dn => dn.isAlive());
        for (const dn of this.damageNumbers) {
            dn.update(dt);
        }

        this.hitSparks = this.hitSparks.filter(hs => hs.isAlive());
        for (const hs of this.hitSparks) {
            hs.update(dt);
        }

        // Update player
        this.player.update(dt, this.level);

        // Hazard collision checks disabled: hazards and related damage are removed.
        try {
            if (this.level && this.level.hazards && this.level.hazards.length > 0) {
                if (typeof Config !== 'undefined' && Config.DEBUG && typeof console !== 'undefined' && console.log) console.log('Clearing hazards at runtime before collision checks (hazards disabled).');
                this.level.hazards = [];
            }
        } catch (e) { /* ignore hazard check errors */ }

        // Update enemies
        this.enemyManager.update(dt, this.player, this.level);

        // Track attack attempts once per attack (instead of per-frame)
        try {
            if (this.player && this.player._attackJustStarted) {
                this.gameStats.attacksAttempted++;
                this.player._attackJustStarted = false;
            }
        } catch (e) {}

        // Check player attacks hitting enemies
        const attackResult = this.enemyManager.checkPlayerAttack(this.player);
        if (attackResult.hit) {
            // Track attack statistics (count hits once per attack)
            try {
                if (this.player && !this.player._attackDidHit) {
                    this.gameStats.attacksHit++;
                    this.player._attackDidHit = true;
                }
            } catch (e) {}
            this.gameStats.totalDamage += attackResult.totalDamage;
            
            this.score += attackResult.totalDamage * 10;
            try { this.dispatchScoreChange && this.dispatchScoreChange(); } catch(e) {}
            // trigger score pulse animation
            try { this._scorePulse = 1.0; } catch (e) {}
        }

        // Sync stats from other systems
        this.gameStats.enemiesDefeated = this.enemyManager.enemiesDefeated || 0;
        this.gameStats.maxCombo = Math.max(this.gameStats.maxCombo, this.player.comboCount || 0);
        this.gameStats.currentCombo = this.player.comboCount || 0;
        
        // Calculate accuracy
        if (this.gameStats.attacksAttempted > 0) {
            this.gameStats.accuracy = this.gameStats.attacksHit / this.gameStats.attacksAttempted;
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

            // Screen shake and hit pause for impactful hits
            if (this.player.isShadowStriking) {
                // Shadow Strike: no screen shake (mobile-friendly)
                this.screenShake = null;
                this.hitPauseTimer = 0.07;
            } else if (this.player.comboCount >= 3) {
                this.screenShake = new ScreenShake(0.08, 5);
                this.audioManager.playSound('combo', 0.8);
            }

        // Check enemy attacks hitting player
        const playerHit = this.enemyManager.checkEnemyAttacks(this.player);
        if (playerHit) {
            // Player died
            this.state = "GAME_OVER";
            this.audioManager.stopMusic();
            this.audioManager.playSound('game_over', 1.0);
            // Notify UI layers (mobile touch controls) about state change
            try { this.dispatchGameStateChange && this.dispatchGameStateChange(); } catch(e) {}

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

            // High score flow: prompt for initials if this score qualifies
            try {
                if (window.Highscores && typeof Highscores.isHighScore === 'function' && Highscores.isHighScore(this.score)) {
                    try {
                        Highscores.promptForInitials(this.score, this.gameStats, (updated) => {
                            try { this.dispatchScoreChange && this.dispatchScoreChange(); } catch(e) {}
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
        }

        // Update camera to follow player
        this.updateCamera();
        // decay score pulse over time
        try { this._scorePulse = Math.max(0, (this._scorePulse || 0) - dt * 2.5); } catch (e) {}
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
        // Centered horizontal follow — snap camera to keep player centered.
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
        // Simple pan helper — moves camera by delta and clamps to level bounds
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
        this.player.draw(this.ctx, this.cameraX, this.cameraY);
        this.enemyManager.draw(this.ctx, this.cameraX, this.cameraY);

        // Render visual effects
        this.ctx.save();
        this.ctx.translate(-this.cameraX, -this.cameraY);
        for (const dn of this.damageNumbers) {
            dn.draw(this.ctx);
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

                // Editor overlays (selection / hover) — draw in world coordinates
                if (this._editorOverlay) {
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
                    } catch (e) {}
                }

                ctx.restore();
            } catch (e) {}
        }
        this.ctx.restore();

        // Restore after screen shake
        if (this.screenShake && this.screenShake.isActive()) {
            this.ctx.restore();
        }
        // Restore scale transform
        this.ctx.restore();
        // Render UI (always on top, no camera offset)
        // Ensure UI knows the current logical view size (important for mobile centering)
        try {
                this.ui.width = this.viewWidth || this.width;
                this.ui.height = this.viewHeight || this.height;
        } catch (e) {}

        if (this.state === "PLAYING") {
            // Pass current level info + clear condition descriptor to HUD
            let objectiveInfo = null;
            try {
                const cc = this.level && this.level.completionConfig ? this.level.completionConfig : null;
                const hasBoss = !!(this.level && this.level.bossConfig && cc && typeof cc.bossTriggerX === 'number');
                const exitX = (cc && typeof cc.exitX === 'number') ? cc.exitX : (this.level.width - 100);

                if (hasBoss) {
                    const bossTriggerX = cc.bossTriggerX;
                    if (!this.bossEncountered) {
                        const pct = bossTriggerX > 0 ? Math.max(0, Math.min(100, Math.floor((this.player.x / bossTriggerX) * 100))) : 0;
                        objectiveInfo = {
                            title: 'CLEAR: Reach boss arena → Defeat boss → Reach exit',
                            detail: `${pct}% to boss (x ${Math.floor(this.player.x)}/${Math.floor(bossTriggerX)})`
                        };
                    } else if (!this.bossDefeated) {
                        let bossHpPct = null;
                        try {
                            const b = this.enemyManager && this.enemyManager.bossInstance ? this.enemyManager.bossInstance : null;
                            if (b && typeof b.health === 'number' && typeof b.maxHealth === 'number' && b.maxHealth > 0) {
                                bossHpPct = Math.max(0, Math.min(1, b.health / b.maxHealth));
                            }
                        } catch (e) {}
                        objectiveInfo = {
                            title: 'CLEAR: Defeat the boss',
                            detail: (bossHpPct !== null) ? `Boss HP: ${Math.max(0, Math.floor((bossHpPct || 0) * 100))}%` : 'Boss fight in progress',
                            bossHpPct
                        };
                    } else {
                        const remaining = Math.max(0, Math.floor(exitX - this.player.x));
                        objectiveInfo = {
                            title: 'CLEAR: Reach the exit',
                            detail: `${remaining}px remaining (exit at x ${Math.floor(exitX)})`
                        };
                    }
                } else {
                    const remaining = Math.max(0, Math.floor(exitX - this.player.x));
                    objectiveInfo = {
                        title: 'CLEAR: Reach the exit',
                        detail: `${remaining}px remaining (exit at x ${Math.floor(exitX)})`
                    };
                }
            } catch (e) {
                objectiveInfo = null;
            }

            this.ui.drawHUD(this.ctx, this.player, this.score, this.player.comboCount, this._scorePulse || 0, this.currentLevelIndex + 1, objectiveInfo);
        } else if (this.state === "LEVEL_COMPLETE") {
            // Draw Level Complete screen
            if (this.ui && typeof this.ui.drawLevelComplete === 'function') {
                this.ui.drawLevelComplete(this.ctx, this.currentLevelIndex + 1);
            }
        } else if (this.state === "VICTORY") {
             if (this.ui && typeof this.ui.drawVictory === 'function') {
                this.ui.drawVictory(this.ctx, this.score);
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
            this.ui.drawGameOver(this.ctx, this.score, this.enemyManager.enemiesDefeated);
        }

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
                const lines = [
                        `cameraX: ${this.cameraX.toFixed(1)}`,
                    `player.x: ${this.player.x.toFixed(1)}`,
                    `level.width: ${this.level.width}`,
                    `viewWidth: ${this.viewWidth}`,
                    `cameraMax: ${Math.max(0, this.level.width - (this.viewWidth || this.width)).toFixed(1)}`,
                    `state: ${this.state}`,
                    `levelVisuals: ${this.levelDebugVisuals ? 'ON' : 'OFF'}`
                ];
                for (let i = 0; i < lines.length; i++) {
                    ctx.fillText(lines[i], 16, 26 + i * 16);
                }
                ctx.fillStyle = '#fff';
                ctx.font = '11px monospace';
                ctx.fillText('Keys: [ ] snap L/R, O toggle overlay', 16, 26 + lines.length * 16);
                ctx.restore();
            } catch (e) {}
        }
    }
}

try { if (typeof Config !== 'undefined' && Config.DEBUG) console.log('Game class defined'); } catch (e) {}
