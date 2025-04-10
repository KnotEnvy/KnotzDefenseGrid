# main.py
import pygame
import sys
import os # Needed for path joining
import json # Needed for pre-loading levels

# --- Imports ---
# Import config elements including the new lookups
from src.config import (SCREEN_WIDTH, SCREEN_HEIGHT, SCREEN_SIZE, FPS, BLACK,
                      WHITE, GREEN, # PATH_WAYPOINTS (no longer used directly here)
                      LEVEL_PATHS, LEVEL_PLATFORMS, LEVEL_BACKGROUNDS, # Use lookup maps
                      PLATFORM_LOCATIONS_L1, # Default fallback if needed
                      STATE_PLAYING, STATE_PAUSED, STATE_GAME_OVER, STATE_VICTORY,
                      RED, YELLOW, GREY) # Add GREY if not already imported
from src.game_manager import GameManager
from src.resource_manager import ResourceManager
from src.ui_manager import UIManager
from src.tower_platform import TowerPlatform # Import TowerPlatform
from src.wave_manager import WaveManager
from src.tower_manager import TowerManager
from src.core import Core

class Game:
    def __init__(self):
        """Initializes Pygame and game components for the first level."""
        pygame.init()
        pygame.mixer.init()
        pygame.font.init()

        self.screen = pygame.display.set_mode(SCREEN_SIZE)
        pygame.display.set_caption("Project: Sentinel Grid - Level Loading")
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

        # --- Define Level Sequence ---
        # Hardcoded for now, could be loaded from elsewhere later
        self.level_order = ["level1", "level2"]
        self.current_level_index = 0 # Start at the first level in the sequence

        # --- Initialize Sprite Groups ---
        self.platform_group = pygame.sprite.Group()
        self.enemy_group = pygame.sprite.Group()
        self.tower_group = pygame.sprite.Group()
        self.projectile_group = pygame.sprite.Group()
        self.core_group = pygame.sprite.GroupSingle()

        # --- Initialize Managers (WaveManager first) ---
        # WaveManager doesn't load a specific level on init anymore
        self.wave_manager = WaveManager(self.enemy_group)
        self.resource_manager = ResourceManager() # Init with default, will be reset by load_level
        self.core = None # Core will be created in load_level
        self.ui_manager = UIManager(self.resource_manager, self.wave_manager, self.core) # Pass core ref placeholder initially
        self.tower_manager = TowerManager(
             resource_manager=self.resource_manager,
             platform_group=self.platform_group,
             tower_group=self.tower_group,
             projectile_group=self.projectile_group
        )
        # GameManager needs refs, including the enemy group for win condition check
        self.game_manager = GameManager(
             resource_manager=self.resource_manager,
             ui_manager=self.ui_manager,
             wave_manager=self.wave_manager,
             core=self.core, # Pass core ref placeholder
             enemy_group=self.enemy_group
        )

        # --- Load the First Level ---
        self.load_level(self.level_order[self.current_level_index])

        print("Game Initialized and first level loaded.")


    def load_level(self, level_id):
         """Loads and sets up all components for the specified level ID."""
         print(f"\n--- LOADING LEVEL: {level_id} ---")
         self.current_level_id = level_id # Store current level ID

         # 1. Load level config data into WaveManager
         try:
             self.wave_manager.load_level_data(level_id)
         except ValueError as e:
              print(f"Error loading level: {e}. Cannot proceed.")
              self.game_manager.is_running = False # Stop game if level fails
              return

         # 2. Get level-specific start values (already loaded by WaveManager)
         level_config = self.all_levels_data[level_id]
         new_starting_resources = level_config.get('starting_resources', 200)
         new_core_health = self.wave_manager.core_starting_health
         new_core_location = self.wave_manager.core_location

         # 3. Reset ResourceManager with new starting amount
         self.resource_manager.reset(new_start_amount=new_starting_resources)

         # 4. Create/Recreate Core
         if self.core: self.core.kill() # Remove old core if exists
         self.core = Core(new_core_location, new_core_health)
         self.core_group.add(self.core)
         # Update references in other managers AFTER creating the new core
         self.game_manager.core = self.core
         self.ui_manager.core = self.core

         # 5. Clear dynamic sprite groups
         self.enemy_group.empty()
         self.tower_group.empty()
         self.projectile_group.empty()

         # 6. Create platforms for the new level
         self._create_platforms(level_id) # Pass level ID

         # 7. Reset Tower Manager state
         self.tower_manager.deselect_tower()

         # 8. Set game state to Playing
         self.game_manager.set_state(STATE_PLAYING)
         print(f"--- LEVEL {level_id} LOAD COMPLETE ---")

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


    def restart_game(self):
        """Resets the *current* level to its initial state."""
        print(f"\n--- RESTARTING LEVEL: {self.current_level_id} ---")
        # Reuse load_level logic for the current level ID
        self.load_level(self.current_level_id)
        print("--- LEVEL RESTART COMPLETE ---")


    def load_next_level(self):
         """Loads the next level in the defined sequence."""
         print("\n--- LOADING NEXT LEVEL ---")
         self.current_level_index += 1 # Move to next index

         if self.current_level_index < len(self.level_order):
              next_level_id = self.level_order[self.current_level_index]
              self.load_level(next_level_id) # Load the determined level
         else:
              print("Congratulations! You've completed all levels!")
              # TODO: Transition to a "Game Complete" state or main menu
              # For now, maybe just end the game or loop back? Let's just stop.
              self.game_manager.set_state(STATE_VICTORY) # Stay in victory state
              # Or self.game_manager.is_running = False


    def _handle_events(self):
        """Processes Pygame events."""
        self.mouse_pos = pygame.mouse.get_pos()
        for event in pygame.event.get():
            if event.type == pygame.QUIT: self.game_manager.is_running = False; return
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_p: self.game_manager.handle_input(event)
                elif event.key == pygame.K_ESCAPE: self.tower_manager.deselect_tower()
                # State-specific key handling
                if self.game_manager.game_state == STATE_PLAYING:
                    if event.key == pygame.K_1: self.tower_manager.select_tower_type("gun_tower")
                    elif event.key == pygame.K_2: self.tower_manager.select_tower_type("cannon_tower")
                    elif event.key == pygame.K_3: self.tower_manager.select_tower_type("slow_tower")
                    elif event.key == pygame.K_u and self.tower_manager.selected_placed_tower: self.tower_manager.attempt_upgrade()
                elif self.game_manager.game_state == STATE_GAME_OVER:
                    if event.key == pygame.K_r: self.restart_game()
                elif self.game_manager.game_state == STATE_VICTORY:
                    if event.key == pygame.K_n: self.load_next_level()

            # Handle click only when playing
            if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1 and self.game_manager.game_state == STATE_PLAYING:
                self._handle_left_click()


    def _handle_left_click(self):
         """Handles left mouse click logic during the PLAYING state."""
         # Assume game_state is already checked before calling this
         clicked_on_tower = False
         # Check collision with PLACED towers FIRST
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
                  else: # Clicked platform, nothing to build
                       self.tower_manager.deselect_tower()
             else: # Clicked empty space
                  self.tower_manager.deselect_tower()



    def _handle_collisions(self):
        """Handles collisions between projectiles and enemies."""
        # Check for projectile hits on enemies
        collisions = pygame.sprite.groupcollide(
             self.projectile_group, self.enemy_group, True, False # Projectile killed, enemy not killed by collision itself
         )

        # Process hits: damage enemy, check for death, grant resources
        for projectile, enemies_hit in collisions.items():
             # Projectile was already killed and returned to pool conceptually by groupcollide dokill1=True
             for enemy in enemies_hit:
                 if enemy.is_active: # Make sure enemy hasn't already been killed this frame
                     enemy.take_damage(projectile.damage)
                     # Check if the enemy died *as a result* of this damage
                     if not enemy.is_active:
                         self.resource_manager.add_resources(enemy.reward)


    def _handle_enemy_at_end(self):
        """Checks for enemies that reached the end, damages core, and removes them."""
        # Iterate directly over the group (or a copy if issues arise)
        for enemy in self.enemy_group:
             # Check the flag set in Enemy.reach_end()
             if enemy.reached_end:
                  print(f"Processing {enemy.name} that reached end - damaging core.")
                  self.core.take_damage(1) # Apply damage to the core
                  enemy.kill() # NOW remove the enemy from all groups


    def _update(self, dt):
        """Updates game state and components."""
        self.game_manager.update(dt) # Checks win/loss conditions first
        if self.game_manager.game_state == STATE_PLAYING:
            self.resource_manager.update(dt)
            self.wave_manager.update(dt)
            self.tower_manager.update(dt, self.enemy_group, self.mouse_pos)
            self.enemy_group.update(dt)
            self.projectile_group.update(dt)
            self.core_group.update(dt)
            self._handle_enemy_at_end()
            self._handle_collisions()

    def _draw_path(self):
        """Draws the path for the current level."""
        # Path data is now stored in wave_manager after load_level
        current_path = self.wave_manager.path
        if current_path and len(current_path) >= 2:
            pygame.draw.lines(self.screen, GREEN, False, current_path, 3)

    def _draw(self):
        """Draws everything to the screen."""
        # Get background color for current level
        background_color_key = self.all_levels_data.get(self.current_level_id, {}).get('map_background', 'color_black')
        background_color = LEVEL_BACKGROUNDS.get(background_color_key, BLACK)
        self.screen.fill(background_color) # Use level-specific background

        self._draw_path() # Draw the correct path
        self.platform_group.draw(self.screen)

        if self.game_manager.game_state in [STATE_PLAYING, STATE_PAUSED]:
            self.core_group.draw(self.screen)
            self.tower_group.draw(self.screen)
            self.enemy_group.draw(self.screen)
            self.projectile_group.draw(self.screen)
            for enemy in self.enemy_group: enemy.draw_health_bar(self.screen)
            if self.tower_manager.selected_tower_type: self.tower_manager.draw_preview(self.screen)
            elif self.tower_manager.selected_placed_tower: self.tower_manager.selected_placed_tower.draw_range(self.screen)

        # --- Draw UI --- (Pass updated core/wave manager refs if needed)
        self.ui_manager.core = self.core # Ensure UI Manager has the current core ref
        # Other UI Manager info is updated via attributes set before its draw call
        self.game_manager.draw(self.screen)

        pygame.display.flip()



    def run(self):
        """The main game loop."""
        while self.game_manager.is_running:
            # Calculate delta time
            dt = self.clock.tick(FPS) / 1000.0 # Time since last frame in seconds

            # Process player input and events
            self._handle_events()

            # Update game logic and state
            self._update(dt)

            # Render the current frame
            self._draw()

        # Exit Pygame when loop ends
        pygame.quit()
        sys.exit()

import os
import json

if __name__ == '__main__':
    print("Starting Game...")
    game = Game()
    game.run()
    print("Game Exited.")