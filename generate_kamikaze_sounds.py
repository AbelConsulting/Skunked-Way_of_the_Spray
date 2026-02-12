"""
Generate kamikaze-specific audio assets:
1. kamikaze_explosion.wav — heavy, punchy explosion (more pronounced than enemy_death)
2. kamikaze_fuse.wav — sizzling fuse ignition + countdown beeps
"""

import math
import random
import os
import wave
import array

SAMPLE_RATE = 22050
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'assets', 'audio', 'sfx')


def write_wav(filename, samples, sample_rate=SAMPLE_RATE):
    """Write a list of float samples [-1,1] to a 16-bit WAV file."""
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


def noise():
    return random.uniform(-1, 1)


def lowpass(samples, cutoff_freq, sample_rate=SAMPLE_RATE):
    """Simple one-pole low-pass filter."""
    rc = 1.0 / (2 * math.pi * cutoff_freq)
    dt = 1.0 / sample_rate
    alpha = dt / (rc + dt)
    out = []
    prev = 0.0
    for s in samples:
        prev = prev + alpha * (s - prev)
        out.append(prev)
    return out


def generate_kamikaze_explosion():
    """
    Heavy, punchy explosion with:
    - Initial transient crack
    - Low-frequency boom rumble
    - Layered noise burst
    - Echoing tail
    """
    duration = 1.2
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n

    for i in range(n):
        t = i / SAMPLE_RATE

        # --- Layer 1: Initial transient crack (first 30ms) ---
        if t < 0.03:
            crack_env = (1.0 - t / 0.03) ** 2
            crack = noise() * crack_env * 1.0
        else:
            crack = 0.0

        # --- Layer 2: Low-frequency boom (60-100 Hz, pitch drops) ---
        boom_freq = 100 * math.exp(-t * 3)  # Drops from 100 to ~5 Hz
        boom_env = math.exp(-t * 3.5) * 0.9
        boom = sine(boom_freq, t) * boom_env

        # Second sub-harmonic for weight
        sub_freq = 50 * math.exp(-t * 2.5)
        sub_env = math.exp(-t * 2.0) * 0.6
        sub = sine(sub_freq, t) * sub_env

        # --- Layer 3: Noise burst (filtered) ---
        if t < 0.5:
            noise_env = math.exp(-t * 6) * 0.7
            noise_val = noise() * noise_env
        else:
            noise_val = 0.0

        # --- Layer 4: Mid-frequency crackle (200-600 Hz) ---
        crackle_env = math.exp(-t * 5) * 0.4
        crackle_freq = 300 + 200 * sine(3.0, t)
        crackle = sine(crackle_freq, t) * crackle_env * (0.5 + 0.5 * noise())

        # --- Layer 5: Echo tail (delayed, softer repetition) ---
        echo = 0.0
        if t > 0.15:
            echo_t = t - 0.15
            echo_env = math.exp(-echo_t * 4.0) * 0.3
            echo_freq = 80 * math.exp(-echo_t * 3)
            echo = sine(echo_freq, echo_t) * echo_env
        if t > 0.35:
            echo_t2 = t - 0.35
            echo_env2 = math.exp(-echo_t2 * 5.0) * 0.15
            echo += noise() * echo_env2

        # --- Layer 6: High-frequency sizzle (debris) ---
        sizzle = 0.0
        if t < 0.4:
            sizzle_env = math.exp(-t * 8) * 0.25
            sizzle = (noise() * 0.5 + sine(2000 + 1000 * noise(), t) * 0.5) * sizzle_env

        # Combine
        sample = crack + boom + sub + noise_val + crackle + echo + sizzle

        # Soft clip for warmth
        sample = math.tanh(sample * 1.3)

        samples[i] = sample

    # Low-pass filter to remove harshness
    samples = lowpass(samples, 6000)

    # Normalize
    peak = max(abs(s) for s in samples)
    if peak > 0:
        samples = [s / peak * 0.95 for s in samples]

    write_wav('kamikaze_explosion.wav', samples)


def generate_kamikaze_fuse():
    """
    Sizzling fuse sound with escalating urgency:
    - Crackling/sizzling base
    - Rising pitch warning tone
    - Accelerating beep pattern at the end
    """
    duration = 0.8  # Short cue — the actual fuse timer is in-game
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n

    for i in range(n):
        t = i / SAMPLE_RATE
        progress = t / duration  # 0 -> 1

        # --- Layer 1: Crackling sizzle ---
        sizzle_env = 0.3 + progress * 0.3
        sizzle = noise() * sizzle_env * 0.4
        # Filter it with a modulating cutoff
        cutoff_mod = 800 + progress * 2000
        sizzle *= (0.5 + 0.5 * sine(cutoff_mod * 0.01, t))

        # --- Layer 2: Rising warning tone ---
        warn_freq = 400 + progress * 800  # 400 -> 1200 Hz
        warn_env = 0.15 + progress * 0.35
        warn = sine(warn_freq, t) * warn_env

        # --- Layer 3: Pulsing beeps (accelerate toward end) ---
        beep_rate = 3 + progress * 12  # 3 Hz -> 15 Hz
        beep_gate = 1.0 if (t * beep_rate) % 1.0 < 0.4 else 0.0
        beep_freq = 800 + progress * 400
        beep = sine(beep_freq, t) * beep_gate * (0.1 + progress * 0.3)

        # --- Layer 4: Sub rumble building ---
        rumble = sine(60 + progress * 40, t) * progress * 0.2

        # Combine
        sample = sizzle + warn + beep + rumble

        # Overall envelope: fade in briefly, sustain
        if t < 0.02:
            sample *= t / 0.02
        # No fade out — the game will cut this when entering dash

        sample = math.tanh(sample * 1.2)
        samples[i] = sample

    # Normalize
    peak = max(abs(s) for s in samples)
    if peak > 0:
        samples = [s / peak * 0.9 for s in samples]

    write_wav('kamikaze_fuse.wav', samples)


if __name__ == '__main__':
    print("Generating kamikaze audio assets...")
    generate_kamikaze_explosion()
    generate_kamikaze_fuse()
    print("Done!")
