# src/wave_manager.py
import pygame
import json
import os
from .enemies import Enemy
# Import the data lookup maps and defaults
from .config import (LEVEL_PATHS, PATH_WAYPOINTS_L1, SCREEN_WIDTH, SCREEN_HEIGHT)

# --- Get the absolute path to the project's root directory ---
script_dir = os.path.dirname(os.path.realpath(__file__))
project_root = os.path.dirname(script_dir) # Go up one level from 'src'
DATA_DIR = os.path.join(project_root, 'data') # Path to the data directory

class WaveManager:
    def __init__(self, enemy_group):
        """Initializes the Wave Manager for the first level."""
        self.enemy_data = self._load_json("enemies.json")
        self.wave_definitions = self._load_json("waves.json")
        self.level_data = self._load_json("levels.json") # Load ALL level configs

        if not self.level_data or not self.wave_definitions or not self.enemy_data:
             raise RuntimeError("Failed to load essential game data JSON files.")

        self.enemy_pool = []
        self.active_enemies = enemy_group # Reference to the main enemy sprite group

        # Defer setting level-specific attributes until load_level_data
        self.current_level_id = None
        self.wave_sequence = []
        self.path = []
        self.core_starting_health = 10 # Default fallback
        self.core_location = (0,0) # Default fallback

        self.current_wave_index = -1
        self.wave_active = False
        self.wave_timer = 0.0
        self.spawn_events = []
        self.next_spawn_index = 0
        self.spawning_group = None
        self.time_since_last_wave = 0.0
        self.time_between_waves = 10.0
        self.all_waves_spawned = False
        self.level_complete = False

        print("WaveManager Initialized (Data loaded, level not set yet).")


    def load_level_data(self, level_id):
        """Loads configuration for a specific level ID and resets state."""
        print(f"WaveManager: Loading data for level '{level_id}'...")
        if level_id not in self.level_data:
             print(f"Error: Level ID '{level_id}' not found in levels.json.")
             # Should we revert to a default or raise an error? Let's raise for now.
             raise ValueError(f"Level ID '{level_id}' not found.")

        self.current_level_id = level_id
        level_config = self.level_data[level_id]

        # Get data from config, using defaults if necessary
        self.wave_sequence = level_config.get('wave_sequence', [])
        self.core_starting_health = level_config.get('core_health', 10)
        default_core_loc = (SCREEN_WIDTH - 50, SCREEN_HEIGHT // 2)
        self.core_location = level_config.get('core_location', default_core_loc)

        # Get path using the key and lookup map from config.py
        path_key = level_config.get('path_waypoints_key', None)
        self.path = LEVEL_PATHS.get(path_key, PATH_WAYPOINTS_L1) # Default to L1 path if key invalid

        print(f"  Level Name: {level_config.get('name', 'N/A')}")
        print(f"  Wave Sequence: {self.wave_sequence}")
        print(f"  Core Health: {self.core_starting_health}")
        print(f"  Core Location: {self.core_location}")
        print(f"  Path Key: {path_key} (Using path with {len(self.path)} waypoints)")

        # Reset progress for the newly loaded level
        self.reset()


    def reset(self):
        """Resets the wave progression state for the currently loaded level."""
        # print(f"WaveManager: Resetting progress for level '{self.current_level_id}'.")
        self.current_wave_index = -1
        self.wave_active = False
        self.wave_timer = 0.0
        self.spawn_events = []
        self.next_spawn_index = 0
        self.spawning_group = None
        self.time_since_last_wave = 0.0
        self.all_waves_spawned = False
        self.level_complete = False

    def _load_json(self, filename):
        """Loads data from a JSON file located in the project's data directory."""
        file_path = os.path.join(DATA_DIR, filename)
        try:
            with open(file_path, 'r') as f:
                # print(f"Loading JSON from: {file_path}") # Debug print
                return json.load(f)
        except FileNotFoundError:
            print(f"Error: JSON file not found at {file_path}")
            return {}
        except json.JSONDecodeError:
            print(f"Error: Could not decode JSON from {file_path}")
            return {}

    def _get_enemy_from_pool(self, enemy_type_id):
         """Gets an inactive enemy from the pool or creates a new one."""
         if not enemy_type_id in self.enemy_data:
              print(f"Error: Unknown enemy type '{enemy_type_id}' requested.")
              return None

         enemy_config = self.enemy_data[enemy_type_id]

         for enemy in self.enemy_pool:
              if not enemy.is_active and enemy.name == enemy_config['name']:
                   enemy.setup(enemy_config, self.path)
                   return enemy

         # print(f"Creating new '{enemy_config['name']}' for pool.") # Debug print
         new_enemy = Enemy(enemy_config, self.path)
         new_enemy.is_active = True
         self.enemy_pool.append(new_enemy)
         return new_enemy

    def _return_enemy_to_pool(self, enemy):
         """Marks an enemy as inactive."""
         enemy.is_active = False


    def start_next_wave(self):
        """Starts the next wave in the sequence."""
        if self.level_complete or self.all_waves_spawned or not self.current_level_id:
            # Cannot start wave if level is won, all spawned, or no level loaded
            return

        self.current_wave_index += 1
        if self.current_wave_index < len(self.wave_sequence):
            wave_id = self.wave_sequence[self.current_wave_index]
            if wave_id in self.wave_definitions:
                print(f"Starting Wave {self.current_wave_index + 1} / {len(self.wave_sequence)}: {wave_id}")
                self.spawn_events = sorted(self.wave_definitions[wave_id], key=lambda x: x['time'])
                self.wave_active = True
                self.wave_timer = 0.0
                self.next_spawn_index = 0
                self.spawning_group = None
                self.time_since_last_wave = 0.0 # Reset time between waves timer
            else:
                print(f"Error: Wave definition not found for ID: {wave_id}")
                # Skip this wave? Or halt? Let's just log error and potentially stall.
                self.wave_active = False
                self.current_wave_index -= 1 # Decrement index as wave didn't start
        else:
             # This case means we tried to start a wave *after* the last one.
             # This might happen if the check in update() is slightly off.
             # The all_waves_spawned flag should prevent this now.
             print("Attempted to start wave beyond sequence (should be handled).")
             self.current_wave_index = len(self.wave_sequence) # Ensure index reflects state


    def update(self, dt):
        """Updates wave timing and enemy spawning."""
        if self.level_complete: return # Stop processing if level won

        # --- Start Next Wave Logic ---
        if not self.wave_active and not self.all_waves_spawned:
             self.time_since_last_wave += dt
             # Start wave immediately if index is -1 (first wave)
             # Or if enough time has passed since the last one finished spawning
             if self.current_wave_index == -1 or self.time_since_last_wave >= self.time_between_waves:
                  self.start_next_wave()

        if not self.wave_active:
            return # Return if no wave is currently active (either between waves or all spawned)

        # --- Process Active Wave ---
        self.wave_timer += dt

        # Handle currently spawning group
        if self.spawning_group:
            enemy_type, remaining, interval, timer = self.spawning_group
            timer -= dt
            if timer <= 0 and remaining > 0:
                enemy = self._get_enemy_from_pool(enemy_type)
                if enemy:
                    self.active_enemies.add(enemy)
                remaining -= 1
                timer = interval # Reset timer for next spawn in group
                if remaining == 0:
                    self.spawning_group = None # Finished this group
                else:
                    self.spawning_group = (enemy_type, remaining, interval, timer)
            elif remaining > 0 :
                 self.spawning_group = (enemy_type, remaining, interval, timer)

        # Check for next spawn event time if not currently spawning a group
        if self.next_spawn_index < len(self.spawn_events) and not self.spawning_group:
            next_event = self.spawn_events[self.next_spawn_index]
            if self.wave_timer >= next_event['time']:
                # print(f"Wave Event Triggered: Spawn {next_event['count']}x {next_event['enemy_type']}") # Debug print
                self.spawning_group = (
                    next_event['enemy_type'],
                    next_event['count'],
                    next_event['interval'],
                    0.0
                )
                self.next_spawn_index += 1

        # Check if wave is finished spawning (all events triggered, current group finished)
        if self.next_spawn_index >= len(self.spawn_events) and not self.spawning_group:
            # This wave is done spawning enemies
            self.wave_active = False # Mark wave as inactive for spawning purposes
            print(f"Wave {self.current_wave_index + 1} finished spawning.")
            self.time_since_last_wave = 0.0 # Start timer for *next* wave immediately

            # Check if this was the LAST wave in the sequence
            if self.current_wave_index >= len(self.wave_sequence) - 1:
                print("All waves for the level have finished spawning.")
                self.all_waves_spawned = True
                # GameManager handles the actual win condition check based on this flag


    def is_level_spawning_complete(self):
        """Returns True if all waves in the sequence have finished spawning."""
        return self.all_waves_spawned

    def get_active_enemies(self):
         """Returns the sprite group containing active enemies."""
         # Note: This group is managed externally (passed in __init__)
         # WaveManager only adds to it.
         return self.active_enemies
    
    def get_time_until_next_wave(self):
        """
        Returns the time remaining until the next wave starts,
        or None if a wave is active, spawning is complete, or level is won.
        """
        if self.level_complete or self.wave_active or self.all_waves_spawned:
            return None # No countdown applicable in these states

        # If between waves (and not the very start before wave 0)
        if self.current_wave_index >= -1: # Check needed? Always >= -1
            time_remaining = self.time_between_waves - self.time_since_last_wave
            return max(0, time_remaining) # Don't return negative time

        return None # Default case
