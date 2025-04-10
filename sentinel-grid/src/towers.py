# src/towers.py
import pygame
import math
# Import Projectile if type hinting or direct instantiation was needed,
# but it's mainly handled via the pool passed in __init__.
# from .projectiles import Projectile

class Tower(pygame.sprite.Sprite):
    """Base class for all towers."""
    def __init__(self, tower_id, tower_data, pos, projectile_pool, projectile_group):
        """Initializes a tower instance."""
        super().__init__()

        self.tower_id = tower_id
        self.data = tower_data # Store the raw data dict from JSON
        self.name = tower_data.get('name', 'Unknown Tower')
        self.range = tower_data.get('range', 100)
        self.fire_rate = tower_data.get('fire_rate', 1.0) # Pulses/shots per second
        self.cost = tower_data.get('cost', 100)
        self.color = tower_data.get('color', (100, 100, 100))
        self.size = tower_data.get('size', (30, 30))

        self.pos = pygame.Vector2(pos)
        # References to external systems needed for operation
        self.projectile_pool = projectile_pool
        self.projectile_group = projectile_group

        # Visuals
        self.image = pygame.Surface(self.size).convert_alpha()
        self.image.fill(self.color)
        # Simple visual distinction (e.g., inner darker rect)
        try: # Handle potential division by zero if color component is 0
            darker_color = tuple(max(0, c - 50) for c in self.color) # Make it slightly darker
            inner_rect = pygame.Rect(5, 5, max(1, self.size[0]-10), max(1, self.size[1]-10))
            pygame.draw.rect(self.image, darker_color , inner_rect)
        except Exception as e:
             print(f"Warning: Could not draw inner rect for tower {self.name}. Error: {e}")

        self.rect = self.image.get_rect(center=self.pos)

        # State variables
        self.target = None # Current single enemy target (for projectile towers)
        self.last_shot_time = 0.0 # Time since last shot/pulse
        self.cooldown = 1.0 / self.fire_rate if self.fire_rate > 0 else float('inf')
        self.is_selected = False # For showing range/upgrade UI

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
        """
        Base update method, primarily for single-target projectile towers.
        Subclasses for effect towers (like SlowTower) should override this.
        """
        # 1. Find a target
        self.find_target(enemies_group)

        # 2. Handle Firing Cooldown and Attempt Firing
        self.last_shot_time += dt
        if self.last_shot_time >= self.cooldown:
             if self.target and self.target.is_active: # Check if target exists and is still active
                  if self.fire(): # Attempt to fire
                       self.last_shot_time = 0.0 # Reset cooldown ONLY if fire was successful


        # Inside class Tower(pygame.sprite.Sprite):

    def fire(self):
        """
        Default fire method: Creates and launches a projectile towards the target.
        Returns True if firing was successful, False otherwise.
        """
        # 1. Check for a valid, active target
        if not self.target or not self.target.is_active:
            return False

        # 2. Debug print (optional now, but keep if desired)
        # print(f"  DEBUG Tower.fire for {self.name}:")
        # print(f"    Checking projectile_pool: {type(self.projectile_pool)} (Is None: {self.projectile_pool is None})")
        # print(f"    Checking projectile_group: {type(self.projectile_group)} (Is None: {self.projectile_group is None})")

        # 3. **Crucial Check:** Explicitly check if objects are None.
        if self.projectile_pool is None or self.projectile_group is None:
             print(f"Critical Error: {self.name} FAILED 'is None' check for pool/group!")
             return False

        # 4. Get projectile from pool
        projectile = self.projectile_pool.get(self.data, self.rect.center, self.target.rect.center)

        # 5. Add to group if successfully retrieved
        if projectile:
            self.projectile_group.add(projectile)
            return True
        else:
             print(f"Error: {self.name} failed to get projectile from pool.")
             return False


    def draw_range(self, surface):
        """Draws the tower's range indicator, brighter if selected."""
        # Use alpha transparency for the circle color
        color = (255, 255, 255, 150) if self.is_selected else (255, 255, 255, 70)
        # Draw the circle directly onto the main surface
        pygame.draw.circle(surface, color, self.rect.center, self.range, 1) # width=1 for outline


# --- Specific Tower Type Subclasses ---

class GunTower(Tower):
    """A standard single-target projectile tower."""
    # No need to override __init__, update, or fire unless adding unique behavior.
    # Inherits the base class logic which works for this type.
    pass

class CannonTower(Tower):
    """A slower, higher-damage projectile tower (potentially AoE later)."""
    # Inherits base update/fire for now.
    # If adding AoE, the projectile's handle_hit or a collision callback
    # would need to find enemies near the impact point.
    pass

class SlowTower(Tower):
    """Applies a slowing effect to enemies within range periodically."""
    def __init__(self, tower_id, tower_data, pos, projectile_pool, projectile_group):
        super().__init__(tower_id, tower_data, pos, projectile_pool, projectile_group)
        # Store effect-specific parameters
        self.slow_factor = tower_data.get('slow_factor', 0.5)
        self.slow_duration = tower_data.get('slow_duration', 2.0)
        # Use fire_rate from JSON as the pulse rate
        self.pulse_cooldown = 1.0 / self.fire_rate if self.fire_rate > 0 else float('inf')
        self.last_pulse_time = 0.0 # Use last_shot_time from base class as the pulse timer


    def update(self, dt, enemies_group):
        """
        Overrides the base update. Applies slow effect periodically to all enemies in range.
        """
        self.last_shot_time += dt # Use base class timer for pulsing
        if self.last_shot_time >= self.pulse_cooldown:
            self.last_shot_time = 0.0 # Reset pulse timer

            targets_in_range = self.find_targets_in_range(enemies_group)
            if targets_in_range:
                 # print(f"{self.name}: Pulsing slow effect on {len(targets_in_range)} targets.") # Debug
                 # Trigger SFX/VFX pulse effect here later
                 for enemy in targets_in_range:
                     if enemy.is_active: # Double-check target is active
                         enemy.apply_slow(self.slow_factor, self.slow_duration)

            # Does not need to find or store a single self.target

    # Override fire() method as this tower doesn't shoot projectiles
    def fire(self):
         return False