/*!
 * Skunked: Way of the Spray — Electron Demo Launcher
 * Copyright (c) 2026 Mephitideus Interactive LLC. All Rights Reserved.
 *
 * Thin entry point for the Steam marketing demo build. Sets SKUNKFU_DEMO
 * before delegating to the regular main process so main.js's default
 * (non-demo) path is completely untouched for the real Steam release.
 */
'use strict';

process.env.SKUNKFU_DEMO = '1';
require('./main.js');
