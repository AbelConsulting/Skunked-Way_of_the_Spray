
import numpy as np
import wave
import random
import os

def save_wav(filename, data, sample_rate=44100):
    data = (data * 32767).astype(np.int16)
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        f.writeframes(data.tobytes())
    print(f"Generated {filename}")

def gen_footstep(duration=0.1, sample_rate=44100):
    t = np.linspace(0, duration, int(duration * sample_rate))
    # Filtered noise for a step sound
    noise = np.random.normal(0, 1, len(t))
    
    # Low-pass filter approximation (simple moving average for "thud" effect)
    window_size = 20
    noise = np.convolve(noise, np.ones(window_size)/window_size, mode='same')
    
    # Envelope
    envelope = np.exp(-t * 20) # Fast decay
    
    audio = noise * envelope
    return audio * 0.5

def gen_coin(duration=0.4, sample_rate=44100):
    t = np.linspace(0, duration, int(duration * sample_rate))
    # Two high tones
    freq1 = 1200
    freq2 = 1800
    
    tone1 = np.sin(2 * np.pi * freq1 * t) * np.exp(-t * 10)
    tone2 = np.sin(2 * np.pi * freq2 * t) * np.exp(-t * 8)
    
    # Determine split point for "ba-ding"
    split_idx = int(0.05 * sample_rate)
    
    audio = np.zeros_like(t)
    audio[:split_idx] = tone1[:split_idx]
    audio[split_idx:] = tone2[:-split_idx] + tone1[split_idx:] * 0.2
    
    return audio * 0.4

def gen_powerup(duration=1.0, sample_rate=44100):
    t = np.linspace(0, duration, int(duration * sample_rate))
    # Rising major chord arpeggio
    freqs = [440, 554, 659, 880] # A Major
    
    audio = np.zeros_like(t)
    
    segment_len = 0.1
    for i, freq in enumerate(freqs):
        start = i * segment_len
        if start >= duration: break
        
        # Segment time
        st_idx = int(start * sample_rate)
        seg_t = t[st_idx:]
        
        tone = np.sin(2 * np.pi * freq * (seg_t - start))
        # Decay for each note
        envelope = np.exp(-(seg_t - start) * 5)
        
        tone = tone * envelope
        
        if len(tone) > len(audio) - st_idx:
            tone = tone[:len(audio) - st_idx]
            
        audio[st_idx:st_idx+len(tone)] += tone
        
    return audio * 0.3

def gen_level_complete(duration=2.5, sample_rate=44100):
    t = np.linspace(0, duration, int(duration * sample_rate))
    # Victory fanfare style
    freqs = [523.25, 659.25, 783.99, 1046.50] # C Major: C E G C
    timings = [0.0, 0.2, 0.4, 0.8]
    durations = [0.2, 0.2, 0.4, 1.5]
    
    audio = np.zeros_like(t)
    
    for freq, start, dur in zip(freqs, timings, durations):
        st_idx = int(start * sample_rate)
        end_idx = int((start + dur) * sample_rate)
        
        if st_idx >= len(t): continue
        if end_idx > len(t): end_idx = len(t)
        
        note_t = t[st_idx:end_idx] - start
        tone = np.sin(2 * np.pi * freq * note_t)
        
        # Richer tone (add mild harmonics)
        tone += 0.3 * np.sin(2 * np.pi * freq * 2 * note_t)
        
        # Envelope ADSR-ish
        env = np.ones_like(note_t)
        att = int(0.05 * sample_rate)
        dec = int(0.1 * sample_rate)
        
        if len(env) > att:
            env[:att] = np.linspace(0, 1, att)
            if len(env) > att + dec:
                env[att:att+dec] = np.linspace(1, 0.7, dec)
                env[-dec:] = np.linspace(0.7, 0, dec)
            else:
                env[att:] = np.linspace(1, 0, len(env)-att)
        else:
             env[:] = np.linspace(0, 0, len(env))

        audio[st_idx:end_idx] += tone * env
        
    return audio * 0.3

def gen_enemy_attack(duration=0.3, sample_rate=44100):
    t = np.linspace(0, duration, int(duration * sample_rate))
    # Whoosh noise
    noise = np.random.normal(0, 1, len(t))
    # Filter by simple smoothing
    noise = np.convolve(noise, np.ones(10)/10, mode='same')
    
    # Rise and fall envelope
    envelope = np.hstack([np.linspace(0, 1, int(len(t)*0.5)), np.linspace(1, 0, int(len(t)*0.5))])
    if len(envelope) < len(t):
        envelope = np.pad(envelope, (0, len(t)-len(envelope)))
    elif len(envelope) > len(t):
        envelope = envelope[:len(t)]
    
    audio = noise * envelope
    return audio * 0.4

def gen_boss_defeat(duration=2.0, sample_rate=44100):
    t = np.linspace(0, duration, int(duration * sample_rate))
    # Low rumbling explosion
    noise = np.random.normal(0, 1, len(t))
    noise = np.convolve(noise, np.ones(50)/50, mode='same') # Low pass
    
    # Amplitude modulation for texture
    mod = np.sin(2 * np.pi * 15 * t) * 0.5 + 0.5
    
    envelope = np.exp(-t * 2)
    
    audio = noise * mod * envelope
    
    # Add a down-pitching tone
    sweep = np.sin(2 * np.pi * 100 * (1 - t/duration) * t) * np.exp(-t)
    audio += sweep * 0.5
    
    return audio * 0.6

def gen_boss_spawn(duration=1.5, sample_rate=44100):
    t = np.linspace(0, duration, int(duration * sample_rate))
    # Rising tension
    freq = np.linspace(50, 200, len(t))
    
    # Sawtooth-ish wave
    wave = 0.5 * np.sin(2 * np.pi * freq * t)
    wave += 0.25 * np.sin(2 * np.pi * freq * 2 * t)
    wave += 0.125 * np.sin(2 * np.pi * freq * 3 * t)
    
    # Tremolo
    tremolo = np.sin(2 * np.pi * 15 * t) * 0.3 + 0.7
    
    audio = wave * tremolo
    
    # Envelope
    env = np.ones_like(t)
    env[:int(len(t)*0.1)] = np.linspace(0, 1, int(len(t)*0.1))
    env[-int(len(t)*0.1):] = np.linspace(1, 0, int(len(t)*0.1))
    
    return audio * 0.5

if __name__ == "__main__":
    out_dir = "assets/audio/sfx"
    os.makedirs(out_dir, exist_ok=True)
    
    save_wav(os.path.join(out_dir, "footstep.wav"), gen_footstep())
    save_wav(os.path.join(out_dir, "coin_collect.wav"), gen_coin())
    save_wav(os.path.join(out_dir, "powerup.wav"), gen_powerup())
    save_wav(os.path.join(out_dir, "level_complete.wav"), gen_level_complete())
    save_wav(os.path.join(out_dir, "enemy_attack_gen.wav"), gen_enemy_attack())
    save_wav(os.path.join(out_dir, "boss_defeat_gen.wav"), gen_boss_defeat())
    save_wav(os.path.join(out_dir, "boss_spawn_gen.wav"), gen_boss_spawn())
