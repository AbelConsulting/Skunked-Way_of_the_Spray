/*!
 * Skunked: Way of the Spray — Steam Build Script
 * Copyright (c) 2026 Mephitideus Interactive LLC. All Rights Reserved.
 *
 * Usage:
 *   node scripts/build-steam.js            # development (unminified)
 *   node scripts/build-steam.js --release  # production (minified)
 *
 * Output: dist-steam/  (used by electron/main.js and electron-builder)
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT       = path.resolve(__dirname, '..');
const DIST_WEB   = path.join(ROOT, 'dist');
const DIST_STEAM = path.join(ROOT, 'dist-steam');

const isRelease = process.argv.includes('--release');

// ── 1. Build the web bundle ───────────────────────────────────────────────────
async function buildWebBundle() {
    const { build } = require('./build.js');
    await build({ minify: isRelease, sourcemap: !isRelease });
    console.log('[steam-build] Web bundle built →', DIST_WEB);
}

// ── 2. Copy dist → dist-steam ─────────────────────────────────────────────────
function copyDist() {
    if (fs.existsSync(DIST_STEAM)) fs.rmSync(DIST_STEAM, { recursive: true });
    copyRecursive(DIST_WEB, DIST_STEAM);
    console.log('[steam-build] Copied dist → dist-steam');
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

// ── 3. Patch index.html for Steam ─────────────────────────────────────────────
//  • Remove AdSense / GTM / Google Funding Choices scripts
//  • Remove service-worker registration
//  • Remove <link rel="manifest">
//  • Inject window.PLATFORM = 'steam' as the very first script
function patchIndexHtml() {
    const indexPath = path.join(DIST_STEAM, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');

    // ── Inject platform flag before everything else ──
    html = html.replace(
        '<head>',
        '<head>\n    <script>window.PLATFORM="steam";</script>'
    );

    // ── Remove Google Tag Manager inline snippet ──
    html = html.replace(
        /<script>\(function\(w,d,s,l,i\)\{[\s\S]*?GTM-[\w]+[\s\S]*?\}\)\(window,document,'script','dataLayer','GTM-[\w]+'\);<\/script>/,
        '<!-- GTM removed for Steam build -->'
    );

    // ── Remove Google Funding Choices / CMP snippet ──
    html = html.replace(
        /<script>\s*\(function\(\)\s*\{[\s\S]*?googlefc[\s\S]*?\}\)\(\);\s*<\/script>/,
        '<!-- Funding Choices removed for Steam build -->'
    );

    // ── Remove AdSense script tags ──
    html = html.replace(
        /<script[^>]*adsbygoogle[^>]*>[\s\S]*?<\/script>/g,
        '<!-- AdSense removed for Steam build -->'
    );
    html = html.replace(
        /<script[^>]*adsbygoogle[^>]*\/>/g,
        '<!-- AdSense removed for Steam build -->'
    );

    // ── Remove manifest link (no PWA on desktop) ──
    html = html.replace(
        /<link[^>]+rel=["']manifest["'][^>]*>/g,
        '<!-- manifest removed for Steam build -->'
    );

    // ── Remove service-worker registration inline ──
    html = html.replace(
        /<script[^>]*>[\s\S]*?serviceWorker\.register[\s\S]*?<\/script>/g,
        '<!-- SW removed for Steam build -->'
    );

    // ── Remove GTM noscript body tag ──
    html = html.replace(
        /<noscript><iframe src="https:\/\/www\.googletagmanager\.com[\s\S]*?<\/noscript>/,
        '<!-- GTM noscript removed for Steam build -->'
    );

    fs.writeFileSync(indexPath, html, 'utf8');
    console.log('[steam-build] Patched index.html (ads/GTM/SW removed, PLATFORM=steam injected)');
}

// ── 4. Copy steam_appid.txt into dist-steam ───────────────────────────────────
function copySteamAppId() {
    const src  = path.join(ROOT, 'electron', 'steam_appid.txt');
    const dest = path.join(DIST_STEAM, 'steam_appid.txt');
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log('[steam-build] Copied steam_appid.txt');
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
    try {
        console.log(`[steam-build] Starting ${isRelease ? 'RELEASE' : 'DEV'} build…`);
        await buildWebBundle();
        copyDist();
        patchIndexHtml();
        copySteamAppId();
        console.log('[steam-build] ✓ dist-steam/ ready');
    } catch (e) {
        console.error('[steam-build] FAILED:', e);
        process.exit(1);
    }
})();
