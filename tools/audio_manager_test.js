'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

function runtime({ webAudio = true } = {}) {
    let now = 10000;
    let nextId = 0;
    const timers = new Map();
    const media = [];
    const sources = [];
    const mediaNodes = [];
    const errors = [];
    const listeners = {};
    const schedule = (fn, delay = 0, interval = 0) => {
        const id = ++nextId;
        timers.set(id, { fn, at: now + delay, interval });
        return id;
    };
    class Param {
        constructor(value = 1) { this.base = value; this.events = []; }
        get value() {
            const completed = this.events.filter(e => e.time <= now / 1000);
            return completed.length ? completed[completed.length - 1].value : this.base;
        }
        set value(value) { this.base = value; this.events = []; }
        setValueAtTime(value, time) { this.events.push({ value, time }); }
        linearRampToValueAtTime(value, time) { this.events.push({ value, time }); }
        cancelScheduledValues(time) {
            this.base = this.value;
            this.events = this.events.filter(e => e.time < time);
        }
    }
    class AudioNode {
        constructor() { this.gain = new Param(); this.connected = false; }
        connect() { this.connected = true; return this; }
        disconnect() { this.connected = false; }
    }
    class Context {
        constructor() { this.state = 'running'; this.destination = new AudioNode(); }
        get currentTime() { return now / 1000; }
        createGain() { return new AudioNode(); }
        createStereoPanner() { const node = new AudioNode(); node.pan = new Param(0); return node; }
        createMediaElementSource(audio) {
            const node = new AudioNode();
            node.audio = audio;
            mediaNodes.push(node);
            return node;
        }
        createBufferSource() {
            const source = new AudioNode();
            source.playbackRate = new Param();
            source.detune = new Param(0);
            source.start = () => {
                source.started = true;
                const rate = source.playbackRate.value * Math.pow(2, source.detune.value / 1200);
                source.actualEnd = this.currentTime + source.buffer.duration / rate;
                source.timer = schedule(() => source.stop(), source.buffer.duration / rate * 1000);
            };
            source.stop = () => {
                if (source.stopped) return;
                source.stopped = true;
                timers.delete(source.timer);
                if (source.onended) source.onended();
            };
            sources.push(source);
            return source;
        }
        resume() { this.state = 'running'; return Promise.resolve(); }
        suspend() { this.state = 'suspended'; return Promise.resolve(); }
    }
    class Audio {
        constructor() { this.paused = true; this.currentTime = 0; this.volume = 1; media.push(this); }
        play() { this.paused = false; return Promise.resolve(); }
        pause() { this.paused = true; }
        load() { queueMicrotask(() => { if (this.oncanplaythrough) this.oncanplaythrough(); }); }
    }
    const ctx = vm.createContext({
        window: { AudioContext: webAudio ? Context : undefined },
        document: {
            hidden: false,
            createElement: () => ({ canPlayType: () => 'probably' }),
            addEventListener: (name, callback) => { listeners[name] = callback; },
        },
        performance: { now: () => now },
        Date: class extends Date { static now() { return now; } },
        Config: { DEBUG: false },
        Audio,
        console: { log() {}, warn: (...args) => errors.push(args), error: (...args) => errors.push(args) },
        __err: (_, error) => errors.push(error),
        setTimeout: (fn, delay) => schedule(fn, delay),
        clearTimeout: id => timers.delete(id),
        setInterval: (fn, delay) => schedule(fn, delay, delay),
        clearInterval: id => timers.delete(id),
        requestAnimationFrame: fn => schedule(() => fn(now), 16),
        cancelAnimationFrame: id => timers.delete(id),
    });
    vm.runInContext(read('js/audioManager.js') + '\nglobalThis.TestAudioManager = AudioManager;', ctx);
    const manager = new ctx.TestAudioManager();
    manager._ensureContext();
    return {
        ctx, manager, media, sources, mediaNodes, errors, listeners,
        advance(ms) {
            const end = now + ms;
            let count = 0;
            while (true) {
                const entry = [...timers].filter(([, timer]) => timer.at <= end)
                    .sort((a, b) => a[1].at - b[1].at)[0];
                if (!entry) break;
                assert.ok(++count < 10000, 'timers must settle');
                const [id, timer] = entry;
                now = timer.at;
                if (timer.interval) timer.at += timer.interval;
                else timers.delete(id);
                timer.fn();
            }
            now = end;
        },
        liveSources() { return sources.filter(source => source.started && !source.stopped); },
    };
}

test('menu sliders change actual gains and persist preferences', () => {
    const r = runtime();
    const html = read('index.html');
    const start = html.indexOf('// Settings volume sliders');
    const end = html.indexOf('// --- Skin pack', start);
    assert.ok(start >= 0 && end > start);
    const elements = {};
    for (const id of ['menu-sfx-volume', 'menu-music-volume', 'menu-sfx-volume-value', 'menu-music-volume-value']) {
        elements[id] = { value: 0, addEventListener(event, callback) { this[event] = callback; } };
    }
    const saved = new Map();
    vm.runInNewContext(html.slice(start, end), {
        window: { game: { audioManager: r.manager } },
        document: { getElementById: id => elements[id] },
        localStorage: { setItem: (key, value) => saved.set(key, String(value)) },
        console,
    });
    elements['menu-sfx-volume'].input();
    elements['menu-music-volume'].value = 20;
    elements['menu-music-volume'].input();
    assert.equal(r.manager.sfxGain.gain.value, 0);
    assert.equal(r.manager.musicGain, 0.2);
    assert.ok(Math.abs(r.manager.ambientGain - 0.04) < 1e-9);
    assert.equal(saved.get('sfxVolume'), '0');
    assert.equal(saved.get('musicVolume'), '20');
});

for (const volume of [0, 0.1, 0.5, 1]) {
    test(`ducking respects music volume ${volume}`, () => {
        const r = runtime();
        r.manager.setMusicVolume(volume);
        r.manager._applyDuck();
        r.advance(30);
        assert.ok(Math.abs(r.manager.musicGainNode.gain.value - volume * 0.4) < 1e-9);
        r.advance(600);
        assert.equal(r.manager.musicGainNode.gain.value, volume);
    });
}

test('changing music volume cancels stale duck automation', () => {
    const r = runtime();
    r.manager._applyDuck();
    r.manager.setMusicVolume(0);
    r.advance(30);
    assert.equal(r.manager.musicGainNode.gain.value, 0);
    r.advance(1000);
    assert.equal(r.manager.musicGainNode.gain.value, 0);
});

for (const webAudio of [true, false]) {
    test(`interrupted transitions stop all old music (${webAudio ? 'WebAudio' : 'fallback'})`, async () => {
        const r = runtime({ webAudio });
        const a = await r.manager.loadMusic('a', 'a.wav');
        const b = await r.manager.loadMusic('b', 'b.wav');
        const c = await r.manager.loadMusic('c', 'c.wav');
        r.manager.playMusic('a');
        r.advance(1000);
        r.manager.playMusic('b');
        r.advance(100);
        r.manager.stopMusic(300);
        r.manager.playMusic('c');
        r.advance(4000);
        assert.equal(a.paused, true);
        assert.equal(b.paused, true);
        assert.equal(c.paused, false);
        assert.equal(r.manager.currentMusic, c);
        assert.deepEqual(r.errors, []);
    });

    test(`stop clears queued music and tolerates repeated stop (${webAudio ? 'WebAudio' : 'fallback'})`, async () => {
        const r = runtime({ webAudio });
        await r.manager.loadMusic('a', 'a.wav');
        await r.manager.loadMusic('b', 'b.wav');
        r.manager.playMusic('a');
        r.manager.playMusic('b');
        r.manager.stopMusic();
        r.manager.stopMusic();
        r.advance(4000);
        assert.ok(r.media.every(audio => audio.paused));
        assert.equal(r.manager.currentMusic, null);
        assert.equal(r.manager._isFading, false);
    });

    test(`pause during a transition stays paused (${webAudio ? 'WebAudio' : 'fallback'})`, async () => {
        const r = runtime({ webAudio });
        await r.manager.loadMusic('a', 'a.wav');
        const b = await r.manager.loadMusic('b', 'b.wav');
        r.manager.playMusic('a');
        r.advance(1000);
        r.manager.playMusic('b');
        r.manager.pauseMusic();
        r.advance(1000);
        assert.ok(r.media.every(audio => audio.paused));
        r.manager.unpauseMusic();
        assert.equal(b.paused, false);
    });
}

test('impact ducking does not interrupt a music fade', async () => {
    const r = runtime();
    await r.manager.loadMusic('a', 'a.wav');
    await r.manager.loadMusic('b', 'b.wav');
    r.manager.playMusic('a');
    r.advance(1000);
    r.manager.playMusic('b');
    const events = r.manager.musicGainNode.gain.events.map(event => ({ ...event }));
    r.manager._applyDuck();
    assert.deepEqual(r.manager.musicGainNode.gain.events, events);
});

test('WebAudio waits for the outgoing track to stop before starting the next', async () => {
    const r = runtime();
    const a = await r.manager.loadMusic('a', 'a.wav');
    const b = await r.manager.loadMusic('b', 'b.wav');
    r.manager.playMusic('a');
    r.advance(1000);
    r.manager.playMusic('b');
    r.advance(200);
    assert.equal(a.paused, false);
    assert.equal(b.paused, true);
    r.advance(300);
    assert.equal(a.paused, true);
    assert.equal(b.paused, false);
});

for (const webAudio of [true, false]) {
    test(`zero-duration fades settle (${webAudio ? 'WebAudio' : 'fallback'})`, async () => {
        const r = runtime({ webAudio });
        await r.manager.loadMusic('a', 'a.wav');
        await r.manager.loadMusic('b', 'b.wav');
        r.manager.playMusic('a', true, { fadeIn: 0, fadeOut: 0 });
        r.advance(50);
        r.manager.playMusic('b', true, { fadeIn: 0, fadeOut: 0 });
        r.advance(50);
        r.manager.stopMusic(0);
        r.advance(50);
        assert.ok(r.media.every(audio => audio.paused && Number.isFinite(audio.volume)));
        assert.equal(r.manager._isFading, false);
    });
}

test('backgrounding during a transition restores music only when appropriate', async () => {
    const r = runtime();
    await r.manager.loadMusic('a', 'a.wav');
    const b = await r.manager.loadMusic('b', 'b.wav');
    r.manager.playMusic('a');
    r.advance(1000);
    r.manager.playMusic('b');
    r.ctx.document.hidden = true;
    r.listeners.visibilitychange();
    r.advance(1000);
    assert.ok(r.media.every(audio => audio.paused));
    r.ctx.document.hidden = false;
    r.listeners.visibilitychange();
    assert.equal(b.paused, false);
    r.manager.pauseMusic();
    r.ctx.document.hidden = true;
    r.listeners.visibilitychange();
    r.ctx.document.hidden = false;
    r.listeners.visibilitychange();
    assert.equal(b.paused, true, 'a user-paused track must not auto-resume');
});

test('autoplay retry does not override pause', async () => {
    const r = runtime();
    const a = await r.manager.loadMusic('a', 'a.wav');
    r.manager.playMusic('a');
    r.advance(1000);
    r.manager.pauseMusic();
    r.manager._musicPlayPending = true;
    await r.manager.initialize();
    assert.equal(a.paused, true);
});

test('slowed and detuned effects still respect the global voice limit', () => {
    const r = runtime();
    r.manager.maxSfxVoices = 1;
    r.manager.sfxBuffers.boss_attack = { duration: 1 };
    r.manager.playSound('boss_attack', { rate: 0.5, detune: -1200 });
    r.advance(1100);
    r.manager.playSound('boss_attack', { rate: 0.5 });
    assert.equal(r.liveSources().length, 1);
    assert.equal(r.manager._activeSfx.length, 1);
});

test('ended effects release voice slots and pooled nodes immediately', () => {
    const r = runtime();
    r.manager.sfxBuffers.ui_hover = { duration: 0.03 };
    for (let i = 0; i < 3; i++) {
        r.manager.playSound('ui_hover', { pan: 0.2 });
        r.advance(70);
        assert.equal(r.manager._activeSfx.length, 0);
    }
    assert.equal(r.sources.length, 3);
    assert.equal(r.manager._gainPool.length, 1);
    assert.equal(r.manager._pannerPool.length, 1);
});

test('ambient loads reuse both in-flight and completed requests', async () => {
    const r = runtime();
    const [a, b] = await Promise.all([
        r.manager.loadAmbient('forest', 'forest.wav'),
        r.manager.loadAmbient('forest', 'forest.wav'),
    ]);
    assert.equal(a, b);
    for (let i = 0; i < 20; i++) {
        assert.equal(await r.manager.loadAmbient('forest', 'forest.wav'), a);
    }
    assert.equal(r.media.length, 1);
    assert.equal(r.mediaNodes.length, 1);
});

test('failed ambient loads can be retried', async () => {
    const r = runtime();
    const originalLoad = r.ctx.Audio.prototype.load;
    r.ctx.Audio.prototype.load = function () { queueMicrotask(() => this.onerror()); };
    assert.equal(await r.manager.loadAmbient('forest', 'forest.wav'), null);
    r.ctx.Audio.prototype.load = originalLoad;
    assert.ok(await r.manager.loadAmbient('forest', 'forest.wav'));
    assert.equal(r.media.length, 2);
    assert.equal(r.errors.length, 1);
});

test('cached ambience is routed when WebAudio becomes available later', async () => {
    const r = runtime();
    const context = r.manager.audioCtx;
    const constructor = r.manager._AudioContextClass;
    r.manager.audioCtx = null;
    r.manager._AudioContextClass = null;
    const a = await r.manager.loadAmbient('forest', 'forest.wav');
    a.volume = 0.1;
    r.manager.audioCtx = context;
    r.manager._AudioContextClass = constructor;
    r.manager.playAmbient('forest');
    assert.equal(a._audioConnected, true);
    assert.equal(a.volume, 1);
    assert.equal(r.mediaNodes.length, 1);
});

for (const webAudio of [true, false]) {
    test(`replaying cached ambience cancels its pending stop (${webAudio ? 'WebAudio' : 'fallback'})`, async () => {
        const r = runtime({ webAudio });
        const a = await r.manager.loadAmbient('forest', 'forest.wav');
        r.manager.playAmbient('forest');
        r.advance(1100);
        r.manager.stopAmbient(0.5);
        r.manager.playAmbient('forest');
        r.advance(1500);
        assert.equal(a.paused, false);
        assert.equal(r.manager.currentAmbient, a);
        r.manager.stopAmbient();
        r.advance(2000);
        assert.equal(a.paused, true);
        assert.deepEqual(r.errors, []);
    });
}

test('the unused metal pad is not loaded into SFX memory', () => {
    assert.equal(/\['metal_pad',\s*'assets\/audio\/sfx\/metal_pad\.wav'\]/.test(read('js/main.js')), false);
});
