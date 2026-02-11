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
        } catch (_) {
            // Absolute last resort — never let the error handler itself crash
        }
    };

    // Expose the log array so developers can inspect it in the console
    window.__errorLog = _errorLog;

    // ── Global error handler ────────────────────────────────────────────
    window.onerror = function(message, source, lineno, colno, error) {
        window.__err('global',
            error || (message + ' at ' + source + ':' + lineno + ':' + colno));
        return false; // allow default browser handling too
    };

    // ── Unhandled promise rejection handler ──────────────────────────────
    window.addEventListener('unhandledrejection', function(event) {
        window.__err('promise', event.reason || 'Unhandled promise rejection');
    });
})();
