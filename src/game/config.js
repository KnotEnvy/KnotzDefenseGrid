// Shared constants for the Phaser view layer.
import { CELL } from '../sim/grid.js';

export const GAME_W = 1280;
export const GAME_H = 720;

// The playfield is 32x20 cells (1024x640 px) placed below a 40px top bar. The main camera is scrolled
// so that world coordinates == sim (field-local) coordinates.
export const FIELD = { x: 0, y: 40, w: 1024, h: 640 };
export const PANEL_X = FIELD.w; // right-hand HUD panel starts here

export const TEX_SCALE = 2; // SVG sprites are rasterised at 2x and displayed at 1/2
export const SC = 1 / TEX_SCALE;

export const FONT = {
  title: '"Rye", "Georgia", serif',
  body: '"IM Fell English", "Georgia", serif',
  mono: '"Special Elite", "Courier New", monospace'
};

export const COLOR = {
  bone: 0xe8dcc0,
  boneCss: '#e8dcc0',
  gold: 0xd6b25e,
  goldCss: '#d6b25e',
  ink: 0x120c08,
  inkCss: '#120c08',
  leather: 0x6b4a2b,
  panel: 0x1a120d,
  panelEdge: 0x6b4a2b,
  beam: 0x8ff3ff,
  beamCss: '#8ff3ff',
  crimson: 0xc0283a,
  crimsonCss: '#e05566',
  good: 0x7ddc8a,
  bad: 0xe05050,
  silver: 0xdfe6ee
};

export const DEPTH = {
  ground: 0,
  decals: 3,
  grass: 5,
  rocks: 8,
  grid: 12,
  path: 13,
  postBase: 20,
  postHead: 24,
  shard: 30,
  enemy: 40,
  fly: 55,
  fx: 60,
  beam: 62,
  fog: 80,
  hud: 100
};

export { CELL };
