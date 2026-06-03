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
//
// IMPORTANT: All script-content regexes use the non-crossing pattern
//   (?:[^<]|<(?!\/script>))*
// so they never swallow content across </script> boundaries.
function patchIndexHtml() {
    const indexPath = path.join(DIST_STEAM, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');

    // ── Inject platform flag before everything else ──
    html = html.replace(
        '<head>',
        '<head>\n    <script>window.PLATFORM="steam";</script>'
    );

    // ── Safe single-block script content pattern (never crosses </script>) ──
    // Matches: <script ATTRS>CONTENT</script>  where CONTENT has no </script>
    const SAFE_CONTENT = '(?:[^<]|<(?!\\/script>))*';

    // Patterns that identify ad/tracking/SW script blocks by their content
    const AD_CONTENT_PATTERNS = [
        /googletagmanager\.com/,
        /GTM-[A-Z0-9]+/,
        /googlefc/,
        /adsbygoogle/,
        /pagead2\.googlesyndication/,
        /serviceWorker\.register/,
        /FundingChoices/,
        /googleadservices/,
    ];

    // Walk all inline script blocks and remove only those containing ad/tracking code.
    // External <script src="..."> tags are left untouched by this pass.
    const inlineScriptRe = new RegExp(`<script([^>]*)>(${SAFE_CONTENT})<\\/script>`, 'gs');
    html = html.replace(inlineScriptRe, (match, attrs, content) => {
        // Reject by src attribute
        if (/adsbygoogle|googlesyndication|googletagmanager|pagead2/i.test(attrs)) {
            return '<!-- ad/tracking script removed for Steam build -->';
        }
        // Reject by inline content
        if (AD_CONTENT_PATTERNS.some(p => p.test(content))) {
            return '<!-- ad/tracking script removed for Steam build -->';
        }
        return match;
    });

    // ── Remove external AdSense/GTM script tags (self-closing or with src) ──
    html = html.replace(
        /<script[^>]*(?:adsbygoogle|googlesyndication|googletagmanager|pagead2)[^>]*(?:\/>|><\/script>)/gi,
        '<!-- ad script removed for Steam build -->'
    );

    // ── Remove manifest link (no PWA on desktop) ──
    html = html.replace(
        /<link[^>]+rel=["']manifest["'][^>]*>/g,
        '<!-- manifest removed for Steam build -->'
    );

    // ── Remove GTM noscript iframe ──
    html = html.replace(
        /<noscript>\s*<iframe[^>]*googletagmanager[^>]*>[\s\S]*?<\/iframe>\s*<\/noscript>/g,
        '<!-- GTM noscript removed for Steam build -->'
    );

    fs.writeFileSync(indexPath, html, 'utf8');
    const lines = html.split('\n').length;
    console.log(`[steam-build] Patched index.html (${lines} lines — ads/GTM/SW removed, PLATFORM=steam injected)`);
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
