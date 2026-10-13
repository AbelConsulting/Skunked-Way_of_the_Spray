'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const names = ['attack_slash', 'attack_strike', 'attack_enemy', 'attack_boss'];

function runtime() {
    const sprites = Object.fromEntries(names.map(name => [name, { name }]));
    const errors = [];
    const context = vm.createContext({
        Config: { DEBUG: false, SHOW_HITBOXES: false },
        spriteLoader: { getSprite: name => sprites[name] },
        __err: (scope, error) => errors.push({ scope, error }),
        console
    });
    for (const file of ['utils', 'player', 'enemy']) {
        vm.runInContext(fs.readFileSync(path.join(root, 'js', `${file}.js`), 'utf8'), context);
    }
    const classes = vm.runInContext('({ Utils, Player, Enemy })', context);
    return { ...classes, config: context.Config, sprites, errors };
}

function canvas() {
    const calls = [];
    const ctx = {};
    for (const method of ['save', 'restore', 'translate', 'scale', 'drawImage',
        'beginPath', 'ellipse', 'fill', 'fillRect', 'strokeRect', 'fillText',
        'strokeText', 'arc', 'stroke', 'moveTo', 'lineTo', 'closePath']) {
        ctx[method] = (...args) => calls.push([method, ...args]);
    }
    ctx.createRadialGradient = () => ({ addColorStop() {} });
    return { ctx, calls };
}

function actor(Class, boss = false) {
    const value = Object.assign(Object.create(Class.prototype), {
        x: 100, y: 80, width: 64, height: 64,
        isAttacking: true, facingRight: true,
        attackHitbox: { x: 152, y: 92, width: 120, height: 40 },
        health: 100, maxHealth: 100,
        currentAnimation: { spriteSheet: {}, draw() {} },
        enemyType: boss ? 'BOSS' : 'BASIC',
        _spriteLoadAttempts: 0
    });
    // A swept collision box must never determine artwork size or position.
    value.getAttackHitboxForCollision = () => ({ x: 0, y: 0, width: 500, height: 80 });
    return value;
}

test('whole attack images draw in both directions without mutating collision geometry', () => {
    const { Utils, sprites } = runtime();
    const hb = { x: 120, y: 80, width: 120, height: 70 };
    const before = { ...hb };
    for (const name of names) {
        for (const right of [true, false]) {
            const { ctx, calls } = canvas();
            Utils.drawAttackEffect(ctx, name, hb, right);
            assert.deepEqual(calls, right
                ? [['drawImage', sprites[name], 120, 80, 120, 70]]
                : [['save'], ['translate', 240, 80], ['scale', -1, 1],
                    ['drawImage', sprites[name], 0, 0, 120, 70], ['restore']]);
            assert.deepEqual(hb, before);
        }
    }
});

test('player and enemy rendering selects the right effect and preserves debug boxes', () => {
    const { Player, Enemy, config, sprites, errors } = runtime();
    const cases = [
        [actor(Player), 'attack_slash'],
        [Object.assign(actor(Player), { isShadowStriking: true }), 'attack_strike'],
        [actor(Enemy), 'attack_enemy'],
        [actor(Enemy, true), 'attack_boss']
    ];
    for (const [value, name] of cases) {
        const before = { ...value.attackHitbox };
        config.SHOW_HITBOXES = false;
        let drawing = canvas();
        value.draw(drawing.ctx, 30, 20);
        assert.deepEqual(drawing.calls.filter(call => call[0] === 'drawImage'),
            [['drawImage', sprites[name], 152, 92, 120, 40]]);
        assert.ok(drawing.calls.some(call => call[0] === 'translate' && call[1] === -30 && call[2] === -20));
        assert.equal(drawing.calls.filter(call => call[0] === 'save').length,
            drawing.calls.filter(call => call[0] === 'restore').length);
        assert.deepEqual(value.attackHitbox, before);

        config.SHOW_HITBOXES = true;
        drawing = canvas();
        value.draw(drawing.ctx);
        assert.equal(drawing.calls.filter(call => call[0] === 'drawImage').length, 0);
        assert.ok(drawing.calls.some(call => call[0] === 'strokeRect' && call[1] === 152));

        config.SHOW_HITBOXES = false;
        value.isAttacking = false;
        drawing = canvas();
        value.draw(drawing.ctx);
        assert.equal(drawing.calls.filter(call => call[0] === 'drawImage').length, 0);
    }
    assert.deepEqual(errors, []);
});

test('pixel snapping matches character sprites without altering hitboxes', () => {
    const { Utils, sprites, config } = runtime();
    const hitbox = { x: 120.4, y: 80.8, width: 119.7, height: 69.6 };
    const before = { ...hitbox };
    for (const snap of [true, false]) {
        config.PIXEL_SNAP = snap;
        for (const right of [true, false]) {
            const { ctx, calls } = canvas();
            Utils.drawAttackEffect(ctx, 'attack_slash', hitbox, right);
            const x = snap ? 120 : 120.4;
            const y = snap ? 81 : 80.8;
            const w = snap ? 120 : 119.7;
            const h = snap ? 70 : 69.6;
            assert.deepEqual(calls, right
                ? [['drawImage', sprites.attack_slash, x, y, w, h]]
                : [['save'], ['translate', x + w, y], ['scale', -1, 1],
                    ['drawImage', sprites.attack_slash, 0, 0, w, h], ['restore']]);
            assert.deepEqual(hitbox, before);
        }
    }
});

test('missing effects are reported once during loading, without placeholders or render-loop logging', async () => {
    const errors = [];
    const context = vm.createContext({
        Config: { DEBUG: false },
        Image: class { set src(value) { this.onerror(); } },
        __err: (scope, error) => errors.push({ scope, error }),
        console
    });
    for (const file of ['spriteLoader', 'utils']) {
        vm.runInContext(fs.readFileSync(path.join(root, 'js', `${file}.js`), 'utf8'), context);
    }
    const { Utils, loader } = vm.runInContext('({ Utils, loader: spriteLoader })', context);
    const { ctx, calls } = canvas();
    for (const name of names) {
        const image = await loader.loadSprite(name, `${name}.png`);
        assert.equal(image, null);
        const count = errors.length;
        for (let frame = 0; frame < 120; frame++) {
            Utils.drawAttackEffect(ctx, name, { x: 0, y: 0, width: 120, height: 40 }, true);
        }
        assert.equal(errors.length, count);
    }
    assert.equal(calls.length, 0);
    assert.equal(errors.length, 4);
    assert.equal(loader.loadedCount, 4);
    assert.equal(loader._missing.length, 4);
    assert.match(errors[0].error.message, /attack_slash/);
});

test('all four PNGs are registered for startup loading and offline precaching', () => {
    const source = fs.readFileSync(path.join(root, 'js', 'spriteLoader.js'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    for (const name of names) {
        const relative = `assets/sprites/backgrounds/${name}.png`;
        assert.ok(source.includes(`['${name}', '${relative}']`));
        assert.ok(serviceWorker.includes(`'${relative}'`));
        const png = fs.readFileSync(path.join(root, 'assets', 'sprites', 'backgrounds', `${name}.png`));
        assert.equal(png.subarray(1, 4).toString(), 'PNG');
        assert.equal(png[25], 6, 'effect PNG must have an alpha channel');
    }
});

test('actual PNGs load and render transparently with exact horizontal mirroring in Chromium', async () => {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.route('http://attack-effects.test/**', async route => {
            const pathname = new URL(route.request().url()).pathname;
            if (pathname === '/') {
                await route.fulfill({ contentType: 'text/html', body: '<!doctype html><html></html>' });
                return;
            }
            const name = names.find(name => pathname === `/assets/sprites/backgrounds/${name}.png`);
            assert.ok(name, `unexpected request: ${pathname}`);
            await route.fulfill({
                contentType: 'image/png',
                body: fs.readFileSync(path.join(root, 'assets', 'sprites', 'backgrounds', `${name}.png`))
            });
        });
        await page.goto('http://attack-effects.test/');
        await page.addScriptTag({ content: 'const Config = { DEBUG: false }; function __err(scope, error) { throw error; }' });
        for (const file of ['spriteLoader', 'utils']) {
            await page.addScriptTag({ path: path.join(root, 'js', `${file}.js`) });
        }
        const results = await page.evaluate(async names => {
            const results = [];
            for (const name of names) {
                const image = await spriteLoader.loadSprite(name, `assets/sprites/backgrounds/${name}.png`);
                const canvas = document.createElement('canvas');
                canvas.width = 120;
                canvas.height = 80;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;
                const hitbox = { x: 0, y: 0, width: canvas.width, height: canvas.height };
                Utils.drawAttackEffect(ctx, name, hitbox, true);
                const right = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                Utils.drawAttackEffect(ctx, name, hitbox, false);
                const left = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                let mirrored = true;
                let opaque = 0;
                let transparent = 0;
                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const i = (y * canvas.width + x) * 4;
                        const j = (y * canvas.width + canvas.width - 1 - x) * 4;
                        if (right[i + 3] > 0) opaque++;
                        else transparent++;
                        for (let channel = 0; channel < 4; channel++) {
                            if (right[i + channel] !== left[j + channel]) mirrored = false;
                        }
                    }
                }
                results.push({ name, width: image.width, height: image.height, mirrored, opaque, transparent });
            }
            return results;
        }, names);
        for (const result of results) {
            assert.ok(result.width > 0 && result.height > 0, `${result.name} decoded`);
            assert.ok(result.opaque > 0, `${result.name} is visible`);
            assert.ok(result.transparent > 0, `${result.name} retains transparency`);
            assert.ok(result.mirrored, `${result.name} mirrors correctly`);
        }
    } finally {
        await browser.close();
    }
});
