# src/tower_platform.py
import pygame
from .config import (PLATFORM_SIZE, PLATFORM_COLOR_IDX,
                   PLATFORM_BORDER_COLOR_IDX, get_color) # Use palette

class TowerPlatform(pygame.sprite.Sprite):
    def __init__(self, x, y):
        """Initializes a tower placement platform."""
        super().__init__()

        # --- Define Shape using pygame.draw ---
        self.image = pygame.Surface(PLATFORM_SIZE, pygame.SRCALPHA) # Use SRCALPHA for potential transparency
        self.image.set_colorkey((0,0,0)) # Make black transparent if needed

        fill_color = get_color(PLATFORM_COLOR_IDX)
        border_color = get_color(PLATFORM_BORDER_COLOR_IDX)
        platform_rect = self.image.get_rect()

        pygame.draw.rect(self.image, fill_color, platform_rect, border_radius=3) # Fill
        pygame.draw.rect(self.image, border_color, platform_rect, 1, border_radius=3) # Border

        self.rect = self.image.get_rect(center=(x, y))
        self.occupied = False
        self.tower = None

    def update(self, *args, **kwargs):
        """Platforms generally don't need much update logic themselves."""
        pass

    # Keep draw method for now, as platforms use self.image which is pre-rendered in __init__
    def draw(self, screen):
        """Explicit draw method."""
        screen.blit(self.image, self.rect)