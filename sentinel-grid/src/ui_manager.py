# src/ui_manager.py
import pygame
from .config import (WHITE, YELLOW, RED, GREEN, BLACK, GREY, # Add GREY
                   SCREEN_WIDTH, SCREEN_HEIGHT,
                   STATE_PLAYING, STATE_PAUSED, STATE_GAME_OVER, STATE_VICTORY, SCREEN_SIZE)

class UIManager:
    def __init__(self, resource_manager, wave_manager, core):
        self.resource_manager = resource_manager
        self.wave_manager = wave_manager
        self.core = core
        self._font_tiny = pygame.font.SysFont(None, 18)   # For detailed stats
        self._font_small = pygame.font.SysFont(None, 24)
        self._font_medium = pygame.font.SysFont(None, 36)
        self._font_large = pygame.font.SysFont(None, 72)
        self._font_xl = pygame.font.SysFont(None, 96) # For Titles

        self.selected_tower_type = None
        self.selected_tower_data = None
        self.selected_placed_tower_data = None
        self.selected_placed_tower_id = None
        self.full_tower_data = {}

        # --- UI Panel Settings ---
        self.panel_color = (40, 40, 40, 200) # Dark grey, semi-transparent
        self.top_panel_height = 50
        self.bottom_panel_height = 70 # Increased height for more info

        print("UIManager Initialized")

    def _render_text(self, text, font, color):
        return font.render(text, True, color)

    def _draw_panel(self, surface, rect, color, border_color=None, border_width=1):
        """Helper to draw a panel with optional border."""
        pygame.draw.rect(surface, color, rect, border_radius=5)
        if border_color:
            pygame.draw.rect(surface, border_color, rect, border_width, border_radius=5)

    def draw_hud(self, screen):
        """Draws the main Heads-Up Display with panels."""
        panel_padding = 10

        # --- Top Panels ---
        top_panel_rect = pygame.Rect(0, 0, SCREEN_WIDTH, self.top_panel_height)
        # Draw one background panel across the top (or individual ones)
        # Let's do one for simplicity
        # self._draw_panel(screen, top_panel_rect, self.panel_color)

        # Resources (Top Right)
        resource_text = f"Resources: {self.resource_manager.resources}"
        resource_surf = self._render_text(resource_text, self._font_medium, YELLOW) # Yellow for resources
        resource_rect = resource_surf.get_rect(topright=(SCREEN_WIDTH - panel_padding, panel_padding))
        screen.blit(resource_surf, resource_rect)

        # Wave Info (Top Left)
        current_wave_num = self.wave_manager.current_wave_index + 1
        total_waves = len(self.wave_manager.wave_sequence)
        wave_text = f"Wave: {current_wave_num} / {total_waves}"
        if self.wave_manager.level_complete: wave_text = "Level Complete!"
        elif self.wave_manager.all_waves_spawned: wave_text = f"Wave: {total_waves} / {total_waves} (Clear remaining)"
        elif current_wave_num < 1: wave_text = f"Wave: 0 / {total_waves}"
        wave_surf = self._render_text(wave_text, self._font_medium, WHITE)
        wave_rect = wave_surf.get_rect(topleft=(panel_padding, panel_padding))
        screen.blit(wave_surf, wave_rect)

        # Next Wave Timer (Below Wave Info)
        time_to_next = self.wave_manager.get_time_until_next_wave()
        timer_text = ""
        if time_to_next is not None:
            timer_text = f"Next: {int(time_to_next) + 1}s" # Show seconds remaining
            timer_surf = self._render_text(timer_text, self._font_small, GREY)
            timer_rect = timer_surf.get_rect(topleft=(wave_rect.left, wave_rect.bottom + 2))
            screen.blit(timer_surf, timer_rect)


        # Core Health (Top Center)
        core_health_display = max(0, int(self.core.current_health))
        core_health_str = f"{core_health_display} / {int(self.core.max_health)}"
        core_text = f"Core: {core_health_str}" # Shortened label
        core_surf = self._render_text(core_text, self._font_medium, YELLOW if self.core.current_health > 0 else RED)
        core_rect = core_surf.get_rect(midtop=(SCREEN_WIDTH // 2, panel_padding))
        screen.blit(core_surf, core_rect)

        # --- Bottom Info Panel ---
        bottom_panel_rect = pygame.Rect(0, SCREEN_HEIGHT - self.bottom_panel_height, SCREEN_WIDTH, self.bottom_panel_height)
        self._draw_panel(screen, bottom_panel_rect, self.panel_color)

        # Draw Build/Upgrade Info inside the bottom panel
        info_y_pos = bottom_panel_rect.top + 5 # Start text near top of panel
        line_height_small = self._font_small.get_linesize()
        line_height_tiny = self._font_tiny.get_linesize()

        # Default build instructions
        info_text_line1 = "Select Tower: [1] Gun [2] Cannon [3] Slow | [ESC] Deselect"
        info_color = WHITE
        info_font = self._font_small

        # If placing a new tower
        if self.selected_tower_type and self.selected_tower_data:
             info_text_line1 = f"Placing: {self.selected_tower_data.get('name','N/A')} (Cost: {self.selected_tower_data.get('cost','N/A')})"
             info_color = YELLOW

        # If a placed tower is selected
        elif self.selected_placed_tower_id and self.selected_placed_tower_data:
             current_config = self.full_tower_data.get(self.selected_placed_tower_id)
             tower_name = self.selected_placed_tower_data.get('name', 'N/A')
             info_color = YELLOW

             # Line 1: Name and Upgrade Path/Cost
             upgrade_text = " (Max Level)"
             upgrade_cost_text = ""
             can_upgrade = False
             if current_config:
                  upgrades_to_id = current_config.get("upgrades_to")
                  upgrade_cost = current_config.get("upgrade_cost", 0)
                  if upgrades_to_id and upgrades_to_id in self.full_tower_data and upgrade_cost > 0:
                       upgrade_config = self.full_tower_data[upgrades_to_id]
                       upgrade_name = upgrade_config.get('name', 'Unknown Upgrade')
                       upgrade_text = f" -> {upgrade_name}"
                       upgrade_cost_text = f" | Cost: {upgrade_cost} [U]"
                       can_upgrade = True # Mark that upgrade is possible

             info_text_line1 = f"Selected: {tower_name}{upgrade_text}{upgrade_cost_text}"

             # Line 2: Basic Stats (Damage/Effect, Range, Rate)
             stats_text = "Stats: "
             if 'damage' in self.selected_placed_tower_data:
                 stats_text += f"Dmg: {self.selected_placed_tower_data['damage']} | "
             if 'effect_type' in self.selected_placed_tower_data:
                 effect = self.selected_placed_tower_data['effect_type']
                 factor = self.selected_placed_tower_data.get('slow_factor', '?')
                 duration = self.selected_placed_tower_data.get('slow_duration', '?')
                 stats_text += f"Effect: {effect} ({factor*100:.0f}%, {duration}s) | " # Show slow %
             stats_text += f"Rng: {self.selected_placed_tower_data.get('range', '?')} | "
             stats_text += f"Rate: {self.selected_placed_tower_data.get('fire_rate', '?')}/s"

             stats_surf = self._render_text(stats_text, self._font_tiny, WHITE)
             stats_rect = stats_surf.get_rect(bottomleft=(panel_padding, bottom_panel_rect.bottom - 5)) # Align near bottom
             screen.blit(stats_surf, stats_rect)

        # Render and draw Line 1 (build instructions or selected tower name/upgrade)
        info_surf_line1 = self._render_text(info_text_line1, info_font, info_color)
        info_rect_line1 = info_surf_line1.get_rect(topleft=(panel_padding, info_y_pos))
        screen.blit(info_surf_line1, info_rect_line1)


    def draw_game_over(self, screen):
        """Displays the Game Over screen."""
        # Semi-transparent overlay
        overlay = pygame.Surface(SCREEN_SIZE, pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 180))
        screen.blit(overlay, (0, 0))

        # Panel for text
        panel_width = 600
        panel_height = 250
        panel_rect = pygame.Rect(0, 0, panel_width, panel_height)
        panel_rect.center = screen.get_rect().center
        self._draw_panel(screen, panel_rect, (50, 0, 0, 220), RED) # Dark red panel

        # Text
        title_surf = self._render_text("GAME OVER", self._font_xl, RED)
        title_rect = title_surf.get_rect(center=(panel_rect.centerx, panel_rect.centery - 50))
        screen.blit(title_surf, title_rect)

        restart_surf = self._render_text("Press R to Restart (Not Implemented)", self._font_medium, WHITE)
        restart_rect = restart_surf.get_rect(center=(panel_rect.centerx, panel_rect.centery + 50))
        screen.blit(restart_surf, restart_rect)


    def draw_victory(self, screen):
        """Displays the Victory screen."""
        overlay = pygame.Surface(SCREEN_SIZE, pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 180))
        screen.blit(overlay, (0, 0))

        panel_width = 600
        panel_height = 250
        panel_rect = pygame.Rect(0, 0, panel_width, panel_height)
        panel_rect.center = screen.get_rect().center
        self._draw_panel(screen, panel_rect, (0, 50, 0, 220), GREEN) # Dark green panel

        title_surf = self._render_text("VICTORY!", self._font_xl, GREEN)
        title_rect = title_surf.get_rect(center=(panel_rect.centerx, panel_rect.centery - 50))
        screen.blit(title_surf, title_rect)

        next_level_surf = self._render_text("Press N for Next Level (Not Implemented)", self._font_medium, WHITE)
        next_level_rect = next_level_surf.get_rect(center=(panel_rect.centerx, panel_rect.centery + 50))
        screen.blit(next_level_surf, next_level_rect)


    def draw_pause(self, screen):
        """Displays the Pause overlay."""
        overlay = pygame.Surface(SCREEN_SIZE, pygame.SRCALPHA)
        overlay.fill((0, 0, 50, 150)) # Bluish tint for pause
        screen.blit(overlay, (0,0))

        pause_surf = self._render_text("PAUSED", self._font_large, WHITE)
        pause_rect = pause_surf.get_rect(center=screen.get_rect().center)
        screen.blit(pause_surf, pause_rect)


    def draw(self, screen, game_state):
        """Main draw call for UI elements based on game state."""
        # Always draw HUD elements? Or only when playing/paused?
        # Let's draw HUD always for now, maybe dim it on end screens.
        self.draw_hud(screen)

        # Draw overlays based on state
        if game_state == STATE_PAUSED:
            self.draw_pause(screen)
        elif game_state == STATE_GAME_OVER:
             self.draw_game_over(screen)
        elif game_state == STATE_VICTORY:
             self.draw_victory(screen)