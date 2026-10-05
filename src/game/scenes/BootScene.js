import Phaser from 'phaser';
import { GAME_W, GAME_H, FONT, COLOR } from '../config.js';
import { bakeSvgTextures, makeFxTextures } from '../art/textures.js';
import { Sfx } from '../audio/Sfx.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.cameras.main.setBackgroundColor('#07050a');
    this.add.text(GAME_W / 2, GAME_H / 2 - 30, 'BEAMFALL', { fontFamily: FONT.title, fontSize: 64, color: '#d6b25e' }).setOrigin(0.5);
    const status = this.add.text(GAME_W / 2, GAME_H / 2 + 36, 'Stoking the fire…', { fontFamily: FONT.body, fontSize: 22, color: '#a89a80', fontStyle: 'italic' }).setOrigin(0.5);
    const bar = this.add.rectangle(GAME_W / 2 - 150, GAME_H / 2 + 76, 0, 6, COLOR.gold).setOrigin(0, 0.5);
    this.add.rectangle(GAME_W / 2, GAME_H / 2 + 76, 300, 6, 0xffffff, 0.08);

    (async () => {
      makeFxTextures(this);
      await bakeSvgTextures(this, p => (bar.width = 300 * p));
      status.setText('Long days and pleasant nights.');
      // Synthesise the soundscape (no audio files ship with the game).
      this.registry.set('sfx', new Sfx(this.game));
      await this.registry.get('sfx').bake();
      this.registry.set('progress', loadProgress());
      this.cameras.main.fadeOut(350, 7, 5, 10);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        const q = new URLSearchParams(location.search);
        if (q.has('level')) this.scene.start('Game', { level: Number(q.get('level')) - 1, difficulty: q.get('diff') || 'normal' });
        else this.scene.start('Menu');
      });
    })();
  }
}

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem('beamfall.progress') || '{}');
  } catch {
    return {};
  }
}

export function saveProgress(p) {
  try {
    localStorage.setItem('beamfall.progress', JSON.stringify(p));
  } catch {
    /* private mode etc.: progress just won't persist */
  }
}
