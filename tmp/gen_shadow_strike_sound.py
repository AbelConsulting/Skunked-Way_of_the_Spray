import math
import wave
import struct
import os

out_path = 'assets/audio/sfx/shadow_strike.wav'
rate = 44100
length = 0.45
samples = int(rate * length)

# Metal-ish: bright noisy transient + descending tone + ring mod
start_freq = 720.0
end_freq = 220.0

frames = []
for i in range(samples):
    t = i / rate
    freq = start_freq * ((end_freq / start_freq) ** (t / length))
    phase = 2 * math.pi * freq * t
    base = math.sin(phase) + 0.4 * math.sin(phase * 2.0)
    ring = math.sin(phase * 0.5) * math.sin(phase * 1.7)
    # short metallic noise burst
    noise = (math.sin(phase * 3.1 + 1.1) + math.sin(phase * 5.3 + 0.4)) * 0.08

    # envelope: sharp attack, fast decay
    attack = min(1.0, t / 0.015)
    decay = max(0.0, 1.0 - (t / length))
    env = attack * (decay ** 1.6)

    sample = (base * 0.7 + ring * 0.35 + noise) * env
    val = int(max(-1.0, min(1.0, sample)) * 32767)
    frames.append(val)

os.makedirs(os.path.dirname(out_path), exist_ok=True)
with wave.open(out_path, 'wb') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(rate)
    wf.writeframes(b''.join(struct.pack('<h', s) for s in frames))

print('Wrote', out_path, 'samples', samples)
