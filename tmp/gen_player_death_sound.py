import math
import wave
import struct
import os

out_path = 'assets/audio/sfx/player_death.wav'
rate = 44100
length = 1.2
samples = int(rate * length)

start_freq = 420.0
end_freq = 120.0

frames = []
for i in range(samples):
    t = i / rate
    freq = start_freq * ((end_freq / start_freq) ** (t / length))
    phase = 2 * math.pi * freq * t
    tone = math.sin(phase)
    tone += 0.4 * math.sin(phase * 0.5)
    noise = (math.sin(phase * 1.7 + 1.3) + math.sin(phase * 2.3 + 0.7)) * 0.05
    attack = min(1.0, t / 0.04)
    decay = max(0.0, 1.0 - (t / length))
    env = attack * (decay ** 1.2)
    sample = (tone + noise) * env
    val = int(max(-1.0, min(1.0, sample)) * 32767)
    frames.append(val)

os.makedirs(os.path.dirname(out_path), exist_ok=True)
with wave.open(out_path, 'wb') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(rate)
    wf.writeframes(b''.join(struct.pack('<h', s) for s in frames))

print('Wrote', out_path, 'samples', samples)
