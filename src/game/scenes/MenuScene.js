import Phaser from 'phaser';
import { GAME_W as W, GAME_H as H, FONT, COLOR } from '../config.js';
import { TITLE, SUBTITLE, TAGLINE, CREDITS } from '../../sim/data/lore.js';
import { skyBackdrop } from '../ui/backdrop.js';
import { installBasicFx } from '../fx/PostFx.js';
import { button, panel, txt, STYLE } from '../ui/kit.js';
import { loadProgress } from './BootScene.js';
import { getQuality, setQuality } from '../settings.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const sfx = this.registry.get('sfx');
    this.sfx = sfx;
    const cam = this.cameras.main;
    cam.setBackgroundColor('#07050a');
    this.backdrop = skyBackdrop(this, { towerX: 840, towerH: 480, silhouette: true });
    installBasicFx(this);

    // --- title
    const title = txt(this, 70, 78, TITLE, { fontFamily: FONT.title, fontSize: 118, color: '#e9c46a', stroke: '#2a1308', strokeThickness: 10 }).setOrigin(0, 0.5).setDepth(10);
    title.setShadow(0, 6, '#000000', 10, true, true);
    title.enableFilters();
    const glow = title.filters.internal.addGlow(0xff7a30, 3, 0, 1, false, 8, 10);
    glow.setPaddingOverride(null);
    this.tweens.add({ targets: glow, outerStrength: { from: 2, to: 6 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    txt(this, 76, 150, SUBTITLE.toUpperCase(), { fontFamily: FONT.mono, fontSize: 22, color: '#c9b890', letterSpacing: 6 }).setDepth(10);
    const tag = txt(this, 76, 188, TAGLINE, { fontFamily: FONT.body, fontSize: 30, fontStyle: 'italic', color: '#8ff3ff' }).setDepth(10);
    this.tweens.add({ targets: tag, alpha: { from: 0.55, to: 1 }, duration: 1800, yoyo: true, repeat: -1 });

    // --- buttons
    const prog = loadProgress();
    const started = Object.keys(prog).length > 0;
    const bx = 76;
    let by = 262;
    const mk = (label, fn, opts = {}) => {
      const b = button(this, bx, by, 300, 46, label, () => {
        sfx?.play('click', { volume: 0.7 });
        fn();
      }, { fontSize: 24, font: FONT.title, ...opts, onHover: () => sfx?.play('hover', { volume: 0.4 }) });
      b.bg.setDepth(10);
      b.label.setDepth(11);
      b.zone.setDepth(12);
      by += 56;
      return b;
    };
    mk(started ? 'Continue' : 'Begin the Journey', () => {
      if (started) this.go('Select');
      else this.go('Story', { title: 'The Keeping', subtitle: 'Why gunslingers exist', speaker: null, prologue: true });
    });
    mk('The Path of the Beam', () => this.go('Select'));
    mk('How to Play', () => this.showHelp());
    this.soundBtn = mk(sfx?.muted ? 'Sound: Off' : 'Sound: On', () => {
      const muted = sfx?.toggleMute();
      this.soundBtn.setLabel(muted ? 'Sound: Off' : 'Sound: On');
    }, { fontSize: 20 });
    this.fxBtn = mk(`Effects: ${getQuality() === 'low' ? 'Low' : 'High'}`, () => {
      const next = getQuality() === 'low' ? 'high' : 'low';
      setQuality(next);
      this.fxBtn.setLabel(`Effects: ${next === 'low' ? 'Low' : 'High'}  (next scene)`);
    }, { fontSize: 20 });
    if (started) {
      mk('Start Over', () => {
        try {
          localStorage.removeItem('beamfall.progress');
        } catch {
          /* ignore */
        }
        this.registry.set('progress', {});
        this.go('Story', { title: 'The Keeping', subtitle: 'Why gunslingers exist', speaker: null, prologue: true });
      }, { fontSize: 18 });
    }

    txt(this, 76, H - 56, CREDITS[3], { fontFamily: FONT.body, fontSize: 13, color: '#8a7a60', wordWrap: { width: 540 } }).setDepth(10);
    txt(this, 76, H - 28, 'Built with Phaser 4  ·  Long days and pleasant nights.', { fontFamily: FONT.mono, fontSize: 12, color: '#7a6a50' }).setDepth(10);

    this.help = this.buildHelp();
    sfx?.playMusic('menu');
    cam.fadeIn(900, 7, 5, 10);
    this.tweens.add({ targets: cam, zoom: { from: 1.0, to: 1.035 }, duration: 14000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // distant lightning
    const flash = () => {
      this.time.delayedCall(Phaser.Math.Between(7000, 14000), () => {
        if (!this.scene.isActive()) return;
        cam.flash(160, 210, 200, 255);
        this.time.delayedCall(180, () => cam.flash(260, 255, 230, 255));
        this.time.delayedCall(700, () => sfx?.play('thunder', { volume: 0.5 }));
        flash();
      });
    };
    flash();
  }

  buildHelp() {
    const objs = [];
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0).setInteractive().setDepth(100);
    const box = panel(this, 250, 70, 780, 580).setDepth(101);
    const lines = [
      ['HOW TO PLAY', 'title', 34],
      ['The Red Tithe pours from a Doorway to steal the Beam-shards at your Waystation, then runs home through the same Doorway. Every shard that escapes is a piece of the Beam gone for good.', 'body', 19],
      ['•  Kill the thief carrying a shard. It drops the shard; leave it a moment and it drifts home.', 'body', 18],
      ['•  Click a post (or press 1-8), then click the ground. Posts are 2×2 cells. Right-click cancels.', 'body', 18],
      ['•  Posts reshape the road. Lengthen it, never seal it: the game will refuse a build that closes the way.', 'body', 18],
      ['•  Spend wisely: banked silver earns interest. Call waves early (Space) for a bonus.', 'body', 18],
      ['•  Armor shrugs off small bullets. Mix posts: Sixguns, Beams, mortars, lightning, scatterguns, wards.', 'body', 18],
      ['•  U upgrade · S sell · T target mode · F speed · H show path · P pause · M mute', 'mono', 16]
    ];
    let y = 100;
    for (const [s, kind, size] of lines) {
      const t = txt(this, 290, y, s, { ...(STYLE[kind]), fontSize: size, wordWrap: { width: 700 } }).setDepth(102);
      objs.push(t);
      y += t.height + 14;
    }
    const close = button(this, 560, 590, 160, 40, 'Back', () => this.toggleHelp(false), { fontSize: 20 });
    [close.bg, close.label, close.zone].forEach(o => o.setDepth(103));
    const all = [dim, box, ...objs, close.bg, close.label, close.zone];
    all.forEach(o => o.setVisible(false));
    close.zone.disableInteractive();
    dim.disableInteractive();
    return { all, dim, close };
  }

  toggleHelp(v) {
    this.help.all.forEach(o => o.setVisible(v));
    if (v) {
      this.help.close.zone.setInteractive();
      this.help.dim.setInteractive();
    } else {
      this.help.close.zone.disableInteractive();
      this.help.dim.disableInteractive();
    }
  }

  showHelp() {
    this.toggleHelp(true);
  }

  go(scene, data) {
    this.cameras.main.fadeOut(600, 7, 5, 10);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene, data));
  }

  update(time, delta) {
    this.backdrop.update(time, delta);
  }
}
