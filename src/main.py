"""
Skunk Fu - 2D Beat 'em Up Platformer
Main game entry point
"""
import pygame
import sys
from game import Game

def main():
    """Initialize and run the game"""
    pygame.init()
    
    # Game configuration
    SCREEN_WIDTH = 1280
    SCREEN_HEIGHT = 720
    FPS = 60
    
    # Create game window
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("Skunk Fu - Ninja Skunk")
    
    # Initialize game
    game = Game(screen, SCREEN_WIDTH, SCREEN_HEIGHT)
    clock = pygame.time.Clock()
    
    # Game loop
    running = True
    while running:
        dt = clock.tick(FPS) / 1000.0  # Delta time in seconds
        
        # Handle events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            game.handle_event(event)
        
        # Update game state
        game.update(dt)
        
        # Render
        game.render()
        pygame.display.flip()
    
    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()
