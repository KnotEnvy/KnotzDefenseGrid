import Phaser from 'phaser';
import { GAME_W as W, GAME_H as H, FONT } from '../config.js';
import { PROLOGUE, PROLOGUE_FINAL } from '../../sim/data/lore.js';
import { skyBackdrop } from '../ui/backdrop.js';
import { installBasicFx } from '../fx/PostFx.js';
import { button, panel, txt } from '../ui/kit.js';
import { typewriter } from '../ui/flow.js';

/** Typewriter story slides: the prologue (why gunslingers exist), level briefings and epilogues. */
export class StoryScene extends Phaser.Scene {
  constructor() {
    super('Story');
  }

  init(data) {
    this.data0 = data;
    // Phaser reuses this instance for every scene.start('Story'): without the reset, the briefing that follows the
    // prologue starts with leaving=true and ignores every click, key and the Skip button.
    this.leaving = false;
  }

  create() {
    const d = this.data0;
    const sfx = this.registry.get('sfx');
    this.sfx = sfx;
    const prologue = !!d.prologue;
    this.slides = prologue ? [...PROLOGUE, PROLOGUE_FINAL] : d.slides;
    this.next = d.next ?? { scene: 'Select' };
    this.idx = 0;
    const cam = this.cameras.main;
    cam.setBackgroundColor('#07050a');
    this.backdrop = skyBackdrop(this, { sky: d.palette?.sky ?? [0x07040f, 0x1c0f2a, 0x6a2a3a], tower: prologue || !!d.epilogue, silhouette: false, towerX: 1020, towerH: 400 });
    installBasicFx(this);

    // dim the lower half so the text reads
    const dim = this.add.graphics().setDepth(20);
    dim.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.85, 0.85).fillRect(0, H * 0.45, W, H * 0.55);

    txt(this, 80, 40, (d.title ?? '').toUpperCase(), { fontFamily: FONT.title, fontSize: 30, color: '#e9c46a', stroke: '#120c08', strokeThickness: 5 }).setDepth(30);
    if (d.subtitle) txt(this, 82, 80, d.subtitle, { fontFamily: FONT.body, fontSize: 20, fontStyle: 'italic', color: '#b8a888' }).setDepth(30);

    const px = 110;
    const py = 438;
    this.box = panel(this, px, py, W - 220, 240, { alpha: 0.9 }).setDepth(30);
    if (d.speaker) {
      txt(this, px + 28, py + 16, d.speaker.toUpperCase(), { fontFamily: FONT.mono, fontSize: 16, color: '#8ff3ff', letterSpacing: 3 }).setDepth(31);
    }
    this.body = txt(this, px + 28, py + (d.speaker ? 48 : 30), '', { fontFamily: FONT.body, fontSize: 27, color: '#eadfc4', wordWrap: { width: W - 220 - 56 }, lineSpacing: 6 }).setDepth(31);
    this.hint = txt(this, W - 150, py + 214, 'click to continue ▸', { fontFamily: FONT.mono, fontSize: 14, color: '#a89a80' }).setOrigin(1, 0.5).setDepth(31).setAlpha(0);
    this.counter = txt(this, px + 28, py + 214, '', { fontFamily: FONT.mono, fontSize: 13, color: '#7a6a50' }).setOrigin(0, 0.5).setDepth(31);
    this.tweens.add({ targets: this.hint, alpha: { from: 0.2, to: 1 }, duration: 800, yoyo: true, repeat: -1 });

    const skip = button(this, W - 130, 22, 100, 30, 'Skip ▸▸', () => this.finish(), { fontSize: 14, font: FONT.mono });
    [skip.bg, skip.label, skip.zone].forEach(o => o.setDepth(40));

    this.input.on('pointerdown', () => this.advance());
    this.input.keyboard.on('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') this.advance();
      else if (e.key === 'Escape') this.finish();
    });
    sfx?.playMusic('menu');
    cam.fadeIn(700, 7, 5, 10);
    this.show();
  }

  show() {
    const line = this.slides[this.idx];
    const last = this.idx === this.slides.length - 1 && this.data0.prologue;
    this.body.setFontFamily(last ? FONT.title : FONT.body).setFontSize(last ? 54 : 27).setColor(last ? '#8ff3ff' : '#eadfc4');
    this.counter.setText(`${this.idx + 1} / ${this.slides.length}`);
    this.typing = typewriter(this, this.body, line, { cps: last ? 12 : 58, sfx: this.sfx, onDone: () => (this.hint.setVisible(true)) });
    this.hint.setVisible(false);
  }

  advance() {
    if (this.leaving) return;
    if (!this.typing.done) {
      this.typing.skip();
      return;
    }
    this.sfx?.play('click', { volume: 0.4 });
    if (this.idx >= this.slides.length - 1) this.finish();
    else {
      this.idx++;
      this.show();
    }
  }

  finish() {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(600, 7, 5, 10);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.next.scene, this.next.data));
  }

  update(time, delta) {
    this.backdrop.update(time, delta);
  }
}
