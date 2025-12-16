side tr/**
 * Game class - Main game controller
 */

console.log('game.js loaded');

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

        // Initialize audio (use provided AudioManager if available)
        this.audioManager = audioManager || new AudioManager();

        // Game state
        this.state = "MENU"; // MENU, PLAYING, PAUSED, GAME_OVER
        this.score = 0;
        this.lives = 3;

        // Visual effects
        this.screenShake = null;
        this.hitPauseTimer = 0;
        this.damageNumbers = [];
        this.hitSparks = [];

        // Initialize game components
        this.player = new Player(100, 500, this.audioManager);
        this.level = new Level(this.width, this.height);
        // Keep a flag so Level can reduce visual complexity on mobile
        this.level.useMobileOptimizations = this.isMobile;
        // Default level data with platforms (make world wider than viewport so horizontal panning is possible)
        const worldWidth = Math.max(this.width * 2, 1920);
        const levelData = {
            width: worldWidth,
            height: this.height,
            platforms: [
                { x: 100, y: 600, width: 400, height: 32, type: 'static' },
                { x: 600, y: 500, width: 200, height: 32, type: 'static' },
                { x: 900, y: 400, width: 250, height: 32, type: 'static' },
                { x: 0, y: 700, width: worldWidth, height: 40, type: 'static' }
            ]
        };
        this.level.loadLevel(levelData);
        this.enemyManager = new EnemyManager(this.audioManager);
        this.ui = new UI(this.width, this.height);

        // Camera
        this.cameraX = 0;
        this.cameraY = 0;

        // Input handling
        this._touchKeys = new Set();
        this.setupInput();
    }

    
        setupInput() {
            // Normalize input and use consistent keys (use event.code when available)
            const normalize = (ev) => {
                const raw = ev.code || ev.key || '';
                return String(raw).toLowerCase();
            };

            // Key down handler
            window.addEventListener('keydown', (event) => {
                const key = normalize(event);

                // Prevent default for primary game keys
                if (['space', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
                    event.preventDefault();
                }

                // Global controls
                if (key === 'escape') {
                    if (this.state === 'PLAYING') {
                        this.state = 'PAUSED';
                        this.audioManager.playSound && this.audioManager.playSound('pause');
                        this.audioManager.pauseMusic && this.audioManager.pauseMusic();
                        this.dispatchGameStateChange();
                    } else if (this.state === 'PAUSED') {
                        this.state = 'PLAYING';
                        this.audioManager.unpauseMusic && this.audioManager.unpauseMusic();
                        this.dispatchGameStateChange();
                    }
                } else if (key === 'enter') {
                    if (this.state === 'MENU' || this.state === 'GAME_OVER') {
                        this.audioManager.playSound && this.audioManager.playSound('menu_select');
                        this.startGame();
                        this.dispatchGameStateChange();
                    }
                }

                // Gameplay controls
                if (this.state === 'PLAYING') {
                    this.player.handleInput(key, true);
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

        // Start or restart the game
        async startGame() {
            console.log('Game.startGame() called');
            this.state = 'PLAYING';
            this.score = 0;
            this.lives = 3;
            if (this.player && typeof this.player.reset === 'function') this.player.reset();
            if (this.enemyManager && typeof this.enemyManager.reset === 'function') this.enemyManager.reset();
            this.damageNumbers = [];
            this.hitSparks = [];
            // Place player on the floor so they don't start on small platforms
            if (this.level.platforms && this.level.platforms.length > 0) {
                const floor = this.level.platforms.reduce((a, b) => (b.y > a.y ? b : a), this.level.platforms[0]);
                const spawnX = Math.floor(floor.x + (floor.width - this.player.width) / 2);
                const spawnPadding = 8; // px above the platform
                this.player.x = spawnX;
                this.player.y = floor.y - this.player.height - spawnPadding;
                console.log('Spawn placed on floor at', this.player.x, this.player.y, 'floor:', floor.x, floor.y, floor.width, floor.height);
                // Snap camera immediately to the player so the floor is visible on start
                if (Config.CAMERA_START === 'bottom-left') {
                    // bottom-left: x=0, y = level.height - viewHeight (show floor)
                    this.cameraX = 0;
                    this.cameraY = Math.max(0, this.level.height - (this.viewHeight || this.height));
                } else {
                    const targetCamX = this.player.x - (this.viewWidth || this.width) / 3;
                    this.cameraX = Utils.clamp(targetCamX, 0, Math.max(0, this.level.width - (this.viewWidth || this.width)));
                    const targetCamY = this.player.y - (this.viewHeight || this.height) * 0.45;
                    this.cameraY = Utils.clamp(targetCamY, 0, Math.max(0, this.level.height - (this.viewHeight || this.height)));
                }
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

        update(dt) {
            if (this.state !== "PLAYING") {
                return;
        }

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

        // Update enemies
        this.enemyManager.update(dt, this.player, this.level);

        // Check player attacks hitting enemies
        const attackResult = this.enemyManager.checkPlayerAttack(this.player);
        if (attackResult.hit) {
            this.score += attackResult.totalDamage * 10;
            
            // Create visual feedback (limit on mobile)
            for (const enemy of this.enemyManager.getEnemies()) {
                if (this.player.hitEnemies.has(enemy)) {
                    // On mobile, limit damage numbers to reduce overdraw
                    if (!this.isMobile || this.damageNumbers.length < 2) {
                        this.damageNumbers.push(new DamageNumber(
                            enemy.x + enemy.width / 2,
                            enemy.y,
                            Math.floor(attackResult.totalDamage / attackResult.enemiesHit),
                            this.player.isShadowStriking
                        ));
                    }

                    // Skip spark particles on mobile
                    if (!this.isMobile) {
                        this.hitSparks.push(new HitSpark(
                            enemy.x + enemy.width / 2,
                            enemy.y + enemy.height / 2
                        ));
                    }
                }
            }

            // Screen shake and hit pause for impactful hits
            if (this.player.isShadowStriking) {
                this.screenShake = new ScreenShake(0.1, 8);
                this.hitPauseTimer = 0.05;
            } else if (this.player.comboCount >= 3) {
                this.screenShake = new ScreenShake(0.08, 5);
                this.audioManager.playSound('combo', 0.8);
            }
        }

        // Check enemy attacks hitting player
        const playerHit = this.enemyManager.checkEnemyAttacks(this.player);
        if (playerHit) {
            // Player died
            this.state = "GAME_OVER";
            this.audioManager.stopMusic();
            this.audioManager.playSound('game_over', 1.0);
        }

        // Update camera to follow player
        this.updateCamera();
    }

    updateCamera() {
        // Smooth camera following
        const horizontalBias = this.isMobile ? 0.28 : (1 / 3);
        const targetCameraX = this.player.x - (this.viewWidth || this.width) * horizontalBias;
        const lerpFactorX = this.isMobile ? 0.12 : 0.1;
        this.cameraX = Utils.lerp(this.cameraX || 0, targetCameraX, lerpFactorX);
        
        // Clamp camera to level bounds (use viewWidth so camera can move on narrow mobile viewports)
        const clampMaxX = Math.max(0, this.level.width - (this.viewWidth || this.width));
        this.cameraX = Utils.clamp(this.cameraX, 0, clampMaxX);

        // Diagnostics: emit a short trace for the first few frames while playing to capture values
        if (!this._camDiagInitialized) {
            this._camDiagInitialized = true;
            this._camDiagCount = 0;
        }
        if (this.state === 'PLAYING' && this._camDiagCount < 20) {
            console.log('CameraX trace', {
                frame: this._camDiagCount,
                playerX: this.player.x,
                cameraX: this.cameraX,
                targetCameraX,
                clampMaxX,
                viewWidth: this.viewWidth,
                levelWidth: this.level.width
            });
            this._camDiagCount++;
            if (this._camDiagCount === 20 && clampMaxX === 0) {
                console.warn('No horizontal room to pan: level.width <= viewWidth', { levelWidth: this.level.width, viewWidth: this.viewWidth });
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
            console.log('CameraY diagnostic', { cameraY: this.cameraY, targetCameraY, viewHeight: this.viewHeight, levelHeight: this.level.height });
        }
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
        this.ctx.restore();

        // Restore after screen shake
        if (this.screenShake && this.screenShake.isActive()) {
            this.ctx.restore();
        }
        // Restore scale transform
        this.ctx.restore();
        // Render UI (always on top, no camera offset)
        if (this.state === "PLAYING") {
            this.ui.drawHUD(this.ctx, this.player, this.score, this.player.comboCount);
        } else if (this.state === "MENU") {
            this.ui.drawMenu(this.ctx);
        } else if (this.state === "PAUSED") {
            this.ui.drawPauseMenu(this.ctx);
        } else if (this.state === "GAME_OVER") {
            this.ui.drawGameOver(this.ctx, this.score, this.enemyManager.enemiesDefeated);
        }
    }
}

console.log('Game class defined');
