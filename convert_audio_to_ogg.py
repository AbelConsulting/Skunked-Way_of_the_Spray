#!/usr/bin/env python3
"""
Convert all WAV audio assets to OGG Vorbis for smaller file sizes and
faster network transfer. Keeps the original WAV files as fallback.

Usage:
    python convert_audio_to_ogg.py

Requires: ffmpeg in PATH
"""

import os
import subprocess
import sys
from pathlib import Path

AUDIO_DIR = Path(__file__).parent / "assets" / "audio"
QUALITY = "4"  # OGG quality 0-10 (4 ≈ ~128kbps, good for game SFX)
MUSIC_QUALITY = "5"  # Slightly higher for music

def convert_wav_to_ogg(wav_path: Path, quality: str) -> bool:
    ogg_path = wav_path.with_suffix(".ogg")
    if ogg_path.exists():
        # Skip if OGG is newer than WAV
        if ogg_path.stat().st_mtime >= wav_path.stat().st_mtime:
            print(f"  SKIP (up-to-date): {ogg_path.name}")
            return True

    cmd = [
        "ffmpeg", "-y", "-i", str(wav_path),
        "-c:a", "libvorbis", "-q:a", quality,
        str(ogg_path)
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            wav_kb = wav_path.stat().st_size / 1024
            ogg_kb = ogg_path.stat().st_size / 1024
            ratio = (1 - ogg_kb / wav_kb) * 100 if wav_kb > 0 else 0
            print(f"  OK: {wav_path.name} -> {ogg_path.name}  "
                  f"({wav_kb:.0f}KB -> {ogg_kb:.0f}KB, -{ratio:.0f}%)")
            return True
        else:
            print(f"  FAIL: {wav_path.name}: {result.stderr[:200]}")
            return False
    except FileNotFoundError:
        print("ERROR: ffmpeg not found in PATH. Install it first.")
        sys.exit(1)
    except subprocess.TimeoutExpired:
        print(f"  TIMEOUT: {wav_path.name}")
        return False


def main():
    sfx_dir = AUDIO_DIR / "sfx"
    music_dir = AUDIO_DIR / "music"

    print("=== Converting SFX (WAV -> OGG Vorbis) ===")
    sfx_count = 0
    for wav in sorted(sfx_dir.glob("*.wav")):
        if convert_wav_to_ogg(wav, QUALITY):
            sfx_count += 1

    print(f"\n=== Converting Music (WAV -> OGG Vorbis) ===")
    music_count = 0
    for wav in sorted(music_dir.glob("*.wav")):
        if convert_wav_to_ogg(wav, MUSIC_QUALITY):
            music_count += 1

    print(f"\nDone! Converted {sfx_count} SFX + {music_count} music files.")
    print("OGG files are alongside the original WAVs.")
    print("Update your JS code to prefer .ogg with .wav fallback.")


if __name__ == "__main__":
    main()
