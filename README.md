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

### Android Release Builds

The Android bundle is built from `android/app/build.gradle` with code shrinking and resource shrinking enabled for release builds.

Release signing must be configured before running `bundleRelease`. You can provide it either with `android/keystore.properties` or with these environment variables:

- `ANDROID_STORE_FILE`
- `ANDROID_STORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Then build the upload bundle from the `android/` directory:

```bash
./gradlew bundleRelease
```

If signing is missing, the release build now fails immediately instead of producing an unsigned `.aab`.

Before release uploads, verify that your upload keystore SHA1 matches Play Console:

```bash
npm run android:check-upload-key
```

This checks against the expected fingerprint from your Play reset notice:

- `F4:DB:65:73:65:1B:1F:8F:8D:3A:0F:DE:C1:3B:62:A8:D8:7D:45:E1`

If Play rotates again, you can override at runtime:

```bash
EXPECTED_UPLOAD_SHA1="AA:BB:CC:..." npm run android:check-upload-key
```

You can also run a guarded release build that includes the fingerprint preflight first:

```bash
npm run android:bundle:release
```

### Troubleshooting Android Purchases

The skins screen exposes purchase and restore controls, without billing diagnostics
or a redeem-code panel. For support, report the app version and the purchase error
message shown on screen.

Developers can still inspect `PurchaseManager.diagnose()` through WebView debugging
and call `PurchaseManager.refreshProducts()` to retry the catalogue fetch without
placing an order. Diagnostic state may contain purchase data; do not share raw
purchase tokens or receipts.

Build and sync with `npm run cap:sync` before preparing a new Android release,
then distribute it through a Google Play testing track. A successful automated
test does not validate live Play Console product availability or real-device checkout.

The persisted `cordova-plugin-purchase` patch also fixes Google Play setup
recovery: a failed setup retries the native bridge rather than returning its
cached, unresolved initialization promise. The original promise resolves when
that retry succeeds, allowing catalogue loading to continue. Setup errors remain
available through `PurchaseManager.diagnose()`.

Release resource shrinking must retain `@xml/config`: Cordova looks it up by name
to discover `InAppBillingPlugin`. The keep rule in
`android/app/src/main/res/raw/skunkfu_keep.xml` preserves this registration.
Without it, the JavaScript plugin can load while native initialization reports
`Init failed - Class not found`. Class keep rules alone do not retain XML resources.
The signed release command runs `android:check-billing-bundle` after Gradle to
inspect the actual AAB for both the registration and native plugin class.

### Laysie Skunk, Vampyr, and Malodor Premium Cosmetics

The existing `skins` purchase (and restored legacy `remove_ads` ownership) includes
Laysie Skunk, Vampyr, and Malodor alongside Sapphire and Amethyst. Existing buyers do not need another
purchase. Founder status alone unlocks Gold, not these character skins; the full Steam game includes
all skins. Choose **Laysie Skunk**, **Vampyr**, or **Malodor** in Settings or the pause-menu skin switcher, with skin
display enabled.
Together with Founder-exclusive Gold, there are six selectable skins.
Steel has been retired; saved Steel selections migrate to Sapphire.

Laysie Skunk retains the internal `ninja2` selection ID; Vampyr uses `ninja3`,
and the antagonist Malodor is playable as the cosmetic skin `ninja4`.
Each uses eight transparent, horizontal four-frame PNG sheets named
`ninja2_{idle,walk,jump,attack,skunk_shot,shadow_strike,hurt,death}.png`,
`ninja3_{idle,walk,jump,attack,skunk_shot,shadow_strike,hurt,death}.png`, or
`ninja4_{idle,walk,jump,attack,skunk_shot,shadow_strike,hurt,death}.png` in
`assets/sprites/characters/`. Each sheet uses square frames (currently 48, 64, or 128 pixels).
Rendering uses the original player's animation clock, including fitting the four
hurt frames into the original two-frame duration. Player size, collisions, attacks,
damage, and ability timing are unchanged. Turning skins off restores original artwork.
Run `npm run test:skins` for entitlement, frame bounds, persistence, and timing tests;
after `npm run cap:sync`, `npm run test:purchase-ui` also checks the bundled premium
preview, selection, and actual artwork rendering.
To test a fresh web build without syncing Android, run `npm run build`, then set
`TEST_WEB_ROOT=dist` when running `npm run test:purchase-ui`.

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
