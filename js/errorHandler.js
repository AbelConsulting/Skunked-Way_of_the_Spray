/*!
 * Skunked: Way of the Spray
 * Copyright (c) 2026 Mephitideus Interactive. All Rights Reserved.
 * Proprietary and confidential — unauthorized copying, distribution, or use
 * of this file, via any medium, is strictly prohibited. See LICENSE for terms.
 */
// js/errorHandler.js — Global error handling & lightweight error logger
// Load this BEFORE all other game scripts.
(function() {
    'use strict';

    // Store recent errors for debugging (inspect via window.__errorLog)
    const _errorLog = [];
    const _seenErrors = new Set();
    const MAX_LOG = 200;
    const MAX_SEEN = 500;

    /**
     * Lightweight error logger with deduplication.
     * Logs each unique (tag + message) combo only once per session to
     * avoid flooding the console while still surfacing hidden bugs.
     *
     * @param {string} tag  - Subsystem tag, e.g. 'game', 'audio', 'enemy'
     * @param {*}      err  - The caught error/value
     */
    window.__err = function(tag, err) {
        try {
            var msg = (err && err.message) ? err.message : String(err);
            var key = tag + ':' + msg;

            // Deduplicate — only log each unique error once
            if (_seenErrors.has(key)) return;
            _seenErrors.add(key);
            if (_seenErrors.size > MAX_SEEN) _seenErrors.clear();

            // Store for post-mortem inspection
            var entry = { tag: tag, msg: msg, ts: Date.now(), stack: (err && err.stack) || '' };
            _errorLog.push(entry);
            if (_errorLog.length > MAX_LOG) _errorLog.shift();

            // Surface the error
            console.warn('[' + tag + ']', msg);

            // Forward to analytics (if loaded)
            try {
                if (typeof Analytics !== 'undefined' && Analytics.trackError) {
                    Analytics.trackError({ tag: tag, message: msg });
                }
            } catch (_) { /* */ }
        } catch (_) {
            // Absolute last resort — never let the error handler itself crash
        }
    };

    // Expose the log array so developers can inspect it in the console
    window.__errorLog = _errorLog;

    // ── safeStorage ─────────────────────────────────────────────────────
    // Resilient localStorage wrapper. All methods swallow exceptions
    // (private/incognito mode, quota exceeded, disabled storage) and
    // return a sentinel so callers don't need their own try/catch.
    //
    // getJSON() additionally quarantines corrupt JSON keys to "<key>.broken"
    // so a single bad value can't cascade into deleting unrelated data.
    var _quarantineLogged = new Set();
    function _ls() {
        try { return window.localStorage; }
        catch (_) { return null; }
    }
    window.safeStorage = {
        get: function(key, fallback) {
            try {
                var s = _ls();
                if (!s) return fallback === undefined ? null : fallback;
                var v = s.getItem(key);
                return v === null && fallback !== undefined ? fallback : v;
            } catch (e) {
                window.__err('safeStorage:get', e);
                return fallback === undefined ? null : fallback;
            }
        },
        set: function(key, value) {
            try {
                var s = _ls();
                if (!s) return false;
                s.setItem(key, String(value));
                return true;
            } catch (e) {
                window.__err('safeStorage:set', e);
                return false;
            }
        },
        remove: function(key) {
            try {
                var s = _ls();
                if (!s) return false;
                s.removeItem(key);
                return true;
            } catch (e) {
                window.__err('safeStorage:remove', e);
                return false;
            }
        },
        getJSON: function(key, fallback) {
            var fb = fallback === undefined ? null : fallback;
            try {
                var s = _ls();
                if (!s) return fb;
                var raw = s.getItem(key);
                if (raw === null || raw === '') return fb;
                try {
                    return JSON.parse(raw);
                } catch (parseErr) {
                    // Corrupt JSON — move it aside so we don't lose it,
                    // but stop poisoning subsequent reads.
                    try { s.setItem(key + '.broken', raw); } catch (_) { /* */ }
                    try { s.removeItem(key); } catch (_) { /* */ }
                    if (!_quarantineLogged.has(key)) {
                        _quarantineLogged.add(key);
                        window.__err('safeStorage:corrupt', new Error('Quarantined corrupt JSON for key "' + key + '"'));
                    }
                    return fb;
                }
            } catch (e) {
                window.__err('safeStorage:getJSON', e);
                return fb;
            }
        },
        setJSON: function(key, value) {
            try {
                var s = _ls();
                if (!s) return false;
                s.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                window.__err('safeStorage:setJSON', e);
                return false;
            }
        }
    };

    // ── Global error handler ────────────────────────────────────────────
    window.onerror = function(message, source, lineno, colno, error) {
        var src = String(source || '');
        var msg = String(message || '');
        // Silently ignore MetaMask / browser-extension noise
        if (/MetaMask|inpage\.js|lockdown-install|SES|Extension context/i.test(msg + ' ' + src)) {
            return true; // swallow
        }
        window.__err('global',
            error || (message + ' at ' + source + ':' + lineno + ':' + colno));
        return false; // allow default browser handling too
    };

    // ── Unhandled promise rejection handler ──────────────────────────────
    window.addEventListener('unhandledrejection', function(event) {
        var reason = event.reason;
        var rStr = String(reason && reason.stack ? reason.stack : reason || '');
        // Silently ignore MetaMask / browser-extension noise
        if (/MetaMask|inpage\.js|lockdown-install|SES_UNCAUGHT|Extension context invalidated|chromePort disconnected/i.test(rStr)) {
            event.preventDefault();
            return;
        }
        window.__err('promise', reason || 'Unhandled promise rejection');
    });
})();
