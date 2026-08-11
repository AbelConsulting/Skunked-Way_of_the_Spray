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
//  Strategy: minimal safe changes only — no regex that can cross tag boundaries.
//  • Inject window.PLATFORM = 'steam' as the very first script
//  • Remove manifest link (no PWA on desktop)
//  • Remove the GTM noscript iframe (harmless but clean)
//  Everything else (ads, SW) is already handled at runtime by the game code
//  (adManager.js checks window.electronAPI.platform === 'steam' and skips all ads).
function patchIndexHtml() {
    const indexPath = path.join(DIST_STEAM, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');

    // ── Inject platform flag as first thing in <head> ──
    html = html.replace(
        /(<head[^>]*>)/i,
        '$1\n    <script>window.PLATFORM="steam";window.STEAM_APP_ID=4815180;</script>'
    );

    // ── Remove manifest link (no PWA on desktop) ──
    html = html.replace(
        /<link[^>]+rel=["']manifest["'][^>]*>/g,
        '<!-- manifest removed for Steam build -->'
    );

    // ── Remove ad/analytics scripts that are irrelevant on desktop Steam ──
    html = html.replace(
        /<!-- Google Tag Manager \(web only[\s\S]*?<!-- End Google Tag Manager -->/g,
        '<!-- GTM removed for Steam build -->'
    );
    html = html.replace(
        /<!-- Google Funding Choices CMP[\s\S]*?<!-- End Google Funding Choices CMP -->/g,
        '<!-- Funding Choices CMP removed for Steam build -->'
    );
    html = html.replace(
        /<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-8519140628365141"[\s\S]*?<\/script>/g,
        '<!-- AdSense script removed for Steam build -->'
    );

    // ── Update main-menu Skins button — no purchase wording on Steam ──
    html = html.replace(
        '<span class="menu-btn-label">&#127912; Skins &amp; Remove Ads</span><span class="menu-btn-meta">Pick your ninja colour. One-time $1.99 unlocks 3 skins &amp; ad-free.</span>',
        '<span class="menu-btn-label">&#127912; Ninja Skins</span><span class="menu-btn-meta">Pick your ninja colour. All skins unlocked!</span>'
    );

    fs.writeFileSync(indexPath, html, 'utf8');
    const lines = html.split('\n').length;
    console.log(`[steam-build] Patched index.html (${lines} lines — PLATFORM=steam injected, manifest removed)`);
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
