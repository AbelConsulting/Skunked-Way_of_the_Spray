# 🦨 SKUNKED: Way of the Spray

### *The stinkiest beat 'em up you'll ever love.*

---

**Skunked: Way of the Spray** is a lightning-fast 2D beat 'em up platformer that puts you in the fur of the deadliest ninja the animal kingdom has ever seen. Run. Jump. Slash. And when things get serious — unleash the **Shadow Strike** and leave nothing but a trail of devastation (and a lingering smell).

No downloads. No installs. **Just play.**

👉 **[Play Now](https://skunked.io/)** — works on desktop, mobile, tablet, and even Meta Quest VR headsets.

---

## Why Play Skunked?

### ⚡ Pick Up and Play in Seconds

Open a browser tab and you're in. No app store. No 4 GB download. No account. No waiting. Runs on any device with a modern browser — your phone, your laptop, your kid's tablet, your VR headset.

### 🥷 Be the Ninja Skunk

You're not just *any* skunk — you're a **shadow-striking, combo-chaining, boss-slaying ninja**. Tight, responsive controls reward skill and aggression. Every hit feels crunchy. Every dodge feels earned.

### 💀 Shadow Strike

Your signature move. Dash through enemies with devastating force and invulnerability frames. Time it right and you'll carve through an entire wave. Time it wrong and… well, skunks have more than one life.

### 🏆 Chase the High Score

Every enemy you defeat feeds your combo meter. Chain attacks without getting hit to rack up massive multipliers. Compete against yourself — or brag to your friends. The leaderboard doesn't lie.

### 🎮 Play Your Way

| Platform | How It Works |
|----------|-------------|
| **Desktop** | Keyboard — Arrow keys, Space, X, Z. Instant and precise. |
| **Mobile / Tablet** | On-screen touch buttons appear automatically. Optimized for thumbs. |
| **Meta Quest VR** | Point-and-click with controllers or use the on-screen touch UI with the laser. Full WebXR bridge support. |
| **Gamepad** | Xbox and standard controllers auto-detected. A = Jump, Trigger = Attack, B = Special. |

### 🗺️ Three Stages of Mayhem

Progress through increasingly brutal levels. Each stage introduces new enemy types, tighter platforming, and bigger bosses with unique AI that will punish predictable play. Survive them all and prove you're the real deal.

### 🎁 Loot & Power-Ups

- **Health Regen** — green pickups that heal over time
- **Extra Lives** — red hearts to keep you in the fight
- **Golden Idols** — collect all three in a level for stacked speed, damage, and survival bonuses

### 🎵 Full Soundtrack

Original procedurally generated music and sound effects bring every punch, jump, and explosion to life. Metal guitar riffs kick in when things heat up.

---

## The Ninja Skunk — At a Glance

| Stat | Value |
|------|-------|
| Health | 80 HP |
| Speed | 400 (fastest in class) |
| Jump Force | 700 (sky-high) |
| Attack Damage | 15 per hit |
| Special | **Shadow Strike** — invincible dash attack |

---

## Quick Start

**Just want to play?** Open the live link above — done.

**Want to run it locally?**

```bash
git clone https://github.com/AbelConsulting/Skunked-Way_of_the_Spray.git
cd Skunked-Way_of_the_Spray
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

---

## Controls

### Keyboard

| Action | Key |
|--------|-----|
| Move | ← → Arrow Keys or A / D |
| Jump | Space |
| Attack | X |
| Shadow Strike | Z |
| Pause | ESC |
| Start / Restart | Enter or Space |

### Touch (Mobile / Tablet / VR Laser)

Touch controls appear automatically on supported devices:

- **Left side** — directional arrows
- **Right side** — Jump, Attack, and Special buttons
- **Tap anywhere** on MENU / GAME OVER to start or restart

### Gamepad / VR Controllers

| Button | Action |
|--------|--------|
| Left Stick / Thumbstick | Move |
| A / Primary | Jump / Start Game |
| Trigger (Right) | Attack |
| B / Secondary | Special (Shadow Strike) |
| Left Bumper / Grip | Pause |
| Left Trigger / Right Grip | Skunk Shot |

---

## For Developers

<details>
<summary>Project structure, setup scripts, and deployment info</summary>

### Project Structure

```
SkunkFU/
├── index.html            # Entry point
├── js/                   # Game engine
│   ├── main.js           # Init & game loop
│   ├── game.js           # Core game controller
│   ├── player.js         # Player character
│   ├── enemy.js          # Enemy AI
│   ├── enemyManager.js   # Spawning & waves
│   ├── itemManager.js    # Power-ups & drops
│   ├── level.js          # Platforms & world
│   ├── levelData.js      # Stage configs
│   ├── ui.js             # HUD & menus
│   ├── spriteLoader.js   # Sprite sheets
│   ├── audioManager.js   # Sound system
│   ├── touchControls.js  # Mobile input
│   ├── visualEffects.js  # Particles & FX
│   ├── config.js         # Tuning constants
│   └── utils.js          # Helpers
├── assets/
│   ├── sprites/          # Characters, enemies, items, backgrounds
│   └── audio/            # SFX and music
├── tools/                # Dev & test utilities
├── toolshed/             # Sprite pipeline tools
└── python/               # Legacy Pygame version
```

### Useful npm Scripts

| Command | What it does |
|---------|-------------|
| `npm start` | Start local dev server with CSP headers |
| `npm run serve:py` | Start simple Python HTTP server |
| `npm run test:mobile-all` | Run full mobile Playwright test suite |
| `npm run check:sprite-frames` | Validate sprite sheet frame counts |
| `npm run fix:sprites` | Auto-pad sprite sheets |

### Asset Pipeline

- **Generate placeholder SFX**: `python generate_sounds.py`
- **Generate music**: `python generate_music.py`
- **Generate metal guitar layer**: `python generate_metal_sound.py`
- **Stitch sprite sheets**: `python sprite_stitcher.py ninja`
- **Test sprites**: `python toolshed/test_sprites.py`

Replace any generated asset by dropping your own `.wav` / `.png` files with matching names.

### Deployment

Works on any static host — GitHub Pages, Netlify, Vercel, S3 + CloudFront, or a basic web server. Just upload everything and point to `index.html`.

### Docker / CI

```Dockerfile
CMD ["node", "index.js"]
```

Or use `npm start` in your CI pipeline.

</details>

---

## Contributing

Found a bug? Have a feature idea? Want to add a new enemy or level? PRs welcome.

---

## Credits

- **Concept** — Skunk Squad
- **Engine** — HTML5 Canvas + vanilla JavaScript
- **Audio** — Procedural generation with custom asset support
- **VR Support** — WebXR Gamepad API bridge for Meta Quest

---

<p align="center">
  <strong>🦨 The spray is mightier than the sword. 🦨</strong><br>
  <em>Play free. Play anywhere. Play now.</em>
</p>
