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
- [ ] Add Ninja Skunk sprite animations
- [x] Implement Shadow Strike special ability
- [ ] Add sound effects and music
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

The game currently uses placeholder graphics. To add custom sprites:
- Check `assets/sprites/*/README.md` for sprite specifications
- Character sprites: 64x64 pixels
- Enemy sprites: 48x48 pixels
- PNG format with transparency

## License

This project is open source. See LICENSE file for details.

## Credits

**Development**: Built with Python and Pygame
**Characters**: Based on Skunk Squad

---

Have fun playing Skunk Fu! 🦨💥