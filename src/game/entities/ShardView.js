import Phaser from 'phaser';
import { DEPTH } from '../config.js';

// A Beam-shard. Always drawn at shard.x/y; the state decides how loudly it announces itself:
//   home       calm bob + soft glow
//   carried    pulsing alert ring (this is the thing you must shoot)
//   dropped    hot, flashing: it will drift home unless a thief snatches it
//   returning  streaks back to the Waystation
export class ShardView {
  constructor(scene, shard) {
    this.scene = scene;
    this.shard = shard;
    this.seed = Math.random() * 10;
    this.glow = scene.add.image(shard.x, shard.y, 'glow').setTint(0x8ff3ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.shard - 1);
    this.spr = scene.add.image(shard.x, shard.y, 'shard').setScale(0.5 * 0.9).setDepth(DEPTH.shard);
    this.ring = scene.add.image(shard.x, shard.y, 'ring').setTint(0xff4a5a).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.shard - 1).setVisible(false);
    this.trail = null;
    this.spr.setTintMode(Phaser.TintModes.MULTIPLY);
  }

  update(dt, time) {
    const s = this.shard;
    const t = time / 1000 + this.seed;
    if (s.state === 'lost') {
      this.spr.setVisible(false);
      this.glow.setVisible(false);
      this.ring.setVisible(false);
      return;
    }
    let x = s.x;
    let y = s.y;
    let glowSize = 38;
    let glowA = 0.55;
    let scale = 0.45;
    this.ring.setVisible(false);
    if (s.state === 'home') {
      y += Math.sin(t * 2) * 1.4;
      glowA = 0.4 + 0.15 * Math.sin(t * 2.4);
      glowSize = 34;
    } else if (s.state === 'carried') {
      scale = 0.55;
      glowSize = 46 + 6 * Math.sin(t * 9);
      glowA = 0.8;
      const k = (t * 1.6) % 1;
      this.ring.setVisible(true).setDisplaySize(24 + k * 46, 24 + k * 46).setAlpha((1 - k) * 0.9);
      y -= 5;
    } else if (s.state === 'dropped') {
      scale = 0.6 + 0.06 * Math.sin(t * 14);
      glowSize = 60 + 10 * Math.sin(t * 12);
      glowA = 0.95;
      const k = (t * 2.2) % 1;
      this.ring.setVisible(true).setTint(0x8ff3ff).setDisplaySize(20 + k * 60, 20 + k * 60).setAlpha((1 - k) * 0.9);
    } else if (s.state === 'returning') {
      glowSize = 50;
      glowA = 0.9;
      this.ring.setTint(0xff4a5a);
    }
    this.spr.setVisible(true).setPosition(x, y).setScale(scale).setRotation(Math.sin(t * 1.3) * 0.12);
    this.glow.setVisible(true).setPosition(x, y).setDisplaySize(glowSize * 2, glowSize * 2).setAlpha(glowA);
    this.ring.setPosition(x, y);
    this.spr.setDepth(DEPTH.shard + (s.state === 'carried' ? 14 : 0));
    this.glow.setDepth(DEPTH.shard - 1 + (s.state === 'carried' ? 14 : 0));
    this.ring.setDepth(DEPTH.shard + (s.state === 'carried' ? 13 : 0));
  }

  destroy() {
    this.spr.destroy();
    this.glow.destroy();
    this.ring.destroy();
  }
}
