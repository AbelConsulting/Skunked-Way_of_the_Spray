/**
 * founderManager.js — "Founder" / Early Access entitlement.
 *
 * What is a Founder?
 *   A player who supported the game during the early-access window. The
 *   entitlement is permanent, account-bound (via the Google Play Remove Ads
 *   purchase on Android, or directly via FounderManager.grant() on web/promo).
 *
 * Founder rewards (cosmetic, no gameplay imbalance):
 *   • Exclusive GOLD ninja skin (only obtainable during early-access window).
 *   • "FOUNDER" badge displayed on the start menu and game-over leaderboard row.
 *   • "Day-One Skunk" achievement (granted on first detection).
 *
 * Remove Ads ($2.99) entitlement (separate from Founder, no time limit):
 *   • Removes banner + interstitial ads.
 *   • Unlocks the SAPPHIRE, AMETHYST, and STEEL ninja skins.
 *   • If purchased before EARLY_ACCESS_END_ISO, also auto-grants Founder + Gold.
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
    // Founder skin colour variant (gold | sapphire | amethyst | steel).
    // Default 'gold' if missing or unknown.
    const STORAGE_KEY_SKIN_VARIANT  = 'skunkfu.skinVariant';
    const VALID_SKIN_VARIANTS = Object.freeze(['gold', 'sapphire', 'amethyst', 'steel']);
    const DEFAULT_SKIN_VARIANT = 'gold';
    // Skins that anyone with the Remove Ads purchase can use, regardless of
    // Founder status. Gold is intentionally excluded — it remains the
    // permanent early-access exclusive.
    const AD_FREE_SKIN_VARIANTS = Object.freeze(['sapphire', 'amethyst', 'steel']);

    let _isFounder = _read();
    let _goldSkinEnabled = _readGoldSkinPref();
    let _skinVariant = _readSkinVariant();
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

    function _readSkinVariant() {
        try {
            const v = localStorage.getItem(STORAGE_KEY_SKIN_VARIANT);
            return VALID_SKIN_VARIANTS.includes(v) ? v : DEFAULT_SKIN_VARIANT;
        } catch (e) { return DEFAULT_SKIN_VARIANT; }
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

        // 0. Debug overrides via URL params (development/testing only).
        //    Add `?debugSkins=1` to grant Founder (unlocks ALL 4 skins).
        //    Add `?debugSkins=adfree` to simulate Remove-Ads-only (3 skins, gold locked).
        //    Add `?debugSkins=reset` to wipe skin/founder state on this device.
        try {
            const params = (typeof window !== 'undefined' && window.location)
                ? new URLSearchParams(window.location.search) : null;
            const dbg = params && params.get('debugSkins');
            if (dbg) {
                if (dbg === 'reset' || dbg === '0') {
                    try {
                        localStorage.removeItem(STORAGE_KEY_FOUNDER);
                        localStorage.removeItem(STORAGE_KEY_FOUNDER_SINCE);
                        localStorage.removeItem(STORAGE_KEY_AD_FREE);
                        localStorage.removeItem(STORAGE_KEY_CODES_USED);
                        localStorage.removeItem(STORAGE_KEY_SKIN_VARIANT);
                        localStorage.removeItem(STORAGE_KEY_GOLD_SKIN);
                    } catch (e) {}
                    _isFounder = false;
                    _founderSince = null;
                    _goldSkinEnabled = true;
                    _skinVariant = DEFAULT_SKIN_VARIANT;
                    _log('debugSkins=reset — cleared founder/skin state');
                } else if (dbg === 'adfree') {
                    try { localStorage.setItem(STORAGE_KEY_AD_FREE, '1'); } catch (e) {}
                    _log('debugSkins=adfree — simulating Remove Ads owner (gold stays locked)');
                } else {
                    // Default: grant Founder so all 4 skins are unlockable.
                    if (!_isFounder) _grantInternal('debug-skins-param');
                    _log('debugSkins=on — Founder granted for testing');
                }
            }
        } catch (e) {}

        // 1. Auto-grant if Remove Ads is owned and we're inside the early-access window.
        if (!_isFounder && _hasRemoveAds() && _isWithinEarlyAccess()) {
            _grantInternal('early-access-purchase');
        }

        // 2. Listen for future Remove Ads purchases — if PurchaseManager is
        //    wired, react when the ad-free entitlement flips to true.
        //      • During the early-access window → also grant Founder (gold).
        //      • After early-access ends → only the 3 colour skins unlock
        //        (handled implicitly by isSkinUnlocked); we still notify so
        //        the Settings UI re-renders the swatches as unlocked.
        try {
            if (window.PurchaseManager && typeof PurchaseManager.onChange === 'function') {
                PurchaseManager.onChange(adFree => {
                    if (!adFree) return;
                    if (!_isFounder && _isWithinEarlyAccess()) {
                        _grantInternal('purchase-during-early-access');
                    } else {
                        // Skin entitlement just expanded (sapphire/amethyst/steel
                        // became unlockable). Refresh listeners.
                        _notify();
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

    // ── Skin entitlement ───────────────────────────────────────────────────
    /**
     * Returns true if the player is entitled to use the given skin variant.
     *   gold     → Founder only (early-access exclusive)
     *   sapphire/amethyst/steel → Founder OR Remove Ads owner
     */
    function isSkinUnlocked(variantId) {
        if (!VALID_SKIN_VARIANTS.includes(variantId)) return false;
        if (variantId === 'gold') return _isFounder;
        if (_isFounder) return true;
        return _hasRemoveAds();
    }

    /** Convenience: true if at least one variant is unlocked. */
    function hasAnyUnlockedSkin() {
        return _isFounder || _hasRemoveAds();
    }

    /** Returns the list of variant ids currently unlocked for this player. */
    function getUnlockedSkinVariants() {
        return VALID_SKIN_VARIANTS.filter(isSkinUnlocked);
    }

    /**
     * Picks a sensible default variant from the unlocked set.
     * Preference order: gold (if unlocked) → sapphire → amethyst → steel.
     */
    function _firstUnlockedVariant() {
        const unlocked = getUnlockedSkinVariants();
        if (unlocked.includes('gold')) return 'gold';
        return unlocked[0] || DEFAULT_SKIN_VARIANT;
    }

    // ── Skin display toggle ────────────────────────────────────────────────
    // The pref is cached in `_goldSkinEnabled` so the per-frame render path
    // never hits localStorage. Persisted as '0' for opt-out; absence == on,
    // so users default to skin-on without a migration.
    // Note: kept the function name `isGoldSkinEnabled` for backwards-compat;
    // it now means "render the chosen unlocked skin" (any colour).
    function isGoldSkinEnabled() {
        if (!_goldSkinEnabled) return false;
        if (!hasAnyUnlockedSkin()) return false;
        // Only enable if the *current* variant is one we're entitled to.
        return isSkinUnlocked(_skinVariant);
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

    /**
     * Founder skin colour variant. Always returns a valid id from
     * VALID_SKIN_VARIANTS, regardless of Founder status (so callers can
     * preview the variant in UI even before grant).
     */
    /**
     * Returns the player's selected skin variant, clamped to one they
     * are actually entitled to. If the saved variant is locked (e.g.
     * "gold" for a non-founder), falls back to the first unlocked variant
     * so render code never tries to display a locked skin.
     */
    function getSkinVariant() {
        if (isSkinUnlocked(_skinVariant)) return _skinVariant;
        return _firstUnlockedVariant();
    }
    function getSkinVariants() { return VALID_SKIN_VARIANTS.slice(); }
    /**
     * Attempt to set the active skin variant. Rejects unknown ids and
     * variants the player has not unlocked. Returns true on success.
     */
    function setSkinVariant(id) {
        if (!VALID_SKIN_VARIANTS.includes(id)) return false;
        if (!isSkinUnlocked(id)) return false;
        if (_skinVariant === id) return true;
        _skinVariant = id;
        try {
            if (id === DEFAULT_SKIN_VARIANT) localStorage.removeItem(STORAGE_KEY_SKIN_VARIANT);
            else                              localStorage.setItem(STORAGE_KEY_SKIN_VARIANT, id);
        } catch (e) {}
        _notify();
        return true;
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
        getSkinVariant,
        getSkinVariants,
        setSkinVariant,
        isSkinUnlocked,
        hasAnyUnlockedSkin,
        getUnlockedSkinVariants,
        EARLY_ACCESS_END_ISO
    };
})();

if (typeof window !== 'undefined') {
    window.FounderManager = FounderManager;
}
