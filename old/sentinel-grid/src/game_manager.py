# src/game_manager.py
from .config import STATE_PLAYING, STATE_PAUSED, STATE_GAME_OVER, STATE_VICTORY

class GameManager:
    def __init__(self, resource_manager, ui_manager, wave_manager, core, enemy_group): # Add wave_manager, core, enemy_group
        """Initializes the GameManager."""
        self.resource_manager = resource_manager
        self.ui_manager = ui_manager
        self.wave_manager = wave_manager
        self.core = core
        self.enemy_group = enemy_group # Need reference to check if empty for win condition

        self.game_state = STATE_PLAYING
        self.is_running = True

        print("GameManager Initialized")


    def update(self, dt):
        """Updates the game state and checks win/loss conditions."""
        if self.game_state == STATE_PLAYING:
            # --- Check Win/Loss Conditions FIRST ---
            # Loss Condition: Core health depleted
            if self.core.current_health <= 0:
                self.set_state(STATE_GAME_OVER)
                return # Stop further updates in playing state

            # Win Condition: All waves spawned and all enemies cleared
            if self.wave_manager.is_level_spawning_complete() and not self.enemy_group:
                 # Double check if we already declared victory (prevents flicker)
                 if not self.wave_manager.level_complete:
                    print("Victory condition met!")
                    self.wave_manager.level_complete = True # Set flag in wave manager too
                    self.set_state(STATE_VICTORY)
                    return # Stop further updates in playing state

            # --- Update game logic (Only if still playing) ---
            # Managers already updated in main loop if playing
            pass

        elif self.game_state == STATE_PAUSED:
            # Do nothing or update pause menu logic
            pass
        elif self.game_state == STATE_GAME_OVER:
             # Handle Game Over specific logic (e.g., wait for input)
             pass
        elif self.game_state == STATE_VICTORY:
             # Handle Victory specific logic (e.g., wait for input)
             pass


    def draw(self, screen):
        """Coordinates drawing operations based on state."""
        # Delegate drawing based on state to UIManager
        self.ui_manager.draw(screen, self.game_state)


    def set_state(self, new_state):
        """Changes the game state, handling transitions."""
        # Allow transitions from end states only if restarting/loading next level
        if self.game_state in [STATE_GAME_OVER, STATE_VICTORY]:
            if new_state != STATE_PLAYING: # Only allow moving back to PLAYING from end state
                 print(f"Cannot change state from {self.game_state} to {new_state} without restart/next.")
                 return

        # Allow pausing only when playing
        if new_state == STATE_PAUSED and self.game_state != STATE_PLAYING:
            print(f"Cannot pause from state {self.game_state}.")
            return
        # Allow resuming only when paused
        if self.game_state == STATE_PAUSED and new_state != STATE_PLAYING:
            print(f"Cannot unpause to state {new_state}.")
            return


        print(f"Changing game state from {self.game_state} to {new_state}")
        self.game_state = new_state
        # TODO: Pause/unpause audio streams here later if needed

    def handle_input(self, event):
        """Handles global input relevant to game state (e.g., Pause)."""
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_p:
                if self.game_state == STATE_PLAYING:
                    self.set_state(STATE_PAUSED)
                elif self.game_state == STATE_PAUSED:
                    self.set_state(STATE_PLAYING)
            # Restart (R) and Next Level (N) are handled in main.py's event loop
            # based on the current state, which then calls Game methods.


# Need pygame for event types
import pygame