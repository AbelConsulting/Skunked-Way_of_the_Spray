class AudioManager {
    constructor() {
        // Web Audio Context for SFX (Low latency, high polyphony)
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        this.sfxBuffers = {}; // Stores decoded audio data
        this.musicElements = {}; // Stores HTML5 Audio elements
        
        this.currentMusic = null;
        this.soundEnabled = true;
        this.musicEnabled = true;
        
        // Gain Nodes for Volume Control
        this.masterGain = this.audioCtx.createGain();
        this.sfxGain = this.audioCtx.createGain();
        this.musicGain = 1.0; // Handled separately for HTML5 Audio elements
        
        this.masterGain.connect(this.audioCtx.destination);
        this.sfxGain.connect(this.masterGain);
        
        // Defaults
        this.setSoundVolume(0.7);
        this.setMusicVolume(0.5);
    }

    /**
     * Call this on the FIRST user interaction (click/keydown)
     * to unlock the browser's audio engine.
     */
    async initialize() {
        if (this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume();
        }
    }

    /**
     * Load a short sound effect into memory (Web Audio API)
     */
    async loadSound(name, path) {
        try {
            const response = await fetch(path);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
            this.sfxBuffers[name] = audioBuffer;
            return audioBuffer;
        } catch (e) {
            console.warn(`Failed to load sound: ${path}`, e);
            return null;
        }
    }

    /**
     * Load background music (HTML5 Audio - Streaming)
     */
    loadMusic(name, path) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => {
                this.musicElements[name] = audio;
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
     * Load all assets (Accepts lists as arguments for reusability)
     */
    async loadAssets(soundList, musicList) {
        const soundPromises = soundList.map(([name, path]) => this.loadSound(name, path));
        const musicPromises = musicList.map(([name, path]) => this.loadMusic(name, path));
        await Promise.all([...soundPromises, ...musicPromises]);
    }

    /**
     * Play a SFX with low latency and automatic overlapping
     */
    playSound(name, volumeScale = 1.0) {
        if (!this.soundEnabled || !this.sfxBuffers[name]) return;

        // Create a source node for this specific instance of the sound
        const source = this.audioCtx.createBufferSource();
        source.buffer = this.sfxBuffers[name];

        // Create a temporary gain node for this specific sound instance
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = volumeScale; // Individual sound volume adjustment

        // Connect: Source -> Instance Gain -> SFX Group Gain -> Master -> Speakers
        source.connect(gainNode);
        gainNode.connect(this.sfxGain);

        source.start(0);
    }

    playMusic(name, loop = true) {
        if (!this.musicEnabled || !this.musicElements[name]) return;

        // If same track is requested, just ensure it's playing
        if (this.currentMusic === this.musicElements[name]) {
            if (this.currentMusic.paused) this.currentMusic.play();
            return;
        }

        this.stopMusic();

        this.currentMusic = this.musicElements[name];
        this.currentMusic.loop = loop;
        this.currentMusic.volume = this.musicGain;
        
        const playPromise = this.currentMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => console.warn(`Auto-play blocked for music ${name}:`, e));
        }
    }

    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.currentMusic = null;
        }
    }

    toggleMute() {
        this.soundEnabled = !this.soundEnabled;
        this.musicEnabled = !this.musicEnabled;
        
        if (!this.musicEnabled) this.stopMusic();
        // Web Audio mute
        this.masterGain.gain.setValueAtTime(this.soundEnabled ? 1 : 0, this.audioCtx.currentTime);
    }

    setSoundVolume(val) {
        // Clamp between 0 and 1
        const volume = Math.max(0, Math.min(1, val));
        this.sfxGain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
    }

    setMusicVolume(val) {
        const volume = Math.max(0, Math.min(1, val));
        this.musicGain = volume;
        if (this.currentMusic) {
            this.currentMusic.volume = volume;
        }
    }
}