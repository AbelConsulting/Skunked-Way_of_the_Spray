/**
 * Audio manager for music and sound effects
 */

class AudioManager {
    constructor() {
        this.sounds = {};
        this.music = {};
        this.currentMusic = null;
        this.soundEnabled = true;
        this.musicEnabled = true;
        this.soundVolume = 0.7;
        this.musicVolume = 0.5;
    }

    /**
     * Load a sound effect
     */
    loadSound(name, path) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => {
                this.sounds[name] = audio;
                resolve(audio);
            };
            audio.onerror = () => {
                console.warn(`Failed to load sound: ${path}`);
                resolve(null); // Don't reject, just continue without this sound
            };
            audio.src = path;
            audio.load();
        });
    }

    /**
     * Load background music
     */
    loadMusic(name, path) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => {
                this.music[name] = audio;
                resolve(audio);
            };
            audio.onerror = () => {
                console.warn(`Failed to load music: ${path}`);
                resolve(null);
            };
            audio.src = path;
            audio.load();
        });
    }

    /**
     * Load all game audio
     */
    async loadAllAudio() {
        const soundsToLoad = [
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

        const musicToLoad = [
            ['gameplay', 'assets/audio/music/gameplay.ogg']
        ];

        const soundPromises = soundsToLoad.map(([name, path]) => this.loadSound(name, path));
        const musicPromises = musicToLoad.map(([name, path]) => this.loadMusic(name, path));

        await Promise.all([...soundPromises, ...musicPromises]);
    }

    /**
     * Play a sound effect
     */
    playSound(name, volume = 1.0) {
        if (!this.soundEnabled || !this.sounds[name]) return;

        try {
            const sound = this.sounds[name].cloneNode();
            sound.volume = this.soundVolume * volume;
            sound.play().catch(e => console.warn(`Error playing sound ${name}:`, e));
        } catch (e) {
            console.warn(`Error playing sound ${name}:`, e);
        }
    }

    /**
     * Play background music
     */
    playMusic(name, loop = true) {
        if (!this.musicEnabled || !this.music[name]) return;

        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
        }

        this.currentMusic = this.music[name];
        this.currentMusic.loop = loop;
        this.currentMusic.volume = this.musicVolume;
        this.currentMusic.play().catch(e => console.warn(`Error playing music ${name}:`, e));
    }

    /**
     * Pause current music
     */
    pauseMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
        }
    }

    /**
     * Resume current music
     */
    unpauseMusic() {
        if (this.currentMusic) {
            this.currentMusic.play().catch(e => console.warn('Error resuming music:', e));
        }
    }

    /**
     * Stop all music
     */
    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.currentMusic = null;
        }
    }

    /**
     * Set sound volume (0-1)
     */
    setSoundVolume(volume) {
        this.soundVolume = Utils.clamp(volume, 0, 1);
    }

    /**
     * Set music volume (0-1)
     */
    setMusicVolume(volume) {
        this.musicVolume = Utils.clamp(volume, 0, 1);
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume;
        }
    }
}
