/*!
 * Skunked: Way of the Spray — Electron Main Process
 * Copyright (c) 2026 Mephitideus Interactive LLC. All Rights Reserved.
 */
'use strict';

const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
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
let steamworksModule = null;

function initSteam() {
    try {
        // steamworks.js must be initialised synchronously before app is ready
        const steamworks = require('steamworks.js');
        steamworksModule = steamworks;
        steamClient = steamworks.init(STEAM_APP_ID);
        console.log(`[Steam] Initialised. AppID=${STEAM_APP_ID}  Player="${steamClient.localplayer.getName()}"`);
    } catch (e) {
        console.warn('[Steam] SDK unavailable — running without Steam features:', e.message);
        steamClient = null;
    }
}

// ── Steam Input (ISteamInput) ─────────────────────────────────────────────────
// Action set / action names below MUST match steam/controller_vdf/game_actions_<appid>.vdf
// (uploaded once via Steamworks App Admin → Steam Input) or the handles resolve to 0
// and initSteamInput() bails out, leaving js/main.js on its existing browser
// Gamepad API fallback (Steam's Xbox-emulation layer) — so nothing breaks either way.
const STEAM_INPUT_ACTION_SET      = 'GameControls';
const STEAM_INPUT_ANALOG_ACTION   = 'Move';
const STEAM_INPUT_DIGITAL_ACTIONS = [
    'MoveLeft', 'MoveRight', 'Jump', 'Attack', 'SkunkShot', 'Special', 'Pause', 'Confirm'
];

const steamInput = {
    available: false,
    actionSetHandle: null,
    digitalHandles: {},
    analogHandle: null,
    pollTimer: null,
    lastStateJson: null
};

function initSteamInput(win) {
    if (!steamClient || !steamClient.input) return;
    try {
        steamClient.input.init();

        steamInput.actionSetHandle = steamClient.input.getActionSet(STEAM_INPUT_ACTION_SET);
        if (!steamInput.actionSetHandle) {
            console.warn(`[SteamInput] Action set "${STEAM_INPUT_ACTION_SET}" not found — has steam/controller_vdf/game_actions_${STEAM_APP_ID}.vdf been uploaded via Steamworks App Admin → Steam Input yet? Falling back to the browser Gamepad API.`);
            return;
        }

        for (const name of STEAM_INPUT_DIGITAL_ACTIONS) {
            steamInput.digitalHandles[name] = steamClient.input.getDigitalAction(name);
        }
        steamInput.analogHandle = steamClient.input.getAnalogAction(STEAM_INPUT_ANALOG_ACTION);

        steamInput.available = true;
        console.log(`[SteamInput] Initialised action set "${STEAM_INPUT_ACTION_SET}" (${STEAM_INPUT_DIGITAL_ACTIONS.length} digital actions).`);

        steamInput.pollTimer = setInterval(() => pollSteamInput(win), 16);
    } catch (e) {
        console.warn('[SteamInput] Unavailable — falling back to the browser Gamepad API:', e.message);
        steamInput.available = false;
    }
}

function pollSteamInput(win) {
    if (!steamInput.available || !win || win.isDestroyed()) return;
    try {
        const controllers = steamClient.input.getControllers() || [];

        let state = null;
        if (controllers.length > 0) {
            const digital = {};
            for (const name of STEAM_INPUT_DIGITAL_ACTIONS) digital[name] = false;
            const analog = { x: 0, y: 0 };

            for (const controller of controllers) {
                try { controller.activateActionSet(steamInput.actionSetHandle); } catch (e) { /* ignore per-controller errors */ }

                for (const name of STEAM_INPUT_DIGITAL_ACTIONS) {
                    try {
                        if (controller.isDigitalActionPressed(steamInput.digitalHandles[name])) digital[name] = true;
                    } catch (e) { /* ignore */ }
                }

                try {
                    const vec = controller.getAnalogActionVector(steamInput.analogHandle);
                    if (Math.abs(vec.x) > Math.abs(analog.x)) analog.x = vec.x;
                    if (Math.abs(vec.y) > Math.abs(analog.y)) analog.y = vec.y;
                } catch (e) { /* ignore */ }
            }

            state = { digital, analog };
        }

        const json = JSON.stringify(state);
        if (json !== steamInput.lastStateJson) {
            steamInput.lastStateJson = json;
            win.webContents.send('steam:input:state', state);
        }
    } catch (e) {
        // Swallow per-tick errors so a transient SDK hiccup can't spam the log or crash the timer.
    }
}

function shutdownSteamInput() {
    if (steamInput.pollTimer) {
        clearInterval(steamInput.pollTimer);
        steamInput.pollTimer = null;
    }
    if (steamInput.available && steamClient && steamClient.input) {
        try { steamClient.input.shutdown(); } catch (e) { /* ignore */ }
    }
    steamInput.available = false;
}

// ── IPC handlers ──────────────────────────────────────────────────────────────
function setupIPC() {
    // Steam Input
    ipcMain.handle('steam:input:available', () => steamInput.available);

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

    // Rich Presence — update friends-list status
    ipcMain.handle('steam:setRichPresence', (_, { key, value }) => {
        if (!steamClient) return false;
        try {
            if (typeof steamClient.localplayer.setRichPresence === 'function') {
                steamClient.localplayer.setRichPresence(key, value);
            }
            return true;
        } catch (e) { console.error('[Steam] setRichPresence:', e.message); return false; }
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

    // On Steam Deck (Linux) launch fullscreen; elsewhere start windowed.
    const isLinux = process.platform === 'linux';

    const win = new BrowserWindow({
        width: 1280,
        height: 800,      // 1280×800 = Steam Deck native; 720 letterboxes cleanly inside
        minWidth: 960,
        minHeight: 540,
        fullscreen: isLinux,          // fullscreen on Steam Deck / Linux
        fullscreenable: true,
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

    // F11 toggles fullscreen on all platforms
    win.webContents.on('before-input-event', (_, input) => {
        if (input.type === 'keyDown' && input.key === 'F11') {
            win.setFullScreen(!win.isFullScreen());
        }
    });

    initSteamInput(win);
    win.on('closed', shutdownSteamInput);

    const indexPath = path.join(__dirname, '..', 'dist-steam', 'index.html');
    win.loadFile(indexPath);

    // Open DevTools in development to diagnose layout/console errors
    if (!app.isPackaged) win.webContents.openDevTools();
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
// Steamworks.js must be initialised before app.whenReady() to avoid
// the DLL loading race on Windows.
initSteam();

// electronEnableSteamOverlay() appends GPU-related Chromium command-line
// switches that only take effect if set before the app is "ready", so this
// must happen here — NOT inside createWindow(). It also self-registers to
// handle any windows created later (see steamworks.js's index.js).
if (steamClient && steamworksModule) {
    try { steamworksModule.electronEnableSteamOverlay(false); } catch (e) { console.warn('[Steam] electronEnableSteamOverlay failed:', e.message); }
}

app.whenReady().then(() => {
    setupIPC();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    shutdownSteamInput();
    if (process.platform !== 'darwin') app.quit();
});
