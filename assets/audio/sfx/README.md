# Sound Effects

## Player SFX
- jump.wav
- attack1.wav, attack2.wav, attack3.wav
- shadow_strike.wav
- shadow_strike_hit.wav
- player_hit.wav
- land.wav
- footstep.wav
- combo.wav

## Enemy SFX
- enemy_attack.wav
- enemy_hurt.wav
- enemy_death.wav
- boss_spawn.wav
- boss_attack.wav
- boss_hurt.wav
- boss_defeat.wav
- boss2_spawn.wav
- boss2_attack.wav
- boss2_hurt.wav
- boss2_defeat.wav

## UI SFX
- ui_hover.wav
- menu_select.wav
- menu_move.wav
- ui_confirm.wav
- ui_back.wav
- pause.wav
- level_complete.wav
- game_over.wav
- victory.wav
- powerup.wav
- coin_collect.wav
- metal_pad.wav
- item_pickup.wav
- combo_level_up.wav
- parry_success.wav

## Format
- WAV or OGG
- Short duration (< 2 seconds)
- 44.1kHz sample rate recommended

## Warm menu button sounds

The menu cues use soft, fixed-pitch chimes with short attacks and releases,
without pitch sweeps or drones:

- `ui_hover`: a single E5 chime, 80 ms.
- `menu_move`: a single C5 chime, 75 ms.
- `menu_select`: C5-E5, 160 ms.
- `ui_confirm`: E5-G5, 180 ms.
- `ui_back`: E5-C5, 160 ms.

Each cue also has a 30 ms silent tail to protect its release when short
Vorbis clips are decoded. These five cues are mono at 22.05 kHz, with peaks
below 0.22. They are shared
by the main menu, pause menu, and other UI that uses these sound names.
Combat sounds, environmental ambience, and outcome jingles are unchanged.

From the repository root:

```powershell
python generate_audio_assets.py --menu-only
foreach ($name in 'ui_hover', 'menu_move', 'menu_select', 'ui_confirm', 'ui_back') {
    ffmpeg -y -i "assets\audio\sfx\$name.wav" -c:a libvorbis -q:a 4 "assets\audio\sfx\$name.ogg"
    if ($LASTEXITCODE -ne 0) { throw "Failed to convert $name" }
}
```

This also writes the flute menu music WAV. Convert it as described in the
[music documentation](../music/README.md); keep both WAV and OGG exports
up to date because the game prefers OGG.
