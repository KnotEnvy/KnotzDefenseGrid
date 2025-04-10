# src/core.py
import pygame
import math # For pulsing animation
from .config import get_color # Use palette helper

class Core(pygame.sprite.Sprite):
    def __init__(self, pos, health):
        """Initializes the Core objective."""
        super().__init__()

        self.max_health = health
        self.current_health = float(health)

        # --- Define Core Shape --- (Can be customized)
        self.shape_type = "circle"
        self.base_radius = 25
        self.fill_color_idx = 7 # Yellow
        self.border_color_idx = 1 # White
        self.border_width = 2

        self.pos = pygame.Vector2(pos)
        self.rect = pygame.Rect(0, 0, self.base_radius * 2, self.base_radius * 2)
        self.rect.center = self.pos

        self.pulse_speed = 2.0 # Radians per second for pulsing effect
        self.pulse_amplitude = 3 # Pixels variation in radius

        print(f"Core Initialized at {pos} with {self.max_health} HP.")

        # --- Remove old image creation ---
        # self.image = pygame.Surface((60, 60), pygame.SRCALPHA)
        # core_radius = 25
        # center_pos = (30, 30)
        # pygame.draw.circle(self.image, YELLOW, center_pos, core_radius)
        # pygame.draw.circle(self.image, BLACK, center_pos, core_radius, 2)
        # self.rect = self.image.get_rect(center=pos)


    def take_damage(self, amount):
        """Reduces Core health."""
        if self.current_health > 0:
            self.current_health -= amount
            print(f"Core took {amount} damage. Current HP: {self.current_health}/{self.max_health}")
            if self.current_health <= 0:
                self.current_health = 0
                print("Core destroyed!")

    def update(self, dt):
        """Core update for animations like pulsing."""
        # Keep rect updated in case position changes (it doesn't currently)
        self.rect.center = self.pos
        # Add pulsing logic here if desired (calculated in draw_shape)

    def draw_shape(self, surface):
        """Draws the Core's shape."""
        fill_color = get_color(self.fill_color_idx)
        border_color = get_color(self.border_color_idx)

        # Calculate pulsing radius
        time_sec = pygame.time.get_ticks() / 1000.0
        pulse_offset = math.sin(time_sec * self.pulse_speed) * self.pulse_amplitude
        current_radius = max(1, int(self.base_radius + pulse_offset)) # Ensure radius > 0

        if self.shape_type == "circle":
            pygame.draw.circle(surface, fill_color, self.rect.center, current_radius)
            if self.border_width > 0:
                pygame.draw.circle(surface, border_color, self.rect.center, current_radius, self.border_width)
        # Add other shape types if needed

    def draw(self, surface):
        """Deprecated draw using image - use draw_shape now."""
        # surface.blit(self.image, self.rect)
        pass # Do nothing here