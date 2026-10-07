import { COLS, ROWS } from '../grid.js';

// Maps are described as rectangle operations so they stay readable and dimension-safe.
//   rock x y w h   road x y w h   base x y w h   door id x y w h   open x y w h
export function buildMap(ops) {
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  const fill = (ch, x, y, w, h) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < COLS && j < ROWS) g[j][i] = ch;
  };
  // Boundary wall.
  fill('#', 0, 0, COLS, 1);
  fill('#', 0, ROWS - 1, COLS, 1);
  fill('#', 0, 0, 1, ROWS);
  fill('#', COLS - 1, 0, 1, ROWS);
  for (const op of ops) {
    const [kind, ...a] = op;
    if (kind === 'rock') fill('#', ...a);
    else if (kind === 'road') fill('-', ...a);
    else if (kind === 'open') fill('.', ...a);
    else if (kind === 'base') fill('B', ...a);
    else if (kind === 'door') fill(String(a[0]), ...a.slice(1));
    else throw new Error(`bad map op ${kind}`);
  }
  return g.map(r => r.join(''));
}

// ---- 1. Dry Creek: a gentle serpentine -------------------------------------------------------
export const DRY_CREEK = buildMap([
  ['door', 1, 0, 2, 1, 2], ['road', 1, 2, 2, 2],
  ['rock', 0, 5, 28, 2], // lane A / lane B divider, gap on the right
  ['rock', 4, 11, 27, 2], // lane B / lane C divider, gap on the left
  ['rock', 0, 17, 32, 3],
  ['base', 31, 14, 1, 2], ['road', 29, 14, 2, 2],
  // boulders
  ['rock', 13, 2, 2, 2], ['rock', 19, 8, 2, 2], ['rock', 9, 8, 1, 1], ['rock', 24, 14, 2, 2], ['rock', 15, 15, 1, 1],
  ['rock', 6, 1, 1, 1], ['rock', 23, 4, 1, 1]
]);

// ---- 2. Gilead's Cinder-Road: ruined city blocks, two doorways ------------------------------
export const CINDER_ROAD = buildMap([
  ['door', 1, 0, 2, 1, 3], ['road', 1, 2, 2, 3],
  ['door', 2, 0, 15, 1, 3], ['road', 1, 15, 2, 3],
  ['base', 31, 8, 1, 4], ['road', 29, 8, 2, 4],
  ['rock', 6, 5, 4, 3], ['rock', 6, 12, 4, 3],
  ['rock', 13, 1, 3, 4], ['rock', 13, 8, 3, 4], ['rock', 13, 15, 3, 4],
  ['rock', 20, 4, 4, 3], ['rock', 20, 13, 4, 3],
  ['rock', 26, 1, 3, 4], ['rock', 26, 15, 3, 4],
  ['rock', 9, 9, 1, 2], ['rock', 18, 9, 2, 2], ['rock', 23, 9, 1, 1], ['rock', 10, 2, 1, 1], ['rock', 10, 17, 1, 1]
]);

// ---- 3. Thunderclap Flats: wide open plain ---------------------------------------------------
export const THUNDERCLAP = buildMap([
  ['door', 1, 0, 8, 1, 4], ['road', 1, 8, 2, 4],
  ['base', 31, 8, 1, 4], ['road', 29, 8, 2, 4],
  ['rock', 8, 3, 3, 3], ['rock', 8, 14, 3, 3],
  ['rock', 15, 8, 3, 4], ['rock', 15, 1, 2, 2], ['rock', 15, 17, 2, 2],
  ['rock', 21, 4, 3, 3], ['rock', 21, 13, 3, 3],
  ['rock', 26, 9, 2, 2], ['rock', 5, 1, 2, 1], ['rock', 4, 18, 2, 1], ['rock', 12, 10, 1, 1], ['rock', 28, 4, 1, 1], ['rock', 28, 15, 1, 1]
]);

// ---- 4. Lud's Spur: a rail yard of switchbacks -----------------------------------------------
export const LUDS_SPUR = buildMap([
  ['door', 1, 0, 1, 1, 3], ['road', 1, 1, 2, 3],
  ['base', 31, 15, 1, 3], ['road', 29, 15, 2, 3],
  ['rock', 0, 4, 26, 2], // divider 1: gap right
  ['rock', 6, 9, 26, 2], // divider 2: gap left
  ['rock', 0, 14, 26, 2], // divider 3: gap right
  ['rock', 11, 1, 1, 2], ['rock', 19, 7, 2, 1], ['rock', 12, 12, 2, 1], ['rock', 20, 17, 1, 2], ['rock', 5, 7, 1, 1], ['rock', 5, 17, 2, 1]
]);

// ---- 5. Algul Siento: three doorways converge ------------------------------------------------
export const ALGUL = buildMap([
  ['door', 1, 0, 2, 1, 2], ['road', 1, 2, 2, 2],
  ['door', 2, 0, 9, 1, 2], ['road', 1, 9, 2, 2],
  ['door', 3, 0, 16, 1, 2], ['road', 1, 16, 2, 2],
  ['base', 31, 8, 1, 4], ['road', 29, 8, 2, 4],
  ['rock', 6, 0, 3, 5], ['rock', 6, 15, 3, 5],
  ['rock', 8, 7, 4, 1], ['rock', 8, 12, 4, 1],
  ['rock', 15, 3, 3, 3], ['rock', 15, 14, 3, 3], ['rock', 14, 9, 3, 2],
  ['rock', 22, 1, 3, 4], ['rock', 22, 15, 3, 4], ['rock', 21, 8, 2, 4],
  ['rock', 26, 6, 1, 1], ['rock', 26, 13, 1, 1]
]);
