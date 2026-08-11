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

function detectSteamDeckHardware() {
    if (process.platform !== 'linux') return false;

    // Fast env checks commonly present when launched from Steam/Game Mode.
    if (process.env.STEAM_DECK === '1') return true;
    if (process.env.GAMESCOPE_WAYLAND_DISPLAY) return true;

    // Hardware fingerprint checks on Steam Deck (Jupiter / Galileo boards).
    const probes = [
        '/sys/devices/virtual/dmi/id/board_vendor',
        '/sys/devices/virtual/dmi/id/product_name',
        '/sys/devices/virtual/dmi/id/product_version'
    ];
    try {
        const joined = probes
            .filter((p) => fs.existsSync(p))
            .map((p) => {
                try { return fs.readFileSync(p, 'utf8').trim(); }
                catch (_) { return ''; }
            })
            .join(' ')
            .toLowerCase();
        if (!joined) return false;
        return joined.includes('valve') || joined.includes('jupiter') || joined.includes('galileo') || joined.includes('steam deck');
    } catch (_) {
        return false;
    }
}

function getRuntimeProfile() {
    const isLinux = process.platform === 'linux';
    const isSteamDeck = detectSteamDeckHardware();
    const isDeckLikeSession = !!(
        process.env.STEAM_RUNTIME ||
        process.env.STEAM_COMPAT_CLIENT_INSTALL_PATH ||
        process.env.GAMESCOPE_WAYLAND_DISPLAY
    );

    return {
        platform: process.platform,
        arch: process.arch,
        isLinux,
        isSteamDeck,
        isDeckLikeSession
    };
}

function configureLinuxDeckRuntimeFlags() {
    if (process.platform !== 'linux') return;

    // Steam Deck runs games through gamescope; force Ozone/Wayland paths for
    // better fullscreen/input behavior and avoid accidental background throttling.
    const isDeckLike = !!(
        process.env.STEAM_RUNTIME ||
        process.env.STEAM_COMPAT_CLIENT_INSTALL_PATH ||
        process.env.GAMESCOPE_WAYLAND_DISPLAY ||
        process.env.STEAM_DECK
    );

    app.commandLine.appendSwitch('enable-features', 'UseOzonePlatform,WaylandWindowDecorations');
    app.commandLine.appendSwitch('ozone-platform-hint', isDeckLike ? 'auto' : 'wayland');
    app.commandLine.appendSwitch('disable-renderer-backgrounding');
    app.commandLine.appendSwitch('disable-background-timer-throttling');
    app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
}

function initSteam() {
    try {
        // steamworks.js must be initialised synchronously before app is ready
        const steamworks = require('steamworks.js');
        steamworksModule = steamworks;
        if (app.isPackaged && steamworks.restartAppIfNecessary(STEAM_APP_ID)) {
            console.log(`[Steam] Relaunching through Steam. AppID=${STEAM_APP_ID}`);
            app.exit(0);
            return;
        }
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
    ipcMain.handle('platform:getRuntimeProfile', () => getRuntimeProfile());

    // Steam Input
    ipcMain.handle('steam:input:available', () => steamInput.available);

    // Steam Overlay
    ipcMain.handle('steam:overlay:activate', (_, { dialog = 'Friends' } = {}) => {
        if (!steamClient || !steamClient.overlay) return false;
        try {
            const dialogs = steamClient.overlay.Dialog || {};
            const value = Object.prototype.hasOwnProperty.call(dialogs, dialog)
                ? dialogs[dialog]
                : dialogs.Friends;
            steamClient.overlay.activateDialog(typeof value === 'number' ? value : 0);
            return true;
        } catch (e) {
            console.warn('[Steam] overlay activate failed:', e.message);
            return false;
        }
    });

    // Achievement
    ipcMain.handle('steam:unlockAchievement', (_, id) => {
        if (!steamClient) { console.warn('[Steam] unlockAchievement: no steamClient for', id); return false; }
        try {
            const ok = steamClient.achievement.activate(id);
            if (!ok) console.warn(`[Steam] unlockAchievement: activate("${id}") returned false — check the API name matches Steamworks exactly`);
            else console.log(`[Steam] Achievement unlocked: ${id}`);
            return ok;
        }
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

            // Also update the per-user INT stat of the same name (Steamworks stat ID 3,
            // "global_highscores"). This keeps the personal-best stat in sync, which lets
            // Steamworks fire score-based stat achievements automatically and shows the
            // value on the player's profile.
            try {
                const cur = steamClient.stats.getStatInt(leaderboardName) || 0;
                if (score > cur) {
                    steamClient.stats.setStatInt(leaderboardName, score);
                    await steamClient.stats.storeStats();
                }
            } catch (e) { console.warn('[Steam] stat sync:', e.message); }

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

    // On-screen keyboard — shows the Steam Deck virtual keyboard for text entry
    ipcMain.handle('steam:showKeyboard', async (_, { description = 'Enter text', existingText = '', maxChars = 100 } = {}) => {
        if (!steamClient) return null;
        try {
            // Try floating text input (overlay-style, non-modal)
            if (steamClient.utils && typeof steamClient.utils.showFloatingGamepadTextInput === 'function') {
                const result = await steamClient.utils.showFloatingGamepadTextInput('normal', 0, 0, 500, 80);
                return (typeof result === 'string') ? result : null;
            }
            // Fallback: modal gamepad text input
            if (steamClient.utils && typeof steamClient.utils.showGamepadTextInput === 'function') {
                const result = await steamClient.utils.showGamepadTextInput(description, existingText, maxChars);
                return (typeof result === 'string') ? result : null;
            }
        } catch (e) { console.warn('[Steam] showKeyboard:', e.message); }
        return null;
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

    // On Steam Deck / Deck-like Linux sessions, launch fullscreen; otherwise start windowed.
    const isLinux = process.platform === 'linux';
    const isDeckLikeLinux = isLinux && !!(
        process.env.STEAM_DECK === '1' ||
        process.env.STEAM_RUNTIME ||
        process.env.STEAM_COMPAT_CLIENT_INSTALL_PATH ||
        process.env.GAMESCOPE_WAYLAND_DISPLAY ||
        detectSteamDeckHardware()
    );

    const win = new BrowserWindow({
        width: 1280,
        height: 800,      // 1280×800 = Steam Deck native; 720 letterboxes cleanly inside
        minWidth: 960,
        minHeight: 540,
        fullscreen: isDeckLikeLinux,
        fullscreenable: true,
        autoHideMenuBar: true,
        show: false,
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

    win.once('ready-to-show', () => {
        try {
            win.show();
            if (isDeckLikeLinux) {
                win.setFullScreen(true);
            }
        } catch (e) {
            console.warn('[Steam] ready-to-show handling failed:', e.message);
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
configureLinuxDeckRuntimeFlags();
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
