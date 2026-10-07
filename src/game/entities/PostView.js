import Phaser from 'phaser';
import { POSTS } from '../../sim/data/posts.js';
import { DEPTH, SC, CELL } from '../config.js';

const ROTATING = new Set(['sixgun', 'scattergun', 'mortar', 'beam']);

export class PostView {
  constructor(scene, post, fx) {
    this.scene = scene;
    this.post = post;
    this.def = POSTS[post.type];
    this.fx = fx;
    const { x, y } = post;
    const z = y * 0.0001;
    this.base = scene.add.image(x, y, `post_${post.type}_base`).setScale(SC).setLighting(true).setDepth(DEPTH.postBase + z);
    this.head = scene.add.image(x, y, `post_${post.type}_head`).setScale(SC).setLighting(true).setDepth(DEPTH.postHead + z);
    this.pips = scene.add.graphics().setDepth(DEPTH.postHead + 1 + z);
    this.aim = post.aim;
    this.kickT = 0;
    this.kickDir = 0;
    this.kickPow = 0;
    this.selected = false;
    this.glowFx = null;
    this.hexed = null;
    this.light = null;
    this.emitter = null;

    if (post.type === 'fire') {
      this.light = scene.lights.addLight(x, y, 210, 0xff8a3a, 1.2, 70);
      this.emitter = scene.add.particles(x, y, 'spark', {
        lifespan: { min: 500, max: 1100 }, speedY: { min: -38, max: -14 }, speedX: { min: -8, max: 8 },
        scale: { start: 0.9, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xffd24a, 0xff8a1c, 0xff5a1a],
        frequency: 70, quantity: 1, blendMode: 'ADD', x: { min: -8, max: 8 }, y: { min: -4, max: 6 }, maxAliveParticles: 30
      }).setDepth(DEPTH.postHead + 2 + z);
    } else if (post.type === 'orb') {
      this.light = scene.lights.addLight(x, y, 140, 0xff6fd8, 0.6, 60);
    } else if (post.type === 'glass') {
      this.light = scene.lights.addLight(x, y, 150, 0x8a70ff, 0.5, 60);
    }
    this.refresh();
    // build pop-in
    this.base.setScale(SC * 0.3);
    this.head.setScale(SC * 0.3);
    scene.tweens.add({ targets: this.base, scaleX: SC, scaleY: SC, duration: 260, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: this.head, scaleX: SC * this.tierScale(), scaleY: SC * this.tierScale(), duration: 320, ease: 'Back.easeOut', delay: 60 });
  }

  tierScale() {
    return 1 + this.post.level * 0.07;
  }

  /** Re-draw tier pips (call after an upgrade). */
  refresh() {
    const g = this.pips;
    g.clear();
    const n = this.post.level + 1;
    const { x, y } = this.post;
    for (let i = 0; i < n; i++) {
      const px = x + (i - (n - 1) / 2) * 9;
      const py = y + CELL - 5;
      g.fillStyle(0x120c08, 0.8).fillCircle(px, py, 4.2);
      g.fillStyle(n === 3 ? 0xffe08a : 0xd6b25e, 1).fillTriangle(px, py - 3.2, px + 3.2, py, px, py + 3.2);
      g.fillTriangle(px, py - 3.2, px - 3.2, py, px, py + 3.2);
    }
    this.head.setScale(SC * this.tierScale());
  }

  kick(dir, power = 4) {
    this.kickT = 1;
    this.kickDir = dir;
    this.kickPow = power;
  }

  setSelected(v) {
    if (v === this.selected) return;
    this.selected = v;
    if (v) {
      if (!this.glowFx) {
        this.base.enableFilters();
        this.glowFx = this.base.filters.internal.addGlow(0xffd77a, 5, 0, 1, false, 8, 8);
        this.glowFx.setPaddingOverride(null);
      }
      this.glowFx.setActive(true);
    } else if (this.glowFx) {
      this.glowFx.setActive(false);
    }
  }

  update(dt, time) {
    const p = this.post;
    const head = this.head;
    const sim = this.scene.sim;
    const hexed = p.disabled > sim.time;

    if (ROTATING.has(p.type)) {
      this.aim = Phaser.Math.Angle.RotateTo(this.aim, p.aim, 9 * dt);
      head.setRotation(this.aim);
    } else if (p.type === 'sigul') {
      head.setRotation(time * 0.0006);
      head.setAlpha(0.8 + 0.2 * Math.sin(time * 0.004));
    } else if (p.type === 'glass') {
      head.setRotation(Math.sin(time * 0.0007) * 0.4);
    }

    // recoil
    let ox = 0;
    let oy = 0;
    if (this.kickT > 0) {
      this.kickT = Math.max(0, this.kickT - dt * 9);
      ox = -Math.cos(this.kickDir) * this.kickPow * this.kickT;
      oy = -Math.sin(this.kickDir) * this.kickPow * this.kickT;
    }
    head.setPosition(p.x + ox, p.y + oy);

    if (p.type === 'fire') {
      const f = 0.92 + 0.12 * Math.sin(time * 0.02) + Math.random() * 0.08;
      head.setScale(SC * this.tierScale() * f);
      this.light.intensity = (0.9 + 0.5 * Math.random()) * (p.level + 1) * 0.55 + 0.4;
      this.light.radius = 190 + 22 * p.level + Math.random() * 14;
    } else if (p.type === 'orb') {
      const k = 1 + 0.05 * Math.sin(time * 0.006);
      head.setScale(SC * this.tierScale() * k);
      this.light.intensity = 0.45 + 0.25 * Math.sin(time * 0.008) + (p.cd > 0.6 ? 0.8 : 0);
    } else if (p.type === 'glass') {
      this.light.intensity = 0.4 + 0.2 * Math.sin(time * 0.003) + (p.cd > 0 ? 0 : 0.5);
    } else if (p.type === 'beam') {
      head.setAlpha(1);
    }

    // hex: grey & shaking
    if (hexed) {
      head.setTint(0x6a5050);
      this.base.setTint(0x8a7070);
      head.x += (Math.random() - 0.5) * 1.6;
    } else if (head.tintTopLeft !== 0xffffff) {
      head.setTint(0xffffff);
      this.base.setTint(0xffffff);
    }
  }

  destroy() {
    this.scene.tweens.killTweensOf([this.base, this.head]);
    if (this.light) this.scene.lights.removeLight(this.light);
    this.emitter?.destroy();
    this.pips.destroy();
    this.base.destroy();
    this.head.destroy();
  }
}
