import Phaser from 'phaser';
import { DEPTH, SC } from '../config.js';

const VIEW_SCALE = { bear: 0.78, brute: 0.9, ashe: 0.95 };
const BOB = { cantoi: 0.07, hound: 0.05, lowman: 0.05, swarm: 0.12, crow: 0.04, breaker: 0.05, brute: 0.045, bear: 0.02, ashe: 0.04 };

export class EnemyView {
  constructor(scene, e) {
    this.scene = scene;
    this.e = e;
    this.scale = (VIEW_SCALE[e.type] ?? 1) * SC;
    this.spr = scene.add.image(e.x, e.y, `enemy_${e.type}`).setScale(this.scale).setLighting(true);
    this.base = e.flying ? DEPTH.fly : DEPTH.enemy;
    this.heading = 0;
    this.seed = Math.random() * 100;
    this.flashT = 0;
    this.spr.setDepth(this.base + e.y * 0.0001);
    this.spawnT = 0;
    this.spr.setAlpha(0);
    if (e.flying) {
      this.shadow = scene.add.image(e.x, e.y, `enemy_${e.type}`).setScale(this.scale * 0.85).setTint(0x000000).setAlpha(0.32).setDepth(DEPTH.enemy - 2);
    }
    // Breakers wear their aura.
    if (e.def.aura) {
      this.aura = scene.add.image(e.x, e.y, 'ring').setDisplaySize(e.def.aura.radius * 2, e.def.aura.radius * 2).setTint(0x9fc4ff).setAlpha(0.14).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.enemy - 3);
    }
  }

  hit() {
    this.flashT = 0.07;
  }

  update(dt, time) {
    const e = this.e;
    const spr = this.spr;
    if (Math.abs(e.vx) + Math.abs(e.vy) > 1) {
      this.heading = Phaser.Math.Angle.RotateTo(this.heading, Math.atan2(e.vy, e.vx), 7 * dt);
    }
    const speedK = Math.max(0.2, Math.hypot(e.vx, e.vy) / 40);
    const w = Math.sin(time * 0.0075 * speedK + this.seed);
    const bob = BOB[e.type] ?? 0.05;
    this.spawnT = Math.min(1, this.spawnT + dt * 4);
    spr.setPosition(e.x, e.y);
    spr.setRotation(this.heading + w * bob * 1.4);
    spr.setScale(this.scale * (1 + w * bob * 0.5) * (0.6 + 0.4 * this.spawnT), this.scale * (1 - w * bob * 0.5) * (0.6 + 0.4 * this.spawnT));
    spr.setAlpha(this.spawnT);
    spr.setDepth(this.base + e.y * 0.0001);
    if (this.flashT > 0) {
      this.flashT -= dt;
      spr.setTintMode(Phaser.TintModes.FILL).setTint(0xffffff);
    } else {
      spr.setTintMode(Phaser.TintModes.MULTIPLY);
      const sim = this.scene.sim;
      if (e.stasisUntil > sim.time) spr.setTint(0x86a2ff);
      else if (e.stunUntil > sim.time) spr.setTint(0xffe680);
      else if (e.slow < 0.99) spr.setTint(0xa6f0e2);
      else if (e.hasteUntil > sim.time) spr.setTint(0xff9a8a);
      else if (e.enraged) spr.setTint(0xff7a6a);
      else spr.setTint(0xffffff);
    }
    if (this.shadow) {
      this.shadow.setPosition(e.x + 9, e.y + 15).setRotation(spr.rotation).setScale(spr.scaleX * 0.88, spr.scaleY * 0.88);
    }
    if (this.aura) this.aura.setPosition(e.x, e.y).setAlpha(0.1 + 0.05 * Math.sin(time * 0.004 + this.seed));
  }

  destroy() {
    this.spr.destroy();
    this.shadow?.destroy();
    this.aura?.destroy();
  }
}
