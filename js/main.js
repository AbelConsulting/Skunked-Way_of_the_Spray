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
        this.lastTime = 0;
        this.running = false;

        this.init();
    }

    async init() {
        try {
            // Load all assets
            await this.loadAssets();

            // Hide loading screen
            this.loadingScreen.classList.add('hidden');

            // Create game instance
            this.game = new Game(this.canvas);

            // Start game loop
            this.running = true;
            this.lastTime = performance.now();
            this.gameLoop(this.lastTime);

        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.loadingText.textContent = 'Error loading game. Please refresh.';
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


        // Load audio
        const audioManager = new AudioManager();
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
            ['pause', 'assets/audio/sfx/pause.wav'],
            ['combo', 'assets/audio/sfx/combo.wav'],
            ['game_over', 'assets/audio/sfx/game_over.wav']
        ];
        const musicList = [
            ['gameplay', 'assets/audio/music/gameplay.ogg']
        ];
        
            // Enable audio on first user interaction (required by browsers)
            window.addEventListener('keydown', () => audioManager.initialize(), { once: true });
            window.addEventListener('mousedown', () => audioManager.initialize(), { once: true });
        await audioManager.loadAssets(soundList, musicList);

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

        // Calculate delta time (in seconds)
        const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 0.1s
        this.lastTime = currentTime;

        // Update and render
        if (this.game) {
            this.game.update(dt);
            this.game.render();
        }

        // Continue loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    stop() {
        this.running = false;
    }
}

// Start the game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    const gameApp = new GameApp();
});
