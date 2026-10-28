'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const states = ['idle', 'walk', 'jump', 'attack', 'skunk_shot', 'shadow_strike', 'hurt', 'death'];

function runtime({ owned = false, founder = false, platform, selected } = {}) {
    const storage = new Map(owned ? [['skunkfu.adFree', '1']] : []);
    if (selected) storage.set('skunkfu.skinVariant', selected);
    const draws = [];
    const ctx = vm.createContext({
        console, URLSearchParams, Map, PLATFORM: platform,
        localStorage: {
            getItem: key => storage.get(key) || null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: key => storage.delete(key),
        },
    });
    ctx.window = ctx;
    for (const file of ['js/spriteLoader.js', 'js/founderManager.js', 'js/goldenSkin.js', 'js/player.js']) {
        vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx);
    }
    if (founder) ctx.FounderManager.grant('test');
    const player = vm.runInContext('Object.create(Player.prototype)', ctx);
    const loader = vm.runInContext('spriteLoader', ctx);
    for (const prefix of ['ninja', 'ninja2', 'ninja3', 'ninja4']) {
        for (const state of states) {
            const name = prefix + '_' + state;
            const bytes = fs.readFileSync(path.join(ROOT, 'assets', 'sprites', 'characters', name + '.png'));
            loader.sprites[name] = { name, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
        }
    }
    player.loadSprites();
    Object.assign(player, { x: 10, y: 20, width: 64, height: 64, facingRight: true });
    const canvas = {
        save() {}, restore() {}, translate() {}, scale() {},
        drawImage(...args) { draws.push(args); },
    };
    return { ctx, storage, player, canvas, draws, loader, manager: ctx.FounderManager };
}

test('exactly six skins remain; Steel cannot be selected or rendered as a palette', () => {
    const r = runtime({ platform: 'steam' });
    const variants = ['gold', 'sapphire', 'amethyst', 'ninja2', 'ninja3', 'ninja4'];
    assert.deepEqual(Array.from(r.manager.getSkinVariants()), variants);
    assert.deepEqual(Array.from(r.manager.getUnlockedSkinVariants()), variants);
    assert.equal(r.manager.isSkinUnlocked('steel'), false);
    assert.equal(r.manager.setSkinVariant('steel'), false);
    assert.equal(r.ctx.GoldenSkin.hasPalette('steel'), false);
});

for (const options of [{ owned: true }, { owned: true, founder: true }, { platform: 'steam' }]) {
    test('saved Steel selection migrates to an enabled Sapphire skin: ' + JSON.stringify(options), () => {
        const r = runtime({ ...options, selected: 'steel' });
        assert.equal(r.manager.getSkinVariant(), 'sapphire');
        assert.equal(r.manager.isGoldSkinEnabled(), true);
        assert.equal(r.storage.get('skunkfu.skinVariant'), 'sapphire');
        const reloaded = runtime({ ...options, selected: r.storage.get('skunkfu.skinVariant') });
        assert.equal(reloaded.manager.getSkinVariant(), 'sapphire');
        assert.equal(reloaded.manager.isGoldSkinEnabled(), true);
    });
}

test('migrating Steel does not grant skin-pack ownership', () => {
    const r = runtime({ selected: 'steel' });
    assert.equal(r.manager.isSkinUnlocked('sapphire'), false);
    assert.equal(r.manager.isGoldSkinEnabled(), false);
});

for (const variant of ['ninja2', 'ninja3', 'ninja4']) {
test(variant + ' requires skin-pack ownership, not Founder or Founder Pass alone', () => {
    const r = runtime({ founder: true });
    r.storage.set('skunkfu.founderPassOwned', '1');
    assert.equal(r.manager.isSkinUnlocked('gold'), true);
    assert.equal(r.manager.isSkinUnlocked(variant), false);
    assert.equal(r.manager.setSkinVariant(variant), false);
    r.storage.set('skunkfu.adFree', '1');
    assert.equal(r.manager.isSkinUnlocked(variant), true);
    assert.equal(r.manager.setSkinVariant(variant), true);
    assert.equal(r.storage.get('skunkfu.skinVariant'), variant);
});

test('Steam includes ' + variant + '; saved selection survives reload', () => {
    const r = runtime({ platform: 'steam' });
    assert.equal(r.manager.setSkinVariant(variant), true);
    assert.equal(r.manager.getSkinVariant(), variant);
    const reloaded = runtime({ owned: true, selected: r.storage.get('skunkfu.skinVariant') });
    assert.equal(reloaded.manager.getSkinVariant(), variant);
});

test('all eight ' + variant + ' sheets render inside frame bounds without changing gameplay animations', () => {
    const r = runtime({ owned: true });
    r.manager.setSkinVariant(variant);
    for (const state of states) {
        const base = r.player.animations[state];
        const sheet = r.loader.getSprite(variant + '_' + state);
        assert.equal(sheet.width, 4 * sheet.height, state + ' has four square frames');
        r.player.currentAnimation = base;
        base.currentFrame = base.frameCount - 1;
        base.timer = base.frameDuration * 0.9;
        const before = JSON.stringify(base);
        r.player._drawCurrentAnimation(r.canvas);
        const [image, sx, sy, sw, sh, dx, dy, dw, dh] = r.draws.at(-1);
        assert.equal(image.name, variant + '_' + state);
        assert.ok(sx >= 0 && sx + sw <= image.width, state + ' slices within sheet');
        assert.deepEqual([sy, sh, dx, dy, dw, dh], [0, sheet.height, 10, 20, 64, 64]);
        assert.equal(JSON.stringify(base), before, state + ' gameplay clock is untouched');
    }
});

test(variant + ' hurt frames occupy the original duration; toggle and switching restore original artwork', () => {
    const r = runtime({ owned: true });
    r.manager.setSkinVariant(variant);
    const base = r.player.animations.hurt;
    r.player.currentAnimation = base;
    for (let frame = 0; frame < 4; frame++) {
        const elapsed = frame * 0.05;
        base.currentFrame = Math.floor(elapsed / base.frameDuration);
        base.timer = elapsed % base.frameDuration;
        r.player._drawCurrentAnimation(r.canvas);
        assert.equal(r.draws.at(-1)[1], frame * r.loader.getSprite(variant + '_hurt').height);
    }
    assert.equal(base.frameCount * base.frameDuration, 0.2);
    r.manager.setGoldSkinEnabled(false);
    r.player._drawCurrentAnimation(r.canvas);
    assert.equal(r.draws.at(-1)[0].name, 'ninja_hurt');
    r.manager.setGoldSkinEnabled(true);
    r.manager.setSkinVariant('sapphire');
    r.player._drawCurrentAnimation(r.canvas);
    assert.equal(r.draws.at(-1)[0].name, 'ninja_hurt');
    r.manager.setSkinVariant(variant);
    r.storage.delete('skunkfu.adFree');
    r.player._drawCurrentAnimation(r.canvas);
    assert.equal(r.draws.at(-1)[0].name, 'ninja_hurt', 'locked saved selection cannot render premium artwork');
});
}

test('switching character skins reuses only the selected skin artwork', () => {
    const r = runtime({ owned: true });
    for (const state of states) {
        r.player.currentAnimation = r.player.animations[state];
        for (const variant of ['ninja2', 'ninja3', 'ninja4', 'ninja2', 'ninja3', 'ninja4']) {
            assert.equal(r.manager.setSkinVariant(variant), true);
            r.player._drawCurrentAnimation(r.canvas);
            assert.equal(r.draws.at(-1)[0].name, variant + '_' + state);
        }
    }
});

test('all character skin sheets are queued for loading and cached for offline play', async () => {
    const r = runtime();
    const queued = new Map();
    r.loader.loadSprite = async (name, file) => queued.set(name, file);
    r.loader.loadSpriteBest = async () => {};
    await r.loader.loadAllSprites();
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    for (const variant of ['ninja2', 'ninja3', 'ninja4']) {
        for (const state of states) {
            const file = 'assets/sprites/characters/' + variant + '_' + state + '.png';
            assert.equal(queued.get(variant + '_' + state), file);
            assert.equal(r.loader.expectedFrames[variant + '_' + state], 4);
            assert.ok(sw.includes("'" + file + "'"), variant + ' ' + state + ' is precached');
        }
    }
});
