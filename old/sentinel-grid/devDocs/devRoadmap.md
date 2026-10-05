## Updated Development Roadmap - Project: Sentinel Grid (Pygame Edition)

**Phase 1: Core Setup & Scene Foundation** - ✅ **Complete**
*   [X] Setup Python project structure.
*   [X] Create `requirements.txt` (pygame).
*   [X] Implement `main.py`: Basic Pygame initialization, window, loop.
*   [X] Implement `game_manager.py` (basic state).
*   [X] Implement basic `resource_manager.py`.
*   [X] Implement basic `ui_manager.py` (resource text).
*   [X] Define and draw basic `Path`.
*   [X] Create and draw placeholder `TowerPlatform`.
*   [X] Implement robust JSON loading using absolute paths.

**Phase 2: Enemy Spawning & Pathfinding** - ✅ **Complete**
*   [X] Create `data/enemies.json`.
*   [X] Create `enemies.py` (`Enemy` class, load stats, health).
*   [X] Implement `Enemy` movement along waypoints.
*   [X] Create `data/waves.json` and `data/levels.json`.
*   [X] Implement `wave_manager.py` (load data, timed spawning).
*   [X] Implement basic Object Pooling for `Enemy` instances (in WaveManager).
*   [X] Draw enemies and basic health bars.

**Phase 3: Tower Placement & Basic Firing** - ✅ **Complete**
*   [X] Create `data/towers.json`.
*   [X] Create `towers.py` (`Tower` base, `GunTower`, `CannonTower`).
*   [X] Implement `tower_manager.py` (selection, placement, cost).
*   [X] Implement `Tower` target acquisition (nearest).
*   [X] Create `projectiles.py` (`Projectile` class).
*   [X] Implement `Tower` firing logic (cooldown, projectile creation).
*   [X] Implement basic Object Pooling for `Projectile` instances (in TowerManager).
*   [X] Implement `Projectile` movement and lifetime.
*   [X] Implement collision detection (projectile vs enemy) in `main.py`.
*   [X] Implement damage application and enemy death/reward.
*   [X] Implement placement preview sprite.

---
**Phase 4: Core Gameplay Loop Integration** - ⏳ **Current Focus**
*   [ ] **Implement `Core`:**
    *   Create `src/core.py` with `Core(pygame.sprite.Sprite)` class.
    *   Give `Core` health based on `levels.json`.
    *   Instantiate and draw the `Core` sprite at the location specified in `levels.json`.
*   [ ] **Enemy-Core Interaction:**
    *   Modify `Enemy.reach_end()` (or logic in `Enemy.update()`) to detect reaching the final waypoint.
    *   When an enemy reaches the end, have it damage the `Core` instance (e.g., call a `core.take_damage()` method).
    *   The enemy should be removed (`kill()`/pooled) after reaching the end.
*   [ ] **Game State Tracking:**
    *   Modify `GameManager` to hold a reference to the `Core` instance.
    *   Modify `GameManager.update()` to check `Core` health.
*   [ ] **Win/Loss Conditions:**
    *   Implement Loss Condition in `GameManager`: If `Core` health <= 0, set `game_state` to `STATE_GAME_OVER`.
    *   Implement Win Condition in `GameManager`: If `WaveManager` reports all waves in sequence are complete *and* `enemy_group` is empty, set `game_state` to `STATE_VICTORY`. (Requires `WaveManager` to track overall completion).
*   [ ] **UI Updates:**
    *   Update `UIManager` to display the actual `Core` health.
    *   Update `UIManager` to display the current wave number and total waves (e.g., "Wave: 3 / 10") by getting data from `WaveManager`.
    *   Implement basic `draw_game_over()` and `draw_victory()` methods in `UIManager`, called by `GameManager.draw()` based on state.
*   [ ] **Passive Income:** Implement simple passive resource gain over time in `ResourceManager.update()`.

**Phase 5: Basic Polish & Variety (Next Steps After Phase 4)**
*   [ ] Add 1-2 more Tower Types (e.g., AoE Splash, Slowing) with JSON, classes, and logic.
*   [ ] Add 1-2 more Enemy Types (e.g., Fast, Armored/Resistant) with JSON and logic adjustments.
*   [ ] Implement basic Tower Upgrade system (UI interaction, cost, stat modification or instance replacement). Update JSON for upgrades.
*   [ ] Integrate basic placeholder SFX via `AudioManager` (`pygame.mixer`).
*   [ ] Add simple visual effects (explosions, impacts) potentially via `VFXManager` or similar, using pooling.
*   [ ] Refine UI/HUD (clearer tower selection feedback, maybe basic buttons).

**Phase 6+ (Beyond Initial Core):**
*   Advanced Tower/Enemy abilities.
*   Multiple Levels / Level Selection.
*   Loading actual image assets / Spritesheets / Animations.
*   More sophisticated UI (proper menus, buttons).
*   Saving/Loading game state.
*   Optimization passes.
*   Story elements / Meta-progression.

---
