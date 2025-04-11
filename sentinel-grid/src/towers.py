# src/towers.py
import pygame
import math
from .config import get_color # Use palette helper

# --- Add timing constants ---
FIRING_FLASH_DURATION = 0.1 # Seconds the firing flash lasts
SLOW_TOWER_PULSE_SPEED = 4.0 # Radians per second for slow tower idle pulse

class Tower(pygame.sprite.Sprite):
    """Base class for all towers."""
    def __init__(self, tower_id, tower_data, pos, projectile_pool, projectile_group):
        """Initializes a tower instance."""
        super().__init__()

        self.tower_id = tower_id
        self.data = tower_data # Store the raw data dict from JSON
        self.name = tower_data.get('name', 'Unknown Tower')
        self.range = tower_data.get('range', 100)
        self.fire_rate = tower_data.get('fire_rate', 1.0)
        self.cost = tower_data.get('cost', 100)
        self.size = tower_data.get('size', (30, 30)) # Keep size for rect/range draw

        # Store shape info from data
        self.shape_type = tower_data.get("shape_type", "rect")
        self.shape_points = tower_data.get("shape_points", [])
        self.fill_color_idx = tower_data.get("fill_color_idx", 10) # Default Grey index
        self.border_color_idx = tower_data.get("border_color_idx", 1) # Default White index
        self.border_width = tower_data.get("border_width", 1)

        self.pos = pygame.Vector2(pos)
        self.projectile_pool = projectile_pool
        self.projectile_group = projectile_group

        # --- Remove old image creation ---
        # self.image = pygame.Surface(self.size).convert_alpha()
        # self.image.fill(self.color)
        # try:
        #     darker_color = tuple(max(0, c - 50) for c in self.color)
        #     inner_rect = pygame.Rect(5, 5, max(1, self.size[0]-10), max(1, self.size[1]-10))
        #     pygame.draw.rect(self.image, darker_color , inner_rect)
        # except Exception as e:
        #      print(f"Warning: Could not draw inner rect for tower {self.name}. Error: {e}")
        # self.rect = self.image.get_rect(center=self.pos)
        # --- Create rect based on size ---
        self.rect = pygame.Rect(0, 0, self.size[0], self.size[1])
        self.rect.center = self.pos

        self.firing_flash_timer = 0.0 # Timer for firing flash effect

        # State variables
        self.target = None
        self.last_shot_time = 0.0
        self.cooldown = 1.0 / self.fire_rate if self.fire_rate > 0 else float('inf')
        self.is_selected = False

    # find_targets_in_range, find_target remain the same
    def find_targets_in_range(self, enemies_group):
        """Finds all active enemies within the tower's range."""
        targets = []
        range_sq = self.range ** 2 # Use squared distance for efficiency
        for enemy in enemies_group:
            if enemy.is_active: # Only consider active enemies
                dist_sq = (enemy.pos - self.pos).length_squared()
                if dist_sq <= range_sq:
                    targets.append(enemy)
        return targets

    def find_target(self, enemies_group):
         """Finds the single 'best' target (e.g., nearest) from those in range."""
         targets_in_range = self.find_targets_in_range(enemies_group)
         closest_enemy = None
         min_dist_sq = float('inf') # Initialize with infinity

         for enemy in targets_in_range:
             dist_sq = (enemy.pos - self.pos).length_squared()
             if dist_sq < min_dist_sq:
                 min_dist_sq = dist_sq
                 closest_enemy = enemy

         self.target = closest_enemy # Update the tower's target

    def update(self, dt, enemies_group):
        """Base update method for projectile towers."""
        # --- Update Animation Timers ---
        if self.firing_flash_timer > 0:
            self.firing_flash_timer -= dt
        self.find_target(enemies_group)
        self.last_shot_time += dt
        if self.last_shot_time >= self.cooldown:
             if self.target and self.target.is_active:
                  if self.fire():
                       self.last_shot_time = 0.0
                       self.firing_flash_timer = FIRING_FLASH_DURATION # Start the flash

    def fire(self):
        """Default fire method: Creates and launches a projectile."""
        if not self.target or not self.target.is_active:
            return False
        if self.projectile_pool is None or self.projectile_group is None:
             print(f"Critical Error: {self.name} FAILED 'is None' check for pool/group!")
             return False

        # Pass the tower's full data dict, which now includes projectile shape info
        projectile = self.projectile_pool.get(self.data, self.rect.center, self.target.rect.center)

        if projectile:
            self.projectile_group.add(projectile)
            return True
        else:
             # print(f"Error: {self.name} failed to get projectile from pool.") # Quieter
             return False

    def draw_shape(self, surface):
        """Draws the tower's shape using pygame.draw, including animations."""
        # Determine fill color based on animation state
        if self.firing_flash_timer > 0:
            # Use a bright flash color (e.g., palette index 1 - White/Accent)
            fill_color = get_color(1)
        else:
            # Use the tower's normal fill color
            fill_color = get_color(self.fill_color_idx)

        border_color = get_color(self.border_color_idx)
        center_x, center_y = self.rect.centerx, self.rect.centery

        # --- Draw Base Shape ---
        if self.shape_type == "rect":
            pygame.draw.rect(surface, fill_color, self.rect)
            if self.border_width > 0:
                pygame.draw.rect(surface, border_color, self.rect, self.border_width)
        elif self.shape_type == "circle":
             radius = self.size[0] // 2
             pygame.draw.circle(surface, fill_color, self.rect.center, radius)
             if self.border_width > 0:
                 pygame.draw.circle(surface, border_color, self.rect.center, radius, self.border_width)
        elif self.shape_type == "polygon":
            abs_points = [(center_x + p[0], center_y + p[1]) for p in self.shape_points]
            if len(abs_points) > 2:
                pygame.draw.polygon(surface, fill_color, abs_points)
                if self.border_width > 0:
                    pygame.draw.polygon(surface, border_color, abs_points, self.border_width)
            else: # Fallback
                pygame.draw.rect(surface, fill_color, self.rect)
                if self.border_width > 0:
                    pygame.draw.rect(surface, border_color, self.rect, self.border_width)

        # --- Draw Inner Detail (Optional - Not animated here) ---
        inner_radius = max(1, self.size[0] // 5) # Smaller detail
        inner_color = border_color # Use border color for contrast
        pygame.draw.circle(surface, inner_color, self.rect.center, inner_radius)



    def draw_range(self, surface):
        """Draws the tower's range indicator, brighter if selected."""
        # Use palette index 1 (White/Accent) for range circle
        range_color_base = get_color(1, (255, 255, 255))
        alpha = 150 if self.is_selected else 70
        # Create RGBA tuple
        range_color = (range_color_base[0], range_color_base[1], range_color_base[2], alpha)
        pygame.draw.circle(surface, range_color, self.rect.center, self.range, 1)


# --- Specific Tower Type Subclasses ---

class GunTower(Tower):
    pass # Inherits draw_shape

class CannonTower(Tower):
    pass # Inherits draw_shape

class SlowTower(Tower):
    """Applies a slowing effect to enemies within range periodically."""
    def __init__(self, tower_id, tower_data, pos, projectile_pool, projectile_group):
        super().__init__(tower_id, tower_data, pos, projectile_pool, projectile_group)
        self.slow_factor = tower_data.get('slow_factor', 0.5)
        self.slow_duration = tower_data.get('slow_duration', 2.0)
        self.pulse_cooldown = 1.0 / self.fire_rate if self.fire_rate > 0 else float('inf')
        # Idle animation specific state
        self.idle_pulse_timer = 0.0 # Timer for pulsing effect

    def update(self, dt, enemies_group):
        """Overrides base update for pulsing effect and idle animation."""
        # --- Update Animation Timers ---
        self.idle_pulse_timer += dt # Update idle pulse timer

        # --- Apply Slow Effect Logic ---
        self.last_shot_time += dt # Use base class timer
        if self.last_shot_time >= self.pulse_cooldown:
            self.last_shot_time = 0.0 # Reset pulse timer

            targets_in_range = self.find_targets_in_range(enemies_group)
            if targets_in_range:
                 # Add visual pulse effect trigger here later (Phase 9)
                 for enemy in targets_in_range:
                     if enemy.is_active:
                         enemy.apply_slow(self.slow_factor, self.slow_duration)

    def fire(self):
         return False # Slow tower doesn't fire projectiles

    def draw_shape(self, surface):
        """Draws the slow tower with an idle pulse animation."""
        # --- Calculate Idle Pulse Scale ---
        # Use a sine wave for smooth pulsing, cycle based on idle_pulse_timer
        # Scale ranges from e.g., 0.8 to 1.0
        pulse_scale = 0.9 + (math.sin(self.idle_pulse_timer * SLOW_TOWER_PULSE_SPEED) * 0.1)

        # --- Get Colors ---
        fill_color = get_color(self.fill_color_idx)
        border_color = get_color(self.border_color_idx)
        center_x, center_y = self.rect.centerx, self.rect.centery

        # --- Draw Base Shape (Scaled) ---
        if self.shape_type == "rect":
            # Scale the rect size and redraw centered
            w, h = self.rect.width * pulse_scale, self.rect.height * pulse_scale
            scaled_rect = pygame.Rect(0, 0, w, h)
            scaled_rect.center = self.rect.center
            pygame.draw.rect(surface, fill_color, scaled_rect)
            if self.border_width > 0:
                pygame.draw.rect(surface, border_color, scaled_rect, self.border_width)
        elif self.shape_type == "circle":
            # Scale the radius
             radius = int((self.size[0] // 2) * pulse_scale)
             pygame.draw.circle(surface, fill_color, self.rect.center, radius)
             if self.border_width > 0:
                 pygame.draw.circle(surface, border_color, self.rect.center, radius, self.border_width)
        elif self.shape_type == "polygon":
            # Scale the points relative to the center
            abs_points = [(center_x + p[0] * pulse_scale, center_y + p[1] * pulse_scale) for p in self.shape_points]
            if len(abs_points) > 2:
                pygame.draw.polygon(surface, fill_color, abs_points)
                if self.border_width > 0:
                    pygame.draw.polygon(surface, border_color, abs_points, self.border_width)
            else: # Fallback
                 pygame.draw.rect(surface, fill_color, self.rect) # Draw unscaled fallback
                 if self.border_width > 0:
                     pygame.draw.rect(surface, border_color, self.rect, self.border_width)

        # --- Draw Inner Detail (Optional - Also potentially scaled) ---
        inner_radius = max(1, int((self.size[0] // 5) * pulse_scale)) # Scale inner detail too
        inner_color = border_color
        pygame.draw.circle(surface, inner_color, self.rect.center, inner_radius)
        # Add a pulsing visual element later? For now, base draw is enough.
        # Example: Draw a slightly smaller inner polygon that pulses?
        # pulse_scale = 0.5 + (math.sin(pygame.time.get_ticks() * 0.005) + 1) * 0.2 # Slow pulse scale
        # inner_color = get_color(4) # Use blue?
        # center_x, center_y = self.rect.centerx, self.rect.centery
        # if self.shape_type == "polygon":
        #     inner_points = [(center_x + p[0] * pulse_scale, center_y + p[1] * pulse_scale) for p in self.shape_points]
        #     if len(inner_points) > 2:
        #         pygame.draw.polygon(surface, inner_color, inner_points)