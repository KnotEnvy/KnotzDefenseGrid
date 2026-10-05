# src/tower_manager.py
import pygame
import json
import os
# Import all tower types that need to be mapped
from .towers import Tower, GunTower, CannonTower, SlowTower
from .projectiles import Projectile # Needed for ProjectilePool

# --- Get the absolute path to the data directory ---
script_dir = os.path.dirname(os.path.realpath(__file__))
project_root = os.path.dirname(script_dir)
DATA_DIR = os.path.join(project_root, 'data')

class ProjectilePool:
    """Simple object pool for projectiles."""
    def __init__(self):
        self.pool = [] # List to hold projectile instances

    def get(self, tower_data, start_pos, target_pos):
        """Gets an inactive projectile from the pool or creates a new one."""
        for proj in self.pool:
            if not proj.is_active:
                # print("Reusing projectile from pool.") # Optional debug print
                proj.setup(tower_data, start_pos, target_pos)
                return proj
        # print("Creating new projectile for pool.") # Optional debug print
        new_proj = Projectile(tower_data, start_pos, target_pos)
        self.pool.append(new_proj)
        return new_proj

    def return_to_pool(self, proj):
        """Marks a projectile as inactive."""
        proj.is_active = False

class TowerManager:
    # Map tower type IDs from JSON to their corresponding Python classes
    TOWER_TYPE_MAP = {
        "gun_tower": GunTower,
        "cannon_tower": CannonTower,
        "slow_tower": SlowTower,
        "gun_tower_mk2": GunTower, # Upgraded GunTower still uses GunTower logic (just different data)
        # Add more mappings as new tower classes are created
    }

    def __init__(self, resource_manager, platform_group, tower_group, projectile_group):
        """Initializes the Tower Manager."""
        self.resource_manager = resource_manager
        self.platform_group = platform_group       # Group of TowerPlatform sprites
        self.tower_group = tower_group             # Group to add created towers to
        self.projectile_group = projectile_group   # Group for projectiles fired by towers
        self.tower_data = self._load_json("towers.json") # Load all tower definitions
        self.projectile_pool = ProjectilePool()    # Manages projectile instances

        # State variables for player interaction
        self.selected_tower_type = None     # ID of tower type selected for building (e.g., "gun_tower")
        self.selected_placed_tower = None   # Reference to a placed tower sprite selected for upgrade/info
        self.placement_preview_sprite = None # Sprite showing tower placement preview
        self.placement_valid = False         # Flag indicating if current placement preview location is valid

        if not self.tower_data:
             raise RuntimeError("Failed to load tower data JSON file (towers.json).")

        print("TowerManager Initialized")

    def _load_json(self, filename):
        """Loads tower definitions from JSON in the data directory."""
        file_path = os.path.join(DATA_DIR, filename)
        try:
            with open(file_path, 'r') as f:
                # print(f"Loading JSON from: {file_path}") # Debug print
                return json.load(f)
        except FileNotFoundError:
            print(f"Error: Tower JSON file not found at {file_path}")
            return {}
        except json.JSONDecodeError:
            print(f"Error: Could not decode JSON from {file_path}")
            return {}

    def select_tower_type(self, tower_type_id):
        """Sets the tower type the player intends to build."""
        if self.selected_placed_tower: # Deselect placed tower if selecting a build type
             self.selected_placed_tower.is_selected = False
             self.selected_placed_tower = None

        if tower_type_id in self.tower_data:
             self.selected_tower_type = tower_type_id
             print(f"Selected tower type for build: {tower_type_id}")
             # Immediately create/update the placement preview sprite
             self._update_placement_preview(pygame.mouse.get_pos())
        else:
            print(f"Error: Unknown tower type ID requested: {tower_type_id}")
            self.deselect_tower() # Clear selection if invalid type

    def deselect_tower(self):
        """Clears the selected build tower type AND selected placed tower."""
        if self.selected_placed_tower:
             self.selected_placed_tower.is_selected = False
             self.selected_placed_tower = None
        if self.selected_tower_type:
             self.selected_tower_type = None
             self.placement_preview_sprite = None # Hide preview
        # print("Tower selection cleared.") # Optional info

    def select_placed_tower(self, tower_sprite):
        """Selects an already placed tower for potential upgrade/info display."""
        if self.selected_tower_type: # Deselect build type if selecting placed tower
             self.selected_tower_type = None
             self.placement_preview_sprite = None # Hide preview

        if self.selected_placed_tower: # Deselect previously selected placed tower
             self.selected_placed_tower.is_selected = False # Turn off its selection indicator

        # Select the new one
        self.selected_placed_tower = tower_sprite
        self.selected_placed_tower.is_selected = True # Turn on its selection indicator
        print(f"Selected placed tower: {tower_sprite.name} (ID: {tower_sprite.tower_id}) at {tower_sprite.rect.center}")

    def attempt_placement(self, mouse_pos):
        """Attempts to place the selected tower type at the mouse position."""
        # --- Debug prints removed ---
        if not self.selected_tower_type:
             return False
        if self.selected_placed_tower:
            self.selected_placed_tower.is_selected = False
            self.selected_placed_tower = None

        target_platform = None
        for platform in self.platform_group:
             if platform.rect.collidepoint(mouse_pos):
                  target_platform = platform
                  break
        if not target_platform:
             return False
        if target_platform.occupied:
             return False

        tower_config = self.tower_data.get(self.selected_tower_type)
        if not tower_config:
            return False
        cost = tower_config.get('cost', 0)
        if not self.resource_manager.spend_resources(cost):
             return False

        # Placement Successful
        TowerClass = self.TOWER_TYPE_MAP.get(self.selected_tower_type, Tower)
        new_tower = TowerClass(
             tower_id=self.selected_tower_type,
             tower_data=tower_config,
             pos=target_platform.rect.center,
             projectile_pool=self.projectile_pool,
             projectile_group=self.projectile_group
        )
        self.tower_group.add(new_tower)
        target_platform.occupied = True
        target_platform.tower = new_tower
        return True

    def attempt_upgrade(self):
        """Attempts to upgrade the currently selected placed tower."""
        if not self.selected_placed_tower:
            print("Upgrade failed: No placed tower selected.")
            return False

        current_tower = self.selected_placed_tower
        tower_id = current_tower.tower_id
        # Use the data stored on the tower instance itself
        current_config = current_tower.data # Get config from the tower's own data attribute

        if not current_config:
            print(f"Upgrade failed: Cannot find config data on selected tower instance {tower_id}")
            return False

        # 1. Check if upgrade path exists in its data
        upgrades_to_id = current_config.get("upgrades_to")
        if not upgrades_to_id:
            print(f"Upgrade failed: {current_tower.name} has no 'upgrades_to' defined.")
            return False
        # Check if the target upgrade ID exists in our loaded tower data
        if upgrades_to_id not in self.tower_data:
            print(f"Upgrade failed: Target upgrade ID '{upgrades_to_id}' not found in towers.json.")
            return False

        # 2. Check Cost (defined in the *current* tower's config)
        upgrade_cost = current_config.get("upgrade_cost", 0)
        if upgrade_cost <= 0:
             print(f"Upgrade failed: No valid 'upgrade_cost' defined for {current_tower.name}.")
             return False

        print(f"Attempting upgrade. Cost: {upgrade_cost}, Have: {self.resource_manager.resources}") # Debug
        if not self.resource_manager.spend_resources(upgrade_cost):
            print(f"Upgrade failed: Insufficient resources.")
            return False

        # --- Upgrade Successful ---
        print(f"Upgrading {current_tower.name} to {upgrades_to_id}...")
        upgrade_config = self.tower_data[upgrades_to_id] # Get data for the NEW tower
        platform = None

        # Find the platform the current tower is on
        for plat in self.platform_group:
             if plat.tower == current_tower:
                  platform = plat
                  break

        if not platform:
             print("Critical Error: Could not find platform for the tower being upgraded!")
             # Attempt to refund resources
             self.resource_manager.add_resources(upgrade_cost)
             # Might need to deselect here too
             self.deselect_tower()
             return False

        # Get the specific class constructor for the UPGRADED tower ID
        UpgradeTowerClass = self.TOWER_TYPE_MAP.get(upgrades_to_id, Tower)

        # Create the new, upgraded tower instance
        upgraded_tower = UpgradeTowerClass(
             tower_id=upgrades_to_id,        # Use the NEW tower ID
             tower_data=upgrade_config,      # Use the NEW tower config data
             pos=platform.rect.center,       # Same position
             projectile_pool=self.projectile_pool, # Pass same pool/group refs
             projectile_group=self.projectile_group
        )

        # --- Replace the tower ---
        current_tower.kill() # Remove old tower sprite from all groups
        self.tower_group.add(upgraded_tower) # Add the new tower sprite to the group
        platform.tower = upgraded_tower # Update platform reference to the new tower

        # Deselect after successful upgrade
        self.selected_placed_tower = None
        upgraded_tower.is_selected = False # Ensure the new tower isn't immediately selected

        print("Upgrade complete.")
        return True


    def _update_placement_preview(self, mouse_pos):
         """Updates the position and appearance of the placement preview sprite."""
         # Only show preview if a build type is selected
         if not self.selected_tower_type:
             self.placement_preview_sprite = None
             return

         tower_config = self.tower_data.get(self.selected_tower_type)
         if not tower_config: # Should not happen if selection is valid
              self.placement_preview_sprite = None
              return

         size = tower_config.get('size', (30, 30))
         color = tower_config.get('color', (128, 128, 128))
         range_val = tower_config.get('range', 100)
         cost = tower_config.get('cost', 0)

         # Create or reuse the preview sprite structure
         if self.placement_preview_sprite is None:
             self.placement_preview_sprite = pygame.sprite.Sprite()
             # Base image (tower shape part)
             base_image = pygame.Surface(size, pygame.SRCALPHA)
             rgba_color = tuple(color) + (150,) # Add alpha for transparency
             base_image.fill(rgba_color)
             # Range indicator overlay part
             range_radius = range_val
             preview_size = max(1, range_radius * 2) # Ensure size >= 1
             overlay = pygame.Surface((preview_size, preview_size), pygame.SRCALPHA)
             overlay_center = overlay.get_rect().center
             pygame.draw.circle(overlay, (255, 255, 255, 70), overlay_center, range_radius, 1)
             # Combine: blit base image onto the center of the range overlay
             base_rect = base_image.get_rect(center=overlay_center)
             overlay.blit(base_image, base_rect)
             # Set final combined image and rect for the sprite
             self.placement_preview_sprite.image = overlay
             self.placement_preview_sprite.rect = overlay.get_rect() # Get initial rect

         # Update preview position to follow mouse
         self.placement_preview_sprite.rect.center = mouse_pos

         # Check placement validity for visual feedback (tinting/snapping)
         self.placement_valid = False
         collided_platform = None
         for platform in self.platform_group:
             if platform.rect.collidepoint(mouse_pos):
                 collided_platform = platform
                 break

         # Check all conditions for valid placement
         if (collided_platform and
             not collided_platform.occupied and
             self.resource_manager.resources >= cost):
             self.placement_valid = True
             # Snap preview to platform center if valid
             self.placement_preview_sprite.rect.center = collided_platform.rect.center


    def update(self, dt, enemies_group, mouse_pos):
         """Updates all towers' logic and the placement preview sprite."""
         # Update individual towers (targeting, firing, pulsing based on their update method)
         self.tower_group.update(dt, enemies_group) # Calls update() on each sprite in the group

         # Update placement preview position and validity check (only if building)
         if self.selected_tower_type:
             self._update_placement_preview(mouse_pos)
         else:
             self.placement_preview_sprite = None # Ensure preview is hidden if not building


    def draw_preview(self, surface):
         """Draws the placement preview sprite with validity tinting."""
         if self.placement_preview_sprite and self.selected_tower_type:
              # Create a copy to apply temporary tint without modifying original
              temp_image = self.placement_preview_sprite.image.copy()
              if not self.placement_valid:
                   # Apply a red tint for invalid placement
                   red_tint = pygame.Surface(temp_image.get_size(), pygame.SRCALPHA)
                   red_tint.fill((255, 50, 50, 100)) # Semi-transparent red
                   temp_image.blit(red_tint, (0,0), special_flags=pygame.BLEND_RGBA_MULT)

              surface.blit(temp_image, self.placement_preview_sprite.rect)

    def draw_tower_ranges(self, surface):
         """Draws range indicators for placed towers (optional)."""
         # Could be toggled by a key press
         for tower in self.tower_group:
              tower.draw_range(surface)