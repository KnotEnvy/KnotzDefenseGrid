# src/enemies.py
import pygame
import math
from .config import PATH_WAYPOINTS_L1 # Use the globally defined path for now

class Enemy(pygame.sprite.Sprite):
    def __init__(self, enemy_data, path):
        """Initializes an enemy sprite."""
        super().__init__()

        self.name = enemy_data.get('name', 'Unknown Enemy')
        self.max_health = enemy_data.get('health', 10)
        self.health = float(self.max_health) # Use float for smoother health bars later
        self.speed = enemy_data.get('speed', 50) # Pixels per second
        self.reward = enemy_data.get('reward', 0)
        self._color = enemy_data.get('color', (255, 255, 255))
        self._size = enemy_data.get('size', (20, 20))
        self.base_speed = enemy_data.get('speed', 50) # Store original speed
        self.speed = float(self.base_speed) # Current speed can be modified
        self.slow_timer = 0.0 # Timer for slow effect 

        self.path = path
        self.current_waypoint_index = 0
        if self.path:
                    self.pos = pygame.Vector2(self.path[0])
                    if len(self.path) > 1:
                        self.target_waypoint = self.path[self.current_waypoint_index + 1] # Start targeting the *next* point
                    else:
                        self.target_waypoint = self.path[0] # Target the start point if only one
        else:
            self.pos = pygame.Vector2(0, 0) # Default position if no path
            self.target_waypoint = self.pos
            self.current_waypoint_index = -1 # Indicate no valid path index


        self.image = pygame.Surface(self._size).convert_alpha() # Use enemy_data size/color
        self.image.fill(self._color)
        self.rect = self.image.get_rect(center=self.pos)

        self.is_active = False
        self.reached_end = False

    def setup(self, enemy_data, path):
         """Re-initializes an enemy from the pool."""
         self.name = enemy_data.get('name', 'Unknown Enemy')
         self.max_health = enemy_data.get('health', 10)
         self.health = float(self.max_health)
         self.speed = enemy_data.get('speed', 50)
         self.reward = enemy_data.get('reward', 0)
         self._color = enemy_data.get('color', (255, 255, 255))
         self._size = enemy_data.get('size', (20, 20))
         self.base_speed = enemy_data.get('speed', 50)
         self.speed = float(self.base_speed)
         self.slow_timer = 0.0 # Reset slow effect on setup


         self.path = path
         self.current_waypoint_index = 0
         if self.path:
             self.pos = pygame.Vector2(self.path[0])
             if len(self.path) > 1:
                  self.target_waypoint = self.path[self.current_waypoint_index + 1]
             else:
                  self.target_waypoint = self.path[0]
         else: # Handle no path case during setup too
             self.pos = pygame.Vector2(0, 0)
             self.target_waypoint = self.pos
             self.current_waypoint_index = -1

         self.image = pygame.Surface(self._size).convert_alpha()
         self.image.fill(self._color)
         self.rect = self.image.get_rect(center=self.pos)

         self.is_active = True
         self.reached_end = False
         # print(f"Enemy '{self.name}' activated from pool.")
         
    def apply_slow(self, factor, duration):
        """Applies a slow effect if not already slowed more."""
        # Only apply if this slow is stronger (lower factor) or if not currently slowed
        current_factor = self.speed / self.base_speed if self.base_speed > 0 else 1.0
        if factor < current_factor or self.slow_timer <= 0:
             self.speed = self.base_speed * factor
             self.slow_timer = duration
             # print(f"{self.name} slowed to {self.speed}. Factor: {factor}") # Debug


    def update(self, dt):
        """Updates enemy position, state, and effects."""
        if not self.is_active: return # Skip if inactive

        # --- Update Effects ---
        if self.slow_timer > 0:
            self.slow_timer -= dt
            if self.slow_timer <= 0:
                # print(f"{self.name} slow expired. Speed back to {self.base_speed}") # Debug
                self.speed = self.base_speed # Restore base speed
                self.slow_timer = 0 # Ensure timer is exactly 0

        # --- Movement Logic ---
        # ... (rest of movement logic using self.speed) ...
        if not self.path or self.current_waypoint_index >= len(self.path) -1:
            return

        target_pos = pygame.Vector2(self.target_waypoint)
        direction = target_pos - self.pos
        distance = direction.length()
        # Use current speed for movement calculation
        move_dist = self.speed * dt if self.speed > 0 else 0 # Handle zero speed case

        if distance <= move_dist:
            self.pos = target_pos
            self.current_waypoint_index += 1
            if self.current_waypoint_index >= len(self.path) - 1:
                self.reach_end()
            else:
                self.target_waypoint = self.path[self.current_waypoint_index + 1]
        elif distance > 0: # Avoid normalize if distance is zero
            direction.normalize_ip()
            self.pos += direction * move_dist

        self.rect.center = self.pos
    def take_damage(self, amount):
        """Reduces health and checks for death."""
        if not self.is_active: return # Don't take damage if already dead/inactive

        self.health -= amount
        # print(f"{self.name} took {amount} damage, {self.health}/{self.max_health} HP left.")
        if self.health <= 0:
            self.die()

    def die(self):
        """Handles enemy death (from damage)."""
        # print(f"{self.name} has died.")
        self.is_active = False
        self.reached_end = False # Ensure flag is false if dying normally
        self.kill() # Remove from groups immediately upon death by damage

    def reach_end(self):
        """Handles reaching the end of the path (sets flag, stops activity)."""
        if self.is_active: # Only process if still active
            print(f"{self.name} reached the end flag set.")
            self.is_active = False # Stop taking damage, etc.
            self.reached_end = True # Set the flag for main loop processing
            # Optionally, trigger game over or other effects here

    def draw_health_bar(self, surface):
         """Draws a simple health bar above the enemy."""
         if self.is_active and self.health < self.max_health:
             bar_width = self._size[0]
             bar_height = 5
             fill_width = int(bar_width * (self.health / self.max_health))
             health_bar_rect = pygame.Rect(0, 0, bar_width, bar_height)
             health_bar_rect.midbottom = self.rect.midtop - pygame.Vector2(0, 3) # Position above sprite

             pygame.draw.rect(surface, (255, 0, 0), health_bar_rect) # Red background
             if fill_width > 0:
                 fill_rect = pygame.Rect(health_bar_rect.left, health_bar_rect.top, fill_width, bar_height)
                 pygame.draw.rect(surface, (0, 255, 0), fill_rect) # Green health fill
         # Draw slow indicator if slowed
         if self.is_active and self.slow_timer > 0:
              # Draw a small blue square indicator near the health bar or corner
              indicator_rect = pygame.Rect(0, 0, 8, 8)
              indicator_rect.topleft = self.rect.topright + pygame.Vector2(2, -10) # Position near top-right
              pygame.draw.rect(surface, (0, 150, 255), indicator_rect)