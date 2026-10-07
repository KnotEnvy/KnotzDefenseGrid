# src/projectiles.py
import pygame
import math
from .config import get_color # Use palette helper

class Projectile(pygame.sprite.Sprite):
    def __init__(self, tower_data, start_pos, target_pos):
        """Initializes a projectile."""
        super().__init__()
        # Store data needed for re-setup
        self.tower_data = tower_data
        self.setup(tower_data, start_pos, target_pos) # Call setup

        # --- Remove old image creation ---
        # self.image = pygame.Surface(self.size).convert_alpha()
        # self.image.fill(self.color)
        # self.rect = self.image.get_rect(center=self.pos)

    def setup(self, tower_data, start_pos, target_pos):
        """Re-initializes a projectile from the pool."""
        self.tower_data = tower_data # Store for potential re-use if needed
        self.speed = tower_data.get('projectile_speed', 300)
        self.damage = tower_data.get('damage', 10)

        # Get shape info from tower_data's projectile_shape dict
        proj_shape_data = tower_data.get('projectile_shape', {})
        self.shape_type = proj_shape_data.get("type", "circle")
        self.radius = proj_shape_data.get("radius", 3) # For circle
        self.size = (self.radius*2, self.radius*2) if self.shape_type == "circle" else (5,5) # Approximate size for rect
        self.fill_color_idx = proj_shape_data.get("fill_color_idx", 7) # Default Yellow
        self.border_color_idx = proj_shape_data.get("border_color_idx", 1) # Default White
        self.border_width = proj_shape_data.get("border_width", 0) # Default no border


        self.target_enemy = None
        self.lifetime = 5.0
        self.pos = pygame.Vector2(start_pos)
        self.target_pos = pygame.Vector2(target_pos)
        self.direction = (self.target_pos - self.pos).normalize() if (self.target_pos - self.pos).length() > 0 else pygame.Vector2(0, -1)

        # Create rect based on derived size
        self.rect = pygame.Rect(0, 0, self.size[0], self.size[1])
        self.rect.center = self.pos

        self.is_active = True
        self.age = 0.0

        # --- Remove old image creation ---
        # self.image = pygame.Surface(self.size).convert_alpha()
        # self.image.fill(self.color)
        # self.rect = self.image.get_rect(center=self.pos)

    def update(self, dt):
        """Moves the projectile and checks lifetime."""
        if not self.is_active: return

        self.pos += self.direction * self.speed * dt
        self.rect.center = self.pos
        self.age += dt
        if self.age > self.lifetime:
            self.destroy()
        if not pygame.display.get_surface().get_rect().colliderect(self.rect):
            self.destroy()

    def destroy(self):
        """Marks the projectile for removal/pooling."""
        self.is_active = False
        self.kill()

    def handle_hit(self, enemy):
        """Called when the projectile hits an enemy."""
        self.destroy()

    def draw_shape(self, surface):
        """Draws the projectile's shape using pygame.draw."""
        if not self.is_active: return

        fill_color = get_color(self.fill_color_idx)
        border_color = get_color(self.border_color_idx)

        if self.shape_type == "circle":
            pygame.draw.circle(surface, fill_color, self.rect.center, self.radius)
            if self.border_width > 0:
                pygame.draw.circle(surface, border_color, self.rect.center, self.radius, self.border_width)
        else: # Default to rect if type is unknown or "rect"
            pygame.draw.rect(surface, fill_color, self.rect)
            if self.border_width > 0:
                pygame.draw.rect(surface, border_color, self.rect, self.border_width)