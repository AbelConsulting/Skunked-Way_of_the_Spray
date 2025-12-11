# Audio System Guide

## Overview

SkunkFU includes a complete audio system with sound effects and background music. The game comes with procedurally generated placeholder sounds that you can replace with your own audio files.

## Quick Start

### Generate Placeholder Audio

```bash
# Generate all sound effects (14 files)
python generate_sounds.py

# Generate background music
python generate_music.py
```

This creates:
- **Sound Effects**: `assets/audio/sfx/*.wav` (14 files)
- **Music**: `assets/audio/music/gameplay.wav`

## Sound Effects List

### Player Sounds
| Sound | Trigger | File |
|-------|---------|------|
| Jump | Player presses spacebar | `jump.wav` |
| Attack 1 | First hit in combo | `attack1.wav` |
| Attack 2 | Second hit in combo | `attack2.wav` |
| Attack 3 | Third hit in combo | `attack3.wav` |
| Shadow Strike | Z key pressed (special ability) | `shadow_strike.wav` |
| Player Hit | Enemy damages player | `player_hit.wav` |
| Land | Player lands from significant height | `land.wav` |
| Combo | 3-hit combo completed | `combo.wav` |

### Enemy Sounds
| Sound | Trigger | File |
|-------|---------|------|
| Enemy Hit | Player damages enemy | `enemy_hit.wav` |
| Enemy Death | Enemy health reaches 0 | `enemy_death.wav` |

### UI Sounds
| Sound | Trigger | File |
|-------|---------|------|
| Menu Select | Enter pressed on menu | `menu_select.wav` |
| Menu Move | Arrow keys in menu | `menu_move.wav` |
| Pause | ESC pressed during gameplay | `pause.wav` |
| Game Over | Player loses all lives | `game_over.wav` |

## Background Music

| Track | Loop | File |
|-------|------|------|
| Gameplay | Infinite | `gameplay.wav` / `gameplay.ogg` |

**Format Support**: `.ogg`, `.wav`, `.mp3` (OGG recommended for file size)

## Customizing Audio

### Replace Sound Effects

1. Create or find your sound effect (WAV format recommended)
2. Name it to match one from the list above (e.g., `jump.wav`)
3. Place in `assets/audio/sfx/`
4. Sound will automatically play in-game!

### Replace Music

1. Create or find background music
2. Save as `gameplay.ogg` (or `.wav`, `.mp3`)
3. Place in `assets/audio/music/`
4. Music will play when game starts!

### Add New Sounds

To add a new sound effect:

1. **Place the file** in `assets/audio/sfx/`

2. **Update `audio_manager.py`**:
   ```python
   sound_files = {
       # ... existing sounds ...
       'new_sound': 'new_sound.wav',  # Add your sound here
   }
   ```

3. **Play it in code**:
   ```python
   if self.audio_manager:
       self.audio_manager.play_sound('new_sound', volume=0.7)
   ```

## Volume Control

The `AudioManager` class handles volume:

```python
# Adjust sound effects volume (0.0 to 1.0)
audio_manager.set_sfx_volume(0.5)

# Adjust music volume (0.0 to 1.0)
audio_manager.set_music_volume(0.3)

# Play sound with custom volume
audio_manager.play_sound('jump', volume=0.8)
```

Default volumes:
- **SFX**: 0.7 (70%)
- **Music**: 0.5 (50%)

## Music Controls

```python
# Play music (infinite loop)
audio_manager.play_music('gameplay', loop=-1)

# Stop music
audio_manager.stop_music()

# Pause music
audio_manager.pause_music()

# Resume music
audio_manager.unpause_music()
```

## Free Audio Resources

### Sound Effects
- **[Freesound.org](https://freesound.org)** - Massive library of free sounds
- **[OpenGameArt.org](https://opengameart.org)** - Game-specific audio
- **[SFXR](http://www.drpetter.se/project_sfxr.html)** - Retro sound generator
- **[ChipTone](https://sfbgames.itch.io/chiptone)** - 8-bit sound maker

### Music
- **[Incompetech.com](https://incompetech.com)** - Royalty-free music by Kevin MacLeod
- **[OpenGameArt.org](https://opengameart.org)** - Free game music
- **[FreePD.com](https://freepd.com)** - Public domain music
- **[LMMS](https://lmms.io)** - Free music production software

### Licenses to Look For
- ✅ **CC0 (Public Domain)** - Use freely, no attribution required
- ✅ **CC-BY** - Use freely, just credit the creator
- ✅ **CC-BY-SA** - Use freely, credit creator, share improvements
- ⚠️ **CC-BY-NC** - Free for non-commercial use only

## Technical Details

### Audio Manager (`src/audio_manager.py`)

The `AudioManager` class handles:
- Loading sound effects into memory
- Playing sounds with volume control
- Music playback and looping
- Pause/resume functionality
- Resource cleanup

### Sound Generation

The placeholder sounds use:
- **Numpy** - Wave generation and synthesis
- **Scipy** - WAV file writing
- **Pygame.mixer** - Audio playback

Techniques used:
- **Sine waves** - Pure tones
- **Frequency sweeps** - Rising/falling pitches
- **White noise** - Whoosh effects
- **ADSR envelopes** - Natural attack/decay
- **Harmonics** - Richer musical tones

### Music Generation

The gameplay music features:
- **Chord progression**: Am - F - C - G
- **BPM**: 140 (energetic tempo)
- **Instruments**: Bass, melody, drums
- **Duration**: 60 seconds (loops seamlessly)

## Performance Tips

1. **Use OGG for music** - Smaller file size than WAV
2. **Keep SFX short** - Under 2 seconds for responsiveness
3. **Preload sounds** - AudioManager loads all sounds at startup
4. **Limit simultaneous sounds** - Pygame mixer has channel limits
5. **Adjust buffer size** - In `audio_manager.py` init: `buffer=512`

## Troubleshooting

### No Sound Playing

1. Check volume isn't muted
2. Verify files exist: `python test_sprites.py` (also checks audio)
3. Check console for "✓ Loaded sound:" messages
4. Ensure pygame.mixer initialized: Look for errors on startup

### Choppy/Laggy Audio

1. Increase buffer size in `audio_manager.py`: `buffer=1024`
2. Reduce audio file sizes
3. Lower sample rate (edit generators: `sample_rate=22050`)

### Sound Plays Multiple Times

This is normal! Sounds like `attack.wav` can overlap when pressing buttons rapidly. To prevent:

```python
# In AudioManager.play_sound(), stop previous instance:
if sound_name in self.sounds and self.sounds[sound_name] is not None:
    self.sounds[sound_name].stop()  # Add this line
    sound = self.sounds[sound_name]
    sound.play()
```

## What's Next?

Current audio features are complete! Optional enhancements:

1. **Menu music** - Separate track for main menu
2. **Boss music** - Intense track for boss battles
3. **Ambient sounds** - Wind, environmental effects
4. **Voice lines** - Character grunts, catchphrases
5. **Dynamic music** - Tempo changes based on action
6. **Audio mixing** - Ducking music during important sounds

---

**Ready to play?** Run the game and enjoy the audio! 🔊🎵

```bash
cd src
python main.py
```
