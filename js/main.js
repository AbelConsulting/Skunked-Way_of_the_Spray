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
        await audioManager.loadAllAudio();

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
