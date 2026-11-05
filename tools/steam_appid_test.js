'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const main = path.resolve(__dirname, '..', 'electron', 'main.js');
const source = fs.readFileSync(main, 'utf8');

function launch({ platform, demo = false, appIdFile, packaged = true }) {
    const calls = [];
    const app = {
        isPackaged: packaged,
        commandLine: { appendSwitch() {} },
        whenReady: () => ({ then() {} }),
        on() {}
    };
    const context = {
        __dirname: path.dirname(main),
        process: { platform, env: demo ? { SKUNKFU_DEMO: '1' } : {} },
        console,
        require(name) {
            if (name === 'path') return path;
            if (name === 'fs') return {
                existsSync: () => appIdFile !== undefined,
                readFileSync: () => appIdFile
            };
            if (name === 'electron') return { app };
            if (name === 'steamworks.js') return {
                restartAppIfNecessary(id) { calls.push(['restart', id]); return false; },
                init(id) {
                    calls.push(['init', id]);
                    return { localplayer: { getName: () => 'Test player' } };
                },
                electronEnableSteamOverlay() {}
            };
            throw new Error(`Unexpected module: ${name}`);
        }
    };
    vm.runInNewContext(source, context, { filename: main });
    return calls;
}

for (const platform of ['win32', 'linux']) {
    for (const demo of [false, true]) {
        test(`${platform}: ${demo ? 'demo' : 'main'} depot uses its real App ID without development files`, () => {
            const id = demo ? 5226570 : 4815180;
            assert.deepEqual(launch({ platform, demo }), [['restart', id], ['init', id]]);
        });
    }
}

test('development App ID override is preserved without restarting through Steam', () => {
    assert.deepEqual(launch({ platform: 'win32', appIdFile: '480\n', packaged: false }), [['init', 480]]);
});

for (const appIdFile of ['', '4815180invalid', '-1', '1.5']) {
    test(`invalid App ID file fails explicitly: ${JSON.stringify(appIdFile)}`, () => {
        assert.throws(() => launch({ platform: 'win32', appIdFile }), /Invalid App ID/);
    });
}
