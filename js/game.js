/**
 * Game class - Main game controller
 */

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = Config.SCREEN_WIDTH;
        this.height = Config.SCREEN_HEIGHT;

        // Initialize audio
        this.audioManager = new AudioManager();

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
        this.enemyManager = new EnemyManager(this.audioManager);
        this.ui = new UI(this.width, this.height);

        // Camera
        this.cameraX = 0;

        // Input handling
        this.setupInput();
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        window.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });
    }

    handleKeyDown(event) {
        const key = event.key;

        // Prevent default for game keys
        if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
            event.preventDefault();
        }

        // Global controls
        if (key === 'Escape') {
            if (this.state === "PLAYING") {
                this.state = "PAUSED";
                this.audioManager.playSound('pause');
                this.audioManager.pauseMusic();
            } else if (this.state === "PAUSED") {
                this.state = "PLAYING";
                this.audioManager.unpauseMusic();
            }
        } else if (key === 'Enter') {
            if (this.state === "MENU") {
                this.audioManager.playSound('menu_select');
                this.startGame();
            } else if (this.state === "GAME_OVER") {
                this.audioManager.playSound('menu_select');
                this.startGame();
            }
        }

        // Gameplay controls
        if (this.state === "PLAYING") {
            this.player.handleInput(key, true);
        }
    }

    handleKeyUp(event) {
        const key = event.key;

        if (this.state === "PLAYING") {
            this.player.handleInput(key, false);
        }
    }

    startGame() {
        this.state = "PLAYING";
        this.score = 0;
        this.lives = 3;
        this.player.reset();
        this.enemyManager.reset();
        this.damageNumbers = [];
        this.hitSparks = [];

        // Start gameplay music
        this.audioManager.playMusic('gameplay', true);
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
            
            // Create visual feedback
            for (const enemy of this.enemyManager.getEnemies()) {
                if (this.player.hitEnemies.has(enemy)) {
                    this.damageNumbers.push(new DamageNumber(
                        enemy.x + enemy.width / 2,
                        enemy.y,
                        Math.floor(attackResult.totalDamage / attackResult.enemiesHit),
                        this.player.isShadowStriking
                    ));
                    this.hitSparks.push(new HitSpark(
                        enemy.x + enemy.width / 2,
                        enemy.y + enemy.height / 2
                    ));
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
        const targetCameraX = this.player.x - this.width / 3;
        this.cameraX = Utils.lerp(this.cameraX, targetCameraX, 0.1);
        
        // Clamp camera to level bounds
        this.cameraX = Utils.clamp(this.cameraX, 0, Math.max(0, this.level.width - this.width));
    }

    render() {
        // Clear screen
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Apply screen shake
        if (this.screenShake && this.screenShake.isActive()) {
            this.ctx.save();
            this.ctx.translate(this.screenShake.offsetX, this.screenShake.offsetY);
        }

        // Render game world
        this.level.draw(this.ctx, this.cameraX);
        this.player.draw(this.ctx, this.cameraX);
        this.enemyManager.draw(this.ctx, this.cameraX);

        // Render visual effects
        this.ctx.save();
        this.ctx.translate(-this.cameraX, 0);
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
