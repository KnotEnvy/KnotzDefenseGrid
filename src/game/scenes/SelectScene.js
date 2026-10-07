import Phaser from 'phaser';
import { GAME_W as W, FONT, SC } from '../config.js';
import { LEVELS } from '../../sim/data/levels.js';
import { POST_ORDER } from '../../sim/data/posts.js';
import { DIFFICULTY, DIFFICULTY_ORDER } from '../../sim/data/difficulty.js';
import { skyBackdrop } from '../ui/backdrop.js';
import { installBasicFx } from '../fx/PostFx.js';
import { button, panel, txt, setText } from '../ui/kit.js';
import { startLevelFlow, leaveTo } from '../ui/flow.js';

const NODES = [[150, 330], [380, 262], [610, 340], [840, 262], [1050, 330]];

export function starPoly(g, cx, cy, R, r, color, alpha = 1) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : r;
    pts.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad });
  }
  g.fillStyle(color, alpha).fillPoints(pts, true);
}

/** The Path of the Beam: a map of Waystations with progress, stars and difficulty choice. */
export class SelectScene extends Phaser.Scene {
  constructor() {
    super('Select');
  }

  create() {
    const sfx = this.registry.get('sfx');
    this.sfx = sfx;
    const cam = this.cameras.main;
    cam.setBackgroundColor('#07050a');
    this.backdrop = skyBackdrop(this, { sky: [0x090516, 0x2c1736, 0xa9503a], towerX: 1190, towerH: 430, grass: true });
    installBasicFx(this);
    const q = new URLSearchParams(location.search);
    this.prog = this.registry.get('progress') ?? {};
    this.unlockAll = q.has('unlock');
    this.difficulty = this.registry.get('difficulty') ?? 'normal';

    txt(this, W / 2, 34, 'THE PATH OF THE BEAM', { fontFamily: FONT.title, fontSize: 40, color: '#e9c46a', stroke: '#120c08', strokeThickness: 7 }).setOrigin(0.5).setDepth(30);
    const back = button(this, 24, 22, 110, 32, '◂ Menu', () => this.leave('Menu'), { fontSize: 16, font: FONT.mono });
    [back.bg, back.label, back.zone].forEach(o => o.setDepth(40));

    this.drawPath();
    this.nodes = LEVELS.map((lv, i) => this.makeNode(lv, i));
    this.buildDetail();

    // select the first unfinished level
    let first = LEVELS.findIndex((l, i) => this.isUnlocked(i) && !this.prog[l.id]?.done);
    if (first < 0) first = LEVELS.length - 1;
    this.select(first);
    sfx?.playMusic('menu');
    cam.fadeIn(700, 7, 5, 10);
  }

  isUnlocked(i) {
    return this.unlockAll || i === 0 || !!this.prog[LEVELS[i - 1].id]?.done;
  }

  drawPath() {
    const pts = NODES.map(([x, y]) => new Phaser.Math.Vector2(x, y));
    const curve = new Phaser.Curves.Spline([new Phaser.Math.Vector2(-30, 420), ...pts, new Phaser.Math.Vector2(W + 30, 220)]);
    const g = this.add.graphics().setDepth(10).setBlendMode(Phaser.BlendModes.ADD);
    const pl = curve.getPoints(160);
    for (const [w, a, c] of [[16, 0.08, 0x3ab8ff], [8, 0.2, 0x8ff3ff], [2.5, 0.8, 0xffffff]]) {
      g.lineStyle(w, c, a);
      g.beginPath();
      pl.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.strokePath();
    }
    // energy motes running along the Beam
    this.motes = [];
    for (let i = 0; i < 9; i++) {
      const s = this.add.image(0, 0, 'glow').setTint(0xcffaff).setBlendMode(Phaser.BlendModes.ADD).setDepth(11).setDisplaySize(26, 26);
      this.motes.push({ s, t: i / 9 });
    }
    this.curve = curve;
  }

  makeNode(lv, i) {
    const [x, y] = NODES[i];
    const unlocked = this.isUnlocked(i);
    const done = !!this.prog[lv.id]?.done;
    const g = this.add.graphics().setDepth(20);
    const draw = (hover = false, selected = false) => {
      g.clear();
      g.fillStyle(0x000000, 0.5).fillCircle(x + 3, y + 5, 30);
      g.fillStyle(unlocked ? (done ? 0x3a2c14 : 0x24180e) : 0x141010, 1).fillCircle(x, y, 28);
      g.lineStyle(selected ? 4 : 3, unlocked ? (hover || selected ? 0xffe08a : 0xd6b25e) : 0x4a3a2a, 1).strokeCircle(x, y, 28);
      if (done) g.lineStyle(2, 0x8ff3ff, 0.8).strokeCircle(x, y, 33);
    };
    draw();
    txt(this, x, y, `${lv.number}`, { fontFamily: FONT.title, fontSize: 28, color: unlocked ? '#f1d9a0' : '#4a3a2a' }).setOrigin(0.5).setDepth(21);
    txt(this, x, y + 46, lv.name, { fontFamily: FONT.body, fontSize: 17, color: unlocked ? '#e8dcc0' : '#5a4a3a', align: 'center', wordWrap: { width: 190 } }).setOrigin(0.5, 0).setDepth(21);
    const stars = this.add.graphics().setDepth(21);
    const st = this.prog[lv.id]?.stars ?? 0;
    for (let s = 0; s < 3; s++) starPoly(stars, x - 22 + s * 22, y - 44, 9, 4, s < st ? 0xffd77a : 0x2a2018, 1);
    const zone = this.add.zone(x - 34, y - 34, 68, 68).setOrigin(0).setDepth(25).setInteractive({ useHandCursor: unlocked });
    zone.on('pointerover', () => {
      draw(true, this.sel === i);
      if (unlocked) this.sfx?.play('hover', { volume: 0.4 });
    });
    zone.on('pointerout', () => draw(false, this.sel === i));
    zone.on('pointerdown', () => {
      if (!unlocked) {
        this.sfx?.play('error', { volume: 0.4 });
        return;
      }
      this.sfx?.play('click', { volume: 0.5 });
      this.select(i);
    });
    return { draw, unlocked, x, y };
  }

  buildDetail() {
    const y0 = 440;
    panel(this, 60, y0, W - 120, 250, { alpha: 0.93 }).setDepth(30);
    this.dName = txt(this, 90, y0 + 16, '', { fontFamily: FONT.title, fontSize: 30, color: '#e9c46a' }).setDepth(31);
    this.dSub = txt(this, 92, y0 + 56, '', { fontFamily: FONT.body, fontSize: 19, fontStyle: 'italic', color: '#b8a888' }).setDepth(31);
    this.dInfo = txt(this, 92, y0 + 90, '', { fontFamily: FONT.mono, fontSize: 15, color: '#d8ccb0', lineSpacing: 6 }).setDepth(31);
    this.dPosts = this.add.group();
    txt(this, 92, y0 + 168, 'ARSENAL', { fontFamily: FONT.mono, fontSize: 11, color: '#8a7a60', letterSpacing: 3 }).setDepth(31);
    // difficulty
    txt(this, 700, y0 + 18, 'RIDE AS', { fontFamily: FONT.mono, fontSize: 12, color: '#8a7a60', letterSpacing: 3 }).setDepth(31);
    this.diffBtns = DIFFICULTY_ORDER.map((id, i) => {
      const b = button(this, 700 + i * 150, y0 + 40, 142, 44, '', () => {
        this.difficulty = id;
        this.registry.set('difficulty', id);
        this.refreshDiff();
      }, { fontSize: 18 });
      [b.bg, b.label, b.zone].forEach(o => o.setDepth(32));
      b.id = id;
      b.x0 = 700 + i * 150;
      b.y0 = y0 + 40;
      b.setLabel(DIFFICULTY[id].name);
      return b;
    });
    this.diffNote = txt(this, 700, y0 + 88, '', { fontFamily: FONT.body, fontSize: 16, fontStyle: 'italic', color: '#a89a80' }).setDepth(31);
    this.startBtn = button(this, 700, y0 + 150, 440, 56, 'Ride out  ▸', () => this.start(), { fontSize: 30, font: FONT.title, fill: 0x3a2610, edge: 0xd6b25e, hover: 0x553a1a });
    [this.startBtn.bg, this.startBtn.label, this.startBtn.zone].forEach(o => o.setDepth(32));
    this.endlessBtn = button(this, 700, y0 + 112, 440, 32, 'Mode: Campaign', () => {
      if (!this.canEndless(this.sel)) return;
      this.endless = !this.endless;
      this.refreshDiff();
    }, { fontSize: 15, font: FONT.mono });
    [this.endlessBtn.bg, this.endlessBtn.label, this.endlessBtn.zone].forEach(o => o.setDepth(32));
    this.endless = false;
    this.refreshDiff();
  }

  canEndless(i) {
    return this.unlockAll || !!this.prog[LEVELS[LEVELS.length - 1].id]?.done;
  }

  refreshDiff() {
    for (const b of this.diffBtns) {
      const on = b.id === this.difficulty;
      b.bg.clear();
      b.bg.fillStyle(on ? 0x4a3418 : 0x2b1d12, 1).fillRoundedRect(b.x0, b.y0, 142, 44, 7);
      b.bg.lineStyle(2, on ? 0xffe08a : 0x8a6a3c, 1).strokeRoundedRect(b.x0, b.y0, 142, 44, 7);
    }
    setText(this.diffNote, DIFFICULTY[this.difficulty].blurb);
    const can = this.sel === undefined ? false : this.canEndless(this.sel);
    if (!can) this.endless = false;
    this.endlessBtn.setVisible(can);
    this.endlessBtn.setLabel(this.endless ? 'Mode: The Wheel Turns (endless)' : 'Mode: Campaign   [click for endless]');
  }

  select(i) {
    this.sel = i;
    this.nodes.forEach((n, k) => n.draw(false, k === i));
    if (this.endlessBtn) this.refreshDiff();
    const lv = LEVELS[i];
    const done = this.prog[lv.id];
    setText(this.dName, `${lv.number}. ${lv.name}`);
    setText(this.dSub, lv.subtitle);
    setText(this.dInfo, `${lv.shards} shards to hold   ·   ${lv.waves.length} waves   ·   ${new Set(lv.map.join('').match(/[1-4]/g)).size} doorway${new Set(lv.map.join('').match(/[1-4]/g)).size > 1 ? 's' : ''}\nBest: ${done?.done ? '★'.repeat(done.stars) + '☆'.repeat(3 - done.stars) : 'not yet cleared'}${this.prog[lv.id + '-endless']?.best ? `   ·   Wheel: ${this.prog[lv.id + '-endless'].best} waves` : ''}`);
    this.dPosts.clear(true, true);
    const types = POST_ORDER.filter(t => lv.unlocks.includes(t));
    types.forEach((t, k) => {
      const x = 106 + k * 48;
      const y = 440 + 208;
      this.dPosts.add(this.add.image(x, y, `post_${t}_base`).setScale(SC * 0.55).setDepth(31));
      this.dPosts.add(this.add.image(x, y, `post_${t}_head`).setScale(SC * 0.55).setDepth(32));
      const isNew = i === 0 ? true : !LEVELS[i - 1].unlocks.includes(t);
      if (isNew) this.dPosts.add(txt(this, x + 14, y - 22, 'NEW', { fontFamily: FONT.mono, fontSize: 9, color: '#8ff3ff' }).setDepth(33));
    });
  }

  start() {
    this.registry.set('difficulty', this.difficulty);
    this.sfx?.play('click', { volume: 0.7 });
    startLevelFlow(this, this.sel, this.difficulty, { endless: this.endless });
  }

  leave(scene) {
    leaveTo(this, scene);
  }

  update(time, delta) {
    this.backdrop.update(time, delta);
    for (const m of this.motes) {
      m.t = (m.t + delta * 0.00006) % 1;
      const p = this.curve.getPoint(m.t);
      m.s.setPosition(p.x, p.y).setAlpha(0.5 + 0.5 * Math.sin(m.t * 40));
    }
  }
}
