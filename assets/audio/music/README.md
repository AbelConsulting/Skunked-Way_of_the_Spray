# Music Assets

## Game Music

- menu_theme.ogg (Main menu music)
- level1_theme.ogg (Forest/outdoor level)
- level2_theme.ogg (City level)
- boss_theme.ogg (Boss battle)
- victory_theme.ogg (Level complete)
- game_over.ogg (Game over screen)
- gameplay.wav (Default gameplay loop)
- ambient_cave_loop.wav (Level 4 ambience loop)

## Format
- OGG or MP3
- Loopable tracks
- Recommended: 2-3 minute loops

## Gameplay arrangement

`gameplay.wav` and `gameplay.ogg` contain a 64-second, 32-bar loop at
120 BPM. The original lead melody (notes, rhythm, and synth tone) and
Am-F-C-G progression are retained. The guitar accompaniment stays in place,
with a lighter mix to make room for warm string-like synth pads, plucked
arpeggios, a rhythmic bass part, and varied drums with eight-bar fills.

| Time | Arrangement |
| --- | --- |
| 0-16 s | Guitar-led groove with bass and drums |
| 16-32 s | Warm pads enter underneath the melody |
| 32-48 s | Offbeat plucked arpeggios add movement |
| 48-56 s | Quieter guitar, pads, sparse bass, and half-time drums |
| 56-64 s | Full accompaniment returns and leads back into the opening |

Only the main gameplay track has this arrangement; the other themes and
environmental ambience are unchanged.

From the repository root, using Python with NumPy and SciPy installed:

```powershell
python toolshed\generate_music.py --gameplay-only
ffmpeg -y -i assets\audio\music\gameplay.wav -c:a libvorbis -q:a 5 assets\audio\music\gameplay.ogg
python -m unittest toolshed.test_generate_music
```

The generator writes WAV; the separate FFmpeg command updates the OGG
preferred by the game. Keep both formats together. The fixed percussion seed
makes repeated renders reproducible. Running the generator without
`--gameplay-only` also regenerates the other five legacy level themes.

## Flute menu variation

`menu_theme.wav` and `menu_theme.ogg` use the gameplay melody on a gentle
synthesized flute at 96 BPM, with soft plucked chords instead of the former
low drone and wavering pads. The 40-second, 16-bar loop preserves the melody's
pitch sequence, with subtle changes in articulation and additional arpeggios
in the middle two phrases. The mix targets 0.11 RMS with a 0.55 peak ceiling.

Generate just the menu music and its five warmer button sounds (NumPy and
SciPy required), then convert the menu music to the game's preferred format:

```powershell
python generate_audio_assets.py --menu-only
ffmpeg -y -i assets\audio\music\menu_theme.wav -c:a libvorbis -q:a 5 assets\audio\music\menu_theme.ogg
```

Also convert the five button WAVs to OGG as described in the
[sound effects documentation](../sfx/README.md). The existing menu music
asset name is unchanged, so no playback routing changes are needed.
