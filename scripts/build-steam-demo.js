/*!
 * Skunked: Way of the Spray — Steam DEMO Build Script
 * Copyright (c) 2026 Mephitideus Interactive LLC. All Rights Reserved.
 *
 * Builds a stage-capped marketing demo for Steam, completely separate from
 * the regular Steam release pipeline (scripts/build-steam.js):
 *   • Output goes to dist-steam-demo/ (not dist-steam/), so a demo build
 *     never clobbers a real release build sitting in dist-steam/.
 *   • Patches window.STEAM_DEMO = true so js/game.js caps the campaign to
 *     Config.WEB_DEMO_STAGE_CAP stages (same mechanism as the web funnel demo).
 *   • electron/main-demo.js (not electron/main.js) is the packaged entry
 *     point, so the regular Steam build's electron/main.js default path/appid
 *     logic is never touched.
 *
 * Usage:
 *   node scripts/build-steam-demo.js            # development (unminified)
 *   node scripts/build-steam-demo.js --release  # production (minified)
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT            = path.resolve(__dirname, '..');
const DIST_WEB         = path.join(ROOT, 'dist');
const DIST_STEAM_DEMO  = path.join(ROOT, 'dist-steam-demo');

const isRelease = process.argv.includes('--release');

async function buildWebBundle() {
    const { build } = require('./build.js');
    await build({ minify: isRelease, sourcemap: !isRelease });
    console.log('[steam-demo-build] Web bundle built →', DIST_WEB);
}

function copyDist() {
    if (fs.existsSync(DIST_STEAM_DEMO)) fs.rmSync(DIST_STEAM_DEMO, { recursive: true });
    copyRecursive(DIST_WEB, DIST_STEAM_DEMO);
    console.log('[steam-demo-build] Copied dist → dist-steam-demo');
}

function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        for (const name of fs.readdirSync(src)) {
            copyRecursive(path.join(src, name), path.join(dest, name));
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Same safe patch strategy as build-steam.js, plus STEAM_DEMO=true and a
// title tweak so the window/taskbar clearly reads "Demo".
function patchIndexHtml() {
    const indexPath = path.join(DIST_STEAM_DEMO, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');

    html = html.replace(
        /(<head[^>]*>)/i,
        '$1\n    <script>window.PLATFORM="steam";window.STEAM_DEMO=true;window.STEAM_APP_ID=5226570;</script>'
    );

    html = html.replace(
        /<link[^>]+rel=["']manifest["'][^>]*>/g,
        '<!-- manifest removed for Steam demo build -->'
    );

    html = html.replace(
        /<!-- Google Tag Manager \(web only[\s\S]*?<!-- End Google Tag Manager -->/g,
        '<!-- GTM removed for Steam demo build -->'
    );
    html = html.replace(
        /<!-- Google Funding Choices CMP[\s\S]*?<!-- End Google Funding Choices CMP -->/g,
        '<!-- Funding Choices CMP removed for Steam demo build -->'
    );
    html = html.replace(
        /<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-8519140628365141"[\s\S]*?<\/script>/g,
        '<!-- AdSense script removed for Steam demo build -->'
    );

    // Replace the website's marketing title even when it already says "Demo".
    html = html.replace(/<title>[\s\S]*?<\/title>/i,
        '<title>Skunked: Way of the Spray — Demo</title>'
    );

    const skinsButtonPattern = /(<button[^>]*id=["']menu-skins-btn["'][^>]*>)([\s\S]*?)(<\/button>)/i;
    const skinsButtonMatch = html.match(skinsButtonPattern);
    if (!skinsButtonMatch) {
        throw new Error('[steam-demo-build] Expected #menu-skins-btn in index.html but it was not found.');
    }
    html = html.replace(
        skinsButtonPattern,
        '$1<span class="menu-btn-label">&#127912; Ninja Skins</span><span class="menu-btn-meta">Pick your ninja colour. All skins unlocked!</span>$3'
    );

    if (!html.includes('All skins unlocked!')) {
        throw new Error('[steam-demo-build] Failed to rewrite #menu-skins-btn text for Steam demo build.');
    }

    fs.writeFileSync(indexPath, html, 'utf8');
    const lines = html.split('\n').length;
    console.log(`[steam-demo-build] Patched index.html (${lines} lines — STEAM_DEMO=true injected)`);
}

(async () => {
    try {
        console.log(`[steam-demo-build] Starting ${isRelease ? 'RELEASE' : 'DEV'} demo build…`);
        await buildWebBundle();
        copyDist();
        patchIndexHtml();
        console.log('[steam-demo-build] ✓ dist-steam-demo/ ready');
    } catch (e) {
        console.error('[steam-demo-build] FAILED:', e);
        process.exit(1);
    }
})();
