# src/ui_manager.py
import pygame
# Import get_color instead of specific colors
from .config import (get_color, # Import the helper function
                   SCREEN_WIDTH, SCREEN_HEIGHT, SCREEN_SIZE, # Keep screen stuff
                   STATE_PLAYING, STATE_PAUSED, STATE_GAME_OVER, STATE_VICTORY) # Keep states

class UIManager:
    def __init__(self, resource_manager, wave_manager, core):
        self.resource_manager = resource_manager
        self.wave_manager = wave_manager
        self.core = core
        self._font_tiny = pygame.font.SysFont(None, 18)
        self._font_small = pygame.font.SysFont(None, 24)
        self._font_medium = pygame.font.SysFont(None, 36)
        self._font_large = pygame.font.SysFont(None, 72)
        self._font_xl = pygame.font.SysFont(None, 96)

        self.selected_tower_type = None
        self.selected_tower_data = None
        self.selected_placed_tower_data = None
        self.selected_placed_tower_id = None
        self.full_tower_data = {} # Will be populated by main.py

        # --- UI Panel Settings ---
        # Use palette indices
        self.panel_color_idx = 15    # e.g., Dark Panel BG
        self.panel_border_color_idx = 1 # e.g., White/Accent border
        self.top_panel_height = 50
        self.bottom_panel_height = 70

        # Define standard text color indices
        self.text_color_idx = 1       # Default text (White/Accent)
        self.resource_color_idx = 7   # Resources (Yellow)
        self.warning_color_idx = 6    # Warnings (Red)
        self.success_color_idx = 3    # Success/Good (Green)
        self.neutral_color_idx = 2    # Neutral info (Grey)
        self.highlight_color_idx = 7  # Highlights (Yellow)

        print("UIManager Initialized")

    def _render_text(self, text, font, color_idx):
        """Renders text using a palette color index."""
        color = get_color(color_idx)
        return font.render(text, True, color)

    def _draw_panel(self, surface, rect, fill_color_idx, border_color_idx=None, border_width=1):
        """Helper to draw a panel using palette indices."""
        fill_color = get_color(fill_color_idx)
        # Make panel semi-transparent by adding alpha
        panel_surface = pygame.Surface(rect.size, pygame.SRCALPHA)
        panel_surface.fill((fill_color[0], fill_color[1], fill_color[2], 200)) # Use 200 alpha

        if border_color_idx is not None and border_width > 0:
            border_color = get_color(border_color_idx)
            pygame.draw.rect(panel_surface, border_color, panel_surface.get_rect(), border_width, border_radius=5)

        surface.blit(panel_surface, rect.topleft)


    def draw_hud(self, screen):
        """Draws the main Heads-Up Display with panels."""
        panel_padding = 10

        # --- Top Right: Resources ---
        resource_text = f"Resources: {self.resource_manager.resources}"
        resource_surf = self._render_text(resource_text, self._font_medium, self.resource_color_idx)
        resource_rect = resource_surf.get_rect(topright=(SCREEN_WIDTH - panel_padding, panel_padding))
        screen.blit(resource_surf, resource_rect)

        # --- Top Left: Wave Info ---
        current_wave_num = self.wave_manager.current_wave_index + 1
        total_waves = len(self.wave_manager.wave_sequence) if self.wave_manager.wave_sequence else 0
        wave_text = f"Wave: {current_wave_num} / {total_waves}"
        if self.wave_manager.level_complete: wave_text = "Level Complete!"
        elif self.wave_manager.all_waves_spawned: wave_text = f"Wave: {total_waves} / {total_waves} (Clear remaining)"
        # Ensure wave_sequence exists before trying to access len
        elif not self.wave_manager.wave_sequence: wave_text = "No Waves Loaded"
        elif current_wave_num < 1: wave_text = f"Wave: 0 / {total_waves}"

        wave_surf = self._render_text(wave_text, self._font_medium, self.text_color_idx)
        wave_rect = wave_surf.get_rect(topleft=(panel_padding, panel_padding))
        screen.blit(wave_surf, wave_rect)

        # --- Top Left: Next Wave Timer ---
        time_to_next = self.wave_manager.get_time_until_next_wave()
        if time_to_next is not None:
            timer_text = f"Next: {int(time_to_next) + 1}s"
            timer_surf = self._render_text(timer_text, self._font_small, self.neutral_color_idx)
            timer_rect = timer_surf.get_rect(topleft=(wave_rect.left, wave_rect.bottom + 2))
            screen.blit(timer_surf, timer_rect)

        # --- Top Center: Core Health ---
        if self.core: # Check if core exists
             core_health_display = max(0, int(self.core.current_health))
             core_health_str = f"{core_health_display} / {int(self.core.max_health)}"
             core_text = f"Core: {core_health_str}"
             core_color_idx = self.resource_color_idx if self.core.current_health > 0 else self.warning_color_idx
             core_surf = self._render_text(core_text, self._font_medium, core_color_idx)
             core_rect = core_surf.get_rect(midtop=(SCREEN_WIDTH // 2, panel_padding))
             screen.blit(core_surf, core_rect)
        else: # Draw placeholder if core doesn't exist yet
             core_surf = self._render_text("Core: N/A", self._font_medium, self.neutral_color_idx)
             core_rect = core_surf.get_rect(midtop=(SCREEN_WIDTH // 2, panel_padding))
             screen.blit(core_surf, core_rect)


        # --- Bottom Info Panel ---
        bottom_panel_rect = pygame.Rect(0, SCREEN_HEIGHT - self.bottom_panel_height, SCREEN_WIDTH, self.bottom_panel_height)
        self._draw_panel(screen, bottom_panel_rect, self.panel_color_idx, self.panel_border_color_idx)

        info_y_pos = bottom_panel_rect.top + 5
        line_height_small = self._font_small.get_linesize()
        line_height_tiny = self._font_tiny.get_linesize()

        # Default build instructions
        info_text_line1 = "Select Tower: [1] Gun [2] Cannon [3] Slow | [ESC] Deselect | [U] Upgrade"
        info_color_idx = self.text_color_idx
        info_font = self._font_small
        stats_text = "" # Initialize stats text

        # If placing a new tower
        if self.selected_tower_type and self.selected_tower_data:
             name = self.selected_tower_data.get('name','N/A')
             cost = self.selected_tower_data.get('cost','N/A')
             info_text_line1 = f"Placing: {name} (Cost: {cost})"
             info_color_idx = self.highlight_color_idx
             # Add basic stats for placement preview
             stats_text = "Stats: "
             if 'damage' in self.selected_tower_data: stats_text += f"Dmg:{self.selected_tower_data['damage']} "
             if 'effect_type' in self.selected_tower_data:
                 factor = self.selected_tower_data.get('slow_factor', '?')
                 duration = self.selected_tower_data.get('slow_duration', '?')
                 stats_text += f"Slow:{factor*100:.0f}%/{duration}s "
             stats_text += f"Rng:{self.selected_tower_data.get('range', '?')} Rate:{self.selected_tower_data.get('fire_rate', '?')}/s"


        # If a placed tower is selected
        elif self.selected_placed_tower_id and self.selected_placed_tower_data:
             # Use self.full_tower_data (loaded from TowerManager) for reliable upgrade info
             current_config = self.full_tower_data.get(self.selected_placed_tower_id)
             tower_name = self.selected_placed_tower_data.get('name', 'N/A')
             info_color_idx = self.highlight_color_idx

             # Line 1: Name and Upgrade Path/Cost
             upgrade_text = " (Max Level)"
             upgrade_cost_text = ""
             can_upgrade = False
             if current_config:
                  upgrades_to_id = current_config.get("upgrades_to")
                  upgrade_cost = current_config.get("upgrade_cost", 0)
                  # Check if upgrade exists in the main data AND has a cost
                  if upgrades_to_id and upgrades_to_id in self.full_tower_data and upgrade_cost > 0:
                       upgrade_config = self.full_tower_data[upgrades_to_id]
                       upgrade_name = upgrade_config.get('name', 'Unknown Upgrade')
                       upgrade_text = f" -> {upgrade_name}"
                       # Check affordability for UI feedback
                       can_afford = self.resource_manager.resources >= upgrade_cost
                       cost_color_idx = self.text_color_idx if can_afford else self.warning_color_idx
                       # Render cost separately to color it
                       upgrade_cost_surf = self._render_text(f"Cost: {upgrade_cost} [U]", self._font_small, cost_color_idx)

                       can_upgrade = True # Mark that upgrade is possible
                  else:
                      # Handle case where tower is max level (upgrades_to is null or invalid)
                      upgrade_text = " (Max Level)"


             info_text_line1 = f"Selected: {tower_name}{upgrade_text}"


             # Line 2: Basic Stats (Damage/Effect, Range, Rate)
             stats_text = "Stats: "
             if 'damage' in self.selected_placed_tower_data:
                 stats_text += f"Dmg:{self.selected_placed_tower_data['damage']} | "
             if 'effect_type' in self.selected_placed_tower_data:
                 effect = self.selected_placed_tower_data['effect_type']
                 factor = self.selected_placed_tower_data.get('slow_factor', '?')
                 duration = self.selected_placed_tower_data.get('slow_duration', '?')
                 stats_text += f"Slow:{factor*100:.0f}%/{duration}s | " # Show slow %
             stats_text += f"Rng:{self.selected_placed_tower_data.get('range', '?')} | "
             stats_text += f"Rate:{self.selected_placed_tower_data.get('fire_rate', '?')}/s"


        # Render and draw Line 1 (build instructions or selected tower name/upgrade)
        info_surf_line1 = self._render_text(info_text_line1, info_font, info_color_idx)
        info_rect_line1 = info_surf_line1.get_rect(topleft=(panel_padding, info_y_pos))
        screen.blit(info_surf_line1, info_rect_line1)

        # Blit upgrade cost next to it if applicable and affordable/not
        if self.selected_placed_tower_id and can_upgrade:
             cost_rect = upgrade_cost_surf.get_rect(midleft=(info_rect_line1.right + 10, info_rect_line1.centery))
             screen.blit(upgrade_cost_surf, cost_rect)


        # Render and draw Stats Line (Line 2) if applicable
        if stats_text:
             stats_surf = self._render_text(stats_text, self._font_tiny, self.text_color_idx)
             # Position stats line below the first line
             stats_rect = stats_surf.get_rect(topleft=(panel_padding, info_rect_line1.bottom + 2))
             screen.blit(stats_surf, stats_rect)


    def draw_game_over(self, screen):
        """Displays the Game Over screen."""
        # Semi-transparent overlay using background color
        overlay = pygame.Surface(SCREEN_SIZE, pygame.SRCALPHA)
        bg_color = get_color(0) # Base background color
        overlay.fill((bg_color[0], bg_color[1], bg_color[2], 180)) # Dimmed BG overlay
        screen.blit(overlay, (0, 0))

        # Panel for text
        panel_width = 600
        panel_height = 250
        panel_rect = pygame.Rect(0, 0, panel_width, panel_height)
        panel_rect.center = screen.get_rect().center
        # Use panel index, but maybe a red border?
        self._draw_panel(screen, panel_rect, self.panel_color_idx, self.warning_color_idx, border_width=2)

        # Text
        title_surf = self._render_text("GAME OVER", self._font_xl, self.warning_color_idx) # Red index
        title_rect = title_surf.get_rect(center=(panel_rect.centerx, panel_rect.centery - 50))
        screen.blit(title_surf, title_rect)

        restart_surf = self._render_text("Press R to Restart", self._font_medium, self.text_color_idx) # White index
        restart_rect = restart_surf.get_rect(center=(panel_rect.centerx, panel_rect.centery + 50))
        screen.blit(restart_surf, restart_rect)


    def draw_victory(self, screen):
        """Displays the Victory screen."""
        # Semi-transparent overlay
        overlay = pygame.Surface(SCREEN_SIZE, pygame.SRCALPHA)
        bg_color = get_color(0)
        overlay.fill((bg_color[0], bg_color[1], bg_color[2], 180))
        screen.blit(overlay, (0, 0))

        panel_width = 600
        panel_height = 250
        panel_rect = pygame.Rect(0, 0, panel_width, panel_height)
        panel_rect.center = screen.get_rect().center
        # Green border for victory?
        self._draw_panel(screen, panel_rect, self.panel_color_idx, self.success_color_idx, border_width=2)

        title_surf = self._render_text("VICTORY!", self._font_xl, self.success_color_idx) # Green index
        title_rect = title_surf.get_rect(center=(panel_rect.centerx, panel_rect.centery - 50))
        screen.blit(title_surf, title_rect)

        next_level_surf = self._render_text("Press N for Next Level", self._font_medium, self.text_color_idx) # White index
        next_level_rect = next_level_surf.get_rect(center=(panel_rect.centerx, panel_rect.centery + 50))
        screen.blit(next_level_surf, next_level_rect)


    def draw_pause(self, screen):
        """Displays the Pause overlay."""
        overlay = pygame.Surface(SCREEN_SIZE, pygame.SRCALPHA)
        # Use a different color tint? Maybe dark blueish? Index 5
        pause_tint_color = get_color(5, (0, 0, 50)) # Fallback if index 5 missing
        overlay.fill((pause_tint_color[0], pause_tint_color[1], pause_tint_color[2], 150)) # Bluish tint
        screen.blit(overlay, (0,0))

        pause_surf = self._render_text("PAUSED", self._font_large, self.text_color_idx) # White index
        pause_rect = pause_surf.get_rect(center=screen.get_rect().center)
        screen.blit(pause_surf, pause_rect)


    def draw(self, screen, game_state):
        """Main draw call for UI elements based on game state."""
        # Always draw HUD elements in playing/paused state
        if game_state in [STATE_PLAYING, STATE_PAUSED]:
            self.draw_hud(screen)

        # Draw overlays based on state
        if game_state == STATE_PAUSED:
            self.draw_pause(screen)
        elif game_state == STATE_GAME_OVER:
             self.draw_game_over(screen)
        elif game_state == STATE_VICTORY:
             self.draw_victory(screen)