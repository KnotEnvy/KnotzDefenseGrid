## Project Requirements Document (PRD) - Project: Sentinel Grid (Pygame Edition)

**1. Introduction**
*   **Purpose:** Define the software architecture for "Project: Sentinel Grid", a 2D tower defense game inspired by *Defense Grid*, built with Python and Pygame.
*   **Scope:** Core gameplay loop: wave spawning, enemy pathfinding (on a 2D grid/path), tower placement/firing, resource management, core protection, win/loss conditions. Initial implementation will focus on a limited set of towers, enemies, and one basic level map defined by coordinates.
*   **Definitions:**
    *   TD: Tower Defense
    *   Core: The objective sprite/entity the player must protect.
    *   Wave: A group of enemies spawning over a period.
    *   Resource: The currency used to build/upgrade towers.
    *   Platform: Designated coordinates/areas where towers can be built.

**2. System Overview**
*   A 2D, single-player tower defense game where players strategically place and upgrade towers on fixed locations along a predetermined enemy path (defined by waypoints) to prevent waves of enemies from reaching and damaging/stealing Power Cores. Resources are gained passively and by destroying enemies. Rendered using Pygame.

**3. Architectural Goals**
*   **Modularity:** Components (Python classes/modules) should be loosely coupled.
*   **Extensibility:** Easily add new towers, enemies, levels, and features by adding new classes or configuration entries.
*   **Performance:** Efficiently handle numerous sprites (Object Pooling is recommended).
*   **Maintainability:** Clean, readable, and well-organized Python code.

**4. Key Architectural Patterns & Concepts**
*   **Object-Oriented Programming (OOP):** Use classes and inheritance extensively (e.g., Base `Tower` class, specific tower subclasses).
*   **Pygame Sprites & Groups:** Utilize `pygame.sprite.Sprite` and `pygame.sprite.Group` for managing game entities (towers, enemies, projectiles).
*   **Configuration Files (JSON):** Store game data (Tower stats, Enemy stats, Wave definitions, Level layouts) in external JSON files for easy modification and extension.
*   **Event System:** Use Pygame's event queue (`pygame.event.get()`) for input handling. Custom events (`pygame.event.Event`) or a simple Observer pattern can be used for inter-system communication (e.g., `ENEMY_DESTROYED`, `CORE_HIT`, `WAVE_COMPLETE`).
*   **State Machines:** Manage game state (MainMenu, Playing, Paused, GameOver) using simple state variables or dedicated classes.
*   **Object Pooling:** Implement simple Python lists or custom pool classes to manage reusable objects like enemies and projectiles, reducing object creation overhead.
*   **Game Loop:** Standard Pygame loop structure (Handle Input -> Update State -> Draw Screen).

**5. Core Modules / Components (Python Classes/Files)**

*   **`main.py`:**
    *   Initializes Pygame and core managers.
    *   Contains the main game loop.
    *   Handles Pygame events (quit, basic input delegation).
    *   Manages overall game state transitions.
*   **`game_manager.py` (Class: `GameManager`):**
    *   Manages overall game state (Playing, Paused, GameOver).
    *   Coordinates other managers (Wave, Tower, Resource, UI).
    *   Tracks Core status.
    *   Determines Win/Loss conditions.
    *   Handles pausing logic.
*   **`input_handler.py` (Class: `InputHandler` or integrated into `main.py` loop):**
    *   Processes Pygame events related to gameplay (mouse clicks for placement/selection, keyboard shortcuts).
    *   Translates input into actions (e.g., attempt tower placement, select tower).
*   **`ui_manager.py` (Class: `UIManager`):**
    *   Responsible for drawing HUD elements onto the main screen surface (Resources, Wave Info, Core Status, Selected Tower Info). Uses `pygame.font`.
    *   Draws menus (Pause, Game Over).
    *   Provides visual feedback (e.g., drawing tower range or placement validity).
*   **`resource_manager.py` (Class: `ResourceManager`):**
    *   Tracks player's current resource amount.
    *   Provides methods to `add_resource()` / `spend_resource()`.
    *   Handles passive resource generation over time.
*   **`tower_manager.py` (Class: `TowerManager`):**
    *   Handles logic for selecting tower types and placing `Tower` instances at valid `TowerPlatform` locations.
    *   Manages tower selection state.
    *   Communicates with `ResourceManager` to deduct costs.
    *   Holds references to all active `Tower` instances (likely in a `pygame.sprite.Group`).
*   **`tower_platform.py` (Class: `TowerPlatform(pygame.sprite.Sprite)`):**
    *   Represents a placeable area. Stores its position.
    *   Can hold a reference to the `Tower` built on it (if any).
    *   Used for collision detection with mouse clicks for placement.
*   **`towers.py` (Base Class: `Tower(pygame.sprite.Sprite)`):**
    *   Abstract base for all towers. Loads data from config (JSON).
    *   Attributes: `range`, `fire_rate`, `damage`, `cost`, `target`, `last_shot_time`.
    *   Core logic: Target acquisition (`find_target` method using distances to enemies), firing mechanism (creates `Projectile` instances), range visualization.
    *   Specific Tower Types (e.g., `GunTower`, `SlowTower`, `CannonTower`) inherit from `Tower`.
*   **`wave_manager.py` (Class: `WaveManager`):**
    *   Loads wave definitions from config (JSON).
    *   Spawns `Enemy` instances based on current wave data (timing, type, count).
    *   Uses an object pool for enemy instances.
    *   Tracks active enemies and wave progress.
    *   Triggers wave start/end events/signals.
*   **`enemies.py` (Base Class: `Enemy(pygame.sprite.Sprite)`):**
    *   Loads data from config (JSON).
    *   Attributes: `health`, `speed`, `resource_reward`, `current_waypoint_index`.
    *   Handles movement along a predefined path (list of coordinates).
    *   Manages health (`take_damage` method).
    *   Handles its own destruction (signals `GameManager`/`ResourceManager` for rewards, returns to pool).
    *   Interacts with `Core` if it reaches the end.
*   **`path.py` (Class: `Path` or just list in `LevelData`):**
    *   Defines the sequence of (x, y) coordinates enemies follow.
*   **`core.py` (Class: `Core(pygame.sprite.Sprite)`):**
    *   Represents the objective. Tracks its current health/status.
    *   Handles interaction when an `Enemy` reaches it (e.g., take damage, trigger enemy removal).
*   **`projectiles.py` (Class: `Projectile(pygame.sprite.Sprite)`):**
    *   Represents bullets, rockets, etc.
    *   Attributes: `speed`, `damage`, `target_enemy` (or direction).
    *   Movement logic (straight line, homing).
    *   Handles collision detection with `Enemy` sprites. Managed via pooling.
*   **`audio_manager.py` (Class: `AudioManager`):**
    *   Uses `pygame.mixer` to load and play sound effects and background music. Provides simple `play_sound()` methods.
*   **`config_loader.py` (Utility Functions):**
    *   Helper functions to load data from JSON files (`towers.json`, `enemies.json`, `waves.json`, `levels.json`).

**6. Data Structures (JSON Files)**

*   **`data/towers.json`:** Object mapping tower type IDs to stats { "gun": {"name": "Gun Tower", "cost": 100, "damage": 10, "range": 150, "fire_rate": 1.0, "projectile_type": "bullet", ... }, ... }
*   **`data/enemies.json`:** Object mapping enemy type IDs to stats { "grunt": {"name": "Grunt", "health": 50, "speed": 60, "reward": 5, ...}, ... }
*   **`data/waves.json`:** List or object defining waves, each containing sequences of spawn events { "level1": [ {"time": 0.0, "enemy_type": "grunt", "count": 5, "interval": 1.0}, {"time": 10.0, ...} ], ... }
*   **`data/levels.json`:** Object defining level specifics { "level1": {"name": "Test Zone", "map_background": "placeholder_color", "path_waypoints": [[x1,y1], [x2,y2], ...], "platform_locations": [[x,y], ...], "starting_resources": 200, "core_location": [x,y], "core_health": 10, "wave_sequence": ["wave1_l1", "wave2_l1"] }, ...}

**7. Key Interactions Flow (Pygame Context)**

1.  **Game Start:** `main.py` initializes Pygame, `GameManager`, and other managers. Load level data (path, platforms) from JSON. `ResourceManager` sets starting resources. `UIManager` prepares initial HUD rendering.
2.  **Game Loop:**
    *   **Input:** `main.py`/`InputHandler` processes `pygame.event.get()`. Clicks might trigger `TowerManager` placement attempts.
    *   **Update:** `GameManager` updates timers, checks state. `WaveManager` spawns enemies if needed. `TowerManager` updates towers (targeting, firing cooldowns). `Enemy` instances update their position along the path. `Projectile` instances update position. Collision detection is performed (projectiles vs enemies, enemies vs core). Resource manager updates passive income.
    *   **Draw:** Clear screen. Draw background/map elements. Draw platforms. Draw active enemies (`Enemy` group). Draw active towers (`Tower` group). Draw projectiles (`Projectile` group). Draw the `Core`. `UIManager` draws HUD elements. `pygame.display.flip()`.
3.  **Enemy Spawn:** `WaveManager` gets enemy data from JSON, requests instances from an object pool, sets their starting position and path. Adds sprite to relevant Pygame groups.
4.  **Tower Placement:** Player selects tower type (via UI interaction captured by `InputHandler`), clicks on a `TowerPlatform`. `TowerManager` checks validity (location empty, sufficient resources), creates `Tower` instance, adds to groups, deducts resources via `ResourceManager`.
5.  **Tower Firing:** `Tower` finds valid `Enemy` target in range, checks fire rate cooldown. If ready, creates `Projectile` instance (from pool), sets target/direction. Adds projectile to relevant groups.
6.  **Damage & Death:** `Projectile` collides with `Enemy` (using `pygame.sprite.spritecollide`). Calls `take_damage` on `Enemy`. If health <= 0, `Enemy` signals its death (reward resources via `ResourceManager`, update `WaveManager` count), returns to pool, removed from sprite groups.
7.  **Enemy Reaches End:** `Enemy` position reaches final waypoint. `Enemy` collides with `Core` sprite. `Core` takes damage/updates status. `Enemy` is removed/pooled. `GameManager` checks loss condition.
8.  **Wave End:** `WaveManager` detects wave completion, signals `GameManager`.
9.  **Win/Loss:** `GameManager` checks conditions (all waves cleared vs. Core health depleted), transitions game state (e.g., to `GameOver` state for display by `UIManager`).
