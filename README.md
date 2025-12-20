# Skunk Fu - 2D Beat 'em Up Platformer

A 2D beat 'em up platformer game featuring the Ninja Skunk! Fight through waves of enemies with lightning-fast combat and the deadly Shadow Strike ability!

## Features

### 🎮 Gameplay

- **Fast-Paced Beat 'em Up Action**: Quick attacks, dash abilities, and intense ninja combat
- **Platforming Elements**: High jumps across platforms, agile movement
- **Shadow Strike Special**: Dash through enemies with extended attack range
- **Enemy Waves**: Face different enemy types with unique AI behaviors
- **Score System**: Defeat enemies and rack up points

### 🦨 Ninja Skunk

**The Shadow Striker** - Lightning-fast ninja warrior

- **Health**: 80 (Glass cannon - high risk, high reward)
- **Speed**: 400 (Fastest movement)
- **Jump Force**: 700 (Highest jumps)
- **Attack Damage**: 15
- **Special Ability**: **Shadow Strike** - Forward dash attack with extended hitbox

## Installation

### 🌐 HTML5 Version (Recommended - Play in Browser!)

The game is now available as an HTML5 web game that runs directly in your browser!

**Quick Start:**

1. Clone the repository:

```bash
git clone https://github.com/AbelConsulting/SkunkFU.git
cd SkunkFU
```

1. Open `index.html` in your web browser:
   - **Simple method**: Double-click `index.html` to open in your default browser
   - **Local server method** (recommended for best compatibility):

     ```bash
     # Python 3
    python -m http.server 8000
    # Then open http://localhost:8000 in your browser
    
    # Or with Node.js
    npx http-server -p 8000
    # Then open http://localhost:8000 in your browser
2. Start playing! No installation required.

**Browser Requirements:**

- Modern web browser with HTML5 Canvas support (Chrome, Firefox, Safari, Edge)
- JavaScript enabled

### 🐍 Python/Pygame Version

**Prerequisites:**

- Python 3.8 or higher
- pip package manager

**Setup:**

1. Clone the repository (if not already done):

```bash
git clone https://github.com/AbelConsulting/SkunkFU.git
cd SkunkFU
```

1. Install dependencies:

```bash
pip install -r requirements.txt
```

1. Run the game:

```bash
cd src
python main.py
```

## Controls

### Useful developer scripts (npm)

- **Start local Node server:** `npm start` (runs `tools/csp_server.js`)
- **Start simple Python HTTP server:** `npm run serve:py`
- **Run Playwright tests (landscape):** `npm run test:touch-landscape`
- **Run full mobile test suite:** `npm run test:mobile-all` (runs several playwright tests)
- **Check sprite frames (Python):** `npm run check:sprite-frames` (validates frame/padding)
- **Fix sprite sheets (Python):** `npm run fix:sprites` (pads sprite sheets where needed, creates backups)
- **Extract ninja walk frames (Python):** `npm run extract:ninja-walk` (writes frames to `tmp-frames`)
- **Preview sprites (Python):** `npm run preview:sprites` (opens a small pygame preview window)

These scripts run tools in `tools/` and `toolshed/` to help testing, sprite maintenance and diagnostics.

### Entrypoint & CI/Docker 🔧

- **Expected entrypoint:** `index.js` (root shim) with `"main": "index.js"` in `package.json`. `npm start` still runs `node tools/csp_server.js` for local development.
- **Docker / container platforms:** If your platform runs `node index.js` by default, no change is needed. To override, set the container CMD/ENTRYPOINT, for example:

```Dockerfile
# Run the root shim
CMD ["node", "index.js"]
# or run the server directly
CMD ["node", "tools/csp_server.js"]
```

- **CI (GitHub Actions / other):** Use `npm start` or `node index.js` to start the server in your job. If you prefer a different entrypoint, update the `main` field in `package.json` or set the explicit command in your CI job.

> Tip: keep `npm start` pointing to the dev server (`tools/csp_server.js`) so local `npm start` behavior is predictable.

## Controls

| Action | Keys |
|--------|------|
| Move Left/Right | Arrow Keys or A/D |
| Jump | Spacebar |
| Attack | X |
| Special Ability | Z |
| Pause | ESC |
| Start Game | Enter |

## Project Structure

Total: 128×32 pixels (4 frames @ 32x32 each, scaled to 64x64 in-game)
SkunkFU/
├── index.html              # HTML5 game entry point (NEW!)
├── styles.css              # HTML5 game styles (NEW!)
├── js/                     # HTML5 JavaScript game code (NEW!)
│   ├── main.js             # Game initialization and loop
│   ├── game.js             # Main game controller
│   ├── config.js           # Game configuration and constants
│   ├── utils.js            # Utility functions
│   ├── player.js           # Player character class
│   ├── enemy.js            # Enemy character class
│   ├── enemyManager.js     # Enemy spawning and management
│   ├── level.js            # Level and platform handling
│   ├── ui.js               # User interface and HUD
│   ├── spriteLoader.js     # Sprite loading and animation
│   ├── audioManager.js     # Audio system
│   └── visualEffects.js    # Visual effects (damage numbers, etc.)
├── python/                 # Python/Pygame version (tucked away)
│   ├── main.py             # Game entry point
│   ├── game.py             # Main game controller
│   ├── config.py           # Game configuration and constants
│   ├── player.py           # Player character class
│   ├── enemy.py            # Enemy character class
│   ├── enemy_manager.py    # Enemy spawning and management
│   ├── level.py            # Level and platform handling
│   └── ui.py               # User interface and HUD
├── assets/
│   ├── sprites/
│   │   ├── characters/     # Player character sprites
│   │   ├── enemies/        # Enemy sprites
│   │   └── backgrounds/    # Background and tile sprites
│   └── audio/
│       ├── music/          # Background music
│       └── sfx/            # Sound effects
├── requirements.txt        # Python dependencies
└── README.md              # This file

SkunkFU/ --python version
├── index.html              # HTML5 game entry point (NEW!)
├── styles.css              # HTML5 game styles (NEW!)
├── js/                     # HTML5 JavaScript game code (NEW!)
│   ├── main.js             # Game initialization and loop
│   ├── game.js             # Main game controller
│   ├── config.js           # Game configuration and constants
│   ├── utils.js            # Utility functions
│   ├── player.js           # Player character class
│   ├── enemy.js            # Enemy character class
│   ├── enemyManager.js     # Enemy spawning and management
│   ├── level.js            # Level and platform handling
│   ├── ui.js               # User interface and HUD
│   ├── spriteLoader.js     # Sprite loading and animation
│   ├── audioManager.js     # Audio system
│   └── visualEffects.js    # Visual effects (damage numbers, etc.)
├── src/                    # Python/Pygame version
│   ├── main.py             # Game entry point
│   ├── game.py             # Main game controller
│   ├── config.py           # Game configuration and constants
│   ├── player.py           # Player character class
│   ├── enemy.py            # Enemy character class
│   ├── enemy_manager.py    # Enemy spawning and management
│   ├── level.py            # Level and platform handling
│   └── ui.py               # User interface and HUD
├── assets/
│   ├── sprites/
│   │   ├── characters/     # Player character sprites
│   │   ├── enemies/        # Enemy sprites
│   │   └── backgrounds/    # Background and tile sprites
│   └── audio/
│       ├── music/          # Background music
│       └── sfx/            # Sound effects
├── requirements.txt        # Python dependencies
└── README.md              # This file

SkunkFU/ Html5 version
├── index.html              # HTML5 game entry point (NEW!)
├── styles.css              # HTML5 game styles (NEW!)
├── js/                     # HTML5 JavaScript game code (NEW!)
│   ├── main.js             # Game initialization and loop
│   ├── game.js             # Main game controller
│   ├── config.js           # Game configuration and constants
│   ├── utils.js            # Utility functions
│   ├── player.js           # Player character class
│   ├── enemy.js            # Enemy character class
│   ├── enemyManager.js     # Enemy spawning and management
│   ├── level.js            # Level and platform handling
│   ├── ui.js               # User interface and HUD
│   ├── spriteLoader.js     # Sprite loading and animation
│   ├── audioManager.js     # Audio system
│   └── visualEffects.js    # Visual effects (damage numbers, etc.)
├── src/                    # Python/Pygame version
│   ├── main.py             # Game entry point
│   ├── game.py             # Main game controller
│   ├── config.py           # Game configuration and constants
│   ├── player.py           # Player character class
│   ├── enemy.py            # Enemy character class
│   ├── enemy_manager.py    # Enemy spawning and management
│   ├── level.py            # Level and platform handling
│   └── ui.py               # User interface and HUD
├── assets/
│   ├── sprites/
│   │   ├── characters/     # Player character sprites
│   │   ├── enemies/        # Enemy sprites
│   │   └── backgrounds/    # Background and tile sprites
│   └── audio/
│       ├── music/          # Background music
│       └── sfx/            # Sound effects
├── requirements.txt        # Python dependencies
└── README.md              # This file
```
SkunkFU/ Html5 version
├── index.html              # HTML5 game entry point (NEW!)
├── styles.css              # HTML5 game styles (NEW!)
├── js/                     # HTML5 JavaScript game code (NEW!)
│   ├── main.js             # Game initialization and loop
│   ├── game.js             # Main game controller
│   ├── config.js           # Game configuration and constants
│   ├── utils.js            # Utility functions
│   ├── player.js           # Player character class
│   ├── enemy.js            # Enemy character class
│   ├── enemyManager.js     # Enemy spawning and management
│   ├── level.js            # Level and platform handling
│   ├── ui.js               # User interface and HUD
│   ├── spriteLoader.js     # Sprite loading and animation
│   ├── audioManager.js     # Audio system
│   └── visualEffects.js    # Visual effects (damage numbers, etc.)
├── src/                    # Python/Pygame version
│   ├── main.py             # Game entry point
│   ├── game.py             # Main game controller
│   ├── config.py           # Game configuration and constants
│   ├── player.py           # Player character class
│   ├── enemy.py            # Enemy character class
│   ├── enemy_manager.py    # Enemy spawning and management
│   ├── level.py            # Level and platform handling
│   └── ui.py               # User interface and HUD
├── assets/
│   ├── sprites/
│   │   ├── characters/     # Player character sprites
│   │   ├── enemies/        # Enemy sprites
│   │   └── backgrounds/    # Background and tile sprites
│   └── audio/
│       ├── music/          # Background music
│       └── sfx/            # Sound effects
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## Game Architecture

### Core Components

- **Game Loop**: 60 FPS game loop with delta time
- **Player System**: Character stats, movement, combat, and special abilities
- **Enemy AI**: Patrol, chase, and attack behaviors with detection ranges
- **Collision Detection**: AABB collision for combat and platforms
- **Camera System**: Smooth camera following the player
- **UI System**: Menus, HUD, pause, and game over screens

### Character Stats System

Each character has unique attributes:

- Health points
- Movement speed
- Jump force
- Attack damage
- Special ability

## Development Roadmap

### Phase 1: Core Mechanics ✅

- [x] Basic game loop and structure
- [x] Player movement and jumping
- [x] Basic combat system
- [x] Enemy AI (patrol, chase, attack)
- [x] Collision detection
- [x] Camera system

### Phase 2: Polish (In Progress)

- [x] Add Ninja Skunk sprite animations
- [x] Implement Shadow Strike special ability
- [x] Add sound effects and music
- [ ] Create multiple levels
- [ ] Add power-ups and collectibles
- [ ] Boss battles

### Phase 3: Content Expansion

- [ ] More enemy types and variants
- [ ] Additional ninja abilities and combos
- [ ] Co-op multiplayer support
- [ ] Achievement system
- [ ] High score leaderboard

## Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests
- Create character sprites or assets

## Asset Requirements

### Sound Effects & Music

The game includes a complete audio system with procedurally generated placeholder sounds.

**Generated Sounds:**

- Player: jump, attacks (3 variants), shadow strike, hit, land
- Enemies: hit, death
- UI: menu navigation, pause, combo, game over
- Music: Gameplay background track + metal guitar pad layer

**Quick Setup:**

1. **Generate sounds**: `python generate_sounds.py`
2. **Generate music**: `python generate_music.py`
3. **Generate metal guitar pad**: `python generate_metal_sound.py`
4. All audio files placed in `assets/audio/sfx/` and `assets/audio/music/`

**Replace with Custom Audio:**
Simply drop your own `.wav` files into `assets/audio/sfx/` or music files (`.ogg`, `.wav`, `.mp3`) into `assets/audio/music/` with matching names.

**Recommended Resources:**

- [OpenGameArt.org](https://opengameart.org) - Free game audio
- [Freesound.org](https://freesound.org) - Sound effects library
- [Incompetech.com](https://incompetech.com) - Royalty-free music

### Creating Animated Sprites

The game uses **horizontal sprite sheets** where animation frames are arranged side-by-side.

**Quick Setup:**

1. Create individual frame images (64x64 for Ninja Skunk)
2. Use the sprite stitcher tool: `python sprite_stitcher.py ninja`
3. Sprite sheets are automatically placed in `assets/sprites/characters/`

**Sprite Sheet Format:**

```
ninja_walk.png = [Frame0][Frame1][Frame2][Frame3]
Total: 128×32 pixels (4 frames @ 32x32 each, scaled to 64x64 in-game)
```

**See [SPRITE_GUIDE.md](SPRITE_GUIDE.md) for detailed instructions!**

### Frame Counts

- **Idle**: 1 frame (static, no jitter) | **Walk**: 4 frames | **Jump**: 4 frames
- **Attack**: 4 frames | **Shadow Strike**: 4 frames | **Hurt**: 2 frames

### Tools Provided

- `generate_sounds.py` - Creates all placeholder sound effects
- `generate_music.py` - Creates background music
- `generate_metal_sound.py` - Creates the metal guitar pad layer to blend with music
- `sprite_stitcher.py` - Combines individual frames into sprite sheets
- `create_frame_folders.py` - Creates organized folders for sprite creation
- `test_sprites.py` - Verifies all sprites are properly loaded

**Current Status**:

- ✅ **Audio System**: Complete with 14 sound effects and gameplay music!
- ✅ **Sprite System**: Sprite sheets supported - animations will play automatically when you add multi-frame sheets!
- ✅ **HTML5 Version**: Full web-based port available! Play directly in your browser!

## Deployment (HTML5 Version)

The HTML5 version can be easily deployed to any static web hosting service:

### GitHub Pages

1. Push your repository to GitHub
2. Go to Settings > Pages
3. Select your branch and root directory
4. Your game will be available at `https://yourusername.github.io/SkunkFU/`

### Netlify

1. Drag and drop the entire project folder to [Netlify Drop](https://app.netlify.com/drop)
2. Or connect your GitHub repository for automatic deployments

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Follow the prompts

### Other Static Hosts

The game can be hosted on any static web server:

- Amazon S3 + CloudFront
- Google Cloud Storage
- Azure Static Web Apps
- Any traditional web hosting with static file support

Just upload all files (index.html, styles.css, js/, assets/) to your web server!

## License

This project is open source. See LICENSE file for details.

## Credits

**Development**:

- Python/Pygame version: Built with Python and Pygame
- HTML5 version: Pure JavaScript with HTML5 Canvas
**Characters**: Based on Skunk Squad
**Development**: Built with Python and Pygame by MontanaDad

**Characters**: Based on Skunk Squad by MontanaDad  

---

Have fun playing Skunk Fu! 🦨💥
