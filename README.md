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

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Setup

1. Clone the repository:
```bash
git clone https://github.com/AbelConsulting/SkunkFU.git
cd SkunkFU
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the game:
```bash
cd src
python main.py
```

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

```
SkunkFU/
├── src/
│   ├── main.py              # Game entry point
│   ├── game.py              # Main game controller
│   ├── config.py            # Game configuration and constants
│   ├── player.py            # Player character class
│   ├── enemy.py             # Enemy character class
│   ├── enemy_manager.py     # Enemy spawning and management
│   ├── level.py             # Level and platform handling
│   └── ui.py                # User interface and HUD
├── assets/
│   ├── sprites/
│   │   ├── characters/      # Player character sprites
│   │   ├── enemies/         # Enemy sprites
│   │   └── backgrounds/     # Background and tile sprites
│   └── audio/
│       ├── music/           # Background music
│       └── sfx/             # Sound effects
├── requirements.txt         # Python dependencies
└── README.md               # This file
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

## License

This project is open source. See LICENSE file for details.

## Credits

**Development**: Built with Python and Pygame by MontanaDad

**Characters**: Based on Skunk Squad by MontanaDad

---

Have fun playing Skunk Fu! 🦨💥