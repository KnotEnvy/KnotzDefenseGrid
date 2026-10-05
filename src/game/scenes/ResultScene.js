import Phaser from 'phaser';
import { GAME_W as W, GAME_H as H, FONT } from '../config.js';
import { LEVELS } from '../../sim/data/levels.js';
import { LEVEL_LORE, RUSK, CREDITS, ENDLESS_LORE } from '../../sim/data/lore.js';
import { skyBackdrop } from '../ui/backdrop.js';
import { installBasicFx } from '../fx/PostFx.js';
import { button, panel, txt } from '../ui/kit.js';
import { starPoly } from './SelectScene.js';
import { typewriter, startLevelFlow } from '../ui/flow.js';

/** Victory / defeat screen with animated stars, stats, the level epilogue, and what to do next. */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  init(data) {
    this.r = data;
  }

  create() {
    const r = this.r;
    const sfx = this.registry.get('sfx');
    this.sfx = sfx;
    const level = LEVELS[r.level];
    const lore = LEVEL_LORE[level.id];
    const cam = this.cameras.main;
    cam.setBackgroundColor('#07050a');
    this.backdrop = skyBackdrop(this, {
      sky: r.won ? [0x0b0a1c, 0x2a2a52, 0xe0a050] : [0x14040a, 0x40101e, 0x8a2a30],
      towerX: 1030, towerH: 440, grass: true
    });
    installBasicFx(this);
    const finalWin = r.won && !r.endless && r.level === LEVELS.length - 1;

    const title = txt(this, W / 2, 96, r.endless ? 'THE WHEEL TURNS' : 'THE BEAM HOLDS', {
      fontFamily: FONT.title, fontSize: 88, color: r.won || r.endless ? '#e9c46a' : '#e05566', stroke: '#120c08', strokeThickness: 10
    }).setOrigin(0.5).setDepth(30);
    title.enableFilters();
    const glow = title.filters.internal.addGlow(r.won ? 0xffb040 : 0xff2a40, 3, 0, 1, false, 8, 10);
    glow.setPaddingOverride(null);
    this.tweens.add({ targets: glow, outerStrength: { from: 2, to: 7 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    title.setScale(1.4).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 900, ease: 'Cubic.easeOut' });
    txt(this, W / 2, 160, `${level.number}. ${level.name}`, { fontFamily: FONT.body, fontSize: 26, fontStyle: 'italic', color: '#d8ccb0' }).setOrigin(0.5).setDepth(30);

    // stars
    const g = this.add.graphics().setDepth(31);
    if (r.endless) {
      txt(this, W / 2, 232, `${r.wavesHeld}`, { fontFamily: FONT.title, fontSize: 64, color: '#f1d9a0', stroke: '#120c08', strokeThickness: 8 }).setOrigin(0.5).setDepth(31);
      txt(this, W / 2, 278, r.wavesHeld === 1 ? 'wave held' : 'waves held', { fontFamily: FONT.mono, fontSize: 14, color: '#a89a80', letterSpacing: 3 }).setOrigin(0.5).setDepth(31);
    } else for (let s = 0; s < 3; s++) starPoly(g, W / 2 - 90 + s * 90, 232, 34, 15, 0x2a2018, 1);
    if (r.won && !r.endless) {
      for (let s = 0; s < r.stars; s++) {
        this.time.delayedCall(900 + s * 520, () => {
          const x = W / 2 - 90 + s * 90;
          starPoly(g, x, 232, 34, 15, 0xffd77a, 1);
          const f = this.add.image(x, 232, 'glow').setTint(0xffd77a).setBlendMode(Phaser.BlendModes.ADD).setDepth(32).setDisplaySize(30, 30);
          this.tweens.add({ targets: f, displayWidth: 220, displayHeight: 220, alpha: 0, duration: 700, onComplete: () => f.destroy() });
          sfx?.play('upgrade', { volume: 0.7, rate: 0.9 + s * 0.15 });
          cam.shake(120, 0.003);
        });
      }
    }

    // stats
    const mins = Math.floor(r.time / 60);
    const secs = String(r.time % 60).padStart(2, '0');
    const stats = r.endless
      ? [['Waves held', `${r.wavesHeld}`], ['Best on this road', `${r.best ?? r.wavesHeld}`], ['Thieves put down', `${r.kills}`], ['Time on the road', `${mins}:${secs}`]]
      : [['Shards held', `${r.shards} / ${r.total}`], ['Thieves put down', `${r.kills}`], ['Shards recovered', `${r.recovered}`], ['Time on the road', `${mins}:${secs}`]];
    panel(this, 160, 290, 360, 190, { alpha: 0.9 }).setDepth(30);
    stats.forEach(([k, v], i) => {
      txt(this, 186, 308 + i * 42, k, { fontFamily: FONT.body, fontSize: 20, color: '#b8a888' }).setDepth(31);
      txt(this, 494, 308 + i * 42, v, { fontFamily: FONT.mono, fontSize: 22, color: '#f1e6c8' }).setOrigin(1, 0).setDepth(31);
    });

    // epilogue
    panel(this, 550, 290, 570, 190, { alpha: 0.9 }).setDepth(30);
    const body = txt(this, 576, 308, '', { fontFamily: FONT.body, fontSize: 21, fontStyle: 'italic', color: '#e8dcc0', wordWrap: { width: 520 }, lineSpacing: 4 }).setDepth(31);
    const line = r.endless ? ENDLESS_LORE : r.won ? (lore?.outro ?? RUSK.win[0]) : Phaser.Utils.Array.GetRandom(RUSK.lose);
    this.time.delayedCall(r.won ? 1400 : 500, () => typewriter(this, body, line, { cps: 42, sfx }));

    // buttons
    const by = 520;
    const btns = [];
    if (r.won && !r.endless && r.level < LEVELS.length - 1) btns.push(['Next Waystation  ▸', () => startLevelFlow(this, r.level + 1, r.difficulty)]);
    if (finalWin) btns.push(['Credits', () => this.credits()]);
    btns.push([r.endless ? 'Another Turn' : r.won ? 'Replay' : 'Try Again', () => startLevelFlow(this, r.level, r.difficulty, { skipBriefing: true, endless: !!r.endless })]);
    btns.push(['Path of the Beam', () => this.leave('Select')]);
    const bw = 300;
    const total = btns.length * bw + (btns.length - 1) * 20;
    btns.forEach(([label, fn], i) => {
      const b = button(this, W / 2 - total / 2 + i * (bw + 20), by, bw, 56, label, () => {
        sfx?.play('click', { volume: 0.7 });
        fn();
      }, { fontSize: 24, font: FONT.title });
      [b.bg, b.label, b.zone].forEach(o => o.setDepth(40));
    });

    sfx?.stopMusic();
    cam.fadeIn(900, 7, 5, 10);
    this.time.delayedCall(300, () => sfx?.playMusic('menu'));
  }

  credits() {
    const ov = this.add.rectangle(0, 0, W, H, 0x000000, 0.88).setOrigin(0).setDepth(100).setInteractive();
    const lines = CREDITS.join('\n');
    const t = txt(this, W / 2, H + 40, lines, { fontFamily: FONT.body, fontSize: 28, color: '#e8dcc0', align: 'center', lineSpacing: 12, wordWrap: { width: 800 } }).setOrigin(0.5, 0).setDepth(101);
    this.tweens.add({ targets: t, y: 120, duration: 9000, ease: 'Sine.easeOut' });
    ov.once('pointerdown', () => {
      ov.destroy();
      t.destroy();
    });
  }

  leave(scene) {
    this.cameras.main.fadeOut(500, 7, 5, 10);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene));
  }

  update(time, delta) {
    this.backdrop.update(time, delta);
  }
}
