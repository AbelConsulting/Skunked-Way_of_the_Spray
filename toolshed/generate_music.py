"""
Generate placeholder background music using simple synthesis
"""
import argparse
import numpy as np
import os
from scipy.io import wavfile

GAMEPLAY_MELODY = (
    (440.00, 523.25, 659.25, 523.25),
    (349.23, 440.00, 523.25, 698.46),
    (329.63, 392.00, 523.25, 659.25),
    (293.66, 392.00, 246.94, 392.00),
)


def flute_note(frequency, duration, sample_rate, rng):
    t = np.arange(round(duration * sample_rate)) / sample_rate
    vibrato = np.minimum(t / 0.18, 1) * np.sin(2 * np.pi * 5 * t) * 0.0015
    phase = 2 * np.pi * np.cumsum(frequency * (1 + vibrato)) / sample_rate
    tone = np.sin(phase) + 0.14 * np.sin(phase * 2) + 0.035 * np.sin(phase * 3)
    breath = np.convolve(rng.uniform(-1, 1, len(t)), np.ones(5) / 5, mode='same')
    envelope = np.sin(np.minimum(t / 0.035, 1) * np.pi / 2) ** 2
    envelope *= np.sin(np.clip((duration - t - 1 / sample_rate) / 0.07, 0, 1) * np.pi / 2) ** 2
    return (tone + breath * 0.018) * envelope


def create_menu_music():
    """A gentle flute rendition of the gameplay melody, without drones or drums."""
    sample_rate = 22050
    beat_duration = 60 / 96
    music = np.zeros(round(16 * 4 * beat_duration * sample_rate))
    rng = np.random.default_rng(2027)
    chords = (
        (220.00, 261.63, 329.63),
        (174.615, 220.00, 261.63),
        (130.815, 164.815, 196.00),
        (196.00, 246.94, 293.66),
    )

    def place(sound, beat):
        start = round(beat * beat_duration * sample_rate)
        music[start:start + len(sound)] += sound

    def pluck(frequency, duration):
        t = np.arange(round(duration * sample_rate)) / sample_rate
        tone = np.sin(2 * np.pi * frequency * t) + 0.16 * np.sin(4 * np.pi * frequency * t)
        envelope = np.minimum(t / 0.008, 1) * np.exp(-t * 5)
        envelope *= np.clip((duration - t - 1 / sample_rate) / 0.06, 0, 1)
        return tone * envelope

    for measure in range(16):
        phrase = measure // 4
        chord = chords[measure % 4]
        downbeat = measure * 4
        for beat, frequency in enumerate(GAMEPLAY_MELODY[measure % 4]):
            duration = beat_duration * (0.82 if phrase % 2 == 0 else 0.93)
            lead = flute_note(frequency, duration, sample_rate, rng)
            place(lead * (0.28 if beat == 0 else 0.25), downbeat + beat)

        for beat in (0, 2):
            for degree, frequency in enumerate(chord):
                place(pluck(frequency, beat_duration * 1.6) * 0.07,
                      downbeat + beat + degree * 0.08)
        if phrase in (1, 2):
            for beat, degree in ((0.5, 2), (1.5, 1), (2.5, 2), (3.5, 0)):
                place(pluck(chord[degree] * 2, beat_duration * 0.45) * 0.055,
                      downbeat + beat)

    peak = np.max(np.abs(music))
    rms = np.sqrt(np.mean(music ** 2))
    music *= min(0.55 / peak, 0.11 / rms)
    return music, sample_rate


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

def arrangement_section(measure):
    # Eight-bar phrases: groove, pads, arpeggios, then breakdown/build.
    return (measure // 8) % 4


def create_arranged_backing(num_measures, bpm, sample_rate):
    """Render a deterministic accompaniment without changing the lead melody."""
    beat_duration = 60.0 / bpm
    total_samples = round(num_measures * 4 * beat_duration * sample_rate)
    backing = np.zeros(total_samples)
    rng = np.random.default_rng(2026)
    chords = (
        (110.00, 130.815, 164.815),  # Am
        (87.3075, 110.00, 130.815),  # F
        (65.4075, 82.4075, 98.00),  # C
        (98.00, 123.47, 146.83),  # G
    )

    def place(sound, beat):
        start = round(beat * beat_duration * sample_rate)
        end = min(start + len(sound), total_samples)
        if end - start < len(sound):
            # Release the final bass/fill notes rather than cutting their tails at the loop seam.
            sound = sound[:end - start].copy()
            release = min(len(sound), round(0.025 * sample_rate))
            sound[-release:] *= np.linspace(1, 0, release)
        backing[start:end] += sound[:end - start]

    def pitched(freq, seconds, voice):
        t = np.arange(round(seconds * sample_rate)) / sample_rate
        if voice == 'pad':
            sound = (np.sin(2 * np.pi * freq * t)
                     + 0.3 * np.sin(2 * np.pi * freq * 2.003 * t)
                     + 0.12 * np.sin(2 * np.pi * freq * 3 * t))
            env = np.minimum(t / 0.18, 1) * np.minimum((seconds - t) / 0.25, 1)
        elif voice == 'pluck':
            sound = (np.sin(2 * np.pi * freq * t)
                     + 0.35 * np.sin(2 * np.pi * freq * 2 * t)
                     + 0.12 * np.sin(2 * np.pi * freq * 4 * t))
            env = np.minimum(t / 0.004, 1) * np.exp(-t * 9)
        else:
            sound = (np.sin(2 * np.pi * freq * t)
                     + 0.25 * np.sin(2 * np.pi * freq * 2 * t))
            env = np.minimum(t / 0.008, 1) * np.exp(-t * 3)
        env *= np.clip((seconds - t - 1 / sample_rate) / 0.025, 0, 1)
        return sound * env

    def percussion(kind):
        seconds = {'kick': 0.18, 'snare': 0.14, 'hat': 0.055, 'tom': 0.16}[kind]
        t = np.arange(round(seconds * sample_rate)) / sample_rate
        if kind == 'kick':
            phase = 2 * np.pi * np.cumsum(45 + 115 * np.exp(-t * 40)) / sample_rate
            sound = np.sin(phase) * np.exp(-t * 24)
        elif kind == 'snare':
            sound = (rng.uniform(-1, 1, len(t)) * 0.7
                     + np.sin(2 * np.pi * 185 * t) * 0.3) * np.exp(-t * 30)
        elif kind == 'tom':
            sound = np.sin(2 * np.pi * 120 * t) * np.exp(-t * 25)
        else:
            noise = rng.uniform(-1, 1, len(t))
            sound = np.diff(noise, prepend=noise[0]) * np.exp(-t * 65)
        edge = np.minimum(t / 0.002, 1)
        edge *= np.clip((seconds - t - 1 / sample_rate) / 0.01, 0, 1)
        return sound * edge

    for measure in range(num_measures):
        section = arrangement_section(measure)
        breakdown = section == 3 and measure % 8 < 4
        chord = chords[measure % 4]
        downbeat = measure * 4

        bass_beats = (0, 2) if breakdown else (0, 1.5, 2, 3, 3.5)
        for index, beat in enumerate(bass_beats):
            freq = chord[0] / 2 if index < 3 else chord[2] / 2
            place(pitched(freq, beat_duration * 0.8, 'bass') * 0.27, downbeat + beat)

        if section != 0:
            for freq in chord:
                place(pitched(freq * 2, beat_duration * 4, 'pad') * 0.065, downbeat)

        if section == 2 or (section == 3 and not breakdown):
            for eighth, degree in enumerate((0, 2, 1, 2, 0, 1, 2, 1)):
                # Offbeats leave space for the unchanged quarter-note lead.
                if eighth % 2:
                    place(pitched(chord[degree] * 4, beat_duration * 0.45, 'pluck') * 0.13,
                          downbeat + eighth * 0.5)

        kick_beats = (0, 2) if breakdown else ((0, 1.5, 2, 2.75) if measure % 2 else (0, 0.5, 2))
        for beat in kick_beats:
            place(percussion('kick') * 0.42, downbeat + beat)
        for beat in ((2,) if breakdown else (1, 3)):
            place(percussion('snare') * (0.19 if breakdown else 0.3), downbeat + beat)
        for eighth in range(0, 8, 2 if breakdown else 1):
            place(percussion('hat') * (0.065 if eighth % 2 else 0.095),
                  downbeat + eighth * 0.5)
        if measure % 8 == 7:
            for offset in (3.25, 3.5, 3.75):
                place(percussion('tom') * 0.22, downbeat + offset)

    return backing


def create_gameplay_music(duration=60, bpm=120, arranged=False):
    """Create heavy, groovy metal gameplay music"""
    sample_rate = 22050
    if arranged and (not np.isfinite(bpm) or bpm <= 0):
        raise ValueError("Arranged gameplay BPM must be finite and positive")
    
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
    if arranged and (
        not np.isfinite(duration) or duration <= 0
        or not np.isclose(duration / measure_duration / 32,
                          round(duration / measure_duration / 32))
    ):
        raise ValueError("Arranged gameplay must contain complete 32-bar loops")

    num_measures = round(duration / measure_duration) if arranged else int(duration / measure_duration)
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
    
    for measure in range(num_measures):
        chord_idx = measure % 4
        measure_start = int(measure * measure_duration * sample_rate)
        
        # Add heavy bass notes (whole notes with distortion)
        if not arranged and chord_idx < len(power_chords):
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
                if arranged:
                    breakdown = arrangement_section(measure) == 3 and measure % 8 < 4
                    rhythm *= 0.35 if breakdown else 0.8
                
                end_idx = min(rhythm_start + len(rhythm), total_samples)
                if rhythm_start < total_samples:
                    music[rhythm_start:end_idx] += rhythm[:end_idx - rhythm_start]
        
        # Add lead melody (quarter notes, cleaner tone)
        if chord_idx < len(GAMEPLAY_MELODY):
            for beat, melody_freq in enumerate(GAMEPLAY_MELODY[chord_idx]):
                note_start = measure_start + int(beat * beat_duration * sample_rate)
                note = generate_note(melody_freq, beat_duration * 0.8, sample_rate, volume=0.12, distortion=False)
                
                end_idx = min(note_start + len(note), total_samples)
                if note_start < total_samples:
                    music[note_start:end_idx] += note[:end_idx - note_start]
    
    # Add drums
    num_beats = int(duration / beat_duration)
    drums = (create_arranged_backing(num_measures, bpm, sample_rate) if arranged
             else create_beat(bpm, num_beats, sample_rate))
    
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
    filepath = os.path.join(os.path.dirname(os.path.dirname(__file__)),
                            'assets', 'audio', 'music', filename.replace('.ogg', '.wav'))
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    # Convert to stereo
    stereo_wave = np.column_stack((wave, wave))
    stereo_wave = (stereo_wave * 32767).astype(np.int16)
    
    wavfile.write(filepath, sample_rate, stereo_wave)
    
    print(f"Generated WAV: {filepath}")
    print(f"  Note: For OGG format, you can use ffmpeg to convert:")
    print(f'  ffmpeg -i "{filepath}" -c:a libvorbis -q:a 5 "{filepath.replace(".wav", ".ogg")}"')

def create_all_music():
    """Generate all music tracks"""
    print("🎵 Generating varied background music tracks...\n")
    
    # 1. Gameplay music - heavy and groovy with crushing metal elements (Default)
    print("1. Creating gameplay music (120 BPM heavy metal style)...")
    gameplay, sr = create_gameplay_music(duration=64, bpm=120, arranged=True)
    save_music_as_ogg(gameplay, sr, 'gameplay.ogg')
    
    # 2. Forest theme - slightly slower, more organic feel
    print("\n2. Creating forest theme (110 BPM melodic metal)...")
    forest, sr = create_gameplay_music(duration=60, bpm=110)
    save_music_as_ogg(forest, sr, 'forest_theme.ogg')
    
    # 3. City theme - faster, more aggressive
    print("\n3. Creating city theme (135 BPM thrash metal)...")
    city, sr = create_gameplay_music(duration=60, bpm=135)
    save_music_as_ogg(city, sr, 'city_theme.ogg')
    
    # 4. Cave ambient - slow and atmospheric
    print("\n4. Creating cave ambient (90 BPM atmospheric)...")
    cave, sr = create_gameplay_music(duration=60, bpm=90)
    save_music_as_ogg(cave, sr, 'cave_ambient.ogg')
    
    # 5. Action theme - high energy
    print("\n5. Creating action theme (145 BPM speed metal)...")
    action, sr = create_gameplay_music(duration=60, bpm=145)
    save_music_as_ogg(action, sr, 'action_theme.ogg')
    
    # 6. Boss theme - intense and heavy
    print("\n6. Creating boss theme (130 BPM heavy groove)...")
    boss, sr = create_gameplay_music(duration=60, bpm=130)
    save_music_as_ogg(boss, sr, 'boss_theme.ogg')
    
    print("\n✅ All music tracks generated successfully!")
    print(f"📁 Saved to: assets/audio/music/")
    print("\n💡 Tip: These are placeholder tracks. For better quality:")
    print("   1. Use a DAW (FL Studio, Ableton, LMMS)")
    print("   2. Or use royalty-free music from:")
    print("      - OpenGameArt.org")
    print("      - Incompetech.com")
    print("      - Freesound.org")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--gameplay-only', action='store_true',
                        help='Render the arranged gameplay WAV without changing other tracks')
    args = parser.parse_args()
    if args.gameplay_only:
        gameplay, sr = create_gameplay_music(duration=64, bpm=120, arranged=True)
        save_music_as_ogg(gameplay, sr, 'gameplay.ogg')
    else:
        create_all_music()
