# BEAMFALL — Design Document

> *A Dark Tower defense grid, built on Phaser 4.*
> Unofficial fan project. Not affiliated with or endorsed by Stephen King or his publishers.
> The storyline, characters, and levels below are original; the world (Mid-World, the Beams,
> the Tower, gunslingers, the Crimson King) is borrowed with love.

---

## 1. Pitch

You are the last 'prentice of a dead order, holding a string of ruined Waystations along the Path of the
Beam. Servants of the Crimson King pour out of a *thinny* — a place where the world has worn through —
to steal the **Beam-shards** that anchor the Beam to the ground. Every shard that walks back through the
Doorway is a stretch of Beam gone for good. Build gunslinger posts, shape the road the enemy must walk,
shoot the thieves before they reach the Doorway, and **hold the Beam**.

It is a love letter to *Defense Grid: The Awakening*: a grid, a maze you build, thieves with stolen
power sources running home, and the single most important verb in the genre — *kill the carrier*.

## 2. Why gunslingers exist (the in-world reason)

The Dark Tower stands at the center of all worlds. Six Beams of force run to it from the edges of
creation, and the Tower stands because the Beams hold. Arthur Eld's line forged the guns and swore their
heirs to exactly one duty:

> **Keep the Beam. Keep the Tower. Everything else is a distraction.**

A gunslinger is not a soldier, a sheriff, or a hero. A gunslinger is a *hinge*: the hardware that keeps
the door of the world from swinging off. That is why a gunslinger does not leave a Waystation while a
shard is still on the ground, and why the Crimson King, who wants the Tower down, spends his armies on
*thieving* rather than killing. He does not need Mid-World conquered. He only needs the Beam thin enough
to snap.

"Ka is a wheel," the old gunslingers say: the world turns, and the story repeats with variations.
BEAMFALL is one more turn of the wheel — a different 'prentice, a different road.

## 3. Cast (original)

| Who | Role |
|---|---|
| **Wren Calloway** | The player. Last 'prentice of Gilead's line. Eyes better than her hands, hands better than her patience. |
| **Sai Tobias Rusk** | Old gunslinger, wounded. His gravelly voice is the in-game narrator (wave callouts, tips). |
| **Mercy Vale** | Ex-Breaker who escaped the Spire. Carves sigul-stones, can *feel* the Beam fraying. |
| **Powder Finch** | Dynamite-happy rail hand from the Spur. |
| **Bix** | A billy-bumbler. Says "Bix!" Points at things. |
| **Corvin Ashe** | The Ashen Gunslinger — a fallen gunslinger of Gilead who aimed with his hand and forgot the face of his father. Final boss. The mirror of the player: same guns, broken oath. |

## 4. Core mechanics (Defense Grid DNA)

| Defense Grid: The Awakening | BEAMFALL |
|---|---|
| Aliens walk a path to your base | The Red Tithe walk from a **Doorway** (thinny) to your **Waystation** |
| Power cores | **Beam-shards** (8–12 per level) |
| Alien grabs a core and runs back | A thief grabs a shard and **runs back to the Doorway** |
| Kill the carrier → core drops, then returns | Carrier dies → shard drops, other thieves may snatch it, else it **drifts home** after a few seconds |
| Lose all cores → defeat | Every shard through the Doorway is lost; lose them all and the Beam snaps |
| Grid of build tiles that reshapes the path (maze) | 32×20 grid, 2×2 posts; ground troops re-path via flow fields. **You may never fully seal the road** |
| Interest on banked resources | **Interest** on banked Silver (capped) rewards patience |
| 3-tier tower upgrades, partial refund on sell | 3 tiers, 70% refund |
| Escalating alien roster with armor, swarms, flyers, bosses | Can-toi, Hounds, Low Men (armor), Swarms, Crows (air), Breakers (support), Brutes, Bosses |
| Call next wave early / fast-forward | Same, with a bonus for calling early; 1×/2×/3× speed |
| Narrator commentary | Sai Rusk |

### Rules in detail

* **Grid:** 32×20 cells of 32 px. Posts occupy 2×2 cells. Cell kinds: open (`.`), rock (`#`), road
  (`-`, walkable, unbuildable), shard-site (`B`), doorways (`1`–`4`).
* **Pathing:** ground enemies follow a Dijkstra flow field (8-neighbour, no corner cutting). Two fields:
  *to base* (multi-source from `B`) and *to exit* (one per doorway). Fields rebuild whenever a post is
  built or sold.
* **Build validation:** a post is rejected if (a) any cell is not open/free, (b) a ground enemy is
  standing on the footprint, or (c) it would cut any doorway off from the Waystation.
* **Thieves:** reaching the Waystation, a ground thief takes a shard (resting shards first, then fallen
  ones within reach) and flips to the *to exit* field. Leaving through its doorway makes the shard
  **lost**. A thief carrying a shard cannot take another.
* **Dropped shards:** sit where the thief died for 4.5 s. A non-carrier walking over it takes it
  (it is stolen again). Otherwise it drifts home and rejoins the Waystation.
* **Flyers (Crows)** ignore the grid and fly straight to the Waystation and back.
* **Economy:** Silver from kills, wave-clear bonuses, early-call bonus, and interest
  (`min(cap, bank × rate)` per second, level tunable).
* **Armor:** flat reduction per hit, minimum 25% of the hit gets through. Rewards mixing tower types
  (Sixgun vs Low Men is a bad time; Beam and Mortar are great).
* **Targeting modes** per post: *Thief-first* (default), *Closest to Waystation*, *Strongest*.
* **Win:** all waves spawned, field clear, at least one shard remains. **Stars:** 3 = ≥90% shards kept,
  2 = ≥60%, 1 = survived.

## 5. Posts (towers)

| # | Post | Fantasy | Behavior | Cost | Notes |
|---|---|---|---|---|---|
| 1 | **Sixgun** | The Gunslinger himself | Fast single-target hitscan. L3 dual-wield | 60 | Weak vs armor |
| 2 | **Sigul Ward** | Mercy's carved stones | Persistent slow aura | 80 | Slows don't stack; best wins |
| 3 | **Scattergun** | Close-quarters scattershot | Short-range cone burst, knockback at L3 | 90 | Great vs swarms |
| 4 | **Powder Mortar** | Powder Finch's contraption | Slow lobbed shell, splash, leads targets | 120 | Min range |
| 5 | **Beam Conduit** | A shard-fed lens | Continuous beam that **ramps up**; ignores armor | 130 | Cuts through Low Men |
| 6 | **Ka-Tet Fire** | The campfire where the ka-tet gathers | Buffs nearby posts (damage/range/rate) | 110 | Does not buff itself |
| 7 | **Maerlyn's Orb** | A pink sphere that remembers lightning | Chain lightning, halves armor | 150 | Stun chance at L3 |
| 8 | **Wizard's Glass** | The Glass that shows what *was* | Periodic time-stop pulse in radius | 200 | Strongest crowd control |

Each post has 3 tiers. Unlocks are gradual per level (see §7).

## 6. Enemies — the Red Tithe

| Enemy | Archetype | Notes |
|---|---|---|
| **Can-toi** | Walker | Basic thief. Come in numbers. |
| **Thinny Hound** | Skitter | Fast, fragile, loves a straight line. |
| **Low Man** | Armored | Yellow coat deflects lead. Armor 5. |
| **Rat-Taheen swarm** | Swarmer | Many tiny bodies; shotgun food. |
| **Carrion Crow** | Flyer | Ignores your maze. |
| **Breaker Acolyte** | Support | Aura: nearby allies regenerate. Kill first. |
| **Mutie Brute** | Heavy | Slow, high HP. |
| **The Iron Bear** | Boss (L3) | A Guardian of the Beam, hollowed out. Enrages at 50% and roars allies faster. |
| **Corvin Ashe** | Boss (L5) | The fallen gunslinger. His hex **disables a post** every few seconds. Calls Can-toi through the Doorway. |

## 7. Levels (Waystations along the Beam)

| # | Waystation | Shards | New this level | Hook |
|---|---|---|---|---|
| 1 | **Dry Creek** | 8 | Sixgun, Sigul Ward | Teaches the oath, the maze, "kill the carrier" |
| 2 | **Gilead's Cinder-Road** | 10 | Scattergun, Powder Mortar | Two doorways; Low Men; Mercy joins |
| 3 | **Thunderclap Flats** | 10 | Beam Conduit, Ka-Tet Fire | Open arena; Crows; **Iron Bear** |
| 4 | **Lud's Spur** | 12 | Maerlyn's Orb | Spiral rail maze; Breakers; Brutes; Rusk's last stand |
| 5 | **The Doorway at Algul Siento** | 12 | Wizard's Glass | Three doorways; **Corvin Ashe** |

Post-campaign: **The Wheel Turns** (endless, scaling waves) on any cleared map.

## 8. Phaser 4 feature map (what we lean on, and where)

| Phaser 4 feature | Used for |
|---|---|
| **WebGL renderer / RenderNodes** | Entire game is WebGL-only (`Phaser.WEBGL`); no canvas fallback |
| **Camera Filters** (`filters.internal/external`) | Bloom (via `Actions.AddEffectBloom`), Vignette, ColorMatrix grading, damage tint, Barrel/Displacement "thinny" ripple at the Doorway, Wipe scene transitions |
| **Object Filters** | Glow on shards & selection, Shadow on posts, Mask for reveal effects |
| **Dynamic Lighting** (`setLighting`, point + cone lights) | Dusk ambient; every shot throws a flash light; Ka-Tet Fire flickers; Beam Conduit lights the dust |
| **Normal maps** | Terrain relief lit by muzzle flash (noise-generated) |
| **Gradient** game object | Sky, horizon glow, Beam halo, UI sheen |
| **Noise / NoiseSimplex2D / NoiseCell2D** game objects | Dust & fog banks, terrain mottling, thinny static |
| **SpriteGPULayer** | Thousands of GPU-animated devil-grass tufts swaying in the wind (single draw call) |
| **TilemapGPULayer** | Ground tiles |
| **CaptureFrame** | Wizard's Glass negative/refraction pulse |
| **RenderTexture / DynamicTexture / Stamp** | Persistent scorch decals; procedural glow sprites |
| **Particles** (lit, GravityWell, EmitZone, DeathZone, colorEase) | Muzzle flash, shell casings, embers, Orb sparks, Mortar blasts, dust |
| **Grid & rounded-Rectangle shapes** | Build grid overlay, UI chrome |
| **Camera effects** | Shake/flash/zoom-punch/pan |
| **Tweens, Timeline** | Wave banners, intro cinematic |

## 9. Technical architecture

```
src/
  sim/          Pure JS. No Phaser. Deterministic. Unit-tested with node:test.
    grid.js       cells, occupancy, flow fields, placement validation
    sim.js        the game simulation (enemies, posts, shards, economy, waves)
    rng.js        seeded RNG
    data/         posts, enemies, levels, lore
  game/         Phaser views: scenes, entities, FX, audio, UI
  main.js       boot
```

The simulation is a pure state machine stepped at a fixed 60 Hz. The Phaser layer is a *view*: it
reads sim state each frame and reacts to sim events (`shot`, `hit`, `kill`, `shardDropped`, …) by
spawning particles, lights and sounds. That split lets us (a) unit-test pathfinding and economy,
(b) run a headless **bot** that plays every level for balance, and (c) swap the presentation layer
without touching the rules.

No binary art or audio assets ship: sprites are hand-authored SVG, terrain/glow textures are
generated procedurally at boot, and all sound is synthesized into `AudioBuffer`s.
