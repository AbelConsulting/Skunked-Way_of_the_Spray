"""
Sprite loader and animation handler
"""
import pygame
import os

class SpriteLoader:
    """Utility class for loading and managing sprites"""
    
    def __init__(self):
        self.sprites = {}
        self.base_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "sprites")
    
    def load_sprite(self, path, scale=None):
        """Load a single sprite image"""
        try:
            full_path = os.path.join(self.base_path, path)
            image = pygame.image.load(full_path).convert_alpha()
            if scale:
                image = pygame.transform.scale(image, scale)
            return image
        except pygame.error as e:
            print(f"Warning: Could not load sprite {path}: {e}")
            # Return a colored rectangle as fallback
            surf = pygame.Surface((50, 50))
            surf.fill((255, 0, 255))  # Magenta to indicate missing sprite
            return surf
    
    def load_spritesheet(self, path, frame_width, frame_height, num_frames, scale=None):
        """Load a sprite sheet and split it into frames
        
        This loader attempts to detect uniform padding between frames (1..8px)
        and will compute the effective frame width/stride when sheets include
        padding between frames. If no padding is found, it falls back to using
        a simple division of sheet width by frame count.

        Args:
            path: Path to sprite sheet image
            frame_width: Hint width of each frame in pixels (used as fallback)
            frame_height: Height of each frame in pixels
            num_frames: Number of frames in the sheet (horizontal)
            scale: Optional tuple (width, height) to scale each frame
        """
        try:
            full_path = os.path.join(self.base_path, path)
            sheet = pygame.image.load(full_path).convert_alpha()
            frames = []

            sheet_w, sheet_h = sheet.get_size()

            # Try to detect uniform padding between frames (1..8 px)
            detected_pad = 0
            detected_frame_w = None
            for pad in range(1, 9):
                adjusted = sheet_w - pad * (num_frames - 1)
                if adjusted > 0 and (adjusted % num_frames) == 0:
                    detected_pad = pad
                    detected_frame_w = adjusted // num_frames
                    break

            if detected_pad > 0:
                src_frame_w = detected_frame_w
                frame_stride = src_frame_w + detected_pad
                print(f"SpriteLoader (py): sprite {path} -> detected pad={detected_pad}, frameWidth={src_frame_w}, stride={frame_stride}")
            elif sheet_w % num_frames == 0:
                src_frame_w = sheet_w // num_frames
                frame_stride = src_frame_w
                # If src_frame_w differs from provided hint, prefer the detected one
                if src_frame_w != frame_width:
                    print(f"SpriteLoader (py): sprite {path} width {sheet_w} divisible by {num_frames}; using frameWidth={src_frame_w}")
            else:
                # Fall back to using provided hint/frame_width and assume frames are packed
                src_frame_w = frame_width
                frame_stride = frame_width
                print(f"SpriteLoader (py): sprite {path} width {sheet_w} not divisible and no pad found; falling back to hint frameWidth={frame_width}")

            # Compute optional centering offset if total used width is smaller
            total_used = (num_frames - 1) * frame_stride + src_frame_w
            frame_offset = 0
            if sheet_w > total_used:
                frame_offset = (sheet_w - total_used) // 2

            # Extract frames using computed stride/width
            for i in range(num_frames):
                sx = frame_offset + i * frame_stride
                source_rect = pygame.Rect(sx, 0, src_frame_w, frame_height)
                frame = pygame.Surface((src_frame_w, frame_height), pygame.SRCALPHA)
                frame.blit(sheet, (0, 0), source_rect)

                # Scale if requested
                if scale:
                    frame = pygame.transform.scale(frame, scale)
                frames.append(frame)

            return frames
        except pygame.error as e:
            print(f"Warning: Could not load spritesheet {path}: {e}")
            # Return placeholder frames
            size = scale if scale else (frame_width, frame_height)
            surf = pygame.Surface(size, pygame.SRCALPHA)
            surf.fill((255, 0, 255))
            return [surf]


class Animation:
    """Handles sprite animation"""
    
    def __init__(self, frames, frame_duration=0.1, loop=True):
        self.frames = frames
        self.frame_duration = frame_duration
        self.loop = loop
        self.current_frame = 0
        self.timer = 0
        self.finished = False
    
    def update(self, dt):
        """Update animation"""
        if self.finished and not self.loop:
            return
        
        self.timer += dt
        if self.timer >= self.frame_duration:
            self.timer = 0
            self.current_frame += 1
            
            if self.current_frame >= len(self.frames):
                if self.loop:
                    self.current_frame = 0
                else:
                    self.current_frame = len(self.frames) - 1
                    self.finished = True
    
    def get_current_frame(self):
        """Get the current frame image"""
        return self.frames[self.current_frame]
    
    def reset(self):
        """Reset animation to start"""
        self.current_frame = 0
        self.timer = 0
        self.finished = False


# Global sprite loader instance
sprite_loader = SpriteLoader()
