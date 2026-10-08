// Turns simulation events into Phaser 4 effects: lit particles, dynamic lights, bolts/beams, decals,
// camera juice and sound. The sim never knows this exists.

import Phaser from 'phaser';
import { DEPTH, SC, FONT } from '../config.js';
import { POSTS } from '../../sim/data/posts.js';

const ADD = Phaser.BlendModes.ADD;
const rr = (a, b) => a + Math.random() * (b - a);
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

class LightPool {
  constructor(scene, n) {
    this.scene = scene;
    this.i = 0;
    this.lights = [];
    for (let k = 0; k < n; k++) {
      // Idle lights are hidden: Phaser counts every visible light against maxLights (20) whatever its intensity,
      // and when over budget it drops the lights farthest from the camera centre first, i.e. the sun.
      const l = scene.lights.addLight(-999, -999, 100, 0xffffff, 0, 40).setVisible(false);
      l.tw = null;
      this.lights.push(l);
    }
  }

  flash(x, y, color, radius, intensity, ms, z) {
    const l = this.lights[this.i++ % this.lights.length];
    l.tw?.stop();
    l.setVisible(true).setPosition(x, y).setColor(color).setRadius(radius).setZ(z ?? radius * 0.45);
    l.intensity = intensity;
    l.tw = this.scene.tweens.add({ targets: l, intensity: 0, duration: ms, ease: 'Quad.easeOut', onComplete: () => l.setVisible(false) });
  }

  destroy() {
    for (const l of this.lights) {
      l.tw?.stop();
      this.scene.lights.removeLight(l);
    }
  }
}

export class Fx {
  constructor(scene, sim, world, sfx) {
    this.scene = scene;
    this.sim = sim;
    this.world = world;
    this.sfx = sfx;
    this.cam = scene.cameras.main;
    this.dust = world.dustCol;

    this.lightPool = new LightPool(scene, 9);
    this.bolts = [];
    this.floaters = [];
    this.shellViews = new Map();
    this.beamLightT = new Map();
    this.emitters = [];

    const em = (key, cfg, depth = DEPTH.fx, lit = false) => {
      const e = scene.add.particles(0, 0, key, { emitting: false, frequency: -1, ...cfg }).setDepth(depth);
      if (lit) e.setLighting(true);
      this.emitters.push(e);
      return e;
    };
    this.sparks = em('spark', {
      lifespan: { min: 180, max: 460 }, speed: { min: 70, max: 230 }, angle: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffe9a8, 0xffffff, 0xffc060], blendMode: 'ADD', maxAliveParticles: 600
    });
    this.flares = em('flare', {
      lifespan: 70, scale: { start: 0.55, end: 0.15 }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 360 }, blendMode: 'ADD', maxAliveParticles: 60
    }, DEPTH.fx + 1);
    this.spray = em('spark', {
      lifespan: { min: 120, max: 300 }, speed: { min: 180, max: 420 }, angle: { min: -20, max: 20 },
      scale: { start: 0.8, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffe0a0, 0xffffff], blendMode: 'ADD', maxAliveParticles: 300
    });
    this.smoke = em('puff', {
      lifespan: { min: 600, max: 1300 }, speed: { min: 6, max: 34 }, angle: { min: 0, max: 360 },
      scale: { start: 0.35, end: 1.25 }, alpha: { start: 0.36, end: 0 }, tint: [this.dust, 0x8a7a68, 0x5a5048], maxAliveParticles: 220
    }, DEPTH.fx - 2, true);
    this.ichor = em('puff', {
      lifespan: { min: 260, max: 520 }, speed: { min: 30, max: 130 }, angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0.05 }, alpha: { start: 0.85, end: 0 }, tint: [0x5a0f1c, 0x7a1a2e, 0x2a0a22], maxAliveParticles: 260
    }, DEPTH.fx - 1);
    this.embers = em('spark', {
      lifespan: { min: 500, max: 1100 }, speed: { min: 40, max: 200 }, angle: { min: 0, max: 360 }, gravityY: -30,
      scale: { start: 0.9, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffd24a, 0xff8a1c, 0xff4a1a], blendMode: 'ADD', maxAliveParticles: 400
    });
    this.casings = em('casing', {
      lifespan: { min: 500, max: 900 }, speed: { min: 40, max: 110 }, angle: { min: 0, max: 360 }, rotate: { start: 0, end: 540 },
      scale: SC * 1.3, alpha: { start: 1, end: 0 }, maxAliveParticles: 120
    }, DEPTH.fx - 3, true);
    this.arcs = em('spark', {
      lifespan: { min: 120, max: 320 }, speed: { min: 40, max: 160 }, angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xff9be8, 0xffffff, 0xc07aff], blendMode: 'ADD', maxAliveParticles: 300
    });
    this.motes = em('spark', {
      lifespan: { min: 700, max: 1400 }, speed: { min: 20, max: 90 }, angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0x8ff3ff, 0xffffff, 0xffe9a8], blendMode: 'ADD', maxAliveParticles: 200
    });

    this.gfx = scene.add.graphics().setDepth(DEPTH.beam).setBlendMode(ADD);
    this.shellG = scene.add.group();
    this.bind();
  }

  // -------------------------------------------------------------------------------- helpers
  muzzle(post, hand = 0, dual = false, forward = 30) {
    const a = post.aim;
    const side = dual ? (hand ? 5 : -5) : 0;
    return { x: post.x + Math.cos(a) * forward - Math.sin(a) * side, y: post.y + Math.sin(a) * forward + Math.cos(a) * side };
  }

  shake(ms, intensity) {
    const s = this.cam.shakeEffect;
    if (s.isRunning && intensity < (s.intensity?.x ?? 0)) return;
    this.cam.shake(ms, intensity);
  }

  ring(x, y, size, color, ms = 420, alpha = 0.8, depth = DEPTH.fx) {
    const r = this.scene.add.image(x, y, 'ring').setTint(color).setBlendMode(ADD).setDepth(depth).setAlpha(alpha).setDisplaySize(size * 0.2, size * 0.2);
    this.scene.tweens.add({ targets: r, displayWidth: size, displayHeight: size, alpha: 0, duration: ms, ease: 'Cubic.easeOut', onComplete: () => r.destroy() });
  }

  puffGlow(x, y, size, color, ms = 300, alpha = 0.9) {
    const g = this.scene.add.image(x, y, 'glow').setTint(color).setBlendMode(ADD).setDepth(DEPTH.fx + 2).setAlpha(alpha).setDisplaySize(size * 0.4, size * 0.4);
    this.scene.tweens.add({ targets: g, displayWidth: size, displayHeight: size, alpha: 0, duration: ms, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
  }

  float(x, y, text, color = '#ffe7a0', size = 15) {
    if (this.floaters.length > 14) return;
    const t = this.scene.add.text(x, y, text, {
      fontFamily: FONT.mono, fontSize: size, color, stroke: '#120c08', strokeThickness: 4, resolution: 2
    }).setOrigin(0.5).setDepth(DEPTH.fx + 6);
    this.floaters.push(t);
    this.scene.tweens.add({
      targets: t, y: y - 26, alpha: { from: 1, to: 0 }, duration: 900, ease: 'Cubic.easeOut',
      onComplete: () => {
        t.destroy();
        this.floaters.splice(this.floaters.indexOf(t), 1);
      }
    });
  }

  bolt(points, color, width, life, jitter = 0) {
    this.bolts.push({ pts: points, color, width, life, max: life, jitter });
  }

  postView(post) {
    return this.scene.postViews.get(post.id);
  }

  enemyView(e) {
    return this.scene.enemyViews.get(e.id);
  }

  // -------------------------------------------------------------------------------- event wiring
  bind() {
    const { sim, scene, sfx } = this;
    const pan = x => sfx.pan(x);

    sim.on('shot', ({ post, kind, target, hand, dual, angle, range, spread }) => {
      const view = this.postView(post);
      if (kind === 'hitscan') {
        const m = this.muzzle(post, hand, dual);
        this.flares.emitParticleAt(m.x, m.y, 1);
        this.lightPool.flash(m.x, m.y, 0xffd9a0, 150, 1.8, 80);
        this.bolt([m, { x: target.x, y: target.y }], 0xffe39a, 2.4, 0.08);
        this.sparks.emitParticleAt(target.x, target.y, 3);
        const ca = post.aim + (hand ? 1 : -1) * 1.9;
        this.casings.setEmitterAngle({ min: (ca * 180) / Math.PI - 25, max: (ca * 180) / Math.PI + 25 });
        this.casings.emitParticleAt(post.x, post.y, 1);
        this.smoke.emitParticleAt(m.x, m.y, 1);
        view?.kick(post.aim, 2.6);
        sfx.play(post.level >= 2 ? 'shot2' : 'shot', { volume: 0.5, pan: pan(post.x), rate: rr(0.94, 1.08) });
      } else if (kind === 'cone') {
        const m = this.muzzle(post, 0, false, 32);
        const deg = (angle * 180) / Math.PI;
        this.spray.setEmitterAngle({ min: deg - spread / 2, max: deg + spread / 2 });
        this.spray.emitParticleAt(m.x, m.y, 26);
        this.flares.emitParticleAt(m.x, m.y, 2);
        this.lightPool.flash(m.x, m.y, 0xffc27a, 210, 2.4, 110);
        this.smoke.emitParticleAt(m.x, m.y, 4);
        // visible cone sweep
        this.bolt([m, { x: m.x + Math.cos(angle - spread * 0.0087) * range, y: m.y + Math.sin(angle - spread * 0.0087) * range }], 0xffe0a0, 1.6, 0.07);
        this.bolt([m, { x: m.x + Math.cos(angle + spread * 0.0087) * range, y: m.y + Math.sin(angle + spread * 0.0087) * range }], 0xffe0a0, 1.6, 0.07);
        view?.kick(angle, 5);
        sfx.play('scatter', { volume: 0.7, pan: pan(post.x) });
        this.shake(90, 0.0016);
      }
    });

    sim.on('shell', ({ post }) => {
      const m = this.muzzle(post, 0, false, 30);
      this.flares.emitParticleAt(m.x, m.y, 1);
      this.smoke.emitParticleAt(m.x, m.y, 5);
      this.lightPool.flash(m.x, m.y, 0xffa850, 180, 1.6, 120);
      this.postView(post)?.kick(post.aim, 4);
      sfx.play('mortar_fire', { volume: 0.7, pan: pan(post.x) });
    });

    sim.on('blast', ({ x, y, radius }) => {
      this.embers.emitParticleAt(x, y, 26);
      this.smoke.emitParticleAt(x, y, 10);
      this.puffGlow(x, y, radius * 3.2, 0xffa030, 340);
      this.ring(x, y, radius * 2.6, 0xffd08a, 360, 0.7);
      this.lightPool.flash(x, y, 0xff9a40, radius * 5, 2.8, 260);
      this.world.stamp(x, y, radius * 1.2, 0x000000, 0.34);
      this.shake(140, 0.003);
      sfx.play('boom', { volume: 0.8, pan: pan(x), rate: rr(0.9, 1.1) });
    });

    sim.on('chain', ({ post, points }) => {
      for (let s = 0; s < points.length - 1; s++) {
        this.bolt([points[s], points[s + 1]], 0xff9be8, 3.4, 0.17, 7);
        this.bolt([points[s], points[s + 1]], 0xffffff, 1.4, 0.13, 5);
        this.arcs.emitParticleAt(points[s + 1].x, points[s + 1].y, 5);
      }
      this.lightPool.flash(points[1].x, points[1].y, 0xff7be0, 190, 2.0, 140);
      this.puffGlow(post.x, post.y, 70, 0xff8ae8, 160);
      sfx.play('zap', { volume: 0.55, pan: pan(post.x), rate: rr(0.9, 1.15) });
    });

    sim.on('pulse', ({ post, radius }) => {
      this.ring(post.x, post.y, radius * 2.1, 0xa08aff, 900, 0.9);
      this.ring(post.x, post.y, radius * 1.4, 0xe8d8ff, 650, 0.6);
      this.puffGlow(post.x, post.y, radius * 2, 0x7a5cff, 700, 0.45);
      this.lightPool.flash(post.x, post.y, 0x9a80ff, radius * 3, 2.2, 600);
      this.scene.glassPulse?.(post, radius);
      sfx.play('glass', { volume: 0.8, pan: pan(post.x) });
    });

    sim.on('hit', ({ enemy, kind }) => {
      this.enemyView(enemy)?.hit();
      if (kind === 'blast' || kind === 'shot') this.sparks.emitParticleAt(enemy.x, enemy.y, 2);
      sfx.play('hit', { volume: 0.4, pan: pan(enemy.x), gap: 0.05 });
    });

    sim.on('kill', ({ enemy, reward }) => {
      const big = enemy.boss ? 3 : enemy.radius > 13 ? 1.6 : 1;
      this.ichor.emitParticleAt(enemy.x, enemy.y, Math.round(8 * big));
      this.smoke.emitParticleAt(enemy.x, enemy.y, Math.round(2 * big));
      if (enemy.def.id !== 'swarm') this.world.stamp(enemy.x, enemy.y, 10 + enemy.radius * 1.4 * big, 0x2a0610, 0.38);
      if (reward >= 10) this.float(enemy.x, enemy.y - 12, `+${reward}`, '#ffe7a0', enemy.boss ? 24 : 15);
      if (enemy.boss) {
        this.shake(700, 0.008);
        this.puffGlow(enemy.x, enemy.y, 300, 0xffa050, 700);
        this.lightPool.flash(enemy.x, enemy.y, 0xffb070, 420, 3, 700);
        this.embers.emitParticleAt(enemy.x, enemy.y, 70);
        sfx.play('boom', { volume: 1, rate: 0.7 });
        this.cam.flash(300, 255, 220, 160);
      }
      sfx.play('kill', { volume: 0.45, pan: pan(enemy.x), rate: enemy.radius > 13 ? 0.7 : rr(0.9, 1.15), gap: 0.045 });
    });

    sim.on('spawn', ({ enemy, door }) => {
      this.world.pulseDoor(enemy.spawnId, 0.45);
      if (enemy.boss) {
        this.shake(900, 0.006);
        sfx.play('roar', { volume: 1 });
        scene.cameras.main.flash(380, 110, 16, 36);
      }
      this.smoke.emitParticleAt(enemy.x, enemy.y, 1);
    });

    sim.on('shardPick', ({ enemy, shard, stolenBack }) => {
      this.ring(enemy.x, enemy.y, 110, 0xff4a5a, 500, 0.9);
      this.float(enemy.x, enemy.y - 18, stolenBack ? 'STOLEN AGAIN' : 'THIEF!', '#ff7a88', 14);
      this.lightPool.flash(enemy.x, enemy.y, 0xff5060, 180, 1.4, 350);
      sfx.play('alarm', { volume: 0.7, gap: 0.6 });
      scene.events.emit('say', 'shardPick');
    });
    sim.on('shardDrop', ({ shard }) => {
      this.ring(shard.x, shard.y, 120, 0x8ff3ff, 600, 0.9);
      this.motes.emitParticleAt(shard.x, shard.y, 14);
      this.lightPool.flash(shard.x, shard.y, 0x8ff3ff, 200, 1.6, 600);
      sfx.play('home', { volume: 0.4, rate: 0.7, pan: pan(shard.x) });
      scene.events.emit('say', 'shardDrop');
    });
    sim.on('shardHome', ({ shard }) => {
      this.motes.emitParticleAt(shard.x, shard.y, 10);
      this.puffGlow(shard.x, shard.y, 80, 0x8ff3ff, 400);
      sfx.play('home', { volume: 0.6, pan: pan(shard.x), gap: 0.12 });
      scene.events.emit('say', 'shardHome');
    });
    sim.on('shardLost', ({ enemy }) => {
      const door = this.world.doors.find(d => d.id === enemy.spawnId);
      const x = door?.x ?? enemy.x;
      const y = door?.y ?? enemy.y;
      this.ring(x + 20, y, 260, 0xff3050, 800, 0.9);
      this.puffGlow(x + 20, y, 220, 0xff2a50, 700, 0.8);
      this.cam.flash(260, 255, 40, 70);
      this.shake(380, 0.006);
      this.scene.dangerPulse?.();
      sfx.play('lost', { volume: 0.9 });
      scene.events.emit('say', 'shardLost');
    });

    sim.on('build', ({ post }) => {
      this.smoke.emitParticleAt(post.x, post.y, 9);
      this.ring(post.x, post.y, 110, 0xffe8b0, 360, 0.6);
      this.lightPool.flash(post.x, post.y, 0xffe8b0, 160, 1.2, 260);
      this.shake(80, 0.0015);
      sfx.play('build', { volume: 0.8, pan: pan(post.x) });
      scene.events.emit('say', 'build');
    });
    sim.on('upgrade', ({ post }) => {
      this.puffGlow(post.x, post.y, 120, 0xffd77a, 480);
      this.ring(post.x, post.y, 130, 0xffd77a, 520, 0.9);
      this.motes.emitParticleAt(post.x, post.y, 16);
      this.lightPool.flash(post.x, post.y, 0xffd77a, 200, 1.8, 400);
      sfx.play('upgrade', { volume: 0.7, pan: pan(post.x) });
    });
    sim.on('sell', ({ post, value }) => {
      this.smoke.emitParticleAt(post.x, post.y, 7);
      this.float(post.x, post.y - 14, `+${value}`, '#dfe6ee', 16);
      sfx.play('sell', { volume: 0.7, pan: pan(post.x) });
    });

    sim.on('waveStart', ({ index, wave }) => {
      for (const d of this.world.doors) this.world.pulseDoor(d.id, 1);
      sfx.play('wave', { volume: 0.7 });
      this.shake(300, 0.0025);
      scene.events.emit('waveStart', { index, wave });
      this.scene.riftAll?.();
      scene.events.emit('say', 'waveStart');
    });
    sim.on('waveClear', () => scene.events.emit('say', 'waveClear'));

    sim.on('roar', ({ enemy }) => {
      this.ring(enemy.x, enemy.y, 330, 0xffa050, 700, 0.8);
      this.shake(500, 0.005);
      sfx.play('roar', { volume: 0.9, rate: 0.85 });
    });
    sim.on('enrage', ({ enemy }) => {
      this.puffGlow(enemy.x, enemy.y, 200, 0xff3030, 600);
      this.cam.flash(300, 255, 60, 40);
      sfx.play('roar', { volume: 1, rate: 0.7 });
    });
    sim.on('hex', ({ enemy, post }) => {
      this.bolt([{ x: enemy.x, y: enemy.y }, { x: post.x, y: post.y }], 0x9a2a40, 4, 0.4, 9);
      this.bolt([{ x: enemy.x, y: enemy.y }, { x: post.x, y: post.y }], 0xffa0b0, 1.4, 0.3, 6);
      this.ring(post.x, post.y, 120, 0xb02a50, 600, 0.9);
      this.float(post.x, post.y - 30, 'HEXED', '#ff7a88', 15);
      sfx.play('zap', { volume: 0.7, rate: 0.5 });
    });
    sim.on('summon', ({ enemy }) => {
      this.ring(enemy.x, enemy.y, 150, 0xc02a60, 500, 0.8);
    });
    sim.on('earlyCall', ({ bonus }) => {
      if (bonus > 0) this.float(512, 40, `+${bonus} early`, '#ffe7a0', 18);
    });
  }

  /** Freeze particles and the beam hum with the game. Emitters run on their own clock, not the tween timeScale. */
  setPaused(paused) {
    for (const e of this.emitters) e.timeScale = paused ? 0 : 1;
    if (paused) this.sfx.loop('beam_loop', 0);
  }

  // -------------------------------------------------------------------------------- per frame
  update(dt, time) {
    const g = this.gfx;
    g.clear();

    // beams (state-driven: read straight from the posts)
    for (const p of this.sim.posts) {
      if (POSTS[p.type].behavior !== 'beam' || !p.beam.length) continue;
      const m = this.muzzle(p, 0, false, 28);
      for (const b of p.beam) {
        const k = 0.35 + 0.65 * b.power;
        this.drawBeam(g, m.x, m.y, b.x, b.y, k, time);
        if (Math.random() < 0.5) this.sparks.emitParticleAt(b.x, b.y, 1);
        const last = this.beamLightT.get(p.id) ?? 0;
        if (time - last > 90) {
          this.beamLightT.set(p.id, time);
          this.lightPool.flash(b.x, b.y, 0x8ff3ff, 90 + 100 * k, 1.4 * k + 0.4, 130);
        }
      }
    }
    const beaming = this.sim.posts.reduce((n, p) => n + (p.beam?.length ? 1 : 0), 0);
    this.sfx.loop('beam_loop', Math.min(0.5, beaming * 0.12));

    // bolts / tracers
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.life -= dt;
      if (b.life <= 0) {
        this.bolts.splice(i, 1);
        continue;
      }
      const a = b.life / b.max;
      const pts = b.jitter ? this.jag(b.pts, b.jitter) : b.pts;
      g.lineStyle(b.width * 2.6, b.color, a * 0.22);
      g.beginPath();
      pts.forEach((p, k) => (k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.strokePath();
      g.lineStyle(b.width, b.color, a);
      g.beginPath();
      pts.forEach((p, k) => (k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.strokePath();
    }

    this.syncShells(dt, time);
  }

  jag(pts, amount) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const d = dist(a.x, a.y, b.x, b.y);
      const n = Math.max(2, Math.floor(d / 14));
      const nx = -(b.y - a.y) / (d || 1);
      const ny = (b.x - a.x) / (d || 1);
      for (let s = 1; s < n; s++) {
        const t = s / n;
        const o = rr(-amount, amount);
        out.push({ x: a.x + (b.x - a.x) * t + nx * o, y: a.y + (b.y - a.y) * t + ny * o });
      }
      out.push(b);
    }
    return out;
  }

  drawBeam(g, x0, y0, x1, y1, k, time) {
    const pts = this.jag([{ x: x0, y: y0 }, { x: x1, y: y1 }], 1.5 + k * 1.5);
    const stroke = (w, c, a) => {
      g.lineStyle(w, c, a);
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.strokePath();
    };
    stroke(12 * k + 4, 0x3ab8ff, 0.18);
    stroke(6 * k + 2.5, 0x8ff3ff, 0.55);
    stroke(2.4 * k + 1, 0xffffff, 0.95);
    // impact flare
    g.fillStyle(0xbffcff, 0.9).fillCircle(x1, y1, 3 + k * 4 + Math.sin(time * 0.05) * 1.2);
    g.fillStyle(0x8ff3ff, 0.25).fillCircle(x1, y1, 10 + k * 8);
  }

  syncShells(dt, time) {
    const live = new Set();
    for (const sh of this.sim.shells) {
      live.add(sh.id);
      let v = this.shellViews.get(sh.id);
      if (!v) {
        v = { img: this.scene.add.image(sh.x, sh.y, 'shell').setScale(SC).setDepth(DEPTH.fx + 3), shadow: this.scene.add.image(sh.x, sh.y, 'glow').setTint(0x000000).setAlpha(0.35).setDepth(DEPTH.fx - 4) };
        this.shellViews.set(sh.id, v);
      }
      const k = Math.min(1, sh.t / sh.dur);
      const h = 4 * k * (1 - k) * (30 + sh.dur * 70);
      v.img.setPosition(sh.x, sh.y - h).setScale(SC * (1 + h * 0.012)).setRotation(time * 0.01);
      v.shadow.setPosition(sh.x, sh.y).setDisplaySize(20 - h * 0.08, 12 - h * 0.05);
      if (Math.random() < 0.6) this.smoke.emitParticleAt(sh.x, sh.y - h, 1);
      if (Math.random() < 0.7) this.embers.emitParticleAt(sh.x, sh.y - h, 1);
    }
    for (const [id, v] of this.shellViews) {
      if (!live.has(id)) {
        v.img.destroy();
        v.shadow.destroy();
        this.shellViews.delete(id);
      }
    }
  }

  destroy() {
    this.lightPool.destroy();
    for (const v of this.shellViews.values()) {
      v.img.destroy();
      v.shadow.destroy();
    }
    this.shellViews.clear();
    this.sfx.stopLoops();
  }
}
