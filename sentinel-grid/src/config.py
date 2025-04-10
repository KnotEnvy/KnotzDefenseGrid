# src/config.py
import pygame

# Screen Dimensions & FPS (Keep as is)
SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 720
SCREEN_SIZE = (SCREEN_WIDTH, SCREEN_HEIGHT)
FPS = 60

# Colors (Add dark blue)
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GREY = (128, 128, 128)
GREEN = (0, 255, 0)
BLUE = (0, 0, 255)
DARK_BLUE = (0, 0, 100) # New color
RED = (255, 0, 0)
YELLOW = (255, 255, 0)

# Game States (Keep as is)
STATE_PLAYING = "playing"
STATE_PAUSED = "paused"
STATE_GAME_OVER = "game_over"
STATE_VICTORY = "victory"

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
# Example: Path enters top-left, snakes down, exits bottom-right
PATH_WAYPOINTS_L2 = [
    (0, 100),
    (SCREEN_WIDTH // 3, 100),
    (SCREEN_WIDTH // 3, SCREEN_HEIGHT // 2),
    (SCREEN_WIDTH * 2 // 3, SCREEN_HEIGHT // 2),
    (SCREEN_WIDTH * 2 // 3, SCREEN_HEIGHT - 100),
    (SCREEN_WIDTH, SCREEN_HEIGHT - 100),
]
# Example: Platforms clustered around corners
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
# Map keys used in levels.json to the actual data lists
LEVEL_PATHS = {
    "level1_path": PATH_WAYPOINTS_L1,
    "level2_path": PATH_WAYPOINTS_L2,
}
LEVEL_PLATFORMS = {
    "level1_platforms": PLATFORM_LOCATIONS_L1,
    "level2_platforms": PLATFORM_LOCATIONS_L2,
}
LEVEL_BACKGROUNDS = {
    "color_black": BLACK,
    "color_dark_blue": DARK_BLUE,
    # Add more later (e.g., image file paths)
}

# --- Tower Platform Settings --- (Keep as is)
PLATFORM_SIZE = (50, 50)
PLATFORM_COLOR = GREY
PLATFORM_BORDER_COLOR = BLACK