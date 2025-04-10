# src/projectiles.py
import pygame
import math

class Projectile(pygame.sprite.Sprite):
    def __init__(self, tower_data, start_pos, target_pos):
        """Initializes a projectile."""
        super().__init__()

        self.speed = tower_data.get('projectile_speed', 300)
        self.damage = tower_data.get('damage', 10)
        self.color = tower_data.get('projectile_color', (255, 255, 255))
        self.size = tower_data.get('projectile_size', (5, 5))
        self.target_enemy = None # Store reference if needed later for homing
        self.lifetime = 5.0 # Max seconds projectile lives to prevent stray bullets

        self.pos = pygame.Vector2(start_pos)
        self.target_pos = pygame.Vector2(target_pos) # Initial target position

        # Calculate direction (only once at creation for non-homing)
        self.direction = (self.target_pos - self.pos).normalize() if (self.target_pos - self.pos).length() > 0 else pygame.Vector2(0, -1) # Default up if target is at same pos

        # Create image
        self.image = pygame.Surface(self.size).convert_alpha()
        self.image.fill(self.color)
        self.rect = self.image.get_rect(center=self.pos)

        self.is_active = True # For pooling
        self.age = 0.0

    def setup(self, tower_data, start_pos, target_pos):
        """Re-initializes a projectile from the pool."""
        self.speed = tower_data.get('projectile_speed', 300)
        self.damage = tower_data.get('damage', 10)
        self.color = tower_data.get('projectile_color', (255, 255, 255))
        self.size = tower_data.get('projectile_size', (5, 5))
        self.target_enemy = None
        self.lifetime = 5.0

        self.pos = pygame.Vector2(start_pos)
        self.target_pos = pygame.Vector2(target_pos)
        self.direction = (self.target_pos - self.pos).normalize() if (self.target_pos - self.pos).length() > 0 else pygame.Vector2(0, -1)

        # Recreate image if necessary (or reuse if always same size/color)
        self.image = pygame.Surface(self.size).convert_alpha()
        self.image.fill(self.color)
        self.rect = self.image.get_rect(center=self.pos)

        self.is_active = True
        self.age = 0.0
        # print("Projectile activated from pool.")


    def update(self, dt):
        """Moves the projectile and checks lifetime."""
        if not self.is_active:
            return

        # Move projectile
        self.pos += self.direction * self.speed * dt
        self.rect.center = self.pos

        # Check lifetime
        self.age += dt
        if self.age > self.lifetime:
            self.destroy()

        # Check if off-screen (another way to destroy)
        if not pygame.display.get_surface().get_rect().colliderect(self.rect):
            self.destroy()

    def destroy(self):
        """Marks the projectile for removal/pooling."""
        self.is_active = False
        self.kill() # Remove from sprite groups

    def handle_hit(self, enemy):
        """Called when the projectile hits an enemy."""
        # Apply damage in the main loop/collision handler
        # print(f"Projectile hit {enemy.name}")
        self.destroy() # Projectile is consumed on hit (for simple bullets)