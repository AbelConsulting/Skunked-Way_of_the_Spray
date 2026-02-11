"""
Generate audio assets for the game:
1. Menu background music (calm, slower tempo)
2. Boss battle music (intense, faster tempo)
3. Ambient environmental sounds (forest, cave, city loops)
4. UI hover sound effect
"""

import struct
import math
import random
import os
import wave

SAMPLE_RATE = 22050
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'assets', 'audio')

def write_wav(filename, samples, sample_rate=SAMPLE_RATE):
    """Write a list of float samples [-1,1] to a 16-bit WAV file."""
    import array
    path = os.path.join(OUTPUT_DIR, filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        int_samples = array.array('h', (int(max(-1.0, min(1.0, s)) * 32767) for s in samples))
        wf.writeframes(int_samples.tobytes())
    print(f"  Written: {path} ({len(samples)} samples, {len(samples)/sample_rate:.1f}s)")


def sine(freq, t):
    return math.sin(2 * math.pi * freq * t)

def square(freq, t):
    return 1.0 if (t * freq) % 1.0 < 0.5 else -1.0

def saw(freq, t):
    return 2.0 * ((t * freq) % 1.0) - 1.0

def triangle(freq, t):
    p = (t * freq) % 1.0
    return 4.0 * abs(p - 0.5) - 1.0

def noise():
    return random.uniform(-1, 1)

def envelope_adsr(t, attack=0.01, decay=0.1, sustain=0.7, release=0.2, duration=1.0):
    """Simple ADSR envelope."""
    if t < attack:
        return t / attack
    elif t < attack + decay:
        return 1.0 - (1.0 - sustain) * ((t - attack) / decay)
    elif t < duration - release:
        return sustain
    elif t < duration:
        return sustain * (1.0 - (t - (duration - release)) / release)
    return 0.0

def lowpass(samples, cutoff_freq, sample_rate=SAMPLE_RATE):
    """Simple 1-pole lowpass filter."""
    rc = 1.0 / (2.0 * math.pi * cutoff_freq)
    dt = 1.0 / sample_rate
    alpha = dt / (rc + dt)
    filtered = [0.0] * len(samples)
    filtered[0] = samples[0] * alpha
    for i in range(1, len(samples)):
        filtered[i] = filtered[i-1] + alpha * (samples[i] - filtered[i-1])
    return filtered


# ──────────────────────────────────────────────────────────────────
# 1. Menu Background Music — calm, ambient, mysterious
# ──────────────────────────────────────────────────────────────────
def generate_menu_music():
    print("Generating menu music...")
    duration = 32.0  # 32-second loop
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    
    # Slow pad chords (pulsing synth pads)
    # Dm - Am - Bb - F progression, each chord 8 seconds
    chords = [
        [146.83, 174.61, 220.00],  # D3, F3, A3 (Dm)
        [130.81, 164.81, 220.00],  # C3, E3, A3 (Am)
        [146.83, 174.61, 233.08],  # D3, F3, Bb3 (Bb)
        [130.81, 164.81, 196.00],  # C3, E3, G3 (F)
    ]
    
    chord_duration = 8.0
    for ci, chord in enumerate(chords):
        start_sample = int(ci * chord_duration * SAMPLE_RATE)
        end_sample = int((ci + 1) * chord_duration * SAMPLE_RATE)
        for i in range(start_sample, min(end_sample, num_samples)):
            t = i / SAMPLE_RATE
            local_t = t - ci * chord_duration
            # Slow LFO for tremolo
            lfo = 0.5 + 0.5 * sine(0.3, t)
            # Fade in/out for each chord
            env = 1.0
            if local_t < 1.0:
                env = local_t
            elif local_t > chord_duration - 1.5:
                env = (chord_duration - local_t) / 1.5
            env = max(0, min(1, env))
            
            val = 0.0
            for freq in chord:
                # Detuned sine pairs for width
                val += sine(freq, t) * 0.12
                val += sine(freq * 1.003, t) * 0.10
                val += triangle(freq * 0.5, t) * 0.06
            val *= env * lfo * 0.6
            samples[i] += val
    
    # Subtle high arpeggiated melody
    melody_notes = [
        440, 523.25, 587.33, 523.25,  # A4, C5, D5, C5
        440, 392, 349.23, 392,         # A4, G4, F4, G4
        466.16, 523.25, 587.33, 698.46,# Bb4, C5, D5, F5
        523.25, 440, 392, 349.23       # C5, A4, G4, F4
    ]
    note_dur = 2.0  # Each note 2 seconds
    for ni, freq in enumerate(melody_notes):
        start_sample = int(ni * note_dur * SAMPLE_RATE)
        end_sample = int((ni + 1) * note_dur * SAMPLE_RATE)
        for i in range(start_sample, min(end_sample, num_samples)):
            t = i / SAMPLE_RATE
            local_t = t - ni * note_dur
            env = envelope_adsr(local_t, attack=0.3, decay=0.5, sustain=0.3, release=0.8, duration=note_dur)
            val = sine(freq, t) * 0.08 + sine(freq * 2, t) * 0.03
            # Gentle vibrato
            vib = sine(5.0, t) * 2.0
            val = sine(freq + vib, t) * 0.08
            samples[i] += val * env
    
    # Sub bass drone
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        chord_idx = int(t / chord_duration) % 4
        bass_freq = [73.42, 65.41, 73.42, 65.41][chord_idx]  # D2, C2
        env = 0.5 + 0.5 * sine(0.15, t)
        samples[i] += sine(bass_freq, t) * 0.12 * env
    
    # Apply lowpass for warmth
    samples = lowpass(samples, 3500)
    
    # Normalize
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.7 for s in samples]
    
    write_wav('music/menu_theme.wav', samples)


# ──────────────────────────────────────────────────────────────────
# 2. Boss Battle Music — intense, driving, fast
# ──────────────────────────────────────────────────────────────────
def generate_boss_music():
    print("Generating boss battle music...")
    duration = 24.0  # 24-second loop
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    bpm = 160
    beat_dur = 60.0 / bpm
    
    # Driving bass line - E minor pentatonic aggression
    bass_pattern = [
        82.41, 82.41, 98.00, 82.41,  # E2, E2, G2, E2
        110.0, 98.00, 82.41, 73.42,  # A2, G2, E2, D2
        82.41, 82.41, 98.00, 110.0,  # E2, E2, G2, A2
        123.47, 110.0, 98.00, 82.41, # B2, A2, G2, E2
    ]
    
    for bi in range(int(duration / beat_dur)):
        freq = bass_pattern[bi % len(bass_pattern)]
        start = int(bi * beat_dur * SAMPLE_RATE)
        note_len = int(beat_dur * 0.85 * SAMPLE_RATE)
        for j in range(note_len):
            if start + j >= num_samples:
                break
            t = j / SAMPLE_RATE
            env = envelope_adsr(t, attack=0.005, decay=0.08, sustain=0.6, release=0.05, duration=beat_dur * 0.85)
            # Distorted bass with harmonics
            val = saw(freq, t + bi * beat_dur) * 0.4
            val += square(freq, t + bi * beat_dur) * 0.2
            val = max(-0.6, min(0.6, val * 1.8))  # Soft clip for grit
            samples[start + j] += val * env * 0.35
    
    # Kick drum on every beat
    for bi in range(int(duration / beat_dur)):
        start = int(bi * beat_dur * SAMPLE_RATE)
        kick_dur = int(0.15 * SAMPLE_RATE)
        for j in range(kick_dur):
            if start + j >= num_samples:
                break
            t = j / SAMPLE_RATE
            # Pitch sweep from 150Hz down to 50Hz
            freq = 150 - (100 * t / 0.15)
            env = math.exp(-t * 25)
            samples[start + j] += sine(max(40, freq), t) * env * 0.5
    
    # Snare / hi-hat on off-beats
    for bi in range(int(duration / (beat_dur * 0.5))):
        if bi % 2 == 1:  # Off-beat snare
            start = int(bi * beat_dur * 0.5 * SAMPLE_RATE)
            snare_dur = int(0.12 * SAMPLE_RATE)
            for j in range(snare_dur):
                if start + j >= num_samples:
                    break
                t = j / SAMPLE_RATE
                env = math.exp(-t * 30)
                # Noise burst + tone
                val = noise() * 0.3 + sine(200, t) * 0.15
                samples[start + j] += val * env * 0.4
        # Hi-hat on every 8th note
        start = int(bi * beat_dur * 0.5 * SAMPLE_RATE)
        hh_dur = int(0.04 * SAMPLE_RATE)
        for j in range(hh_dur):
            if start + j >= num_samples:
                break
            t = j / SAMPLE_RATE
            env = math.exp(-t * 80)
            samples[start + j] += noise() * env * 0.12
    
    # Power chord stabs (distorted guitar-like)
    # Every 4 beats, hit a power chord
    power_chords = [
        [164.81, 246.94],  # E3+B3
        [146.83, 220.00],  # D3+A3
        [130.81, 196.00],  # C3+G3
        [146.83, 220.00],  # D3+A3
    ]
    for ci in range(int(duration / (beat_dur * 4))):
        chord = power_chords[ci % len(power_chords)]
        start = int(ci * beat_dur * 4 * SAMPLE_RATE)
        chord_len = int(beat_dur * 3.5 * SAMPLE_RATE)
        for j in range(chord_len):
            if start + j >= num_samples:
                break
            t = j / SAMPLE_RATE
            env = envelope_adsr(t, attack=0.01, decay=0.15, sustain=0.5, release=0.3, duration=beat_dur * 3.5)
            val = 0.0
            for freq in chord:
                val += saw(freq, t + ci * beat_dur * 4) * 0.15
                val += square(freq * 1.001, t + ci * beat_dur * 4) * 0.10
                val += saw(freq * 2.0, t + ci * beat_dur * 4) * 0.08
            # Distortion
            val = max(-0.5, min(0.5, val * 2.5))
            samples[start + j] += val * env * 0.3
    
    # Apply slight lowpass to tame harshness
    samples = lowpass(samples, 6000)
    
    # Normalize
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.75 for s in samples]
    
    write_wav('music/boss_battle.wav', samples)


# ──────────────────────────────────────────────────────────────────
# 3. Ambient Environmental Sounds
# ──────────────────────────────────────────────────────────────────

def generate_ambient_forest():
    print("Generating forest ambient...")
    duration = 16.0
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    
    # Wind base layer - filtered noise with slow modulation
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        wind_mod = 0.3 + 0.7 * (0.5 + 0.5 * sine(0.08, t)) * (0.5 + 0.5 * sine(0.13, t + 3))
        samples[i] += noise() * 0.08 * wind_mod
    samples = lowpass(samples, 800)
    
    # Bird chirps - random short sine sweeps
    random.seed(42)
    for _ in range(30):
        chirp_start = random.uniform(0, duration - 0.5)
        chirp_dur = random.uniform(0.05, 0.15)
        base_freq = random.uniform(2000, 4500)
        freq_sweep = random.uniform(-500, 800)
        vol = random.uniform(0.03, 0.08)
        start_s = int(chirp_start * SAMPLE_RATE)
        dur_s = int(chirp_dur * SAMPLE_RATE)
        for j in range(dur_s):
            if start_s + j >= num_samples:
                break
            t = j / SAMPLE_RATE
            env = math.sin(math.pi * t / chirp_dur)
            freq = base_freq + freq_sweep * (t / chirp_dur)
            samples[start_s + j] += sine(freq, t) * env * vol
    
    # Subtle cricket-like background - high frequency clicks
    for _ in range(60):
        start_t = random.uniform(0, duration - 0.1)
        start_s = int(start_t * SAMPLE_RATE)
        click_dur = int(random.uniform(0.005, 0.02) * SAMPLE_RATE)
        freq = random.uniform(5000, 8000)
        vol = random.uniform(0.01, 0.03)
        for j in range(click_dur):
            if start_s + j >= num_samples:
                break
            t = j / SAMPLE_RATE
            env = math.exp(-t * 200)
            samples[start_s + j] += sine(freq, t) * env * vol
    
    # Normalize
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.5 for s in samples]
    
    write_wav('music/ambient_forest.wav', samples)


def generate_ambient_city():
    print("Generating city ambient...")
    duration = 16.0
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    
    # Traffic hum - low filtered noise
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        mod = 0.4 + 0.6 * (0.5 + 0.5 * sine(0.05, t))
        samples[i] += noise() * 0.06 * mod
    samples = lowpass(samples, 400)
    
    # Occasional car horn-like tones
    random.seed(77)
    for _ in range(8):
        horn_start = random.uniform(0, duration - 1.0)
        horn_dur = random.uniform(0.3, 0.8)
        freq = random.choice([349.23, 392.00, 440.00, 466.16])
        start_s = int(horn_start * SAMPLE_RATE)
        dur_s = int(horn_dur * SAMPLE_RATE)
        vol = random.uniform(0.02, 0.05)
        for j in range(dur_s):
            if start_s + j >= num_samples:
                break
            t = j / SAMPLE_RATE
            env = envelope_adsr(t, 0.02, 0.05, 0.7, 0.1, horn_dur)
            val = square(freq, t + horn_start) * 0.5 + sine(freq, t + horn_start) * 0.5
            samples[start_s + j] += val * env * vol
    
    # Distant siren (rising/falling pitch)
    siren_start = 5.0
    siren_dur = 4.0
    start_s = int(siren_start * SAMPLE_RATE)
    dur_s = int(siren_dur * SAMPLE_RATE)
    for j in range(dur_s):
        if start_s + j >= num_samples:
            break
        t = j / SAMPLE_RATE
        # Siren oscillates between two pitches
        freq = 600 + 200 * sine(1.5, t)
        env = envelope_adsr(t, 0.5, 0.2, 0.3, 1.0, siren_dur)
        samples[start_s + j] += sine(freq, t) * env * 0.03
    
    # Normalize
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.45 for s in samples]
    
    write_wav('music/ambient_city.wav', samples)


def generate_ambient_cave():
    print("Generating cave ambient...")
    duration = 16.0
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    
    # Deep reverberant drone
    drone_freqs = [55.0, 82.41, 110.0]  # A1, E2, A2
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        val = 0.0
        for freq in drone_freqs:
            mod = 0.5 + 0.5 * sine(0.07 + freq * 0.001, t)
            val += sine(freq, t) * 0.06 * mod
        samples[i] += val
    
    # Water drips
    random.seed(99)
    for _ in range(40):
        drip_start = random.uniform(0, duration - 0.2)
        start_s = int(drip_start * SAMPLE_RATE)
        drip_dur = int(random.uniform(0.03, 0.08) * SAMPLE_RATE)
        freq = random.uniform(1500, 3500)
        vol = random.uniform(0.04, 0.10)
        for j in range(drip_dur):
            if start_s + j >= num_samples:
                break
            t = j / SAMPLE_RATE
            env = math.exp(-t * 60)
            samples[start_s + j] += sine(freq, t) * env * vol
    
    # Echoing rumble
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        rumble = sine(30, t) * 0.03 * (0.5 + 0.5 * sine(0.03, t))
        samples[i] += rumble
    
    # Normalize
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.45 for s in samples]
    
    write_wav('music/ambient_cave_deep.wav', samples)


# ──────────────────────────────────────────────────────────────────
# 4. UI Hover Sound - short, subtle click/blip
# ──────────────────────────────────────────────────────────────────
def generate_ui_hover():
    print("Generating UI hover sound...")
    duration = 0.08
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # Quick pitch sweep up
        freq = 800 + 600 * (t / duration)
        env = math.exp(-t * 40) * 0.7
        samples[i] = sine(freq, t) * env + sine(freq * 2, t) * env * 0.3
    
    # Normalize
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.5 for s in samples]
    
    write_wav('sfx/ui_hover.wav', samples)


if __name__ == '__main__':
    print("=== Generating Audio Assets ===")
    generate_menu_music()
    generate_boss_music()
    generate_ambient_forest()
    generate_ambient_city()
    generate_ambient_cave()
    generate_ui_hover()
    print("=== Done! ===")
