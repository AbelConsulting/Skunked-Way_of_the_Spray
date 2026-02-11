/**
 * Utility functions
 */

class Utils {
    /**
     * Check if two rectangles collide (AABB collision)
     */
    static rectCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    /**
     * Clamp a value between min and max
     */
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Linear interpolation
     */
    static lerp(start, end, t) {
        return start + (end - start) * t;
    }

    /**
     * Get random integer between min and max (inclusive)
     */
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Get random float between min and max
     */
    static randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Get distance between two points
     */
    static distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    /**
     * Convert hex color to RGB
     */
    static hexToRgb(hex) {
        if (!hex) return null;
        const h = hex.replace('#', '');
        let r, g, b;
        if (h.length === 3) {
            r = parseInt(h[0] + h[0], 16);
            g = parseInt(h[1] + h[1], 16);
            b = parseInt(h[2] + h[2], 16);
            return { r, g, b };
        }
        const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * Draw the health regen pickup icon.
     * Uses the loaded sprite `health_regen_item` when available; otherwise draws
     * a simple green tile with a plus sign.
     */
    static drawHealthRegenItem(ctx, x, y, size = 32, opts = {}) {
        if (!ctx) return;

        const loader = opts.spriteLoader || ((typeof spriteLoader !== 'undefined') ? spriteLoader : null);
        const key = opts.spriteKey || 'health_regen_item';
        const sprite = (loader && typeof loader.getSprite === 'function') ? loader.getSprite(key) : null;

        const pixelSnap = (typeof Config !== 'undefined' && Config.PIXEL_SNAP) ? true : false;
        const dx = pixelSnap ? Math.round(x) : x;
        const dy = pixelSnap ? Math.round(y) : y;
        const ds = pixelSnap ? Math.round(size) : size;

        // Draw sprite when available
        try {
            if (sprite && sprite.width && sprite.height) {
                ctx.drawImage(sprite, dx, dy, ds, ds);
                return;
            }
        } catch (e) {
            // fall through to placeholder
        }

        // Placeholder: green tile + plus sign
        const prevSmooth = ctx.imageSmoothingEnabled;
        try { ctx.imageSmoothingEnabled = false; } catch (e) { __err('render', e); }

        ctx.fillStyle = '#0b3d1e';
        ctx.fillRect(dx, dy, ds, ds);
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(dx + 1, dy + 1, Math.max(0, ds - 2), Math.max(0, ds - 2));

        // Plus sign sized relative to ds
        const bar = Math.max(2, Math.floor(ds / 8));
        const len = Math.max(bar * 3, Math.floor(ds * 0.6));
        const cx = dx + Math.floor(ds / 2);
        const cy = dy + Math.floor(ds / 2);
        const half = Math.floor(len / 2);

        ctx.fillStyle = '#ffffff';
        // vertical
        ctx.fillRect(cx - Math.floor(bar / 2), cy - half, bar, len);
        // horizontal
        ctx.fillRect(cx - half, cy - Math.floor(bar / 2), len, bar);

        try { ctx.imageSmoothingEnabled = prevSmooth; } catch (e) { __err('render', e); }
    }

    /**
     * Draw the speed boost pickup icon.
     * Uses the loaded sprite `speed_boost_item` when available; otherwise draws
     * a lightning bolt icon on cyan background.
     */
    static drawSpeedBoostItem(ctx, x, y, size = 32, opts = {}) {
        if (!ctx) return;

        const loader = opts.spriteLoader || ((typeof spriteLoader !== 'undefined') ? spriteLoader : null);
        const key = opts.spriteKey || 'speed_boost_item';
        const sprite = (loader && typeof loader.getSprite === 'function') ? loader.getSprite(key) : null;

        const pixelSnap = (typeof Config !== 'undefined' && Config.PIXEL_SNAP) ? true : false;
        const dx = pixelSnap ? Math.round(x) : x;
        const dy = pixelSnap ? Math.round(y) : y;
        const ds = pixelSnap ? Math.round(size) : size;

        // Draw sprite when available
        try {
            if (sprite && sprite.width && sprite.height) {
                ctx.drawImage(sprite, dx, dy, ds, ds);
                return;
            }
        } catch (e) {
            // fall through to placeholder
        }

        // Placeholder: cyan tile + lightning bolt
        const prevSmooth = ctx.imageSmoothingEnabled;
        try { ctx.imageSmoothingEnabled = false; } catch (e) { __err('render', e); }

        ctx.fillStyle = '#0e7490';
        ctx.fillRect(dx, dy, ds, ds);
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(dx + 1, dy + 1, Math.max(0, ds - 2), Math.max(0, ds - 2));

        // Lightning bolt (simplified zigzag)
        const unit = Math.max(1, Math.floor(ds / 16));
        const cx = dx + Math.floor(ds / 2);
        const cy = dy + Math.floor(ds / 2);

        ctx.fillStyle = '#ffff00';
        // Top part
        ctx.fillRect(cx, cy - 7 * unit, 2 * unit, 5 * unit);
        // Middle diagonal part
        ctx.fillRect(cx - 2 * unit, cy - 2 * unit, 5 * unit, 2 * unit);
        // Bottom part
        ctx.fillRect(cx - 1 * unit, cy, 2 * unit, 6 * unit);

        try { ctx.imageSmoothingEnabled = prevSmooth; } catch (e) { __err('render', e); }
    }

    /**
     * Draw the damage boost pickup icon.
     * Uses the loaded sprite `damage_boost_item` when available; otherwise draws
     * a red/orange tile with a sword/power icon.
     */
    static drawDamageBoostItem(ctx, x, y, size = 32, opts = {}) {
        if (!ctx) return;

        const loader = opts.spriteLoader || ((typeof spriteLoader !== 'undefined') ? spriteLoader : null);
        const key = opts.spriteKey || 'damage_boost_item';
        const sprite = (loader && typeof loader.getSprite === 'function') ? loader.getSprite(key) : null;

        const pixelSnap = (typeof Config !== 'undefined' && Config.PIXEL_SNAP) ? true : false;
        const dx = pixelSnap ? Math.round(x) : x;
        const dy = pixelSnap ? Math.round(y) : y;
        const ds = pixelSnap ? Math.round(size) : size;

        // Draw sprite when available
        try {
            if (sprite && sprite.width && sprite.height) {
                ctx.drawImage(sprite, dx, dy, ds, ds);
                return;
            }
        } catch (e) {
            // fall through to placeholder
        }

        // Placeholder: red/orange tile + crossed swords
        const prevSmooth = ctx.imageSmoothingEnabled;
        try { ctx.imageSmoothingEnabled = false; } catch (e) { __err('render', e); }

        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(dx, dy, ds, ds);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(dx + 1, dy + 1, Math.max(0, ds - 2), Math.max(0, ds - 2));

        // Crossed swords icon (simplified)
        const unit = Math.max(1, Math.floor(ds / 16));
        const cx = dx + Math.floor(ds / 2);
        const cy = dy + Math.floor(ds / 2);

        ctx.fillStyle = '#fbbf24'; // Gold blade
        // Left sword (diagonal)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-Math.PI / 4);
        ctx.fillRect(-unit, -6 * unit, 2 * unit, 10 * unit);
        ctx.restore();

        // Right sword (diagonal)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-unit, -6 * unit, 2 * unit, 10 * unit);
        ctx.restore();

        // Hilts
        ctx.fillStyle = '#78350f'; // Brown handles
        ctx.fillRect(cx - 5 * unit, cy - 2 * unit, 3 * unit, 4 * unit);
        ctx.fillRect(cx + 2 * unit, cy - 2 * unit, 3 * unit, 4 * unit);

        try { ctx.imageSmoothingEnabled = prevSmooth; } catch (e) { __err('render', e); }
    }

    /**
     * Draw the extra life pickup icon.
     * Uses the loaded sprite `extra_life` when available; otherwise draws
     * a simple red tile with a heart icon.
     */
    static drawExtraLifeItem(ctx, x, y, size = 32, opts = {}) {
        if (!ctx) return;

        const loader = opts.spriteLoader || ((typeof spriteLoader !== 'undefined') ? spriteLoader : null);
        const key = opts.spriteKey || 'extra_life';
        const sprite = (loader && typeof loader.getSprite === 'function') ? loader.getSprite(key) : null;

        const pixelSnap = (typeof Config !== 'undefined' && Config.PIXEL_SNAP) ? true : false;
        const dx = pixelSnap ? Math.round(x) : x;
        const dy = pixelSnap ? Math.round(y) : y;
        const ds = pixelSnap ? Math.round(size) : size;

        // Draw sprite when available
        try {
            if (sprite && sprite.width && sprite.height) {
                ctx.drawImage(sprite, dx, dy, ds, ds);
                return;
            }
        } catch (e) {
            // fall through to placeholder
        }

        // Placeholder: red tile + heart
        const prevSmooth = ctx.imageSmoothingEnabled;
        try { ctx.imageSmoothingEnabled = false; } catch (e) { __err('render', e); }

        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(dx, dy, ds, ds);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(dx + 1, dy + 1, Math.max(0, ds - 2), Math.max(0, ds - 2));

        // Simple heart shape (pixelated)
        const unit = Math.max(1, Math.floor(ds / 16));
        const cx = dx + Math.floor(ds / 2);
        const cy = dy + Math.floor(ds / 2);

        ctx.fillStyle = '#ffffff';
        // Top two bumps
        ctx.fillRect(cx - 4 * unit, cy - 2 * unit, 3 * unit, unit);
        ctx.fillRect(cx + unit, cy - 2 * unit, 3 * unit, unit);
        // Middle rectangle
        ctx.fillRect(cx - 5 * unit, cy - unit, 10 * unit, 3 * unit);
        // Bottom triangle (simplified as rectangles)
        ctx.fillRect(cx - 4 * unit, cy + 2 * unit, 8 * unit, unit);
        ctx.fillRect(cx - 3 * unit, cy + 3 * unit, 6 * unit, unit);
        ctx.fillRect(cx - 2 * unit, cy + 4 * unit, 4 * unit, unit);

        try { ctx.imageSmoothingEnabled = prevSmooth; } catch (e) { __err('render', e); }
    }

    /**
     * Draw the golden idol collectible.
     * Uses the loaded sprite `golden_idol` when available; otherwise draws
     * a simple gold plaque with a mask symbol.
     */
    static drawGoldenIdol(ctx, x, y, size = 32, opts = {}) {
        if (!ctx) return;

        const loader = opts.spriteLoader || ((typeof spriteLoader !== 'undefined') ? spriteLoader : null);
        const key = opts.spriteKey || 'golden_idol';
        const sprite = (loader && typeof loader.getSprite === 'function') ? loader.getSprite(key) : null;

        const pixelSnap = (typeof Config !== 'undefined' && Config.PIXEL_SNAP) ? true : false;
        const dx = pixelSnap ? Math.round(x) : x;
        const dy = pixelSnap ? Math.round(y) : y;
        const ds = pixelSnap ? Math.round(size) : size;

        // Draw sprite when available
        try {
            if (sprite && sprite.width && sprite.height) {
                ctx.drawImage(sprite, dx, dy, ds, ds);
                return;
            }
        } catch (e) {
            // fall through to placeholder
        }

        const prevSmooth = ctx.imageSmoothingEnabled;
        try { ctx.imageSmoothingEnabled = false; } catch (e) { __err('render', e); }

        // Gold plaque
        ctx.fillStyle = '#6b4a00';
        ctx.fillRect(dx, dy, ds, ds);
        ctx.fillStyle = '#f5c542';
        ctx.fillRect(dx + 1, dy + 1, Math.max(0, ds - 2), Math.max(0, ds - 2));

        // Simple mask glyph
        const unit = Math.max(1, Math.floor(ds / 16));
        const cx = dx + Math.floor(ds / 2);
        const cy = dy + Math.floor(ds / 2);
        ctx.fillStyle = '#3a2400';
        ctx.fillRect(cx - 3 * unit, cy - 4 * unit, 6 * unit, 7 * unit);
        ctx.fillStyle = '#f5c542';
        ctx.fillRect(cx - 2 * unit, cy - 2 * unit, 4 * unit, unit);
        ctx.fillRect(cx - 1 * unit, cy + 1 * unit, 2 * unit, unit);

        try { ctx.imageSmoothingEnabled = prevSmooth; } catch (e) { __err('render', e); }
    }
}
