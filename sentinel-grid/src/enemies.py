# src/enemies.py
import pygame
import math
# Use get_color from config
from .config import get_color, RED, GREEN # Keep old colors for health bar for now

class Enemy(pygame.sprite.Sprite):
    def __init__(self, enemy_data, path):
        """Initializes an enemy sprite."""
        super().__init__()
        self.path = path # Path needed for initial position
        self.setup(enemy_data, path) # Call setup to initialize fully

        # --- Remove old image creation ---
        # self.image = pygame.Surface(self._size).convert_alpha()
        # self.image.fill(self._color)
        # self.rect = self.image.get_rect(center=self.pos)
        # Instead, create rect based on size data for collision
        self._size = self.enemy_data.get('size', (20, 20))
        self.rect = pygame.Rect(0, 0, self._size[0], self._size[1])
        if self.path:
            self.rect.center = self.pos
        else:
            self.rect.center = (0, 0)


    def setup(self, enemy_data, path):
         """Re-initializes an enemy from the pool."""
         self.enemy_data = enemy_data # Store the data dict
         self.name = enemy_data.get('name', 'Unknown Enemy')
         self.max_health = enemy_data.get('health', 10)
         self.health = float(self.max_health)
         self.base_speed = enemy_data.get('speed', 50)
         self.speed = float(self.base_speed)
         self.reward = enemy_data.get('reward', 0)
         self.slow_timer = 0.0

         # Store shape info from data
         self.shape_type = enemy_data.get("shape_type", "rect")
         self.shape_points = enemy_data.get("shape_points", []) # For polygons
         self.fill_color_idx = enemy_data.get("fill_color_idx", 6) # Default Red index
         self.border_color_idx = enemy_data.get("border_color_idx", 1) # Default White index
         self.border_width = enemy_data.get("border_width", 1)
         self._size = enemy_data.get('size', (20, 20)) # Keep size for health bar and rect

         self.path = path
         self.current_waypoint_index = 0
         if self.path:
             self.pos = pygame.Vector2(self.path[0])
             if len(self.path) > 1:
                  self.target_waypoint = self.path[self.current_waypoint_index + 1]
             else:
                  self.target_waypoint = self.path[0]
             self.rect = pygame.Rect(0, 0, self._size[0], self._size[1]) # Recreate rect
             self.rect.center = self.pos
         else:
             self.pos = pygame.Vector2(0, 0)
             self.target_waypoint = self.pos
             self.current_waypoint_index = -1
             self.rect = pygame.Rect(0, 0, self._size[0], self._size[1])
             self.rect.center = self.pos

         self.is_active = True
         self.reached_end = False

         # --- Remove old image creation ---
         # self.image = pygame.Surface(self._size).convert_alpha()
         # self.image.fill(self._color)
         # self.rect = self.image.get_rect(center=self.pos)

    def apply_slow(self, factor, duration):
        """Applies a slow effect if not already slowed more."""
        current_factor = self.speed / self.base_speed if self.base_speed > 0 else 1.0
        if factor < current_factor or self.slow_timer <= 0:
             self.speed = self.base_speed * factor
             self.slow_timer = duration

    def update(self, dt):
        """Updates enemy position, state, and effects."""
        if not self.is_active: return

        if self.slow_timer > 0:
            self.slow_timer -= dt
            if self.slow_timer <= 0:
                self.speed = self.base_speed
                self.slow_timer = 0

        if not self.path or self.current_waypoint_index >= len(self.path) -1:
            # Update rect position even if not moving along path anymore
            self.rect.center = self.pos
            return

        target_pos = pygame.Vector2(self.target_waypoint)
        direction = target_pos - self.pos
        distance = direction.length()
        move_dist = self.speed * dt if self.speed > 0 else 0

        if distance <= move_dist:
            self.pos = target_pos
            self.current_waypoint_index += 1
            if self.current_waypoint_index >= len(self.path) - 1:
                self.reach_end()
            else:
                self.target_waypoint = self.path[self.current_waypoint_index + 1]
        elif distance > 0:
            direction.normalize_ip()
            self.pos += direction * move_dist

        self.rect.center = self.pos # Keep rect updated

    def take_damage(self, amount):
        """Reduces health and checks for death."""
        if not self.is_active: return
        self.health -= amount
        if self.health <= 0:
            self.die()

    def die(self):
        """Handles enemy death (from damage)."""
        self.is_active = False
        self.reached_end = False
        self.kill()

    def reach_end(self):
        """Handles reaching the end of the path."""
        if self.is_active:
            # print(f"{self.name} reached the end flag set.") # Quieter
            self.is_active = False
            self.reached_end = True

    def draw_shape(self, surface):
        """Draws the enemy's shape using pygame.draw."""
        if not self.is_active: return

        fill_color = get_color(self.fill_color_idx)
        border_color = get_color(self.border_color_idx)
        center_x, center_y = int(self.pos.x), int(self.pos.y)

        if self.shape_type == "rect":
            # Adjust rect position before drawing if using rect shape directly
            shape_rect = pygame.Rect(0, 0, self._size[0], self._size[1])
            shape_rect.center = self.rect.center
            pygame.draw.rect(surface, fill_color, shape_rect)
            if self.border_width > 0:
                pygame.draw.rect(surface, border_color, shape_rect, self.border_width)
        elif self.shape_type == "circle":
             radius = self._size[0] // 2 # Approximate from size
             pygame.draw.circle(surface, fill_color, self.rect.center, radius)
             if self.border_width > 0:
                 pygame.draw.circle(surface, border_color, self.rect.center, radius, self.border_width)
        elif self.shape_type == "polygon":
            # Translate relative points to absolute screen coordinates
            abs_points = [(center_x + p[0], center_y + p[1]) for p in self.shape_points]
            if len(abs_points) > 2: # Need at least 3 points for polygon
                pygame.draw.polygon(surface, fill_color, abs_points)
                if self.border_width > 0:
                    pygame.draw.polygon(surface, border_color, abs_points, self.border_width)
            else: # Fallback if polygon points are bad
                 pygame.draw.rect(surface, fill_color, self.rect) # Draw fallback rect
                 if self.border_width > 0:
                      pygame.draw.rect(surface, border_color, self.rect, self.border_width)

        # Health bar and slow indicator draw calls remain the same for now
        self.draw_health_bar(surface)
        self.draw_slow_indicator(surface)


    def draw_health_bar(self, surface):
         """Draws a simple health bar above the enemy."""
         if self.is_active and self.health < self.max_health:
             bar_width = self._size[0]
             bar_height = 5
             fill_width = int(bar_width * (self.health / self.max_health))
             # Position bar relative to the *current* rect top
             health_bar_bg_rect = pygame.Rect(0, 0, bar_width, bar_height)
             health_bar_bg_rect.midbottom = self.rect.midtop - pygame.Vector2(0, 3)

             pygame.draw.rect(surface, RED, health_bar_bg_rect) # Use fixed RED for background
             if fill_width > 0:
                 fill_rect = pygame.Rect(health_bar_bg_rect.left, health_bar_bg_rect.top, fill_width, bar_height)
                 pygame.draw.rect(surface, GREEN, fill_rect) # Use fixed GREEN for fill


    def draw_slow_indicator(self, surface):
        """Draws slow indicator if slowed."""
        if self.is_active and self.slow_timer > 0:
            indicator_rect = pygame.Rect(0, 0, 8, 8)
            # Position relative to the *current* rect topright
            indicator_rect.topleft = self.rect.topright + pygame.Vector2(2, -10)
            # Use a fixed color or a palette color? Let's use palette index 4 (Blue)
            pygame.draw.rect(surface, get_color(4, (0, 150, 255)), indicator_rect)