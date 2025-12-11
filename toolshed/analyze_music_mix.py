"""
Analyze and optimize the music mix for a metal guitar focused feel
Creates a cleaner version without the original background elements
"""
import wave
import numpy as np
import os

def analyze_audio_file(filepath):
    """Analyze an audio file for properties"""
    try:
        with wave.open(filepath, 'rb') as wav_file:
            n_channels = wav_file.getnchannels()
            sample_width = wav_file.getsampwidth()
            framerate = wav_file.getframerate()
            n_frames = wav_file.getnframes()
            
            duration = n_frames / framerate
            
            print(f"\n📊 Analysis: {os.path.basename(filepath)}")
            print(f"   Channels: {n_channels}")
            print(f"   Sample rate: {framerate} Hz")
            print(f"   Duration: {duration:.2f} seconds")
            print(f"   Bit depth: {sample_width * 8} bit")
            
            # Read audio data
            frames = wav_file.readframes(n_frames)
            audio_data = np.frombuffer(frames, dtype=np.int16)
            
            # Calculate RMS (loudness)
            rms = np.sqrt(np.mean(audio_data ** 2))
            print(f"   RMS Level: {rms:.0f} (0-32767 scale)")
            
            return {
                'channels': n_channels,
                'sample_rate': framerate,
                'duration': duration,
                'bit_depth': sample_width * 8,
                'rms': rms
            }
    except Exception as e:
        print(f"   Error reading file: {e}")
        return None


def main():
    print("🎵 Audio Mix Analysis & Optimization")
    print("=" * 60)
    
    base_music = "assets/audio/music/gameplay.wav"
    metal_guitar = "assets/audio/sfx/metal_pad.wav"
    
    # Analyze current files
    print("\nCurrent Audio Files:")
    
    if os.path.exists(base_music):
        music_info = analyze_audio_file(base_music)
    else:
        print(f"\n⚠️  {base_music} not found")
        music_info = None
    
    if os.path.exists(metal_guitar):
        guitar_info = analyze_audio_file(metal_guitar)
    else:
        print(f"\n⚠️  {metal_guitar} not found")
        guitar_info = None
    
    print("\n" + "=" * 60)
    print("🎸 OPTIMIZATION RECOMMENDATIONS:")
    print("=" * 60)
    
    print("""
CURRENT SETUP ISSUE:
- The base gameplay music has multiple melodic layers
- Metal guitar riff adds more complexity on top
- Result: Too many musical elements competing

SOLUTION - Metal Guitar Focused Mix:
The metal guitar should be the dominant element with:
  1. Bass rhythm keeping time
  2. Metal guitar riff as main melody
  3. Minimal or no melodic background

NEXT STEPS:
Option A) Use existing gameplay music with lower volume:
   - Keep gameplay.wav but reduce volume to background level
   - Metal guitar takes the lead
   - Update audio_manager.py to lower music_volume

Option B) Create a stripped-down gameplay track:
   - Remove melodic instruments from gameplay.wav
   - Keep only drums and bass
   - Metal guitar plays main riff on top
   - Would require audio editing

RECOMMENDATION:
Start with Option A - simpler and immediate.
Adjust metal_pad volume in audio_manager.py:
   - metal_pad_sound.set_volume(0.5) -> increase from 0.3
   - pygame.mixer.music.set_volume(self.music_volume) -> decrease to 0.3

This creates:
✓ Metal guitar as lead instrument
✓ Background music for texture
✓ Clear metal feel without chaos
""")
    
    print("\n" + "=" * 60)
    print("Configuration Changes Needed:")
    print("=" * 60)
    print("""
File: src/audio_manager.py

Change 1 - Lower background music volume:
   Line: self.music_volume = 0.5
   To:   self.music_volume = 0.3

Change 2 - Increase metal guitar prominence:
   Line: self.metal_pad_sound.set_volume(0.3)
   To:   self.metal_pad_sound.set_volume(0.5)

Change 3 - Optional: Add description comment
   # Music balance: guitar lead (0.5) + background (0.3)
   # Adjust volumes to taste
""")


if __name__ == "__main__":
    main()
    
    print("\nTo apply changes, edit audio_manager.py and test!")
