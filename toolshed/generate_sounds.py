"""
Generate Placeholder Sound Effects
Creates simple procedural sounds for the game using pygame's mixer
"""
import pygame
import numpy as np
import os

# Initialize pygame mixer
pygame.mixer.init(frequency=22050, size=-16, channels=1, buffer=512)

def generate_tone(frequency, duration, sample_rate=22050, volume=0.3):
    """Generate a simple sine wave tone"""
    num_samples = int(duration * sample_rate)
    t = np.linspace(0, duration, num_samples, False)
    
    # Create sine wave
    wave = np.sin(frequency * 2 * np.pi * t)
    
    # Apply envelope (fade in/out to avoid clicks)
    envelope = np.ones(num_samples)
    fade_samples = int(0.01 * sample_rate)  # 10ms fade
    envelope[:fade_samples] = np.linspace(0, 1, fade_samples)
    envelope[-fade_samples:] = np.linspace(1, 0, fade_samples)
    
    wave = wave * envelope * volume
    
    # Convert to 16-bit integer
    wave = (wave * 32767).astype(np.int16)
    
    return wave

def generate_sweep(start_freq, end_freq, duration, sample_rate=22050, volume=0.3):
    """Generate a frequency sweep"""
    num_samples = int(duration * sample_rate)
    t = np.linspace(0, duration, num_samples, False)
    
    # Linear frequency sweep
    freq = np.linspace(start_freq, end_freq, num_samples)
    phase = 2 * np.pi * np.cumsum(freq) / sample_rate
    wave = np.sin(phase)
    
    # Apply envelope
    envelope = np.ones(num_samples)
    fade_samples = int(0.01 * sample_rate)
    envelope[:fade_samples] = np.linspace(0, 1, fade_samples)
    envelope[-fade_samples:] = np.linspace(1, 0, fade_samples)
    
    wave = wave * envelope * volume
    wave = (wave * 32767).astype(np.int16)
    
    return wave

def generate_noise(duration, sample_rate=22050, volume=0.2):
    """Generate white noise"""
    num_samples = int(duration * sample_rate)
    wave = np.random.uniform(-1, 1, num_samples)
    
    # Apply envelope
    envelope = np.ones(num_samples)
    fade_samples = int(0.005 * sample_rate)
    envelope[:fade_samples] = np.linspace(0, 1, fade_samples)
    envelope[-fade_samples:] = np.linspace(1, 0, fade_samples)
    
    wave = wave * envelope * volume
    wave = (wave * 32767).astype(np.int16)
    
    return wave

def save_sound(wave, filename, sample_rate=22050):
    """Save wave data as a WAV file"""
    # Create stereo from mono
    stereo_wave = np.column_stack((wave, wave))
    
    # Create pygame Sound and save
    sound = pygame.sndarray.make_sound(stereo_wave)
    
    filepath = os.path.join('assets', 'audio', 'sfx', filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    # Save using pygame
    pygame.mixer.Sound.play(sound)  # Brief play to initialize
    pygame.time.wait(10)
    
    # Use numpy to save as WAV
    from scipy.io import wavfile
    wavfile.write(filepath, sample_rate, stereo_wave)
    
    print(f"✓ Generated: {filename}")

def create_all_sounds():
    """Generate all game sound effects"""
    
    print("🔊 Generating placeholder sound effects...\n")
    
    # Jump sound - rising tone
    jump = generate_sweep(200, 400, 0.15, volume=0.25)
    save_sound(jump, 'jump.wav')
    
    # Attack sounds - short percussive hits with different pitches
    attack1 = generate_sweep(300, 150, 0.08, volume=0.3)
    save_sound(attack1, 'attack1.wav')
    
    attack2 = generate_sweep(350, 170, 0.08, volume=0.32)
    save_sound(attack2, 'attack2.wav')
    
    attack3 = generate_sweep(400, 200, 0.1, volume=0.35)
    save_sound(attack3, 'attack3.wav')
    
    # Shadow Strike - whoosh sound (noise with sweep)
    whoosh_noise = generate_noise(0.25, volume=0.15)
    whoosh_tone = generate_sweep(600, 200, 0.25, volume=0.2)
    shadow_strike = whoosh_noise + whoosh_tone
    save_sound(shadow_strike, 'shadow_strike.wav')
    
    # Player hit - descending tone
    player_hit = generate_sweep(400, 200, 0.2, volume=0.25)
    save_sound(player_hit, 'player_hit.wav')
    
    # Land sound - thump
    land = generate_tone(100, 0.08, volume=0.2)
    save_sound(land, 'land.wav')
    
    # Enemy hit - sharp impact
    enemy_hit = generate_sweep(250, 100, 0.1, volume=0.3)
    save_sound(enemy_hit, 'enemy_hit.wav')
    
    # Enemy death - descending sweep
    enemy_death = generate_sweep(300, 80, 0.3, volume=0.25)
    save_sound(enemy_death, 'enemy_death.wav')
    
    # Menu select - pleasant beep
    menu_select = generate_tone(440, 0.08, volume=0.25)
    save_sound(menu_select, 'menu_select.wav')
    
    # Menu move - subtle beep
    menu_move = generate_tone(330, 0.05, volume=0.2)
    save_sound(menu_move, 'menu_move.wav')
    
    # Pause - two-tone
    pause_tone1 = generate_tone(440, 0.08, volume=0.2)
    pause_tone2 = generate_tone(330, 0.08, volume=0.2)
    pause = np.concatenate([pause_tone1, pause_tone2])
    save_sound(pause, 'pause.wav')
    
    # Combo - rising celebratory tone
    combo = generate_sweep(440, 880, 0.15, volume=0.3)
    save_sound(combo, 'combo.wav')
    
    # Game over - descending sad tone
    game_over = generate_sweep(440, 220, 0.5, volume=0.25)
    save_sound(game_over, 'game_over.wav')
    
    # Boss spawn - ominous rising tone
    boss_spawn = generate_sweep(100, 300, 0.8, volume=0.4)
    save_sound(boss_spawn, 'boss_spawn.wav')
    
    # Boss defeat - triumphant rising chord
    boss_defeat1 = generate_tone(440, 0.2, volume=0.3)
    boss_defeat2 = generate_tone(550, 0.2, volume=0.3)
    boss_defeat3 = generate_tone(660, 0.2, volume=0.3)
    boss_defeat = np.concatenate([boss_defeat1, boss_defeat2, boss_defeat3])
    save_sound(boss_defeat, 'boss_defeat.wav')
    
    # Boss attack - heavy impact
    boss_attack = generate_sweep(150, 80, 0.15, volume=0.4)
    save_sound(boss_attack, 'boss_attack.wav')
    
    # Boss hurt - deep rumble
    boss_hurt = generate_tone(80, 0.25, volume=0.35)
    save_sound(boss_hurt, 'boss_hurt.wav')
    
    # Level complete - celebratory fanfare
    level_complete1 = generate_tone(523, 0.1, volume=0.3)  # C
    level_complete2 = generate_tone(659, 0.1, volume=0.3)  # E
    level_complete3 = generate_tone(784, 0.1, volume=0.3)  # G
    level_complete = np.concatenate([level_complete1, level_complete2, level_complete3])
    save_sound(level_complete, 'level_complete.wav')
    
    # Powerup - magical rising tone
    powerup = generate_sweep(300, 600, 0.3, volume=0.25)
    save_sound(powerup, 'powerup.wav')
    
    # Coin collect - pleasant chime
    coin_collect = generate_tone(800, 0.08, volume=0.2)
    save_sound(coin_collect, 'coin_collect.wav')
    
    # Footstep - subtle tap
    footstep = generate_tone(200, 0.04, volume=0.15)
    save_sound(footstep, 'footstep.wav')
    
    print("\n🎮 Generating additional gameplay sounds...")
    
    # Skunk spray/shot - hissing spray sound
    spray_noise = generate_noise(0.3, volume=0.18)
    spray_sweep = generate_sweep(800, 400, 0.3, volume=0.12)
    skunk_spray = spray_noise + spray_sweep
    save_sound(skunk_spray, 'skunk_spray.wav')
    
    # Dash - quick whoosh
    dash = generate_sweep(500, 250, 0.15, volume=0.22)
    save_sound(dash, 'dash.wav')
    
    # Double jump - higher pitched jump
    double_jump = generate_sweep(350, 600, 0.12, volume=0.23)
    save_sound(double_jump, 'double_jump.wav')
    
    # Shield block - metallic clang
    block_tone1 = generate_tone(1200, 0.05, volume=0.28)
    block_tone2 = generate_tone(900, 0.05, volume=0.25)
    shield_block = np.concatenate([block_tone1, block_tone2])
    save_sound(shield_block, 'shield_block.wav')
    
    # Health restore - pleasant healing chime
    heal_tone1 = generate_tone(523, 0.08, volume=0.25)  # C
    heal_tone2 = generate_tone(659, 0.08, volume=0.25)  # E
    heal_tone3 = generate_tone(784, 0.12, volume=0.25)  # G
    health_restore = np.concatenate([heal_tone1, heal_tone2, heal_tone3])
    save_sound(health_restore, 'health_restore.wav')
    
    # Achievement unlock - triumphant fanfare
    achievement1 = generate_tone(440, 0.08, volume=0.28)  # A
    achievement2 = generate_tone(554, 0.08, volume=0.28)  # C#
    achievement3 = generate_tone(659, 0.08, volume=0.28)  # E
    achievement4 = generate_tone(880, 0.15, volume=0.30)  # A (octave)
    achievement = np.concatenate([achievement1, achievement2, achievement3, achievement4])
    save_sound(achievement, 'achievement_unlock.wav')
    
    # Combo break - descending disappointed notes
    combo_break1 = generate_tone(440, 0.08, volume=0.22)
    combo_break2 = generate_tone(330, 0.12, volume=0.20)
    combo_break = np.concatenate([combo_break1, combo_break2])
    save_sound(combo_break, 'combo_break.wav')
    
    # Enemy spawn - aggressive growl
    enemy_spawn = generate_sweep(150, 250, 0.2, volume=0.25)
    save_sound(enemy_spawn, 'enemy_spawn.wav')
    
    # Teleport - sci-fi warble
    teleport_up = generate_sweep(300, 800, 0.15, volume=0.20)
    teleport_down = generate_sweep(800, 300, 0.15, volume=0.18)
    teleport = np.concatenate([teleport_up, teleport_down])
    save_sound(teleport, 'teleport.wav')
    
    # Speed boost pickup - energetic fast sweep
    speed_boost = generate_sweep(400, 1200, 0.2, volume=0.25)
    save_sound(speed_boost, 'speed_boost.wav')
    
    # Damage boost pickup - powerful lower tone
    damage_boost = generate_sweep(200, 600, 0.25, volume=0.28)
    save_sound(damage_boost, 'damage_boost.wav')
    
    # Warning alert - urgent beeping
    warning_beep1 = generate_tone(880, 0.1, volume=0.25)
    warning_beep2 = generate_tone(880, 0.1, volume=0.25)
    warning_silence = np.zeros(int(0.05 * 22050), dtype=np.int16)
    warning = np.concatenate([warning_beep1, warning_silence, warning_beep2])
    save_sound(warning, 'warning_alert.wav')
    
    # Critical hit - powerful impact
    critical_hit = generate_sweep(600, 200, 0.12, volume=0.35)
    save_sound(critical_hit, 'critical_hit.wav')
    
    # Wall hit/bounce - thud
    wall_bounce = generate_tone(120, 0.08, volume=0.22)
    save_sound(wall_bounce, 'wall_bounce.wav')
    
    print("\n✅ All sound effects generated successfully!")
    print(f"📁 Saved to: assets/audio/sfx/")
    print(f"📊 Total: {34} sound effects created")

if __name__ == "__main__":
    try:
        import scipy.io.wavfile
        create_all_sounds()
    except ImportError:
        print("⚠️  scipy not installed. Installing...")
        import subprocess
        subprocess.check_call(['pip', 'install', 'scipy', 'numpy'])
        print("\n✓ Dependencies installed. Run this script again.")
