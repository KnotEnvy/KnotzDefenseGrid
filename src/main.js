import Phaser from 'phaser';
import '@fontsource/rye';
import '@fontsource/im-fell-english';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/special-elite';

import { GAME_W, GAME_H } from './game/config.js';
import { BootScene } from './game/scenes/BootScene.js';
import { MenuScene } from './game/scenes/MenuScene.js';
import { StoryScene } from './game/scenes/StoryScene.js';
import { SelectScene } from './game/scenes/SelectScene.js';
import { GameScene } from './game/scenes/GameScene.js';
import { HudScene } from './game/scenes/HudScene.js';
import { ResultScene } from './game/scenes/ResultScene.js';

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function main() {
  const app = document.getElementById('app');
  if (!hasWebGL()) {
    app.innerHTML = '<div id="nogl"><h2>BEAMFALL needs WebGL</h2><p>This game is built on Phaser 4\'s WebGL renderer (dynamic lights, filters, GPU layers). Please enable hardware acceleration or try a current desktop browser.</p></div>';
    return;
  }
  // Make sure the display fonts are ready before any Text object measures them.
  const sample = 'AaBbCc0123 .,:;!?-—•…’“”';
  await Promise.all(
    ['"Rye"', '"IM Fell English"', 'italic "IM Fell English"', '"Special Elite"'].map(f => document.fonts.load(`24px ${f}`, sample).catch(() => null))
  );

  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'app',
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#07050a',
    banner: false,
    disableContextMenu: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: GAME_W, height: GAME_H },
    render: { antialias: true, pixelArt: false, roundPixels: false, maxLights: 20, pathDetailThreshold: 0.5 },
    fps: { target: 60, smoothStep: true },
    input: { activePointers: 2 },
    scene: [BootScene, MenuScene, StoryScene, SelectScene, GameScene, HudScene, ResultScene]
  });
  // Handy for debugging and the Playwright smoke tests.
  window.__beam = { game, Phaser };
}

main();
