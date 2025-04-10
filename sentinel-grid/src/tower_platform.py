# src/tower_platform.py
import pygame
from .config import PLATFORM_SIZE, PLATFORM_COLOR, PLATFORM_BORDER_COLOR, BLACK

class TowerPlatform(pygame.sprite.Sprite):
    def __init__(self, x, y):
        """Initializes a tower placement platform."""
        super().__init__()
        self.image = pygame.Surface(PLATFORM_SIZE)
        self.image.fill(PLATFORM_COLOR)
        pygame.draw.rect(self.image, PLATFORM_BORDER_COLOR, self.image.get_rect(), 1) # Border
        self.rect = self.image.get_rect(center=(x, y))
        self.occupied = False # Track if a tower is built here
        self.tower = None # Reference to the tower instance later

    def update(self, *args, **kwargs):
        """Platforms generally don't need much update logic themselves."""
        pass # Keep this method for group updates

    def draw(self, screen):
        """Explicit draw method (optional, sprite groups usually handle this)."""
        screen.blit(self.image, self.rect)