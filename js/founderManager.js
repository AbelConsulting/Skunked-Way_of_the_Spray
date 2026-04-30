/**
 * founderManager.js — "Founder" / Early Access entitlement.
 *
 * What is a Founder?
 *   A player who supported the game during the early-access window. The
 *   entitlement is permanent, account-bound (via the Google Play Remove Ads
 *   purchase on Android, or directly via FounderManager.grant() on web/promo).
 *
 * Founder rewards (cosmetic, no gameplay imbalance):
 *   • Gold "Founder" aura on the Ninja Skunk sprite (rendered by player.js).
 *   • "FOUNDER" badge displayed on the start menu and game-over leaderboard row.
 *   • "Day-One Skunk" achievement (granted on first detection).
 *
 * Persistence:
 *   localStorage key  → skunkfu.founder        ('1' if granted, otherwise absent)
 *   localStorage key  → skunkfu.founderSince   (ISO date string, set on first grant)
 *
 * Auto-grant rule:
 *   If the player owns Remove Ads (skunkfu.adFree === '1') AND the current
 *   wall-clock date is before EARLY_ACCESS_END_ISO, founder status is granted
 *   automatically. After the cutoff, only manual grants (e.g. via promo code)
 *   add new founders — existing founders keep the flag forever.
 *
 * Public API:
 *   FounderManager.initialize()
 *   FounderManager.isFounder()           → boolean
 *   FounderManager.grant(source)         → boolean (true if newly granted)
 *   FounderManager.revoke()              → for testing only
 *   FounderManager.onChange(fn)          → fn(isFounder) on state change
 *   FounderManager.getFounderSince()     → ISO string or null
 *   FounderManager.EARLY_ACCESS_END_ISO  → cutoff date constant
 */

const FounderManager = (() => {
    'use strict';

    // ── Configuration ───────────────────────────────────────────────────────
    // Adjust this date to extend or shorten the early-access window.
    // After this date, owning Remove Ads no longer auto-grants Founder status,
    // but anyone already granted keeps it forever.
    const EARLY_ACCESS_END_ISO = '2026-12-31T23:59:59Z';

    // Promo / press / community codes. Codes are case-insensitive and stripped
    // of whitespace before comparison. Each redemption is one-shot per device:
    // once a code has been used on this install it is recorded in
    // `skunkfu.founderCodesUsed` (a JSON array) and cannot be re-used.
    //
    // NOTE: client-side codes are easy to share — keep this list short and
    // rotate values for paid campaigns. For high-value drops, gate redemption
    // through the Firebase function instead and call FounderManager.grant().
    const VALID_REDEEM_CODES = Object.freeze([
        'SKUNKED-FOUNDER',
        'DAY-ONE-SKUNK',
        'WAY-OF-THE-SPRAY'
    ]);

    const STORAGE_KEY_FOUNDER       = 'skunkfu.founder';
    const STORAGE_KEY_FOUNDER_SINCE = 'skunkfu.founderSince';
    const STORAGE_KEY_AD_FREE       = 'skunkfu.adFree';
    const STORAGE_KEY_CODES_USED    = 'skunkfu.founderCodesUsed';
    // Cosmetic preference — Founders may opt out of the gold ninja skin and
    // play with the original look. Defaults to enabled (no entry == on).
    const STORAGE_KEY_GOLD_SKIN     = 'skunkfu.useGoldSkin';

    let _isFounder = _read();
    let _goldSkinEnabled = _readGoldSkinPref();
    let _initialized = false;
    const _listeners = new Set();

    function _log(...args) { try { console.log('[Founder]', ...args); } catch (e) {} }

    function _read() {
        try { return localStorage.getItem(STORAGE_KEY_FOUNDER) === '1'; }
        catch (e) { return false; }
    }

    function _readGoldSkinPref() {
        // Default to enabled; only an explicit '0' opts out.
        try { return localStorage.getItem(STORAGE_KEY_GOLD_SKIN) !== '0'; }
        catch (e) { return true; }
    }

    function _write(v) {
        try {
            if (v) localStorage.setItem(STORAGE_KEY_FOUNDER, '1');
            else   localStorage.removeItem(STORAGE_KEY_FOUNDER);
        } catch (e) {}
    }

    function _writeSince(iso) {
        try { localStorage.setItem(STORAGE_KEY_FOUNDER_SINCE, iso); } catch (e) {}
    }

    function _readSince() {
        try { return localStorage.getItem(STORAGE_KEY_FOUNDER_SINCE) || null; }
        catch (e) { return null; }
    }

    function _isWithinEarlyAccess() {
        try { return Date.now() < Date.parse(EARLY_ACCESS_END_ISO); }
        catch (e) { return false; }
    }

    function _hasRemoveAds() {
        try { return localStorage.getItem(STORAGE_KEY_AD_FREE) === '1'; }
        catch (e) { return false; }
    }

    function _notify() {
        for (const fn of _listeners) {
            try { fn(_isFounder); } catch (e) {}
        }
    }

    function _grantInternal(source) {
        if (_isFounder) return false;
        _isFounder = true;
        _write(true);
        if (!_readSince()) _writeSince(new Date().toISOString());
        _log('granted via', source || 'unknown');

        // Track via Analytics if available.
        try {
            if (window.Analytics && typeof Analytics.trackEvent === 'function') {
                Analytics.trackEvent('founder_granted', { source: source || 'unknown' });
            }
        } catch (e) {}

        // Unlock the matching achievement if the system is available.
        try {
            if (window.Achievements && typeof Achievements.unlock === 'function') {
                Achievements.unlock('day_one_skunk');
            }
        } catch (e) {}

        _notify();
        return true;
    }

    function initialize() {
        if (_initialized) return;
        _initialized = true;

        // 1. Auto-grant if Remove Ads is owned and we're inside the early-access window.
        if (!_isFounder && _hasRemoveAds() && _isWithinEarlyAccess()) {
            _grantInternal('early-access-purchase');
        }

        // 2. Listen for future purchases — if PurchaseManager is wired, react when
        //    the ad-free entitlement flips to true during the early-access window.
        try {
            if (window.PurchaseManager && typeof PurchaseManager.onChange === 'function') {
                PurchaseManager.onChange(adFree => {
                    if (adFree && !_isFounder && _isWithinEarlyAccess()) {
                        _grantInternal('purchase-during-early-access');
                    }
                });
            }
        } catch (e) {}

        // 3. Toggle the start-menu "FOUNDER" badge to match current state.
        _syncBadgeDom();
        _listeners.add(_syncBadgeDom);

        _log('initialized; founder=', _isFounder, 'earlyAccess=', _isWithinEarlyAccess());
    }

    function _syncBadgeDom() {
        try {
            const el = document.getElementById('founder-badge');
            if (!el) return;
            if (_isFounder) el.removeAttribute('hidden');
            else            el.setAttribute('hidden', '');
        } catch (e) {}
    }

    function isFounder() { return _isFounder; }
    function getFounderSince() { return _readSince(); }

    // ── Gold-skin cosmetic toggle ──────────────────────────────────────────
    // The pref is cached in `_goldSkinEnabled` so the per-frame render path
    // never hits localStorage. Persisted as '0' for opt-out; absence == on,
    // so existing Founders default to gold without a migration.
    function isGoldSkinEnabled() {
        return _isFounder && _goldSkinEnabled;
    }
    function setGoldSkinEnabled(on) {
        const next = !!on;
        if (_goldSkinEnabled === next) return;
        _goldSkinEnabled = next;
        try {
            if (next) localStorage.removeItem(STORAGE_KEY_GOLD_SKIN);
            else      localStorage.setItem(STORAGE_KEY_GOLD_SKIN, '0');
        } catch (e) {}
        _notify();
    }

    function grant(source) { return _grantInternal(source || 'manual'); }

    function revoke() {
        // Intended for testing / support requests only.
        if (!_isFounder) return false;
        _isFounder = false;
        _write(false);
        try { localStorage.removeItem(STORAGE_KEY_FOUNDER_SINCE); } catch (e) {}
        _log('revoked');
        _notify();
        return true;
    }

    function onChange(fn) {
        if (typeof fn !== 'function') return () => {};
        _listeners.add(fn);
        return () => _listeners.delete(fn);
    }

    // ── Redeem-code support ────────────────────────────────────────────────
    function _normalizeCode(raw) {
        if (typeof raw !== 'string') return '';
        return raw.trim().toUpperCase().replace(/\s+/g, '-');
    }

    function _readCodesUsed() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_CODES_USED);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }

    function _writeCodesUsed(arr) {
        try { localStorage.setItem(STORAGE_KEY_CODES_USED, JSON.stringify(arr)); } catch (e) {}
    }

    /**
     * Redeem a client-side promo code. Returns:
     *   { ok: true,  status: 'granted' }   — code accepted, founder granted
     *   { ok: true,  status: 'already' }   — code valid but already a founder
     *   { ok: false, status: 'used' }      — code valid but already redeemed on this device
     *   { ok: false, status: 'invalid' }   — code unknown
     *   { ok: false, status: 'empty' }     — empty input
     */
    function redeemCode(rawCode) {
        const code = _normalizeCode(rawCode);
        if (!code) return { ok: false, status: 'empty' };
        if (!VALID_REDEEM_CODES.includes(code)) {
            return { ok: false, status: 'invalid' };
        }
        const used = _readCodesUsed();
        if (used.includes(code)) {
            return { ok: false, status: 'used' };
        }
        used.push(code);
        _writeCodesUsed(used);
        if (_isFounder) {
            return { ok: true, status: 'already' };
        }
        _grantInternal('redeem-code:' + code);
        return { ok: true, status: 'granted' };
    }

    return {
        initialize,
        isFounder,
        grant,
        revoke,
        onChange,
        getFounderSince,
        redeemCode,
        isGoldSkinEnabled,
        setGoldSkinEnabled,
        EARLY_ACCESS_END_ISO
    };
})();

if (typeof window !== 'undefined') {
    window.FounderManager = FounderManager;
}
