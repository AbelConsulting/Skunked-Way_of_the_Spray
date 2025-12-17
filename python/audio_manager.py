"""
Audio Manager - Handles all sound effects and music for the game
"""
import pygame
import os

class AudioManager:
    """Manages all game audio including sound effects and music"""
    
    def __init__(self):
        """Initialize the audio manager"""
        pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
        
        # Sound effect channels for mixing
        self.sfx_volume = 0.7
        # Music balance: balanced blend for cohesion
        self.music_volume = 0.45  # Background music stronger
        self.metal_pad_volume = 0.25  # Metal guitar as subtle accent
        
        # Sound effects dictionary
        self.sounds = {}
        
        # Base paths
        self.base_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'assets', 'audio')
        self.sfx_path = os.path.join(self.base_path, 'sfx')
        self.music_path = os.path.join(self.base_path, 'music')
        
        # Ensure directories exist
        os.makedirs(self.sfx_path, exist_ok=True)
        os.makedirs(self.music_path, exist_ok=True)
        
        # Load all sound effects
        self.load_sounds()
        
        # Music state
        self.current_music = None
        self.music_playing = False
        
        # Metal pad layer for background music
        self.metal_pad_channel = None
        self.metal_pad_sound = None
        self.load_metal_pad()
    
    def load_sounds(self):
        """Load all sound effects"""
        sound_files = {
            # Player sounds
            'jump': 'jump.wav',
            'attack1': 'attack1.wav',
            'attack2': 'attack2.wav',
            'attack3': 'attack3.wav',
            'shadow_strike': 'shadow_strike.wav',
            'player_hit': 'player_hit.wav',
            'land': 'land.wav',
            
            # Enemy sounds
            'enemy_hit': 'enemy_hit.wav',
            'enemy_death': 'enemy_death.wav',
            
            # UI sounds
            'menu_select': 'menu_select.wav',
            'menu_move': 'menu_move.wav',
            'pause': 'pause.wav',
            'combo': 'combo.wav',
            'game_over': 'game_over.wav'
        }
        
        for name, filename in sound_files.items():
            filepath = os.path.join(self.sfx_path, filename)
            
            # Try to load the sound, skip if file doesn't exist
            if os.path.exists(filepath):
                try:
                    sound = pygame.mixer.Sound(filepath)
                    sound.set_volume(self.sfx_volume)
                    self.sounds[name] = sound
                    print(f"✓ Loaded sound: {name}")
                except pygame.error as e:
                    print(f"✗ Failed to load {filename}: {e}")
            else:
                # Create a silent placeholder
                self.sounds[name] = None
    
    def load_metal_pad(self):
        """Load the metal pad sound for background layering"""
        metal_path = os.path.join(self.sfx_path, 'metal_pad.wav')
        if os.path.exists(metal_path):
            try:
                self.metal_pad_sound = pygame.mixer.Sound(metal_path)
                self.metal_pad_sound.set_volume(self.metal_pad_volume)  # Use configurable volume
                print(f"✓ Loaded metal pad layer")
            except pygame.error as e:
                print(f"✗ Failed to load metal pad: {e}")
                self.metal_pad_sound = None
    
    def play_sound(self, sound_name, volume=1.0):
        """
        Play a sound effect
        
        Args:
            sound_name: Name of the sound to play
            volume: Volume multiplier (0.0 to 1.0)
        """
        if sound_name in self.sounds and self.sounds[sound_name] is not None:
            # Create a copy so we can play the same sound multiple times
            sound = self.sounds[sound_name]
            sound.set_volume(self.sfx_volume * volume)
            sound.play()
    
    def play_attack_sound(self, combo_count):
        """
        Play the appropriate attack sound based on combo count
        
        Args:
            combo_count: Current combo number (1, 2, or 3)
        """
        if combo_count == 1:
            self.play_sound('attack1')
        elif combo_count == 2:
            self.play_sound('attack2', volume=1.1)
        elif combo_count >= 3:
            self.play_sound('attack3', volume=1.2)
    
    def play_music(self, music_name, loop=-1):
        """
        Play background music with optional metal pad layer
        
        Args:
            music_name: Name of the music file (without extension)
            loop: Number of times to loop (-1 for infinite)
        """
        # Try OGG first, then WAV
        music_file = None
        for ext in ['.ogg', '.wav', '.mp3']:
            test_file = os.path.join(self.music_path, f"{music_name}{ext}")
            if os.path.exists(test_file):
                music_file = test_file
                break
        
        if music_file:
            try:
                pygame.mixer.music.load(music_file)
                pygame.mixer.music.set_volume(self.music_volume)
                pygame.mixer.music.play(loop)
                self.current_music = music_name
                self.music_playing = True
                print(f"♪ Playing music: {music_name}")
                
                # Layer metal pad for gameplay music
                if music_name == "gameplay" and self.metal_pad_sound:
                    self.metal_pad_channel = self.metal_pad_sound.play(-1)  # Loop indefinitely
                    print(f"🎸 Metal pad layer added")
            except pygame.error as e:
                print(f"✗ Failed to load music {music_name}: {e}")
        else:
            print(f"✗ Music file not found: {music_name} (tried .ogg, .wav, .mp3)")
    
    def stop_music(self):
        """Stop the currently playing music and metal pad layer"""
        pygame.mixer.music.stop()
        if self.metal_pad_channel:
            self.metal_pad_channel.stop()
            self.metal_pad_channel = None
        self.music_playing = False
    
    def pause_music(self):
        """Pause the currently playing music and metal pad"""
        pygame.mixer.music.pause()
        if self.metal_pad_channel:
            self.metal_pad_channel.pause()
    
    def unpause_music(self):
        """Resume paused music and metal pad"""
        pygame.mixer.music.unpause()
        if self.metal_pad_channel:
            self.metal_pad_channel.unpause()
    
    def set_sfx_volume(self, volume):
        """
        Set sound effects volume
        
        Args:
            volume: Volume level (0.0 to 1.0)
        """
        self.sfx_volume = max(0.0, min(1.0, volume))
        
        # Update all loaded sounds
        for sound in self.sounds.values():
            if sound is not None:
                sound.set_volume(self.sfx_volume)
    
    def set_music_volume(self, volume):
        """
        Set music volume
        
        Args:
            volume: Volume level (0.0 to 1.0)
        """
        self.music_volume = max(0.0, min(1.0, volume))
        pygame.mixer.music.set_volume(self.music_volume)
    
    def cleanup(self):
        """Clean up audio resources"""
        pygame.mixer.music.stop()
        pygame.mixer.quit()
