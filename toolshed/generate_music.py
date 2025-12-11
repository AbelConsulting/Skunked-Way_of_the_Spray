"""
Generate placeholder background music using simple synthesis
"""
import pygame
import numpy as np
import os
from scipy.io import wavfile

pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)

def generate_note(frequency, duration, sample_rate=22050, volume=0.15, distortion=False):
    """Generate a musical note with harmonics and optional distortion for metal sound"""
    num_samples = int(duration * sample_rate)
    t = np.linspace(0, duration, num_samples, False)
    
    # Fundamental frequency with slight detuning for thickness
    wave = np.sin(frequency * 2 * np.pi * t) * volume
    wave += np.sin(frequency * 1.005 * 2 * np.pi * t) * volume * 0.8  # Slight detune
    
    # Add harmonics for richer sound (more aggressive for metal)
    wave += np.sin(frequency * 2 * 2 * np.pi * t) * (volume * 0.6)
    wave += np.sin(frequency * 3 * 2 * np.pi * t) * (volume * 0.4)
    wave += np.sin(frequency * 5 * 2 * np.pi * t) * (volume * 0.25)  # 5th harmonic
    
    # Add heavy distortion/overdrive for crushing metal guitar tone
    if distortion:
        wave = np.tanh(wave * 5.0) * 0.75  # Hard clipping distortion for maximum aggression
        # Add sub-harmonics for thickness
        wave += np.sin(frequency * 0.5 * 2 * np.pi * t) * (volume * 0.15)
    
    # Apply ADSR envelope (faster attack for metal)
    attack_samples = int(0.01 * sample_rate)  # Very fast attack
    decay_samples = int(0.08 * sample_rate)
    release_samples = int(0.12 * sample_rate)
    
    envelope = np.ones(num_samples)
    
    # Attack
    if num_samples > attack_samples:
        envelope[:attack_samples] = np.linspace(0, 1, attack_samples)
    
    # Decay
    if num_samples > attack_samples + decay_samples:
        envelope[attack_samples:attack_samples + decay_samples] = np.linspace(1, 0.8, decay_samples)
    
    # Release
    if num_samples > release_samples:
        envelope[-release_samples:] = np.linspace(0.8, 0, release_samples)
    
    wave = wave * envelope
    return wave

def create_beat(bpm=120, beats=4, sample_rate=22050):
    """Create an aggressive metal drum beat"""
    beat_duration = 60.0 / bpm
    total_duration = beat_duration * beats
    num_samples = int(total_duration * sample_rate)
    
    beat = np.zeros(num_samples)
    
    for i in range(beats):
        # Double bass kick drum - more aggressive
        kick_start = int(i * beat_duration * sample_rate)
        kick_duration = 0.08
        kick_samples = int(kick_duration * sample_rate)
        
        if kick_start + kick_samples < num_samples:
            # Low frequency sweep for kick with punch
            t = np.linspace(0, kick_duration, kick_samples, False)
            freq = np.linspace(180, 35, kick_samples)
            phase = 2 * np.pi * np.cumsum(freq) / sample_rate
            kick = np.sin(phase) * 0.4
            
            # Sharper envelope for punch
            env = np.exp(-t * 25)
            kick = kick * env
            
            beat[kick_start:kick_start + kick_samples] += kick
        
        # Add second kick on eighth notes for double bass effect
        if i % 2 == 0:
            kick2_start = kick_start + int(beat_duration * 0.5 * sample_rate)
            if kick2_start + kick_samples < num_samples:
                t = np.linspace(0, kick_duration, kick_samples, False)
                freq = np.linspace(180, 35, kick_samples)
                phase = 2 * np.pi * np.cumsum(freq) / sample_rate
                kick2 = np.sin(phase) * 0.35
                env = np.exp(-t * 25)
                kick2 = kick2 * env
                beat[kick2_start:kick2_start + kick_samples] += kick2
        
        # Snare on beats 2 and 4 (backbeat)
        if i == 1 or i == 3:
            snare_start = kick_start
            snare_duration = 0.08
            snare_samples = int(snare_duration * sample_rate)
            
            if snare_start + snare_samples < num_samples:
                # Snare = noise + tone
                t = np.linspace(0, snare_duration, snare_samples, False)
                snare = np.random.uniform(-1, 1, snare_samples) * 0.2
                snare += np.sin(200 * 2 * np.pi * t) * 0.15
                env = np.exp(-t * 20)
                snare = snare * env
                
                beat[snare_start:snare_start + snare_samples] += snare
        
        # Aggressive hi-hat pattern (eighth notes)
        hat_start = kick_start
        hat_duration = 0.04
        hat_samples = int(hat_duration * sample_rate)
        
        if hat_start + hat_samples < num_samples:
            # Brighter, sharper hi-hat
            hat = np.random.uniform(-1, 1, hat_samples) * 0.12
            env = np.exp(-np.linspace(0, hat_duration, hat_samples) * 40)
            hat = hat * env
            
            beat[hat_start:hat_start + hat_samples] += hat
    
    return beat

def create_gameplay_music(duration=60, bpm=120):
    """Create heavy, groovy metal gameplay music"""
    sample_rate = 22050
    
    # Chord progression: Am - F - C - G (in A minor - darker metal sound)
    # Drop tuning for maximum heaviness
    notes = {
        'C2': 65.41,   # Drop C tuning
        'E2': 82.41,   # Low E for power chords
        'A2': 110.00,
        'D3': 146.83,
        'E3': 164.81,
        'A3': 220.00,
        'B3': 246.94,
        'C4': 261.63,
        'D4': 293.66,
        'E4': 329.63,
        'F4': 349.23,
        'G4': 392.00,
        'A4': 440.00,
        'C5': 523.25,
        'E5': 659.25,
        'F5': 698.46,
        'G5': 783.99
    }
    
    beat_duration = 60.0 / bpm
    measure_duration = beat_duration * 4
    
    num_measures = int(duration / measure_duration)
    total_samples = int(duration * sample_rate)
    
    music = np.zeros(total_samples)
    
    # Power chord progression (root + fifth for metal sound)
    power_chords = [
        ['A2', 'E3'],  # A5 power chord
        ['F4', 'C4'],  # F5 power chord  
        ['C4', 'G4'],  # C5 power chord
        ['G4', 'D3']   # G5 power chord
    ]
    
    # Palm-muted rhythm guitar pattern (aggressive eighth notes)
    rhythm_patterns = [
        ['A3', 'A3', 'A3', 'E3', 'A3', 'A3', 'E3', 'A3'],
        ['F4', 'F4', 'F4', 'C4', 'F4', 'F4', 'C4', 'F4'],
        ['C4', 'C4', 'C4', 'G4', 'C4', 'C4', 'G4', 'C4'],
        ['G4', 'G4', 'G4', 'D3', 'G4', 'G4', 'D3', 'G4']
    ]
    
    # Lead melody (more melodic, higher register)
    melody_patterns = [
        ['A4', 'C5', 'E5', 'C5', 'A4', 'E4', 'A4', 'C5'],
        ['F4', 'A4', 'C5', 'F5', 'C5', 'A4', 'F4', 'A4'],
        ['E4', 'G4', 'C5', 'E5', 'C5', 'G4', 'E4', 'G4'],
        ['D4', 'G4', 'B3', 'G4', 'D4', 'B3', 'G4', 'D4']
    ]
    
    for measure in range(num_measures):
        chord_idx = measure % 4
        measure_start = int(measure * measure_duration * sample_rate)
        
        # Add heavy bass notes (whole notes with distortion)
        if chord_idx < len(power_chords):
            bass_note = notes.get(power_chords[chord_idx][0], 110)
            bass = generate_note(bass_note * 0.5, measure_duration, sample_rate, volume=0.25, distortion=True)
            
            end_idx = min(measure_start + len(bass), total_samples)
            music[measure_start:end_idx] += bass[:end_idx - measure_start]
        
        # Add palm-muted rhythm guitar (eighth notes with distortion)
        if chord_idx < len(rhythm_patterns):
            eighth_duration = beat_duration / 2
            for eighth in range(8):
                rhythm_start = measure_start + int(eighth * eighth_duration * sample_rate)
                note_name = rhythm_patterns[chord_idx][eighth % len(rhythm_patterns[chord_idx])]
                rhythm_freq = notes.get(note_name, 220)
                rhythm = generate_note(rhythm_freq, eighth_duration * 0.6, sample_rate, volume=0.18, distortion=True)
                
                end_idx = min(rhythm_start + len(rhythm), total_samples)
                if rhythm_start < total_samples:
                    music[rhythm_start:end_idx] += rhythm[:end_idx - rhythm_start]
        
        # Add lead melody (quarter notes, cleaner tone)
        if chord_idx < len(melody_patterns):
            for beat in range(4):
                note_start = measure_start + int(beat * beat_duration * sample_rate)
                note_name = melody_patterns[chord_idx][beat % len(melody_patterns[chord_idx])]
                melody_freq = notes.get(note_name, 440)
                note = generate_note(melody_freq, beat_duration * 0.8, sample_rate, volume=0.12, distortion=False)
                
                end_idx = min(note_start + len(note), total_samples)
                if note_start < total_samples:
                    music[note_start:end_idx] += note[:end_idx - note_start]
    
    # Add drums
    num_beats = int(duration / beat_duration)
    drums = create_beat(bpm, num_beats, sample_rate)
    
    # Ensure same length
    min_length = min(len(music), len(drums))
    music = music[:min_length]
    drums = drums[:min_length]
    
    # Mix
    final = music + drums
    
    # Normalize
    max_val = np.max(np.abs(final))
    if max_val > 0:
        final = final / max_val * 0.7
    
    return final, sample_rate

def save_music_as_ogg(wave, sample_rate, filename):
    """Save wave as OGG file (via WAV then conversion)"""
    # First save as WAV
    filepath = os.path.join('assets', 'audio', 'music', filename.replace('.ogg', '.wav'))
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    # Convert to stereo
    stereo_wave = np.column_stack((wave, wave))
    stereo_wave = (stereo_wave * 32767).astype(np.int16)
    
    wavfile.write(filepath, sample_rate, stereo_wave)
    
    print(f"✓ Generated: {filename} (saved as WAV)")
    print(f"  Note: For OGG format, you can use ffmpeg to convert:")
    print(f"  ffmpeg -i {filepath} {filepath.replace('.wav', '.ogg')}")

def create_all_music():
    """Generate all music tracks"""
    print("🎵 Generating metal-infused background music...\n")
    
    # Gameplay music - heavy and groovy with crushing metal elements
    print("Creating gameplay music (120 BPM heavy metal style)...")
    gameplay, sr = create_gameplay_music(duration=60, bpm=120)
    save_music_as_ogg(gameplay, sr, 'gameplay.ogg')
    
    print("\n✅ Music generated successfully!")
    print(f"📁 Saved to: assets/audio/music/")
    print("\n💡 Tip: These are placeholder tracks. For better quality:")
    print("   1. Use a DAW (FL Studio, Ableton, LMMS)")
    print("   2. Or use royalty-free music from:")
    print("      - OpenGameArt.org")
    print("      - Incompetech.com")
    print("      - Freesound.org")

if __name__ == "__main__":
    create_all_music()
