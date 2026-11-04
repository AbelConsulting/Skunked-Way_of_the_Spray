# Music Assets

## Game Music

- menu_theme.ogg (Main menu music)
- forest_theme.ogg (Forest)
- city_theme.ogg (City)
- dojo_theme.ogg (Mountain Dojo)
- crystal_theme.ogg (Crystal Caverns)
- depths_theme.ogg (Cavern Depths and Abyss)
- ridge_theme.ogg (Crystal Ridge)
- action_theme.ogg (Neon Crossroads and Nexus)
- boss_theme.ogg (Boss battle)
- victory_theme.ogg (Level complete)
- game_over.ogg (Game over screen)
- gameplay.wav (Default gameplay loop)

Each active theme has both WAV and OGG exports. Environmental ambience is no
longer loaded or played in campaign or survival, including cave ambience
previously selected as music. Legacy ambient assets and AudioManager helpers
remain available but are unused by gameplay.

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

The default gameplay track is retained unchanged. Level themes build on this
arrangement with distinct synthesized instruments:

| Levels | Added instruments | BPM |
| --- | --- | --- |
| Forest | Flute and marimba | 110 |
| City | Electric piano and brass | 135 |
| Dojo | Plucked strings and flute | 116 |
| Crystal Caverns | Bells and pizzicato strings | 108 |
| Depths / Abyss | Pizzicato strings and marimba | 104 |
| Crystal Ridge | Flute and bells | 118 |
| Neon Crossroads / Nexus | Electric piano and plucked strings | 145 |
| Final levels / boss encounters | Brass and pizzicato strings | 130 |

Campaign levels use their assigned theme instead of randomly falling back to
shared tracks. Survival retains its city/action/gameplay selection. Boss music
plays at its composed tempo rather than speeding up the old battle loop.
Each level theme is a complete 32-bar loop with alternating instrumental
responses, a quieter breakdown, a fuller final build, a 0.70 peak ceiling,
and a maximum 0.16 RMS. Menu music and gameplay sound effects are unchanged.

From the repository root, using Python with NumPy and SciPy installed:

```powershell
python toolshed\generate_music.py --gameplay-only
ffmpeg -y -i assets\audio\music\gameplay.wav -c:a libvorbis -q:a 5 assets\audio\music\gameplay.ogg
python -m unittest toolshed.test_generate_music
```

Render the eight level themes without changing menu/default gameplay audio:

```powershell
python toolshed\generate_music.py --levels-only
if ($LASTEXITCODE -ne 0) { throw 'Level music render failed' }
$themes = 'forest_theme', 'city_theme', 'dojo_theme', 'crystal_theme', 'depths_theme', 'ridge_theme', 'action_theme', 'boss_theme'
foreach ($theme in $themes) {
    ffmpeg -y -i "assets\audio\music\$theme.wav" -c:a libvorbis -q:a 5 "assets\audio\music\$theme.ogg"
    if ($LASTEXITCODE -ne 0) { throw "OGG conversion failed: $theme" }
}
```

The generator writes WAV; FFmpeg updates the OGG preferred by the game. Keep
both formats together. Fixed seeds make repeated renders reproducible.
Running without either selection flag regenerates gameplay and all eight
level themes, but not legacy ambience.

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

## Runtime audio checks

Run `npm run test:audio` from the repository root to check volume settings,
music transition cancellation, pause/background handling, SFX voice limits,
level soundtrack routing in Web Audio and HTML audio fallback modes.

- Main-menu and pause-menu sliders use the same volume setters and saved
  preferences.
- Impact ducking reduces music to 40% of the selected volume, never raises it,
  and does not interrupt a music fade.
- Web Audio music uses sequential fades through its shared music bus.
  The HTML fallback crossfades element volumes. Stopping either path cancels
  queued playback and cleans up outgoing tracks.
- SFX voices are released on playback completion, including rate/detune changes.
- Legacy ambient helper tests verify reuse of cached elements and in-flight requests. Failed loads can
  be retried; replaying a cached element cancels any pending stop.
- The legacy metal-pad asset is retained but no longer decoded at startup.
