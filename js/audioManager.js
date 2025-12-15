class AudioManager {
    constructor() {
        // Web Audio Context for SFX (Low latency, high polyphony)
        this.audioCtx = (window.AudioContext || window.webkitAudioContext) ? new (window.AudioContext || window.webkitAudioContext)() : null;
        
        this.sfxBuffers = {}; // Stores decoded audio data
        this.musicElements = {}; // Stores HTML5 Audio elements
        
        this.currentMusic = null;
        this.soundEnabled = true;
        this.musicEnabled = true;
        
        // Gain Nodes for Volume Control
        this.masterGain = this.audioCtx.createGain();
        this.sfxGain = this.audioCtx.createGain();
        this.musicGain = 1.0; // fallback if WebAudio music routing not used
        this.musicGainNode = this.audioCtx.createGain();

        this.masterGain.connect(this.audioCtx.destination);
        this.sfxGain.connect(this.masterGain);
        this.musicGainNode.connect(this.masterGain);
        
        // Defaults
        this.setSoundVolume(0.7);
        this.setMusicVolume(0.5);
    }

    /**
     * Call this on the FIRST user interaction (click/keydown)
     * to unlock the browser's audio engine.
     */
    async initialize() {
        if (typeof Config !== 'undefined' && Config.DEBUG) console.log('AudioManager: Initializing audio context...');
        if (this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume();
            if (typeof Config !== 'undefined' && Config.DEBUG) console.log('AudioManager: Audio context resumed.');
        } else {
            if (typeof Config !== 'undefined' && Config.DEBUG) console.log('AudioManager: Audio context already running.');
        }
    }

    /**
     * Load a short sound effect into memory (Web Audio API)
     */
    async loadSound(name, path) {
        try {
            const response = await fetch(path);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = this.audioCtx ? await this.audioCtx.decodeAudioData(arrayBuffer) : null;
            this.sfxBuffers[name] = audioBuffer;
            return audioBuffer;
        } catch (e) {
            if (typeof Config !== 'undefined' && Config.DEBUG) console.warn(`Failed to load sound: ${path}`, e);
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
                if (typeof Config !== 'undefined' && Config.DEBUG) console.log(`AudioManager: Music '${name}' loaded successfully`);
                this.musicElements[name] = audio;

                // If WebAudio is available, create a MediaElement source and route through musicGainNode
                try {
                    if (this.audioCtx) {
                        const source = this.audioCtx.createMediaElementSource(audio);
                        source.connect(this.musicGainNode);
                    }
                } catch (e) {
                    // Some browsers disallow multiple media element sources; ignore silently unless debugging
                    if (typeof Config !== 'undefined' && Config.DEBUG) console.warn('AudioManager: media element routing failed', e);
                }

                resolve(audio);
            };
            audio.onerror = () => {
                if (typeof Config !== 'undefined' && Config.DEBUG) console.warn(`Failed to load music: ${path}`);
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
        if (typeof Config !== 'undefined' && Config.DEBUG) console.log('AudioManager: Loading audio assets...');
        const soundPromises = soundList.map(([name, path]) => this.loadSound(name, path));
        const musicPromises = musicList.map(([name, path]) => this.loadMusic(name, path));
        await Promise.all([...soundPromises, ...musicPromises]);
        if (typeof Config !== 'undefined' && Config.DEBUG) console.log('AudioManager: All audio assets loaded.');
    }

    /**
     * Play a SFX with low latency and automatic overlapping
     */
    playSound(name, volumeScale = 1.0) {
        if (!this.soundEnabled) return;
        const buffer = this.sfxBuffers[name];
        if (!buffer) {
            if (typeof Config !== 'undefined' && Config.DEBUG) console.warn(`AudioManager: sound buffer missing '${name}'`);
            return;
        }

        if (!this.audioCtx) return;

        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = volumeScale;

        source.connect(gainNode);
        gainNode.connect(this.sfxGain);

        source.start();
        if (typeof Config !== 'undefined' && Config.DEBUG) console.log(`AudioManager: Playing sound '${name}'`);
    }

    playMusic(name, loop = true) {
        if (!this.musicEnabled) return;
        const audioEl = this.musicElements[name];
        if (!audioEl) {
            if (typeof Config !== 'undefined' && Config.DEBUG) console.warn(`AudioManager: music element missing '${name}'`);
            return;
        }

        if (this.currentMusic === audioEl) {
            if (this.currentMusic.paused) this.currentMusic.play();
            return;
        }

        this.stopMusic();

        this.currentMusic = audioEl;
        this.currentMusic.loop = loop;
        // If routed through WebAudio, control volume via gain node; otherwise use element volume
        if (this.audioCtx) {
            this.musicGainNode.gain.setValueAtTime(this.musicGain, this.audioCtx.currentTime);
            const playPromise = this.currentMusic.play();
            if (playPromise !== undefined) playPromise.catch(e => { if (typeof Config !== 'undefined' && Config.DEBUG) console.warn('Auto-play blocked for music', e); });
        } else {
            this.currentMusic.volume = this.musicGain;
            const playPromise = this.currentMusic.play();
            if (playPromise !== undefined) playPromise.catch(e => { if (typeof Config !== 'undefined' && Config.DEBUG) console.warn('Auto-play blocked for music', e); });
        }
        if (typeof Config !== 'undefined' && Config.DEBUG) console.log(`AudioManager: Playing music '${name}'`);
    }

    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
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
        
        if (!this.musicEnabled) this.stopMusic();
        // Web Audio mute
        if (this.audioCtx) this.masterGain.gain.setValueAtTime(this.soundEnabled ? 1 : 0, this.audioCtx.currentTime);
    }

    setSoundVolume(val) {
        // Clamp between 0 and 1
        const volume = Math.max(0, Math.min(1, val));
        this.sfxGain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
    }

    setMusicVolume(val) {
        const volume = Math.max(0, Math.min(1, val));
        this.musicGain = volume;
        if (this.audioCtx && this.musicGainNode) {
            this.musicGainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);
        } else if (this.currentMusic) {
            this.currentMusic.volume = volume;
        }
    }
}