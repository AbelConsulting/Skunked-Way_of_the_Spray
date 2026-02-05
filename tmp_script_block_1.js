 tags below.
        -->
    <link rel="stylesheet" href="styles.css?v=2026-01-27">
    <link rel="stylesheet" href="achievements.css?v=2026-01-27">

    <style>
        /* expose safe-area insets as CSS variables so JS can read them */
        :root {
            --safe-top: env(safe-area-inset-top, 0px);
            --safe-bottom: env(safe-area-inset-bottom, 0px);
            --safe-left: env(safe-area-inset-left, 0px);
            --safe-right: env(safe-area-inset-right, 0px);
        }
        /* INLINE STYLES FOR MOBILE OPTIMIZATION */
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background-color: #000;
            overflow: hidden; /* Prevent scroll */
            user-select: none; /* Prevent text selection */
            -webkit-user-select: none;
        }

        #game-container {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            /* CRITICAL: Stops browser handling gestures */
            touch-action: none; 
        }

        /* Ensure canvas respects device safe areas (notches) */
        canvas {
            max-width: calc(100vw - var(--safe-left) - var(--safe-right));
            max-height: calc(100vh - var(--safe-top) - var(--safe-bottom));
            object-fit: contain;
            display: block;
        }

        /* --- TOUCH CONTROLS UI --- */
        #touch-controls {
            position: fixed;
            left: 0; right: 0;
            bottom: calc(12px + var(--safe-bottom));
            top: auto;
            height: 240px;
            pointer-events: none; /* Let touches pass through empty areas */
            z-index: 100;
            display: none; /* Hidden by default, shown via JS if mobile */
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 220ms cubic-bezier(.2,.9,.2,1), transform 220ms cubic-bezier(.2,.9,.2,1);
        }

        #touch-controls.visible {
            opacity: 1;
            transform: translateY(0);
        }

        .control-group {
            position: absolute;
            bottom: 20px;
            pointer-events: auto;
        }

        #d-pad { left: 20px; }
        #actions { right: 20px; }
        #game-over-controls { bottom: 100px; left: 50%; transform: translateX(-50%); }

        .touch-btn {
            width: clamp(56px, 9vw, 84px);
            height: clamp(56px, 9vw, 84px);
            background: radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,0.22), rgba(0,0,0,0.45));
            border: 2px solid rgba(255,255,255,0.22);
            border-radius: 16px;
            color: white;
            font-size: clamp(20px, 3.2vw, 28px);
            font-weight: 900;
            display: inline-flex;
            justify-content: center;
            align-items: center;
            margin: 5px;
            user-select: none;
            outline: none;
            /* Disable browser touch actions */
            touch-action: none; 
            -webkit-tap-highlight-color: transparent;
            backdrop-filter: blur(6px);
            box-shadow:
                0 12px 22px rgba(0,0,0,0.35),
                0 0 0 1px rgba(0,0,0,0.25) inset;
            transition: transform 90ms ease, filter 160ms ease, box-shadow 160ms ease;
        }

        /* Make left/right movement buttons slightly wider for easier tapping */
        #btn-left,
        #btn-right {
            width: clamp(64px, 11vw, 96px);
        }

        /* Per-action accents (subtle, readable) */
        .touch-btn--move {
            border-color: rgba(80,255,244,0.26);
            box-shadow: 0 12px 22px rgba(0,0,0,0.35), 0 0 18px rgba(80,255,244,0.10);
        }

        .touch-btn--attack {
            border-color: rgba(255,80,80,0.30);
            box-shadow: 0 12px 22px rgba(0,0,0,0.35), 0 0 20px rgba(255,80,80,0.10);
        }

        .touch-btn--special {
            border-color: rgba(180,90,255,0.30);
            box-shadow: 0 12px 22px rgba(0,0,0,0.35), 0 0 20px rgba(180,90,255,0.10);
        }

        .touch-btn--jump {
            border-color: rgba(120,220,255,0.28);
            box-shadow: 0 12px 22px rgba(0,0,0,0.35), 0 0 20px rgba(120,220,255,0.10);
        }

        .touch-btn--skunk {
            border-color: rgba(80,255,80,0.30);
            box-shadow: 0 12px 22px rgba(0,0,0,0.35), 0 0 20px rgba(80,255,80,0.12);
            transition: opacity 0.3s ease, filter 0.3s ease, box-shadow 0.3s ease;
        }

        .touch-btn--skunk.disabled {
            opacity: 0.35;
            filter: grayscale(0.7) brightness(0.5);
            box-shadow: 0 12px 22px rgba(0,0,0,0.35), 0 0 8px rgba(80,255,80,0.03);
            pointer-events: none;
        }

        .touch-btn--pause {
            border-color: rgba(255,255,255,0.18);
        }

        .touch-btn--restart {
            border-color: rgba(255,160,80,0.28);
            box-shadow: 0 12px 22px rgba(0,0,0,0.35), 0 0 20px rgba(255,160,80,0.10);
        }

        .touch-btn:active {
            filter: brightness(1.12);
            transform: scale(0.94);
            box-shadow:
                0 10px 18px rgba(0,0,0,0.32),
                0 0 18px rgba(255,255,255,0.10);
        }

        /* --- OVERLAYS --- */
        #mobile-start-overlay, #rotate-message {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            z-index: 200;
            color: white;
            font-family: sans-serif;
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 240ms cubic-bezier(.2,.9,.2,1), transform 240ms cubic-bezier(.2,.9,.2,1);
        }

        #mobile-start-btn {
            padding: 15px 40px;
            font-size: 1.5rem;
            background: #ff4d4d;
            border: none;
            color: white;
            border-radius: 8px;
            text-transform: uppercase;
            font-weight: bold;
        }

        #mobile-start-overlay.visible {
            opacity: 1;
            transform: translateY(0);
        }

        /* Pause button (top-right) */
        #pause-btn {
            position: fixed;
            top: 12px;
            right: 12px;
            z-index: 3000;
            width: 44px;
            height: 44px;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.14);
            background: radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,0.14), rgba(0,0,0,0.55));
            color: #fff;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            backdrop-filter: blur(6px);
            box-shadow: 0 10px 22px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.25) inset;
            transition: transform 120ms ease, filter 180ms ease, box-shadow 180ms ease;
            pointer-events: auto;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
        }

        /* Mobile performance toggle (small button) */
        #perf-mode-btn {
            position: absolute;
            top: 12px;
            left: 12px;
            z-index: 501;
            padding: 6px 8px;
            font-size: 12px;
            border-radius: 6px;
            background: linear-gradient(180deg, rgba(80,255,244,0.22), rgba(0,0,0,0.55));
            color: #fff;
            border: 1px solid rgba(80,255,244,0.25);
            display: none; /* shown via JS only on mobile */
            cursor: pointer;
            backdrop-filter: blur(6px);
            box-shadow: 0 10px 18px rgba(0,0,0,0.25);
            transition: transform 120ms ease, filter 180ms ease;
        }

        #pause-btn:hover { filter: brightness(1.08); }
        #pause-btn:active { transform: scale(0.96); }
        #perf-mode-btn:active { transform: scale(0.96); }

        /* Reusable neon button styles */
        .menu-btn {
            appearance: none;
            border: 1px solid rgba(255,255,255,0.14);
            background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(0,0,0,0.55));
            color: #fff;
            padding: 12px 18px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 0.02em;
            cursor: pointer;
            backdrop-filter: blur(8px);
            box-shadow:
                0 14px 28px rgba(0,0,0,0.35),
                0 0 0 1px rgba(0,0,0,0.25) inset;
            transition: transform 120ms ease, filter 180ms ease, box-shadow 180ms ease;
            -webkit-tap-highlight-color: transparent;
            user-select: none;
        }

        .menu-btn:hover { filter: brightness(1.10); }
        .menu-btn:active { transform: scale(0.98); }

        .menu-btn--primary {
            border-color: rgba(80,255,244,0.35);
            background: linear-gradient(180deg, rgba(80,255,244,0.22), rgba(0,0,0,0.55));
            box-shadow:
                0 14px 28px rgba(0,0,0,0.35),
                0 0 22px rgba(80,255,244,0.18);
        }

        /* Pause overlay panel */
        #pause-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(120% 120% at 50% 20%, rgba(0,0,0,0.65), rgba(0,0,0,0.92));
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }

        .pause-panel {
            width: min(560px, 92vw);
            padding: 18px 16px 16px;
            border-radius: 16px;
            border: 1px solid rgba(255,255,255,0.10);
            background: linear-gradient(180deg, rgba(10,12,16,0.88), rgba(0,0,0,0.72));
            box-shadow: 0 18px 60px rgba(0,0,0,0.55);
            backdrop-filter: blur(10px);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 14px;
        }

        .pause-title {
            margin: 0;
            color: #fff;
            font-size: 44px;
            letter-spacing: 0.06em;
            text-shadow: 0 10px 30px rgba(0,0,0,0.55);
        }

        .pause-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: center;
        }

        #mobile-restart-btn {
            padding: 15px 40px;
            font-size: 1.5rem;
            background: #4dff4d;
            border: none;
            color: white;
            border-radius: 8px;
            text-transform: uppercase;
            font-weight: bold;
        }

        /* --- ORIENTATION CHECK / forced landscape --- */
        #rotate-message { 
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: none; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            text-align: center; 
            gap: 10px; 
            padding: 16px;
            background: rgba(0, 0, 0, 0.95);
            z-index: 9999;
            color: white;
        }
        #rotate-message .rotate-icon { font-size: 80px; margin-bottom: 20px; animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        #rotate-message .rotate-actions { margin-top: 12px; }
        #rotate-message #rotate-play-btn { padding: 12px 20px; font-size:16px; border-radius:8px; border:none; background:#ff6b6b; color:#fff; cursor:pointer; }
        
        @media screen and (orientation: portrait) {
            #rotate-message { display: flex !important; }
            #game-container { display: none !important; }
        }

        /* Allow a 'force portrait->landscape' mode: when body has .force-landscape, treat as landscape */
        body.force-landscape #rotate-message { display: none !important; }
        body.force-landscape #game-container { display: flex !important; }
        body.force-landscape #canvas-rotator { transform: rotate(90deg); transform-origin: center center; width: calc(100vh); height: calc(100vw); display:flex; align-items:center; justify-content:center; }
        body.force-landscape canvas { max-width: calc(100vh - var(--safe-top) - var(--safe-bottom)); max-height: calc(100vw - var(--safe-left) - var(--safe-right)); }
    </style>
</head>
<body>

    <div id="rotate-message">
        <div class="rotate-icon">📱➡️💻</div>
        <h1>Please Rotate Your Device</h1>
        <p>Landscape mode required</p>
        <div class="rotate-actions">
            <button id="rotate-play-btn">Play Anyway (Rotate Canvas)</button>
        </div>
    </div>

    <div id="game-container">
        <div id="canvas-rotator" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
            <canvas id="game-canvas" width="1280" height="720"></canvas>
        </div>
        
        <div id="loading-screen">
            <div class="loading-content">
                <h1>Skunked: Way of the Spray</h1>
                <div class="loading-bar">
                    <div id="loading-progress" class="loading-progress"></div>
                </div>
                <p id="loading-text">Loading assets...</p>
            </div>
        </div>

        <!-- Touch controls moved out of #game-container to avoid transform/layout issues -->

        <!-- Pause Button (desktop & mobile) -->
        <button id="pause-btn" aria-label="Pause game" title="Pause" style="display:none;">⏸</button>
        <button id="perf-mode-btn" title="Performance mode">Perf</button>

        <div id="mobile-start-overlay" style="display:none;">
            <button id="mobile-start-btn">Tap to Start</button>
        </div>

        <!-- Pause Overlay -->
        <div id="pause-overlay" style="display:none;">
            <div class="pause-panel">
                <h1 class="pause-title">PAUSED</h1>
                <div class="pause-actions">
                    <button id="resume-btn" class="menu-btn menu-btn--primary">Resume</button>
                    <button id="vr-controllers-btn" title="Enable VR controllers" class="menu-btn">🎮 Enable VR Controllers</button>
                    <button id="view-highscores-btn" title="View High Scores" class="menu-btn">🏆 High Scores</button>
                    <button id="view-achievements-btn" title="View Achievements" class="menu-btn">🎖️ Achievements</button>
                </div>
            </div>
        </div>

        <!-- Error overlay (shown when runtime errors occur) -->
        <div id="error-overlay" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.92); color:#fff; z-index:4000; padding:20px; overflow:auto;">
            <h2 style="margin-bottom:8px;">Runtime Error</h2>
            <pre id="error-content" style="white-space:pre-wrap; font-size:13px; line-height:1.4;"></pre>
            <div style="margin-top:12px;">
                <button id="error-close" style="padding:8px 12px; margin-right:8px;">Close</button>
                <button id="error-copy" style="padding:8px 12px;">Copy</button>
            </div>
        </div>

        <!-- Informational overlay shown when running from file:// to explain fetch/CORS issues -->
        <div id="file-protocol-overlay" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.92); color:#fff; z-index:4001; padding:20px; overflow:auto;">
            <h2 style="margin-bottom:8px;">Serving over HTTP is recommended</h2>
            <p style="font-size:14px; max-width:800px;">It looks like you opened the game directly from the file system (file://). Modern browsers block some cross-origin resource requests when the page is loaded from file:// which may prevent audio and other assets from loading. To run locally, run <code>python -m http.server 8000</code> in the project root and open <a href="http://localhost:8000" style="color:#9ad;">http://localhost:8000</a>.</p>
            <div style="margin-top:12px;">
                <button id="file-overlay-start" style="padding:8px 12px; background:#ffcc33; color:#000; border-radius:6px;">Start Anyway (limited)</button>
                <button id="file-overlay-close" style="padding:8px 12px; background:#2ecc71; color:#000; border-radius:6px; margin-left:8px;">Close</button>
            </div>
        </div>

        <!-- legacy mobile restart overlay removed; on-screen touch controls provide restart -->
        <div id="score-container" style="position:absolute; right:12px; top:88px; z-index:900; max-width:320px; color:#fff; display:none;"></div>
    </div>

    <script src="js/config.js?v=2026-01-27">