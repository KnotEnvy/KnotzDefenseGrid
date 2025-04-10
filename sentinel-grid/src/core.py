# src/core.py
import pygame
from .config import YELLOW, BLACK # Use some distinct colors

class Core(pygame.sprite.Sprite):
    def __init__(self, pos, health):
        """Initializes the Core objective."""
        super().__init__()

        self.max_health = health
        self.current_health = float(health) # Use float for precision if needed

        # Visual Representation (e.g., a yellow circle)
        self.image = pygame.Surface((60, 60), pygame.SRCALPHA) # Use SRCALPHA for transparency
        core_radius = 25
        center_pos = (30, 30)
        pygame.draw.circle(self.image, YELLOW, center_pos, core_radius)
        pygame.draw.circle(self.image, BLACK, center_pos, core_radius, 2) # Black border

        self.rect = self.image.get_rect(center=pos)
        self.pos = pygame.Vector2(pos)

        print(f"Core Initialized at {pos} with {self.max_health} HP.")

    def take_damage(self, amount):
        """Reduces Core health."""
        if self.current_health > 0:
            self.current_health -= amount
            print(f"Core took {amount} damage. Current HP: {self.current_health}/{self.max_health}")
            if self.current_health <= 0:
                self.current_health = 0
                print("Core destroyed!")
                # Trigger game over state in GameManager

    def update(self, dt):
        """Core generally doesn't need per-frame updates unless animated."""
        pass

    def draw(self, surface):
        """Explicit draw if not using group draw consistently."""
        surface.blit(self.image, self.rect)