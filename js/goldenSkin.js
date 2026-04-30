/*!
 * goldenSkin.js — Procedural gold "Founder" skin for the Ninja Skunk.
 *
 * Generates tinted copies of the existing ninja sprite sheets at runtime by
 * mapping each pixel's luminance onto a gold gradient palette. No new image
 * assets are shipped — the gold skin is a derived, in-memory canvas keyed by
 * the source Image. Alpha is preserved exactly so the silhouette is identical.
 *
 * Public API:
 *   GoldenSkin.getGoldFor(image)        → HTMLCanvasElement | null
 *   GoldenSkin.drawAnimation(anim, ctx, x, y, w, h, flip)
 *     – swaps anim.spriteSheet → gold canvas, calls anim.draw(...), swaps back.
 *
 * Performance: tinting is done once per source Image (canvases are cached on
 * a WeakMap), so steady-state rendering is just an extra draw-call cost.
 */

const GoldenSkin = (() => {
    'use strict';

    // Luminance → gold palette (sorted ascending). Tweak these stops to taste:
    // dark shadow, bronze, gold body, bright highlight, near-white spec.
    const GOLD_STOPS = [
        { l: 0.00, r: 0x3a, g: 0x22, b: 0x06 },
        { l: 0.08, r: 0x6a, g: 0x42, b: 0x0a },
        { l: 0.20, r: 0xa8, g: 0x70, b: 0x14 },
        { l: 0.40, r: 0xe0, g: 0xa8, b: 0x28 },
        { l: 0.65, r: 0xff, g: 0xd8, b: 0x60 },
        { l: 0.85, r: 0xff, g: 0xee, b: 0xa8 },
        { l: 1.00, r: 0xff, g: 0xfa, b: 0xe0 }
    ];

    // Cache: source Image (or HTMLCanvasElement) → tinted canvas.
    // WeakMap so it GCs naturally if a source image is dropped.
    const _cache = new WeakMap();

    function _interp(stopA, stopB, t) {
        return {
            r: Math.round(stopA.r + (stopB.r - stopA.r) * t),
            g: Math.round(stopA.g + (stopB.g - stopA.g) * t),
            b: Math.round(stopA.b + (stopB.b - stopA.b) * t)
        };
    }

    function _lumToGold(L) {
        // Clamp
        if (L <= GOLD_STOPS[0].l) return GOLD_STOPS[0];
        if (L >= GOLD_STOPS[GOLD_STOPS.length - 1].l) return GOLD_STOPS[GOLD_STOPS.length - 1];
        for (let i = 1; i < GOLD_STOPS.length; i++) {
            const a = GOLD_STOPS[i - 1];
            const b = GOLD_STOPS[i];
            if (L <= b.l) {
                const t = (L - a.l) / (b.l - a.l);
                return _interp(a, b, t);
            }
        }
        return GOLD_STOPS[GOLD_STOPS.length - 1];
    }

    function _isUsable(img) {
        if (!img) return false;
        // HTMLImageElement: must be loaded and have non-zero dimensions
        if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement) {
            return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
        }
        // HTMLCanvasElement / OffscreenCanvas
        return !!(img.width && img.height);
    }

    function _buildGoldCanvas(img) {
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
            // Cross-origin tainted canvas — give up and return the source-blit canvas.
            // (Sprites are same-origin so this should never trigger in practice.)
            try { console.warn('[GoldenSkin] getImageData blocked:', e); } catch (_) {}
            return canvas;
        }

        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a === 0) continue; // skip fully transparent pixels
            const r = data[i], g = data[i + 1], b = data[i + 2];
            // Rec. 709 luminance, normalized 0..1
            const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            const gold = _lumToGold(L);
            data[i]     = gold.r;
            data[i + 1] = gold.g;
            data[i + 2] = gold.b;
            // alpha unchanged
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    /**
     * Returns a canvas containing the gold-tinted version of `image`,
     * generating and caching it on first call. Returns the source image
     * itself as a fallback if the source isn't ready.
     */
    function getGoldFor(image) {
        if (!_isUsable(image)) return image || null;
        let cached = _cache.get(image);
        if (cached) return cached;
        try {
            cached = _buildGoldCanvas(image);
            _cache.set(image, cached);
            return cached;
        } catch (e) {
            try { console.warn('[GoldenSkin] tint failed:', e); } catch (_) {}
            return image;
        }
    }

    /**
     * Convenience helper for the player render path. Temporarily swaps the
     * animation's spriteSheet to the gold canvas, calls anim.draw(...), then
     * restores the original. Safe if the animation has no spriteSheet.
     */
    function drawAnimation(anim, ctx, x, y, w, h, flip) {
        if (!anim || typeof anim.draw !== 'function') return;
        const original = anim.spriteSheet;
        const gold = original ? getGoldFor(original) : null;
        if (!gold || gold === original) {
            // Nothing to swap — fall back to the regular draw so we never break
            // rendering if tinting failed.
            anim.draw(ctx, x, y, w, h, flip);
            return;
        }
        anim.spriteSheet = gold;
        try {
            anim.draw(ctx, x, y, w, h, flip);
        } finally {
            anim.spriteSheet = original;
        }
    }

    return { getGoldFor, drawAnimation };
})();

if (typeof window !== 'undefined') {
    window.GoldenSkin = GoldenSkin;
}
