/*!
 * Skunked: Way of the Spray — Electron Preload Script
 * Copyright (c) 2026 Mephitideus Interactive LLC. All Rights Reserved.
 *
 * Runs in a privileged context before the renderer page loads.
 * Exposes a safe, minimal API surface via contextBridge so the game
 * can interact with the Steam SDK without nodeIntegration being enabled.
 */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    /** Identifies the runtime so game code can branch on platform. */
    platform: 'steam',

    // ── Achievements ────────────────────────────────────────────────
    /**
     * Unlock a Steam achievement by its API name.
     * @param {string} id  Steam achievement API name (e.g. "ACH_FIRST_KILL")
     * @returns {Promise<boolean>}
     */
    unlockAchievement: (id) => ipcRenderer.invoke('steam:unlockAchievement', id),

    /**
     * Query whether an achievement is already unlocked.
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    isAchievementUnlocked: (id) => ipcRenderer.invoke('steam:isAchievementUnlocked', id),

    // ── Player info ─────────────────────────────────────────────────
    /**
     * Get the local player's Steam display name.
     * @returns {Promise<string|null>}
     */
    getPlayerName: () => ipcRenderer.invoke('steam:getPlayerName'),

    /**
     * Get the local player's 64-bit Steam ID as a string.
     * @returns {Promise<string|null>}
     */
    getSteamId: () => ipcRenderer.invoke('steam:getSteamId'),

    // ── Leaderboard ─────────────────────────────────────────────────
    /**
     * Submit a score to a named Steam leaderboard.
     * @param {string} leaderboardName
     * @param {number} score
     * @returns {Promise<{success: boolean, isNewBest?: boolean}>}
     */
    submitScore: (leaderboardName, score) =>
        ipcRenderer.invoke('steam:submitScore', { leaderboardName, score }),

    /**
     * Fetch the top N entries from a Steam leaderboard.
     * @param {string} leaderboardName
     * @param {number} [count=10]
     * @returns {Promise<Array<{name: string, score: number, rank: number}>>}
     */
    getLeaderboard: (leaderboardName, count = 10) =>
        ipcRenderer.invoke('steam:getLeaderboard', { leaderboardName, count }),

    // ── Steam Input ─────────────────────────────────────────────────
    /**
     * Whether ISteamInput was successfully initialised in the main process.
     * @returns {Promise<boolean>}
     */
    isSteamInputAvailable: () => ipcRenderer.invoke('steam:input:available'),

    /**
     * Subscribe to native Steam Input action-set state updates (pushed
     * whenever the state changes). Shape: { digital: { MoveLeft, MoveRight,
     * Jump, Attack, SkunkShot, Special, Pause, Confirm }, analog: { x, y } },
     * or `null` when no Steam Input controller is connected.
     * @param {(state: object|null) => void} callback
     * @returns {() => void} unsubscribe function
     */
    onSteamInputState: (callback) => {
        const listener = (_event, state) => callback(state);
        ipcRenderer.on('steam:input:state', listener);
        return () => ipcRenderer.removeListener('steam:input:state', listener);
    }
});
