# main.py
import pygame
import sys
import os
import json

# --- Imports ---
from src.config import (SCREEN_WIDTH, SCREEN_HEIGHT, SCREEN_SIZE, FPS,
                      LEVEL_PATHS, LEVEL_PLATFORMS, LEVEL_BACKGROUNDS,
                      PLATFORM_LOCATIONS_L1, # Default fallback if needed
                      STATE_PLAYING, STATE_PAUSED, STATE_GAME_OVER, STATE_VICTORY,
                      get_color) # Use palette helper
from src.game_manager import GameManager
from src.resource_manager import ResourceManager
from src.ui_manager import UIManager
from src.tower_platform import TowerPlatform
from src.wave_manager import WaveManager
from src.tower_manager import TowerManager
from src.core import Core

class Game:
    def __init__(self):
        """Initializes Pygame and game components."""
        pygame.init()
        # pygame.mixer.init() # Defer audio init until AudioManager
        pygame.font.init()

        self.screen = pygame.display.set_mode(SCREEN_SIZE)
        pygame.display.set_caption("Project: Sentinel Grid - Retro Draw")
        self.clock = pygame.time.Clock()
        self.mouse_pos = pygame.mouse.get_pos()

        # --- Load All Level Data Once ---
        try:
            script_dir = os.path.dirname(os.path.realpath(__file__))
            data_dir = os.path.join(script_dir, 'data')
            level_file = os.path.join(data_dir, 'levels.json')
            with open(level_file, 'r') as f:
                 self.all_levels_data = json.load(f)
        except Exception as e:
             print(f"CRITICAL ERROR loading levels.json: {e}")
             pygame.quit(); sys.exit()

        self.level_order = ["level1", "level2"]
        self.current_level_index = 0
        self.current_level_id = None # Will be set by load_level

        # --- Initialize Sprite Groups ---
        self.platform_group = pygame.sprite.Group()
        self.enemy_group = pygame.sprite.Group()
        self.tower_group = pygame.sprite.Group()
        self.projectile_group = pygame.sprite.Group()
        self.core_group = pygame.sprite.GroupSingle() # Still use GroupSingle for the Core logic

        # --- Initialize Managers (order matters for dependencies) ---
        self.wave_manager = WaveManager(self.enemy_group)
        self.resource_manager = ResourceManager()
        self.core = None # Created in load_level
        # Pass core placeholder, will be updated in load_level
        self.ui_manager = UIManager(self.resource_manager, self.wave_manager, self.core)
        self.tower_manager = TowerManager(
             resource_manager=self.resource_manager,
             platform_group=self.platform_group,
             tower_group=self.tower_group,
             projectile_group=self.projectile_group
        )
        # Pass core placeholder, will be updated in load_level
        self.game_manager = GameManager(
             resource_manager=self.resource_manager,
             ui_manager=self.ui_manager,
             wave_manager=self.wave_manager,
             core=self.core,
             enemy_group=self.enemy_group
        )
        # Pass full tower data to UI Manager AFTER Tower Manager loads it
        self.ui_manager.full_tower_data = self.tower_manager.tower_data


        # --- Load the First Level ---
        self.load_level(self.level_order[self.current_level_index])

        print("Game Initialized and first level loaded.")

    # load_level remains mostly the same, just ensure references are updated
    def load_level(self, level_id):
        """Loads and sets up all components for the specified level ID."""
        print(f"\n--- LOADING LEVEL: {level_id} ---")
        if level_id not in self.all_levels_data:
             print(f"CRITICAL ERROR: Level ID '{level_id}' not found in levels.json data.")
             self.game_manager.is_running = False
             return
        self.current_level_id = level_id

        try:
            self.wave_manager.load_level_data(level_id)
        except ValueError as e:
             print(f"Error loading level data via WaveManager: {e}. Cannot proceed.")
             self.game_manager.is_running = False
             return

        level_config = self.all_levels_data[level_id]
        new_starting_resources = level_config.get('starting_resources', 200)
        new_core_health = self.wave_manager.core_starting_health
        new_core_location = self.wave_manager.core_location

        self.resource_manager.reset(new_start_amount=new_starting_resources)

        if self.core: self.core.kill()
        self.core = Core(new_core_location, new_core_health)
        self.core_group.add(self.core) # Add the single sprite instance

        # IMPORTANT: Update references in managers that depend on the core
        self.game_manager.core = self.core
        self.ui_manager.core = self.core

        self.enemy_group.empty()
        self.tower_group.empty()
        self.projectile_group.empty()

        self._create_platforms(level_id)
        self.tower_manager.deselect_tower() # Reset selections

        # Pass tower data to UI manager again in case it changed? (Probably not needed here, but safe)
        self.ui_manager.full_tower_data = self.tower_manager.tower_data


        self.game_manager.set_state(STATE_PLAYING)
        print(f"--- LEVEL {level_id} LOAD COMPLETE ---")

    # _create_platforms remains the same
    def _create_platforms(self, level_id):
        """Creates tower platforms based on the specified level ID."""
        self.platform_group.empty() # Clear existing platforms first

        level_config = self.all_levels_data.get(level_id)
        if not level_config:
             print(f"Warning: Cannot create platforms, level config not found for {level_id}")
             return

        platform_key = level_config.get('platform_locations_key')
        platform_locations = LEVEL_PLATFORMS.get(platform_key, []) # Use lookup map

        print(f"Creating {len(platform_locations)} platforms using key '{platform_key}'.")
        for pos in platform_locations:
            platform = TowerPlatform(pos[0], pos[1]) # TowerPlatform needs to be imported
            self.platform_group.add(platform)

    # restart_game and load_next_level remain the same
    def restart_game(self):
        """Resets the *current* level to its initial state."""
        print(f"\n--- RESTARTING LEVEL: {self.current_level_id} ---")
        self.load_level(self.current_level_id)
        print("--- LEVEL RESTART COMPLETE ---")

    def load_next_level(self):
         """Loads the next level in the defined sequence."""
         print("\n--- LOADING NEXT LEVEL ---")
         self.current_level_index += 1

         if self.current_level_index < len(self.level_order):
              next_level_id = self.level_order[self.current_level_index]
              self.load_level(next_level_id)
         else:
              print("Congratulations! You've completed all levels!")
              self.game_manager.set_state(STATE_VICTORY)

    # _handle_events remains the same, but update UI interaction later
    def _handle_events(self):
        """Processes Pygame events."""
        self.mouse_pos = pygame.mouse.get_pos()

        # Update UI Manager with current selections for drawing info panel
        self.ui_manager.selected_tower_type = self.tower_manager.selected_tower_type
        self.ui_manager.selected_tower_data = self.tower_manager.tower_data.get(self.tower_manager.selected_tower_type) if self.tower_manager.selected_tower_type else None
        if self.tower_manager.selected_placed_tower:
             self.ui_manager.selected_placed_tower_id = self.tower_manager.selected_placed_tower.tower_id
             self.ui_manager.selected_placed_tower_data = self.tower_manager.selected_placed_tower.data
        else:
             self.ui_manager.selected_placed_tower_id = None
             self.ui_manager.selected_placed_tower_data = None


        for event in pygame.event.get():
            if event.type == pygame.QUIT: self.game_manager.is_running = False; return

            # --- Keyboard Input ---
            if event.type == pygame.KEYDOWN:
                # Global Keys
                if event.key == pygame.K_p: self.game_manager.handle_input(event) # Toggle pause
                elif event.key == pygame.K_ESCAPE: self.tower_manager.deselect_tower()

                # State-Specific Keys
                if self.game_manager.game_state == STATE_PLAYING:
                    if event.key == pygame.K_1: self.tower_manager.select_tower_type("gun_tower")
                    elif event.key == pygame.K_2: self.tower_manager.select_tower_type("cannon_tower")
                    elif event.key == pygame.K_3: self.tower_manager.select_tower_type("slow_tower")
                    elif event.key == pygame.K_u and self.tower_manager.selected_placed_tower:
                        self.tower_manager.attempt_upgrade()
                    # Add Sell key later? e.g., K_x
                elif self.game_manager.game_state == STATE_GAME_OVER:
                    if event.key == pygame.K_r: self.restart_game()
                elif self.game_manager.game_state == STATE_VICTORY:
                    if event.key == pygame.K_n: self.load_next_level()

            # --- Mouse Input ---
            if event.type == pygame.MOUSEBUTTONDOWN:
                 # Handle clicks based on state (add UI button clicks later)
                 if self.game_manager.game_state == STATE_PLAYING:
                      if event.button == 1: # Left Click
                           self._handle_left_click()
                      # Add right click deselect?
                      # elif event.button == 3: # Right Click
                      #     self.tower_manager.deselect_tower()

    # _handle_left_click remains the same
    def _handle_left_click(self):
         """Handles left mouse click logic during the PLAYING state."""
         clicked_on_tower = False
         for tower in self.tower_group:
             if tower.rect.collidepoint(self.mouse_pos):
                 self.tower_manager.select_placed_tower(tower)
                 clicked_on_tower = True
                 break

         if not clicked_on_tower:
             target_platform = None
             for platform in self.platform_group:
                  if platform.rect.collidepoint(self.mouse_pos):
                       target_platform = platform
                       break
             if target_platform:
                  if self.tower_manager.selected_tower_type:
                       self.tower_manager.attempt_placement(self.mouse_pos)
                  else: # Clicked platform, nothing to build or select
                       self.tower_manager.deselect_tower()
             else: # Clicked empty space
                  self.tower_manager.deselect_tower()


    # _handle_collisions remains the same
    def _handle_collisions(self):
        """Handles collisions between projectiles and enemies."""
        collisions = pygame.sprite.groupcollide(
             self.projectile_group, self.enemy_group, False, False # Check collision first
         )

        for projectile, enemies_hit in collisions.items():
            # Check if projectile is still active before processing
            if projectile.is_active:
                 # Usually hit only one enemy unless AoE later
                 for enemy in enemies_hit:
                     if enemy.is_active:
                         projectile.handle_hit(enemy) # Let projectile destroy itself
                         enemy.take_damage(projectile.damage)
                         if not enemy.is_active: # Enemy died
                             self.resource_manager.add_resources(enemy.reward)
                         break # Projectile hits one target and is done


    # _handle_enemy_at_end remains the same
    def _handle_enemy_at_end(self):
        """Checks for enemies that reached the end, damages core, and removes them."""
        for enemy in list(self.enemy_group): # Iterate over a copy
             if enemy.reached_end:
                  # print(f"Processing {enemy.name} that reached end - damaging core.") # Quieter
                  self.core.take_damage(1)
                  enemy.kill()

    # _update remains the same
    def _update(self, dt):
        """Updates game state and components."""
        self.game_manager.update(dt) # Checks win/loss first
        if self.game_manager.game_state == STATE_PLAYING:
            self.resource_manager.update(dt)
            self.wave_manager.update(dt)
            # Pass mouse pos to tower manager for preview updates
            self.tower_manager.update(dt, self.enemy_group, self.mouse_pos)
            self.enemy_group.update(dt)
            self.projectile_group.update(dt)
            if self.core: # Ensure core exists before updating
                 self.core_group.update(dt) # Update core (for animations etc)
            self._handle_enemy_at_end()
            self._handle_collisions()
        # No updates needed for paused/end states usually, handled by state manager

    def _draw_path(self):
        """Draws the path for the current level."""
        current_path = self.wave_manager.path
        if current_path and len(current_path) >= 2:
            path_color = get_color(3, (0, 255, 0)) # Palette index 3 (Green)
            pygame.draw.lines(self.screen, path_color, False, current_path, 3)

    def _draw(self):
        """Draws everything to the screen using draw_shape."""
        # --- Background ---
        bg_color_idx = self.all_levels_data.get(self.current_level_id, {}).get('map_background_idx', 0)
        background_color = get_color(bg_color_idx, (0,0,0))
        self.screen.fill(background_color)

        # --- Static Elements ---
        self._draw_path()
        self.platform_group.draw(self.screen) # Platforms still use their pre-rendered image via Group.draw

        # --- Dynamic Elements (Manual Draw) ---
        # Draw in desired order (e.g., towers below enemies?)
        if self.game_manager.game_state in [STATE_PLAYING, STATE_PAUSED]:
             # Draw Core
             if self.core: # Ensure core exists
                 self.core.draw_shape(self.screen) # Use draw_shape

             # Draw Towers & Ranges
             for tower in self.tower_group:
                  tower.draw_shape(self.screen) # Use draw_shape
             # Draw selected tower range AFTER all towers are drawn
             if self.tower_manager.selected_placed_tower:
                  self.tower_manager.selected_placed_tower.draw_range(self.screen)

             # Draw Enemies
             for enemy in self.enemy_group:
                  enemy.draw_shape(self.screen) # Use draw_shape

             # Draw Projectiles
             for proj in self.projectile_group:
                  proj.draw_shape(self.screen) # Use draw_shape

             # Draw Tower Placement Preview (if active)
             # Note: TowerManager.draw_preview uses its own sprite with image, keep for now
             # Or refactor draw_preview to use draw calls too later.
             self.tower_manager.draw_preview(self.screen)


        # --- UI ---
        # UIManager draw handles overlays based on state
        self.game_manager.draw(self.screen)

        # --- Display Update ---
        pygame.display.flip()


    def run(self):
        """The main game loop."""
        while self.game_manager.is_running:
            dt = self.clock.tick(FPS) / 1000.0
            self._handle_events()
            self._update(dt)
            self._draw()

        pygame.quit()
        sys.exit()

# --- Main Execution ---
if __name__ == '__main__':
    print("Starting Game...")
    game = Game()
    game.run()
    print("Game Exited.")