/*!
 * Skunked: Way of the Spray — Electron Main Process
 * Copyright (c) 2026 Mephitideus Interactive LLC. All Rights Reserved.
 */
'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs   = require('fs');

// ── Steam App ID ──────────────────────────────────────────────────────────────
// Replace 480 with your real Steam App ID once your Steamworks app is created.
// 480 = Valve's "SpaceWar" demo — safe for SDK testing only.
const STEAM_APP_ID = (() => {
    const txt = path.join(__dirname, 'steam_appid.txt');
    if (fs.existsSync(txt)) {
        const id = parseInt(fs.readFileSync(txt, 'utf8').trim(), 10);
        if (!isNaN(id) && id > 0) return id;
    }
    return 480; // fallback test ID
})();

// ── Steamworks ────────────────────────────────────────────────────────────────
let steamClient = null;

function initSteam() {
    try {
        // steamworks.js must be initialised synchronously before app is ready
        const steamworks = require('steamworks.js');
        steamClient = steamworks.init(STEAM_APP_ID);
        console.log(`[Steam] Initialised. AppID=${STEAM_APP_ID}  Player="${steamClient.localplayer.getName()}"`);
    } catch (e) {
        console.warn('[Steam] SDK unavailable — running without Steam features:', e.message);
        steamClient = null;
    }
}

// ── IPC handlers ──────────────────────────────────────────────────────────────
function setupIPC() {
    // Achievement
    ipcMain.handle('steam:unlockAchievement', (_, id) => {
        if (!steamClient) return false;
        try { steamClient.achievement.activate(id); return true; }
        catch (e) { console.error('[Steam] unlockAchievement:', e.message); return false; }
    });

    ipcMain.handle('steam:isAchievementUnlocked', (_, id) => {
        if (!steamClient) return false;
        try { return steamClient.achievement.isActivated(id); }
        catch (e) { return false; }
    });

    // Player info
    ipcMain.handle('steam:getPlayerName', () => {
        if (!steamClient) return null;
        try { return steamClient.localplayer.getName(); }
        catch (e) { return null; }
    });

    ipcMain.handle('steam:getSteamId', () => {
        if (!steamClient) return null;
        try { return steamClient.localplayer.getSteamId().steamId64.toString(); }
        catch (e) { return null; }
    });

    // Leaderboard — submit
    ipcMain.handle('steam:submitScore', async (_, { leaderboardName, score }) => {
        if (!steamClient) return { success: false };
        try {
            const lb = await steamClient.leaderboard.findOrCreate(leaderboardName, 'Descending', 'Numeric');
            const result = await steamClient.leaderboard.uploadScore(lb, score, []);
            return { success: true, isNewBest: result.scoreChanged };
        } catch (e) {
            console.error('[Steam] submitScore:', e.message);
            return { success: false };
        }
    });

    // Leaderboard — fetch top N
    ipcMain.handle('steam:getLeaderboard', async (_, { leaderboardName, count = 10 }) => {
        if (!steamClient) return [];
        try {
            const lb = await steamClient.leaderboard.findOrCreate(leaderboardName, 'Descending', 'Numeric');
            const entries = await steamClient.leaderboard.getScores(lb, 0, count - 1);
            return entries.map(e => ({
                name:  e.steamId.name,
                score: e.score,
                rank:  e.rank
            }));
        } catch (e) {
            console.error('[Steam] getLeaderboard:', e.message);
            return [];
        }
    });
}

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
    const iconFile = (() => {
        const base = path.join(__dirname, '..', 'assets', 'icons');
        if (process.platform === 'win32')  return path.join(base, 'icon.ico');
        if (process.platform === 'darwin') return path.join(base, 'icon.icns');
        return path.join(base, 'icon-512x512.png');
    })();

    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 960,
        minHeight: 540,
        title: 'Skunked: Way of the Spray',
        icon: fs.existsSync(iconFile) ? iconFile : undefined,
        backgroundColor: '#000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false  // preload needs require() for IPC
        }
    });

    win.setMenuBarVisibility(false);

    const indexPath = path.join(__dirname, '..', 'dist-steam', 'index.html');
    win.loadFile(indexPath);

    // Open DevTools in development to diagnose layout/console errors
    if (!app.isPackaged) win.webContents.openDevTools();
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
// Steamworks.js must be initialised before app.whenReady() to avoid
// the DLL loading race on Windows.
initSteam();

app.whenReady().then(() => {
    setupIPC();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
