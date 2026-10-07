# GFX guide

For whoever adds details, art and effects next. BEAMFALL ships with **no binary assets**: sprites are hand-written SVG,
terrain is painted at boot, sound is synthesised. That was a choice to move fast, not a rule. Everything below works
for hand-drawn PNG/atlas art as well; the [sprite section](#sprites) says how to swap it in.

Read [`README.md`](../README.md) first for how to run the game, and [`CONTRIBUTING.md`](../CONTRIBUTING.md) for the
checks a PR must pass.

## The one rule

**The simulation (`src/sim/`) never knows about graphics.** It emits events (`shot`, `kill`, `shardDrop`, ...) and exposes
state; the Phaser layer (`src/game/`) draws it. A GFX change should live entirely in `src/game/` (plus `palette` colours in
`src/sim/data/levels.js`). If you feel you need to touch `sim.js` to make something look better, add an *event* there and
react to it in `fx/Fx.js` instead, so the unit tests and the headless balance bot keep working.

## Workflow

```bash
npm run dev                          # live-reload game at http://localhost:5173
npm run sheet                        # contact sheet of every SVG sprite -> tools/out/sheet.png (no server needed)
npm run shots                        # fixed review screenshots          -> tools/out/shots/*.png
npm run perf -- "level=3&all"        # frame rate / light count probe (use GL=hardware on a real GPU)
# http://localhost:5173/tools/terrain.html?l=2   (dev server) shows a level's ground: albedo + normal map
```

1. Run `npm run shots` **before** you change anything and keep the folder; run it again after, and attach both sets to the PR.
2. Check **Effects: Low** (`?fx=low`) still looks acceptable, and that you did not add a per-frame cost (see [Performance](#performance)).
3. `npm test && npm run build`; `npm run e2e` if you touched scenes or entities (it fails on any console error).

Handy URL switches: `?level=N` jump to a Waystation, `?all` every post unlocked, `?silver=9000`, `?wave=1` (seconds until the
first wave), `?amb=ffffff` ambient light colour, `?sun=0` / `?sun=2` sun intensity, `?fx=low|high`, `?endless`,
`?diff=easy|normal|hard`, `?unlock` (all Waystations open on the map).

In the browser console, `__beam.scene` is the live Game scene and `__beam.scene.sim` the simulation:

```js
const sim = __beam.scene.sim;
sim.build('beam', 12, 7);                 // post type, cell x, cell y (2x2 footprint)
sim.posts.forEach(p => sim.upgrade(p));   // tier up
sim.spawnEnemy('bear', 1, 1, 0);          // type, doorway id, hp multiplier, wave number
```

## Sprites

| | |
|---|---|
| Source | `src/game/art/svgs.js`: `POST_BASES`, `POST_HEADS`, `ENEMY_SVG`, `MISC`; sizes are listed in `buildSvgs()` |
| Orientation | everything faces **+x** (right); the views rotate sprites to a heading or aim |
| Baking | `art/textures.js` rasterises each SVG at `TEX_SCALE` (2x) at boot; views draw it at `SC` (0.5) |
| Texture keys | `post_<id>_base`, `post_<id>_head`, `enemy_<id>`, plus `shard`, `rock1`, `rock2`, `ruin`, `ring`, `tracer`, `shell`, `casing`, `dust` |
| Procedural keys | `glow`, `glow_hard`, `spark`, `puff`, `flare`, `dot`, `tuft` (white canvas sprites, tinted at use) in `makeFxTextures()` |

Logical sizes: a post is **64x64** (2x2 cells of 32 px; the base stays put, the head turns to aim), enemies range from
22x14 (`swarm`) to 96x96 (`bear`). The game draws at 1/2 of the baked size, so author raster art at **2x the logical size**
(a 32x32 `cantoi` is a 64x64 PNG).

### Add a sprite

1. Add the SVG string to the right map in `svgs.js` and its size to `buildSvgs()`; check it with `npm run sheet -- --only=<key>`.
2. Use the key (`this.add.image(x, y, 'mything')...setScale(SC).setLighting(true)`). Only reference keys that exist by the time
   the scene starts (bake them in `BootScene`); otherwise Phaser shows its green `__MISSING` placeholder.
3. New enemy or post *type*: also add it to `src/sim/data/enemies.js` / `posts.js`; the sprite key is derived from the id.

### Replace SVG with painted art

`bakeSvg()` skips any key that already exists, so loading an image under the same key before baking wins:

```js
// BootScene.js
preload() {
  this.load.setPath('gfx/');                                  // files live in public/gfx/ (not public/assets/: Vite builds into dist/assets/)
  this.load.image('enemy_cantoi', ['enemy_cantoi.png', 'enemy_cantoi_n.png']); // [color, optional normal map]
  this.load.atlas('enemies', 'enemies.png', 'enemies.json');   // atlases work too: use frame names in the views
}
```

`vite.config.js` uses `base: './'`, so relative paths keep working when the build is hosted under a sub-path. Keep source files
(`.psd`, `.aseprite`, `.blend`) out of `public/` or they ship to players; a top-level `art-src/` folder is a good home.
A normal map next to the colour image is what lets muzzle flashes rake across the sprite (see Lighting).

## Rendering rules

**Depth.** Layers come from `DEPTH` in `game/config.js` (ground 0, decals 3, grass 5, rocks 8, grid 12, post base 20, post head 24,
shard 30, enemy 40, flyer 55, fx 60, beam 62, fog 80, hud 100). Within a layer, objects are y-sorted by adding `y * 0.0001`; copy
that for anything that walks or stands.

**Lighting.** The Game scene runs Phaser 4's dynamic lights (`lights.enable()`, ambient `0x9a8fa6`, one warm "sun", `maxLights: 20`
in `main.js`).

- Call `.setLighting(true)` on images, sprites and particle emitters that should be lit by muzzle flashes, campfires and the sun.
- **Un-lit objects ignore ambient and sun entirely.** That is what you want for glows, beams and anything additive; it is why
  a `blendMode: ADD` spark looks bright regardless of the scene.
- `Gradient`, `NoiseSimplex2D` and `Container` objects cannot be lit.
- **Budget the lights.** Every light costs fill rate. The sun is 1, `Fx.LightPool` reuses 9 for flashes, each Ka-Tet Fire / Orb /
  Glass post owns 1. Reuse the pool (`lightPool.flash(...)`) rather than `addLight` per shot.

**Tints** carry state, so don't fight them with baked-in colour:

| State | Tint | Where |
|---|---|---|
| hit | white FILL tint for 70 ms | `EnemyView.hit()` |
| time-stopped / stunned / slowed / hasted / enraged | `0x86a2ff` / `0xffe680` / `0xa6f0e2` / `0xff9a8a` / `0xff7a6a` (first match wins) | `EnemyView.update()` |
| hexed post | dark grey + shake | `PostView.update()` |

## What exists, and what is thin

This is where a team can add the most.

**Enemies** (`entities/EnemyView.js`) are *one static sprite* animated procedurally: heading rotation, a squash-and-stretch wobble
(`BOB` per type), a 0.25 s scale-in on spawn, a soft shadow for flyers. There are no walk cycles and **no death animation**
(`Fx` on `kill` emits ichor, smoke and a floor stain). Opportunities: sprite-sheet or multi-part (legs, wings) animation, emerge-from-doorway
spawn, per-type death.

**Posts** (`entities/PostView.js`) are a base plus a head. Tier is shown by +7% head scale and gold pips drawn with `Graphics`,
**not** by different art. Opportunities: tier-2/3 head sprites, build/upgrade/sell animation, muzzle variety.

**Terrain and set dressing** (`world/World.js`, `art/terrain.js`): ground and normal map are painted per level from
`level.palette` (`sky`, `dust`, `ground`); boulders and ruins are placed from the rock mask. Per level look is currently palette plus a
handful of sprites. Opportunities: per-level set pieces and props, better road/Waystation readability, weather (dust storm on Thunderclap
Flats), more ruin variants.

**Doorways** are a gradient + a particle vortex; **the Waystation beacon** is a gradient. Both would take real art.

**HUD and menus** (`scenes/HudScene.js`, `ui/kit.js`, `ui/backdrop.js`) are drawn from rectangles, text and the post sprites.
Rusk's portrait is a hat on a silhouette; the cast in `sim/data/lore.js` has no portraits. Opportunities: panel frames, icons, wave banners,
a title logo, map node art.

## Effects

`fx/Fx.js` turns sim events into particles, lights, beams, decals, camera shake and sound, and nothing else calls it. The events it
handles: `shot` `shell` `blast` `chain` `pulse` `hit` `kill` `spawn` `shardPick` `shardDrop` `shardHome` `shardLost` `build` `upgrade`
`sell` `waveStart` `waveClear` `roar` `enrage` `hex` `summon` `earlyCall`. To add an effect, extend the handler in `Fx.bind()`.

Conventions already in `Fx`:

- One **shared emitter per effect** (`this.sparks`, `this.smoke`, `this.ichor`, ...) created through the `em()` helper and fired with
  `emitParticleAt(x, y, n)`. Don't create an emitter per shot.
- Every emitter sets `maxAliveParticles`; keep it.
- Additive glows (`blendMode: 'ADD'`) stay un-lit; smoke and shell casings are lit.
- Camera juice goes through `Fx.shake` and `cam.flash/fade`. Remember that camera flash and fade run *before* the camera filters, so bloom
  and the colour grade apply to them too.

**Full-screen post effects** are in `fx/PostFx.js`: bloom (hand-built from `ParallelFilters` + `Threshold` + `Blur`), colour grade,
vignette, a danger wash, and two localised lenses. Read the Phaser 4 notes in the README before changing them. The stock `Threshold`
filter thresholds alpha and will halve your picture, and `Vignette` strength should be about 0.1.

## Performance

Real-GPU frame rate has **not** been measured (the original development container only had software GL, about 2 fps). Please do.
`GL=hardware npm run perf -- "level=3&all&silver=9000" "<setup js>"` prints fps, light and display-object counts every 4 s.

The expensive things, roughly in order: the full-screen filters (bloom, lenses), the two full-field noise objects (fog, cloud shadows),
the number of lit objects times the number of lights, and particle counts. **Effects: Low** (menu, or `?fx=low`) switches off bloom, fog, cloud
shadows and the lens effects and thins the grass. Anything new and heavy needs a Low path: gate it on `isLow()` from `game/settings.js`.

Texture memory is small today (all SVGs at 2x). Painted art is where it can grow: prefer atlases and avoid sprites larger than they are drawn.

## Audio

All sound is generated in `audio/Sfx.js` (an `SFX` table with one synth function per key such as `shot`, `boom`, `zap`, `roar`, plus the
generative music). It has been tested for sanity (`test/audio.test.mjs`) but nobody has listened to it critically yet. If you replace
sounds with recordings, keep the same key names so `Fx` and the HUD don't change.
