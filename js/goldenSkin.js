/*!
 * goldenSkin.js — Procedural Founder skins for the Ninja Skunk.
 *
 * Generates tinted copies of the existing ninja sprite sheets at runtime by
 * mapping each pixel's luminance onto a colour-gradient palette. No new image
 * assets are shipped — every variant is a derived, in-memory canvas keyed by
 * (palette name, source Image). Alpha is preserved exactly so silhouettes are
 * identical.
 *
 * Public API:
 *   GoldenSkin.getPalettes()                       → [{id,label,aura}, …]
 *   GoldenSkin.hasPalette(id)                      → boolean
 *   GoldenSkin.getAuraColor(id)                    → '#RRGGBB'
 *   GoldenSkin.getTintedFor(image, paletteId?)     → HTMLCanvasElement | image
 *   GoldenSkin.drawAnimation(anim, ctx, x, y, w, h, flip, paletteId?)
 *
 * Caching: each palette has its own WeakMap keyed by source image, so each
 * sprite sheet is tinted at most once per chosen variant.
 */

const GoldenSkin = (() => {
    'use strict';

    // Each palette is a luminance → RGB gradient (stops sorted ascending in `l`,
    // 0..1). Tweak stops to taste; alpha is never modified.
    const PALETTES = Object.freeze({
        gold: {
            id: 'gold',
            label: 'Gold',
            aura: '#FFC857',
            stops: [
                { l: 0.00, r: 0x3a, g: 0x22, b: 0x06 },
                { l: 0.08, r: 0x6a, g: 0x42, b: 0x0a },
                { l: 0.20, r: 0xa8, g: 0x70, b: 0x14 },
                { l: 0.40, r: 0xe0, g: 0xa8, b: 0x28 },
                { l: 0.65, r: 0xff, g: 0xd8, b: 0x60 },
                { l: 0.85, r: 0xff, g: 0xee, b: 0xa8 },
                { l: 1.00, r: 0xff, g: 0xfa, b: 0xe0 }
            ]
        },
        sapphire: {
            id: 'sapphire',
            label: 'Sapphire',
            aura: '#5AB8FF',
            stops: [
                { l: 0.00, r: 0x06, g: 0x10, b: 0x30 },
                { l: 0.08, r: 0x0c, g: 0x22, b: 0x55 },
                { l: 0.20, r: 0x14, g: 0x3e, b: 0x90 },
                { l: 0.40, r: 0x28, g: 0x70, b: 0xd0 },
                { l: 0.65, r: 0x60, g: 0xb8, b: 0xff },
                { l: 0.85, r: 0xb8, g: 0xe2, b: 0xff },
                { l: 1.00, r: 0xe8, g: 0xf6, b: 0xff }
            ]
        },
        amethyst: {
            id: 'amethyst',
            label: 'Amethyst',
            aura: '#C66BFF',
            stops: [
                { l: 0.00, r: 0x18, g: 0x06, b: 0x2c },
                { l: 0.08, r: 0x32, g: 0x12, b: 0x55 },
                { l: 0.20, r: 0x5e, g: 0x26, b: 0x95 },
                { l: 0.40, r: 0x8c, g: 0x46, b: 0xc8 },
                { l: 0.65, r: 0xc8, g: 0x80, b: 0xff },
                { l: 0.85, r: 0xe2, g: 0xc0, b: 0xff },
                { l: 1.00, r: 0xf6, g: 0xe8, b: 0xff }
            ]
        },
        steel: {
            id: 'steel',
            label: 'Steel',
            aura: '#C8D4E2',
            stops: [
                { l: 0.00, r: 0x12, g: 0x16, b: 0x1c },
                { l: 0.08, r: 0x28, g: 0x2e, b: 0x38 },
                { l: 0.20, r: 0x4a, g: 0x52, b: 0x60 },
                { l: 0.40, r: 0x76, g: 0x82, b: 0x94 },
                { l: 0.65, r: 0xb0, g: 0xbc, b: 0xcc },
                { l: 0.85, r: 0xdc, g: 0xe4, b: 0xee },
                { l: 1.00, r: 0xf4, g: 0xf8, b: 0xfd }
            ]
        }
    });

    const DEFAULT_PALETTE = 'gold';

    // Per-palette WeakMap caches: { gold: WeakMap, sapphire: WeakMap, … }.
    const _caches = Object.create(null);
    for (const id of Object.keys(PALETTES)) _caches[id] = new WeakMap();

    function _interp(a, b, t) {
        return {
            r: Math.round(a.r + (b.r - a.r) * t),
            g: Math.round(a.g + (b.g - a.g) * t),
            b: Math.round(a.b + (b.b - a.b) * t)
        };
    }

    function _lumToRgb(stops, L) {
        if (L <= stops[0].l) return stops[0];
        const last = stops[stops.length - 1];
        if (L >= last.l) return last;
        for (let i = 1; i < stops.length; i++) {
            const a = stops[i - 1];
            const b = stops[i];
            if (L <= b.l) return _interp(a, b, (L - a.l) / (b.l - a.l));
        }
        return last;
    }

    function _resolvePalette(id) {
        return (id && PALETTES[id]) || PALETTES[DEFAULT_PALETTE];
    }

    function _isUsable(img) {
        if (!img) return false;
        if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement) {
            return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
        }
        return !!(img.width && img.height);
    }

    function _buildCanvas(img, palette) {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return canvas;

        ctx.drawImage(img, 0, 0);
        let imageData;
        try {
            imageData = ctx.getImageData(0, 0, w, h);
        } catch (e) {
            // Cross-origin tainted canvas — give up and return the source-blit.
            try { console.warn('[GoldenSkin] getImageData blocked:', e); } catch (_) {}
            return canvas;
        }

        const data = imageData.data;
        const stops = palette.stops;
        for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a === 0) continue;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            const c = _lumToRgb(stops, L);
            data[i]     = c.r;
            data[i + 1] = c.g;
            data[i + 2] = c.b;
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    /**
     * Returns a tinted canvas for `image` under the given palette id (default
     * 'gold'). Falls back to the source image if the input isn't ready or if
     * tinting throws.
     */
    function getTintedFor(image, paletteId) {
        if (!_isUsable(image)) return image || null;
        const palette = _resolvePalette(paletteId);
        const cache = _caches[palette.id];
        let cached = cache.get(image);
        if (cached) return cached;
        try {
            cached = _buildCanvas(image, palette);
            cache.set(image, cached);
            return cached;
        } catch (e) {
            try { console.warn('[GoldenSkin] tint failed:', e); } catch (_) {}
            return image;
        }
    }

    /**
     * Convenience helper for the player render path. Temporarily swaps the
     * animation's spriteSheet to the tinted canvas, calls anim.draw(...), then
     * restores the original. Safe if the animation has no spriteSheet or the
     * palette is unknown — falls back to a regular draw.
     */
    function drawAnimation(anim, ctx, x, y, w, h, flip, paletteId) {
        if (!anim || typeof anim.draw !== 'function') return;
        const original = anim.spriteSheet;
        const tinted = original ? getTintedFor(original, paletteId) : null;
        if (!tinted || tinted === original) {
            anim.draw(ctx, x, y, w, h, flip);
            return;
        }
        anim.spriteSheet = tinted;
        try {
            anim.draw(ctx, x, y, w, h, flip);
        } finally {
            anim.spriteSheet = original;
        }
    }

    function getPalettes() {
        return Object.values(PALETTES).map(p => ({ id: p.id, label: p.label, aura: p.aura }));
    }
    function hasPalette(id) { return !!(id && PALETTES[id]); }
    function getAuraColor(id) { return _resolvePalette(id).aura; }

    return {
        getPalettes,
        hasPalette,
        getAuraColor,
        getTintedFor,
        drawAnimation,
        // Back-compat alias from the gold-only era.
        getGoldFor: (img) => getTintedFor(img, DEFAULT_PALETTE)
    };
})();

if (typeof window !== 'undefined') {
    window.GoldenSkin = GoldenSkin;
}
