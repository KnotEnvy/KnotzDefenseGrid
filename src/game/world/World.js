// Builds and animates the static scenery of a level using Phaser 4 features:
//   * lit ground image with a baked normal map (dynamic lights rake across it)
//   * SpriteGPULayer: thousands of GPU-animated devil-grass tufts in one draw call
//   * Noise game objects: drifting fog and cloud shadows (NoiseSimplex2D with colour+alpha ramps)
//   * Gradient game objects: the Doorway portal glow, expanding thinny ripples, the Waystation beacon
//   * RenderTexture decals: persistent scorch marks
//   * Grid shape: the build-grid overlay

import Phaser from 'phaser';
import { K, COLS, ROWS, CELL } from '../../sim/grid.js';
import { DEPTH, FIELD, TEX_SCALE } from '../config.js';
import { makeTerrainTexture } from '../art/textures.js';
import { rockRects } from '../art/terrain.js';
import { isLow } from '../settings.js';

const rr = (a, b) => a + Math.random() * (b - a);

export class World {
  constructor(scene, level, sim) {
    this.scene = scene;
    this.level = level;
    this.sim = sim;
    this.grid = sim.grid;
    this.time = 0;

    this.buildGround();
    this.buildRocks();
    this.buildGrass();
    this.buildDecals();
    this.buildDoors();
    this.buildBeacon();
    this.buildAtmosphere();
    this.buildOverlays();
  }

  // ------------------------------------------------------------------------------- ground
  buildGround() {
    const { scene } = this;
    const { key } = makeTerrainTexture(scene, this.level);
    this.ground = scene.add.image(0, 0, key).setOrigin(0).setDepth(DEPTH.ground).setLighting(true);
  }

  buildRocks() {
    const { scene, grid } = this;
    const baseId = this.level.baseId ?? this.level.id;
    const ruins = baseId === 'cinder-road' || baseId === 'algul-siento';
    this.rocks = [];
    const tints = [0xffffff, 0xf0e4d0, 0xd9c9b0, 0xe8d8c0, 0xc9b99f];
    const add = (x, y, size, rot) => {
      const k = Math.random() < 0.5 ? 'rock1' : 'rock2';
      const r = scene.add.image(x, y, k).setScale((size / (64 * TEX_SCALE)) * (Math.random() < 0.5 ? 1 : -1), size / (64 * TEX_SCALE)).setRotation(rot).setTint(Phaser.Utils.Array.GetRandom(tints));
      r.setDepth(DEPTH.rocks + y / 10000).setLighting(true);
      this.rocks.push(r);
    };
    for (const rect of rockRects(grid)) {
      const x0 = rect.cx * CELL;
      const y0 = rect.cy * CELL;
      const w = rect.w * CELL;
      const h = rect.h * CELL;
      const border = rect.cx === 0 || rect.cy === 0 || rect.cx + rect.w === COLS || rect.cy + rect.h === ROWS;
      if (ruins && rect.w >= 2 && rect.h >= 2 && !border) {
        const r = scene.add.image(x0 + w / 2, y0 + h / 2, 'ruin').setDisplaySize(w - 2, h - 2).setDepth(DEPTH.rocks).setLighting(true);
        r.setTint(Math.random() < 0.5 ? 0xe8dccc : 0xcfc2b0);
        this.rocks.push(r);
        continue;
      }
      // organic boulder clumps
      const density = border ? 0.55 : 0.85;
      for (let cy = rect.cy; cy < rect.cy + rect.h; cy++) {
        for (let cx = rect.cx; cx < rect.cx + rect.w; cx++) {
          if (Math.random() > density) continue;
          add((cx + 0.5) * CELL + rr(-4, 4), (cy + 0.5) * CELL + rr(-4, 4), rr(38, 52), rr(0, Math.PI * 2));
        }
      }
    }
  }

  // ------------------------------------------------------------------------------- devil-grass
  buildGrass() {
    const { scene, grid } = this;
    const open = [];
    for (let cy = 0; cy < ROWS; cy++) {
      for (let cx = 0; cx < COLS; cx++) {
        if (grid.kind[cy * COLS + cx] !== K.OPEN) continue;
        // keep tufts out of the doorway/waystation surroundings
        const nearDoor = [...grid.spawnCells.values()].some(cs => cs.some(c => Math.abs(c.cx - cx) < 4 && Math.abs(c.cy - cy) < 4));
        const nearBase = grid.baseCells.some(c => Math.abs(c.cx - cx) < 3 && Math.abs(c.cy - cy) < 3);
        if (!nearDoor && !nearBase) open.push({ cx, cy });
      }
    }
    const N = Math.min(isLow() ? 450 : 1300, open.length * 2);
    const layer = scene.add.spriteGPULayer('tuft', N).setDepth(DEPTH.grass).setLighting(true);
    layer.setAnimationEnabled('Sine.easeInOut', true);
    layer.setTimerResetPeriod(40000); // 40000 / (2 * 2000) = whole cycles: no phase pop at the wrap
    const pts = [];
    for (let i = 0; i < N; i++) {
      const c = open[Math.floor(Math.random() * open.length)];
      pts.push({ x: (c.cx + Math.random()) * CELL, y: (c.cy + Math.random()) * CELL });
    }
    pts.sort((a, b) => a.y - b.y);
    const m = {};
    for (const p of pts) {
      const violet = Math.random() < 0.14;
      const lean = 0.04 + Math.random() * 0.08;
      const amp = 0.14 + Math.random() * 0.14;
      m.x = p.x;
      m.y = p.y;
      m.originX = 0.5;
      m.originY = 1;
      m.scaleX = m.scaleY = 0.42 + Math.random() * 0.5;
      m.rotation = { base: lean - amp / 2, amplitude: amp, duration: 2000, ease: 'Sine.easeInOut', yoyo: true, delay: p.x * 2.4 + p.y * 0.9 };
      m.alpha = 0.85;
      if (violet) {
        m.tintBottomLeft = m.tintBottomRight = 0x3a2650;
        m.tintTopLeft = m.tintTopRight = 0xa27ac4;
      } else {
        m.tintBottomLeft = m.tintBottomRight = 0x4a4426;
        m.tintTopLeft = m.tintTopRight = 0xc8b768;
      }
      layer.addMember(m);
    }
    this.grass = layer;
  }

  // ------------------------------------------------------------------------------- decals
  buildDecals() {
    const { scene } = this;
    this.decals = scene.add.renderTexture(0, 0, FIELD.w, FIELD.h).setOrigin(0).setDepth(DEPTH.decals);
    this._decalDirty = false;
  }

  /** Persistent scorch / stain mark. */
  stamp(x, y, radius, color = 0x000000, alpha = 0.3) {
    this.decals.stamp('puff', null, x, y, { scale: radius / 32, tint: color, alpha, angle: Math.random() * 360 });
    this._decalDirty = true;
  }

  // ------------------------------------------------------------------------------- doorways
  buildDoors() {
    const { scene } = this;
    this.doors = [];
    for (const [id, c] of this.sim.doorCenter) {
      const cells = this.grid.spawnCells.get(id);
      const tall = Math.max(150, cells.length * CELL + 70);
      const glow = scene.add.gradient({
        bands: [
          { start: 0, end: 0.45, colorStart: [0.05, 0, 0.08, 1], colorEnd: [0.35, 0.03, 0.28, 0.95], interpolation: 2 },
          { start: 0.45, end: 0.85, colorStart: [0.35, 0.03, 0.28, 0.95], colorEnd: [0, 0, 0, 0], interpolation: 3 },
          { start: 0.85, end: 1, colorStart: [0, 0, 0, 0], colorEnd: [0, 0, 0, 0] }
        ],
        shapeMode: 2, start: { x: 0.5, y: 0.5 }, shape: { x: 0.5, y: 0 }, dither: true
      }, c.x + 8, c.y, tall * 0.9, tall * 1.1).setDepth(DEPTH.postBase - 6);
      const ripple = scene.add.gradient({
        bands: [
          { start: 0, end: 0.4, colorStart: [0, 0, 0, 0], colorEnd: [0.95, 0.3, 0.5, 0.55], interpolation: 2 },
          { start: 0.4, end: 0.8, colorStart: [0.95, 0.3, 0.5, 0.55], colorEnd: [0, 0, 0, 0], interpolation: 2 }
        ],
        shapeMode: 2, repeatMode: 1, start: { x: 0.5, y: 0.5 }, shape: { x: 0.5, y: 0 }
      }, c.x + 8, c.y, tall * 1.4, tall * 1.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.postBase - 5);
      // The thinny itself: crimson motes drawn in a spiral toward the Doorway (random emit zone + tangential
      // velocities set in an emit callback), so the portal reads as reality being drained.
      const swirl = scene.add.particles(c.x + 8, c.y, 'spark', {
        emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 90, tall * 0.75) },
        lifespan: { min: 700, max: 1300 }, speed: 0,
        scale: { start: 0.9, end: 0 }, alpha: { start: 0.95, end: 0 },
        tint: [0xff3a7a, 0xc02070, 0xff8ab0, 0xffffff], blendMode: 'ADD', frequency: 35, quantity: 2, maxAliveParticles: 70,
        emitCallback: p => {
          p.velocityX = -p.y * 1.1 - p.x * 0.55;
          p.velocityY = p.x * 1.1 - p.y * 0.55;
        }
      }).setDepth(DEPTH.postBase - 4);
      const light = scene.lights.addLight(c.x + 14, c.y, 220, 0xc02870, 1.1, 90);
      this.doors.push({ id, x: c.x, y: c.y, glow, ripple, swirl, light, pulse: 0 });
    }
  }

  /** Doorway flare when a wave starts / an enemy is born. */
  pulseDoor(id, strength = 1) {
    const d = this.doors.find(x => x.id === id);
    if (d) d.pulse = Math.max(d.pulse, strength);
  }

  // ------------------------------------------------------------------------------- Waystation beacon
  buildBeacon() {
    const { scene } = this;
    const b = this.sim.baseCenter;
    this.beacon = { x: b.x, y: b.y };
    this.beaconGlow = scene.add.gradient({
      bands: [
        { start: 0, end: 0.3, colorStart: [0.7, 1, 1, 0.55], colorEnd: [0.4, 0.9, 1, 0.35], interpolation: 2 },
        { start: 0.3, end: 0.85, colorStart: [0.4, 0.9, 1, 0.35], colorEnd: [0, 0, 0, 0], interpolation: 3 },
        { start: 0.85, end: 1, colorStart: [0, 0, 0, 0], colorEnd: [0, 0, 0, 0] }
      ],
      shapeMode: 2, start: { x: 0.5, y: 0.5 }, shape: { x: 0.5, y: 0 }, dither: true
    }, b.x, b.y, 220, 220).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.postBase - 8);
    this.beaconLight = scene.lights.addLight(b.x - 10, b.y, 260, 0x8ff3ff, 1.0, 110);
  }

  // ------------------------------------------------------------------------------- atmosphere
  buildAtmosphere() {
    const { scene } = this;
    this.dustCol = this.level.palette.dust;
    if (isLow()) {
      // Low quality: skip the full-field noise passes and wind motes.
      this.shadows = { noiseOffset: [0, 0], noisePeriod: [1, 1], noiseFlow: 0, setVisible() {} };
      this.fog = { noiseOffset: [0, 0], noisePeriod: [1, 1], noiseFlow: 0, setVisible() {} };
      return;
    }
    // Cloud shadows: soft dark patches drifting slowly over the ground.
    this.shadows = scene.add.noisesimplex2d({
      noiseCells: [3, 2], noiseIterations: 2, noiseWarpAmount: 0.3, noiseSeed: [4, 9],
      noiseColorStart: [0.02, 0.0, 0.05, 0.0], noiseColorEnd: [0.0, 0.0, 0.05, 0.42], noiseValueAdd: 0.3, noiseValuePower: 1.8
    }, FIELD.w / 2, FIELD.h / 2, FIELD.w, FIELD.h).setDepth(DEPTH.grass + 1);
    // Fog / dust banks: warm, screen-blended, drifting faster.
    this.fog = scene.add.noisesimplex2d({
      noiseCells: [4, 3], noiseIterations: 3, noiseWarpAmount: 0.35, noiseSeed: [7, 3],
      noiseColorStart: [0.5, 0.4, 0.3, 0.0], noiseColorEnd: [0.85, 0.7, 0.55, 0.22], noiseValueAdd: 0.28, noiseValuePower: 2.0
    }, FIELD.w / 2, FIELD.h / 2, FIELD.w, FIELD.h).setDepth(DEPTH.fog).setBlendMode(Phaser.BlendModes.SCREEN);
    this.dustCol = this.level.palette.dust;

    // Wind-blown motes (lit particles).
    this.motes = scene.add.particles(0, 0, 'spark', {
      x: { min: -20, max: FIELD.w }, y: { min: 0, max: FIELD.h },
      lifespan: { min: 4000, max: 8000 }, speedX: { min: 18, max: 44 }, speedY: { min: -6, max: 6 },
      scale: { start: 0.35, end: 0.1 }, alpha: { start: 0, end: 0.5, ease: 'sine.out' },
      tint: [this.dustCol, 0xffe0b0, 0xffffff], frequency: 120, quantity: 1, maxAliveParticles: 90
    }).setDepth(DEPTH.fog - 2).setBlendMode(Phaser.BlendModes.ADD);
  }

  // ------------------------------------------------------------------------------- overlays
  buildOverlays() {
    const { scene } = this;
    this.gridOverlay = scene.add.grid(0, 0, FIELD.w, FIELD.h, CELL, CELL).setOrigin(0).setDepth(DEPTH.grid);
    this.gridOverlay.setFillStyle(0x000000, 0).setStrokeStyle(1, 0xffe8b0, 0.16).setAltFillStyle(0xffffff, 0.02).setVisible(false);
    this.gridOverlay.setCellPadding?.(0);
    this.pathGfx = scene.add.graphics().setDepth(DEPTH.path).setVisible(false);
    this.pathVisible = false;
  }

  setGridVisible(v) {
    this.gridOverlay.setVisible(v);
  }

  /** Marching-ants path from each doorway to the Waystation. */
  drawPaths(time) {
    const g = this.pathGfx;
    g.clear();
    if (!this.pathVisible) return;
    for (const { route } of this.sim.paths()) {
      g.lineStyle(3, 0xffe8b0, 0.0);
      let acc = 0;
      for (let i = 1; i < route.length; i++) {
        const a = this.grid.center(route[i - 1].cx, route[i - 1].cy);
        const b = this.grid.center(route[i].cx, route[i].cy);
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const phase = (acc - time * 40) % 24;
        if (phase < 0 ? phase + 24 < 12 : phase < 12) {
          g.lineStyle(3, 0xffe8b0, 0.55);
          g.lineBetween(a.x, a.y, b.x, b.y);
        }
        acc += len;
      }
    }
  }

  togglePaths() {
    this.pathVisible = !this.pathVisible;
    this.pathGfx.setVisible(this.pathVisible);
    return this.pathVisible;
  }

  // ------------------------------------------------------------------------------- per-frame
  update(time, delta) {
    this.time = time;
    const t = time / 1000;
    if (this._decalDirty) {
      this.decals.render();
      this._decalDirty = false;
    }
    // drift the noise fields (offsets are in noise-cell units and wrap periodically)
    const so = this.shadows.noiseOffset;
    so[0] = (so[0] + delta * 0.00009) % this.shadows.noisePeriod[0];
    so[1] = (so[1] + delta * 0.00004) % this.shadows.noisePeriod[1];
    this.shadows.noiseFlow += delta * 0.00003;
    const fo = this.fog.noiseOffset;
    fo[0] = (fo[0] + delta * 0.00022) % this.fog.noisePeriod[0];
    fo[1] = (fo[1] + delta * 0.00006) % this.fog.noisePeriod[1];
    this.fog.noiseFlow += delta * 0.00006;

    // Beacon breathing
    const breath = 0.8 + 0.2 * Math.sin(t * 1.6);
    this.beaconGlow.offset = 0.02 * Math.sin(t * 1.3);
    this.beaconGlow.setScale(breath * 1.05);
    this.beaconLight.intensity = 0.8 + 0.25 * Math.sin(t * 1.7);

    for (const d of this.doors) {
      d.pulse = Math.max(0, d.pulse - delta / 900);
      const k = 1 + d.pulse * 0.35;
      d.glow.setScale(k * (0.96 + 0.04 * Math.sin(t * 2.2 + d.id)));
      d.ripple.offset = (t * 0.22 + d.id * 0.17) % 0.8 - 0.1;
      d.ripple.setScale(1 + d.pulse * 0.25);
      d.light.intensity = 0.8 + 0.4 * Math.sin(t * 3.1 + d.id) + d.pulse * 1.4 + Math.random() * 0.12;
    }
  }

  destroy() {
    for (const d of this.doors) this.scene.lights.removeLight(d.light);
    this.scene.lights.removeLight(this.beaconLight);
  }
}
