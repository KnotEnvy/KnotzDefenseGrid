import Phaser from 'phaser';
import { Sim, FIXED_DT } from '../../sim/sim.js';
import { LEVELS } from '../../sim/data/levels.js';
import { POSTS, POST_ORDER, TARGET_MODES } from '../../sim/data/posts.js';
import { DIFFICULTY } from '../../sim/data/difficulty.js';
import { CELL, COLS, ROWS } from '../../sim/grid.js';
import { FIELD, DEPTH, GAME_W, SC, FONT } from '../config.js';
import { World } from '../world/World.js';
import { Fx } from '../fx/Fx.js';
import { installPostFx, dangerPulse, destroyPostFx } from '../fx/PostFx.js';
import { PostView } from '../entities/PostView.js';
import { EnemyView } from '../entities/EnemyView.js';
import { ShardView } from '../entities/ShardView.js';
import { loadProgress, saveProgress } from './BootScene.js';

const SPEEDS = [1, 2, 3];

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.levelIndex = data.level ?? 0;
    this.difficulty = data.difficulty ?? 'normal';
    this.endless = !!data.endless;
  }

  create() {
    const q = new URLSearchParams(location.search);
    this.level = LEVELS[this.levelIndex];
    const diff = DIFFICULTY[this.difficulty] ?? DIFFICULTY.normal;
    this.sfx = this.registry.get('sfx');

    const unlocked = q.has('all') ? Object.keys(POSTS) : this.level.unlocks;
    this.sim = new Sim(this.level, { seed: (Math.random() * 1e9) | 0, hpScale: diff.hp, rewardScale: diff.reward, unlocked });
    this.sim.silver = Math.round(this.sim.silver * diff.silver);
    if (q.has('silver')) this.sim.silver = Number(q.get('silver'));
    if (q.has('wave')) this.sim.nextWaveIn = Number(q.get('wave'));

    this.speed = 1;
    this.acc = 0;
    this.paused = false;
    this.ended = false;
    this.buildType = null;
    this.selected = null;
    this.ghost = null;
    this.hoverCell = { cx: -9, cy: -9 };
    this.lastReason = null;
    this.postViews = new Map();
    this.enemyViews = new Map();
    this.shardViews = [];

    const cam = this.cameras.main;
    cam.setScroll(0, -FIELD.y).setBackgroundColor('#07050a');
    this.lights.enable().setAmbientColor(q.has('amb') ? parseInt(q.get('amb'), 16) : 0x9a8fa6);
    this.sun = this.lights.addLight(-80, 320, 1500, 0xffb070, q.has('sun') ? Number(q.get('sun')) : 0.9, 760);

    this.world = new World(this, this.level, this.sim);
    this.fx = new Fx(this, this.sim, this.world, this.sfx);
    this.post = installPostFx(this);
    this.hpGfx = this.add.graphics().setDepth(DEPTH.fx + 4);
    this.selGfx = this.add.graphics().setDepth(DEPTH.fx - 5);
    this.hintText = this.add.text(0, 0, '', { fontFamily: FONT.mono, fontSize: 14, color: '#ffb0b8', stroke: '#120c08', strokeThickness: 4, resolution: 2 }).setOrigin(0.5).setDepth(DEPTH.fx + 8).setVisible(false);

    for (const s of this.sim.shards) this.shardViews.push(new ShardView(this, s));
    this.bindSim();
    this.bindInput();

    // exposed for the HUD and tests
    window.__beam = { ...(window.__beam || {}), scene: this, sim: this.sim };

    this.scene.launch('Hud', { game: this });
    this.events.once('shutdown', () => this.cleanup());

    cam.fadeIn(700, 7, 5, 10);
    cam.setZoom(1.04);
    this.tweens.add({ targets: cam, zoom: 1, duration: 1400, ease: 'Cubic.easeOut' });
    this.sfx?.playMusic('game');
    this.time.delayedCall(900, () => this.sfx?.play('thunder', { volume: 0.45 }));
  }

  // --------------------------------------------------------------------------------- wiring
  bindSim() {
    const sim = this.sim;
    sim.on('build', ({ post }) => {
      this.postViews.set(post.id, new PostView(this, post, this.fx));
    });
    sim.on('upgrade', ({ post }) => this.postViews.get(post.id)?.refresh());
    sim.on('sell', ({ post }) => {
      this.postViews.get(post.id)?.destroy();
      this.postViews.delete(post.id);
      if (this.selected === post) this.select(null);
    });
    sim.on('spawn', ({ enemy }) => this.enemyViews.set(enemy.id, new EnemyView(this, enemy)));
    const drop = ({ enemy }) => {
      this.enemyViews.get(enemy.id)?.destroy();
      this.enemyViews.delete(enemy.id);
    };
    sim.on('kill', drop);
    sim.on('exit', drop);
    sim.on('win', ({ stars }) => this.finish(true, stars));
    sim.on('lose', () => this.finish(false, 0));
  }

  glassPulse(post, radius) {
    this.post.glass?.play(post.x, post.y, radius, 650);
  }

  riftAll() {
    for (const d of this.world.doors) this.post.rift?.play(d.x + 10, d.y, 190, 1100, {
      onUpdate: k => {
        if (this.post.riftDisp) {
          const v = 0.028 * Math.sin(Math.PI * k);
          this.post.riftDisp.x = v;
          this.post.riftDisp.y = v;
        }
      }
    });
  }

  dangerPulse() {
    dangerPulse(this, this.post);
  }

  // --------------------------------------------------------------------------------- input
  bindInput() {
    const input = this.input;
    input.mouse?.disableContextMenu();
    input.on('pointermove', p => this.onMove(p));
    input.on('pointerdown', p => this.onDown(p));
    const kb = input.keyboard;
    kb.on('keydown', ev => this.onKey(ev));
  }

  inField(p) {
    return p.x >= 0 && p.x < FIELD.w && p.y >= FIELD.y && p.y < FIELD.y + FIELD.h;
  }

  snap(p) {
    // centre the 2x2 footprint on the cursor
    return { cx: Math.round(p.worldX / CELL) - 1, cy: Math.round(p.worldY / CELL) - 1 };
  }

  onMove(p) {
    if (!this.inField(p)) {
      this.hoverCell = { cx: -9, cy: -9 };
      return;
    }
    this.hoverCell = this.snap(p);
  }

  onDown(p) {
    if (this.paused || this.ended) return;
    if (!this.inField(p)) return;
    if (p.rightButtonDown()) {
      this.cancel();
      return;
    }
    const { cx, cy } = this.snap(p);
    if (this.buildType) {
      const chk = this.sim.canBuild(this.buildType, cx, cy);
      if (chk.ok) {
        this.sim.build(this.buildType, cx, cy);
        if (this.sim.silver < POSTS[this.buildType].levels[0].cost) this.buildType = null;
      } else {
        this.sfx?.play('error', { volume: 0.5 });
        this.flashHint(chk.reason, p.worldX, p.worldY);
      }
      return;
    }
    const cellX = Math.floor(p.worldX / CELL);
    const cellY = Math.floor(p.worldY / CELL);
    const post = this.sim.postAt(cellX, cellY);
    this.select(post);
    if (post) this.sfx?.play('click', { volume: 0.5 });
  }

  flashHint(reason, x, y) {
    const msgs = {
      blocks: 'Leave them a road',
      terrain: 'Cannot build here',
      occupied: 'Taken',
      enemy: 'Something is standing there',
      silver: 'Not enough silver',
      edge: 'Out of bounds',
      locked: 'Not yet unlocked'
    };
    this.hintText.setText(msgs[reason] ?? 'Cannot build').setPosition(x, y - 40).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.hintText);
    this.tweens.add({ targets: this.hintText, alpha: 0, y: y - 60, duration: 1100, delay: 250, onComplete: () => this.hintText.setVisible(false) });
    if (reason === 'blocks') this.events.emit('say', 'blocked');
  }

  onKey(ev) {
    const k = ev.key;
    if (k === 'Escape') {
      if (this.buildType || this.selected) this.cancel();
      else this.togglePause();
      return;
    }
    if (this.ended) return;
    if (k === ' ') {
      ev.preventDefault?.();
      this.callWave();
    } else if (k === 'p' || k === 'P') this.togglePause();
    else if (k === 'f' || k === 'F') this.cycleSpeed();
    else if (k === 'h' || k === 'H') this.togglePaths();
    else if (k === 'u' || k === 'U') this.upgradeSelected();
    else if (k === 's' || k === 'S' || k === 'Delete') this.sellSelected();
    else if (k === 't' || k === 'T') this.cycleMode();
    else if (k === 'm' || k === 'M') this.sfx?.toggleMute();
    else if (k >= '1' && k <= '8') {
      const types = POST_ORDER.filter(t => this.sim.unlocked.has(t));
      const t = types[Number(k) - 1];
      if (t) this.selectPostType(t);
    }
  }

  // --------------------------------------------------------------------------------- commands (HUD calls these)
  selectPostType(type) {
    if (!this.sim.unlocked.has(type)) return;
    this.buildType = this.buildType === type ? null : type;
    this.select(null);
    this.sfx?.play('click', { volume: 0.5 });
  }

  select(post) {
    if (this.selected && this.postViews.get(this.selected.id)) this.postViews.get(this.selected.id).setSelected(false);
    this.selected = post;
    if (post) {
      this.buildType = null;
      this.postViews.get(post.id)?.setSelected(true);
    }
  }

  cancel() {
    this.buildType = null;
    this.select(null);
  }

  upgradeSelected() {
    const p = this.selected;
    if (!p) return;
    if (!this.sim.upgrade(p)) this.sfx?.play('error', { volume: 0.5 });
  }

  sellSelected() {
    if (this.selected) this.sim.sell(this.selected);
  }

  cycleMode() {
    const p = this.selected;
    if (!p) return;
    const i = TARGET_MODES.indexOf(p.mode);
    this.sim.setMode(p, TARGET_MODES[(i + 1) % TARGET_MODES.length]);
    this.sfx?.play('click', { volume: 0.5 });
  }

  callWave() {
    if (this.sim.canCallWave) this.sim.callWave();
  }

  cycleSpeed() {
    this.speed = SPEEDS[(SPEEDS.indexOf(this.speed) + 1) % SPEEDS.length];
    this.sfx?.play('click', { volume: 0.5 });
  }

  setSpeed(s) {
    this.speed = s;
  }

  togglePause() {
    if (this.ended) return;
    this.paused = !this.paused;
    this.events.emit('paused', this.paused);
    this.tweens.timeScale = this.paused ? 0 : 1;
  }

  togglePaths() {
    return this.world.togglePaths();
  }

  // --------------------------------------------------------------------------------- end of level
  finish(won, stars) {
    if (this.ended) return;
    this.ended = true;
    const sim = this.sim;
    this.sfx?.play(won ? 'win' : 'lose', { volume: 0.9 });
    const result = { won, stars, level: this.levelIndex, difficulty: this.difficulty, shards: sim.shardsRemaining, total: sim.level.shards, kills: sim.stats.kills, time: Math.round(sim.time), recovered: sim.stats.shardsRecovered, lost: sim.stats.shardsLost };
    if (won) {
      const prog = loadProgress();
      const key = this.level.id;
      const best = prog[key]?.stars ?? 0;
      prog[key] = { stars: Math.max(best, stars), done: true };
      saveProgress(prog);
      this.registry.set('progress', prog);
    }
    this.cameras.main.shake(600, won ? 0.002 : 0.01);
    this.time.delayedCall(won ? 1600 : 1200, () => {
      this.cameras.main.fadeOut(800, 7, 5, 10);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.stop('Hud');
        this.scene.start('Result', result);
      });
    });
  }

  // --------------------------------------------------------------------------------- frame loop
  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    const sim = this.sim;
    if (!this.paused && !this.ended) {
      this.acc += dt * this.speed;
      let steps = 0;
      while (this.acc >= FIXED_DT && steps < 8 && sim.state === 'play') {
        sim.update(FIXED_DT);
        this.acc -= FIXED_DT;
        steps++;
      }
      if (steps === 8) this.acc = 0;
    }

    for (const v of this.enemyViews.values()) v.update(dt, time);
    for (const v of this.postViews.values()) v.update(dt, time);
    for (const v of this.shardViews) v.update(dt, time);
    this.fx.update(dt, time);
    this.world.update(time, delta);
    if (this.world.pathVisible) this.world.drawPaths(time / 1000);
    this.drawHealthBars();
    this.drawOverlays(time);

    // keep the sun and rift noise alive
    if (this.post.riftMapObj) this.post.riftMapObj.noiseFlow += delta * 0.0012;
  }

  drawHealthBars() {
    const g = this.hpGfx;
    g.clear();
    for (const v of this.enemyViews.values()) {
      const e = v.e;
      if (e.dead || (e.hp >= e.maxHp && !e.boss)) continue;
      const w = Math.max(16, e.radius * 2.2);
      const x = e.x - w / 2;
      const y = e.y - e.radius - 9;
      const f = Math.max(0, e.hp / e.maxHp);
      g.fillStyle(0x120c08, 0.85).fillRect(x - 1, y - 1, w + 2, 5);
      const col = f > 0.5 ? 0x7ddc8a : f > 0.25 ? 0xe8c050 : 0xe05050;
      g.fillStyle(col, 1).fillRect(x, y, w * f, 3);
    }
  }

  drawOverlays(time) {
    const g = this.selGfx;
    g.clear();
    const sim = this.sim;
    this.world.setGridVisible(!!this.buildType);

    // range ring of the selected post
    if (this.selected) {
      const p = this.selected;
      const s = sim.statsOf(p);
      const r = s.range ?? s.radius ?? 0;
      g.fillStyle(0xffe8b0, 0.06).fillCircle(p.x, p.y, r);
      g.lineStyle(2, 0xffe8b0, 0.55).strokeCircle(p.x, p.y, r);
      if (POSTS[p.type].behavior === 'mortar') g.lineStyle(1, 0xff9a60, 0.5).strokeCircle(p.x, p.y, s.minRange);
      const sz = CELL * 2 + 8;
      g.lineStyle(2, 0xffe08a, 0.9).strokeRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }

    // placement ghost
    if (this.buildType && this.hoverCell.cx > -5) {
      const { cx, cy } = this.hoverCell;
      const type = this.buildType;
      const chk = sim.canBuild(type, cx, cy);
      const x = (cx + 1) * CELL;
      const y = (cy + 1) * CELL;
      const col = chk.ok ? 0x7ddc8a : 0xe05050;
      const def = POSTS[type].levels[0];
      const r = def.range ?? def.radius ?? 0;
      g.fillStyle(col, 0.1).fillCircle(x, y, r);
      g.lineStyle(2, col, 0.6).strokeCircle(x, y, r);
      g.fillStyle(col, 0.28).fillRect(cx * CELL, cy * CELL, CELL * 2, CELL * 2);
      g.lineStyle(2, col, 0.9).strokeRect(cx * CELL, cy * CELL, CELL * 2, CELL * 2);
      if (!this.ghost || this.ghost.type !== type) {
        this.ghost?.base.destroy();
        this.ghost?.head.destroy();
        this.ghost = {
          type,
          base: this.add.image(x, y, `post_${type}_base`).setScale(SC).setAlpha(0.65).setDepth(DEPTH.postBase + 5),
          head: this.add.image(x, y, `post_${type}_head`).setScale(SC).setAlpha(0.7).setDepth(DEPTH.postHead + 5)
        };
      }
      this.ghost.base.setPosition(x, y).setVisible(true).setTint(chk.ok ? 0xffffff : 0xff8080);
      this.ghost.head.setPosition(x, y).setVisible(true).setTint(chk.ok ? 0xffffff : 0xff8080);
      if (!chk.ok && chk.reason === 'blocks') {
        this.hintText.setText('Leave them a road').setPosition(x, y - 46).setVisible(true).setAlpha(0.9);
      } else if (this.hintText.alpha === 0.9) this.hintText.setVisible(false);
    } else if (this.ghost) {
      this.ghost.base.setVisible(false);
      this.ghost.head.setVisible(false);
      if (this.hintText.alpha === 0.9) this.hintText.setVisible(false);
    }
  }

  // --------------------------------------------------------------------------------- teardown
  cleanup() {
    this.sfx?.stopLoops();
    this.sfx?.stopMusic();
    this.fx?.destroy();
    this.world?.destroy();
    destroyPostFx(this.post);
    this.tweens.timeScale = 1;
    this.input.keyboard?.removeAllListeners();
  }
}
