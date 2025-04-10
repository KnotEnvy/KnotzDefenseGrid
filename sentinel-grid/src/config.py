# src/config.py
import pygame

# Screen Dimensions & FPS (Keep as is)
SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 720
SCREEN_SIZE = (SCREEN_WIDTH, SCREEN_HEIGHT)
FPS = 60

# --- Color Palettes ---
# Define palettes as lists/tuples of colors.
# We'll use indices (0, 1, 2, ...) to refer to colors within the active palette.
# Example: 0=Background, 1=Primary Accent, 2=Secondary Accent, 3=Enemy Color 1, etc.

PALETTE_ORIGINAL = [
    (0, 0, 0),         # 0: Black BG
    (255, 255, 255),   # 1: White Text/Accent
    (128, 128, 128),   # 2: Grey Platforms/UI
    (0, 255, 0),       # 3: Green Path/Health
    (0, 0, 255),       # 4: Blue (Slow Tower?)
    (0, 0, 100),       # 5: Dark Blue BG
    (255, 0, 0),       # 6: Red (Grunt Enemy?)
    (255, 255, 0),     # 7: Yellow (Core/Resources?)
    (139, 0, 0),       # 8: Dark Red (Tank?)
    (255, 105, 180),   # 9: Pink (Runner?)
    (160, 160, 160),   # 10: Light Grey (Gun Tower?)
    (200, 200, 200),   # 11: Lighter Grey (Gun Mk2?)
    (80, 80, 80),      # 12: Dark Grey (Cannon?)
    (0, 100, 255),     # 13: Bright Blue (Slow Tower?)
    (255, 165, 0),     # 14: Orange (Cannon Shell?)
    (50, 50, 50),      # 15: Panel BG
]

PALETTE_RETRO_1 = [
    (26, 28, 44),     # 0: Dark Purple BG
    (240, 240, 240),   # 1: Off-White Text/Accent
    (85, 91, 110),     # 2: Mid Grey Platforms/UI
    (66, 230, 134),    # 3: Bright Green Path/Health
    (66, 174, 230),    # 4: Sky Blue
    (38, 50, 88),      # 5: Darker Blue (Alternative BG?)
    (230, 66, 110),    # 6: Magenta/Red Enemy
    (255, 231, 98),    # 7: Bright Yellow Core/Resources
    (170, 46, 96),     # 8: Dark Magenta/Red (Tank?)
    (230, 134, 66),    # 9: Orange (Runner?)
    (139, 148, 171),   # 10: Light Grey-Blue (Gun Tower?)
    (180, 190, 210),   # 11: Lighter Grey-Blue (Gun Mk2?)
    (61, 68, 81),      # 12: Dark Grey-Blue (Cannon?)
    (98, 198, 255),    # 13: Cyan/Bright Blue (Slow Tower?)
    (255, 160, 60),    # 14: Brighter Orange (Cannon Shell?)
    (40, 44, 60),      # 15: Panel BG
]

# --- Select Active Palette ---
# Change this to PALETTE_RETRO_1 etc. to switch themes
ACTIVE_PALETTE = PALETTE_RETRO_1

# --- Helper Function to Get Palette Color ---
def get_color(index, default_color=(255, 0, 255)): # Default to bright pink for errors
    """Gets a color from the ACTIVE_PALETTE by index."""
    try:
        return ACTIVE_PALETTE[index]
    except IndexError:
        print(f"Warning: Color index {index} out of range for current palette.")
        return default_color

# --- Old Color definitions (keep for reference or remove later) ---
# BLACK = (0, 0, 0)
# WHITE = (255, 255, 255)
# GREY = (128, 128, 128)
# GREEN = (0, 255, 0)
# BLUE = (0, 0, 255)
# DARK_BLUE = (0, 0, 100) # New color
# RED = (255, 0, 0)
# YELLOW = (255, 255, 0)

# Game States (Keep as is)
STATE_PLAYING = "playing"
STATE_PAUSED = "paused"
STATE_GAME_OVER = "game_over"
STATE_VICTORY = "victory"
STATE_MAIN_MENU = "main_menu" # Add later
STATE_LEVEL_SELECT = "level_select" # Add later
STATE_OPTIONS = "options" # Add later

# --- Level 1 Data ---
PATH_WAYPOINTS_L1 = [
    (0, SCREEN_HEIGHT // 2),
    (SCREEN_WIDTH // 4, SCREEN_HEIGHT // 2),
    (SCREEN_WIDTH // 4, SCREEN_HEIGHT * 3 // 4),
    (SCREEN_WIDTH * 3 // 4, SCREEN_HEIGHT * 3 // 4),
    (SCREEN_WIDTH * 3 // 4, SCREEN_HEIGHT // 4),
    (SCREEN_WIDTH, SCREEN_HEIGHT // 4)
]
PLATFORM_LOCATIONS_L1 = [
    (150, SCREEN_HEIGHT // 2 - 80),
    (SCREEN_WIDTH // 4 + 80, SCREEN_HEIGHT // 2),
    (SCREEN_WIDTH // 4 + 80, SCREEN_HEIGHT * 3 // 4 + 80),
    (SCREEN_WIDTH * 3 // 4 - 80, SCREEN_HEIGHT * 3 // 4 + 80),
    (SCREEN_WIDTH * 3 // 4 - 80, SCREEN_HEIGHT // 4 - 80),
]

# --- Level 2 Data ---
PATH_WAYPOINTS_L2 = [
    (0, 100),
    (SCREEN_WIDTH // 3, 100),
    (SCREEN_WIDTH // 3, SCREEN_HEIGHT // 2),
    (SCREEN_WIDTH * 2 // 3, SCREEN_HEIGHT // 2),
    (SCREEN_WIDTH * 2 // 3, SCREEN_HEIGHT - 100),
    (SCREEN_WIDTH, SCREEN_HEIGHT - 100),
]
PLATFORM_LOCATIONS_L2 = [
    (SCREEN_WIDTH // 3 - 80, 100),
    (SCREEN_WIDTH // 3 + 80, 100),
    (SCREEN_WIDTH // 3 + 80, SCREEN_HEIGHT // 2 - 80),
    (SCREEN_WIDTH // 3 - 80, SCREEN_HEIGHT // 2 + 80),
    (SCREEN_WIDTH * 2 // 3 + 80, SCREEN_HEIGHT // 2 + 80),
    (SCREEN_WIDTH * 2 // 3 - 80, SCREEN_HEIGHT // 2),
    (SCREEN_WIDTH * 2 // 3 - 80, SCREEN_HEIGHT - 100 - 80),
    (SCREEN_WIDTH * 2 // 3 + 80, SCREEN_HEIGHT - 100),
]

# --- Data Lookup Maps ---
LEVEL_PATHS = {
    "level1_path": PATH_WAYPOINTS_L1,
    "level2_path": PATH_WAYPOINTS_L2,
}
LEVEL_PLATFORMS = {
    "level1_platforms": PLATFORM_LOCATIONS_L1,
    "level2_platforms": PLATFORM_LOCATIONS_L2,
}
# Map background keys to palette indices
LEVEL_BACKGROUNDS = {
    "bg_index_0": 0,
    "bg_index_5": 5,
    # Add more later if needed
}

# --- Tower Platform Settings ---
PLATFORM_SIZE = (50, 50)
PLATFORM_COLOR_IDX = 2      # Index in palette for platform fill
PLATFORM_BORDER_COLOR_IDX = 1 # Index for platform border