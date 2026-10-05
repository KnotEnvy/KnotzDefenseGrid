// Procedural terrain painter. Produces an albedo canvas and a matching normal-map canvas for a level so
// that Phaser 4's dynamic lights (muzzle flashes, campfires, the Beam) rake across real relief.
// No external assets: value-noise fields, cliffs from a blurred rock mask, pebbles, cracks, roads and the
// Waystation platform are all painted here.

import { COLS, ROWS, CELL, K, Grid } from '../../sim/grid.js';

export const TERRAIN_W = COLS * CELL;
export const TERRAIN_H = ROWS * CELL;

function mulberry32(a) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class ValueNoise {
  constructor(seed) {
    const r = mulberry32(seed);
    this.p = new Uint8Array(512);
    const perm = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];
    this.v = new Float32Array(256);
    for (let i = 0; i < 256; i++) this.v[i] = r();
  }

  at(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const w = yf * yf * (3 - 2 * yf);
    const p = this.p;
    const a = this.v[p[(p[xi & 255] + yi) & 255]];
    const b = this.v[p[(p[(xi + 1) & 255] + yi) & 255]];
    const c = this.v[p[(p[xi & 255] + yi + 1) & 255]];
    const d = this.v[p[(p[(xi + 1) & 255] + yi + 1) & 255]];
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  }

  fbm(x, y, oct = 4) {
    let amp = 0.5;
    let f = 1;
    let s = 0;
    let n = 0;
    for (let i = 0; i < oct; i++) {
      s += amp * this.at(x * f, y * f);
      n += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return s / n;
  }
}

const hex = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/** Box blur (separable) of a Float32Array field, radius in px. */
function blurField(src, w, h, r) {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const k = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[y * w + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc / k;
      acc += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / k;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/**
 * @param {object} level   level definition (map + palette)
 * @param {number} seed
 * @returns {{albedo:HTMLCanvasElement, normal:HTMLCanvasElement, rockCells:{cx:number,cy:number}[]}}
 */
export function paintTerrain(level, seed = 1) {
  const grid = new Grid(level.map);
  const W = TERRAIN_W;
  const H = TERRAIN_H;
  const noise = new ValueNoise(seed * 7919 + 13);
  const noise2 = new ValueNoise(seed * 104729 + 7);
  const rand = mulberry32(seed * 31 + 5);
  const pal = level.palette;
  const groundMid = hex(pal.ground);
  const groundDark = mix(groundMid, [20, 12, 8], 0.5);
  const groundLight = mix(groundMid, hex(pal.dust), 0.55);
  const rockDark = [52, 42, 34];
  const rockLight = [150, 128, 100];

  // --- masks ---------------------------------------------------------------------------------
  const rockMask = new Float32Array(W * H);
  const roadMask = new Float32Array(W * H);
  const baseMask = new Float32Array(W * H);
  const rockCells = [];
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      const k = grid.kind[cy * COLS + cx];
      const fillTo = k === K.ROCK ? rockMask : k === K.ROAD || k === K.SPAWN ? roadMask : k === K.BASE ? baseMask : null;
      if (k === K.ROCK) rockCells.push({ cx, cy });
      if (!fillTo) continue;
      for (let y = cy * CELL; y < (cy + 1) * CELL; y++) for (let x = cx * CELL; x < (cx + 1) * CELL; x++) fillTo[y * W + x] = 1;
    }
  }
  // Organic cliff edges: blurred mask + noise, thresholded later.
  const rockSoft = blurField(rockMask, W, H, 9);
  const roadSoft = blurField(roadMask, W, H, 6);
  const baseSoft = blurField(baseMask, W, H, 8);
  const shadowMask = blurField(rockMask, W, H, 12);

  // --- albedo + height ----------------------------------------------------------------------
  const albedo = document.createElement('canvas');
  albedo.width = W;
  albedo.height = H;
  const actx = albedo.getContext('2d');
  const img = actx.createImageData(W, H);
  const d = img.data;
  const height = new Float32Array(W * H);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const n1 = noise.fbm(x * 0.012, y * 0.012, 5);
      const n2 = noise2.fbm(x * 0.06, y * 0.06, 3);
      const ripple = Math.sin((x * 0.035 + y * 0.012 + n1 * 9) * 1.3) * 0.5 + 0.5;
      let t = clamp(n1 * 1.1 + (n2 - 0.5) * 0.35 + (ripple - 0.5) * 0.18);
      let col = mix(groundDark, groundLight, t);
      let h = t * 0.5 + ripple * 0.08;

      // roads: packed, lighter dirt with faint ruts
      const road = roadSoft[i];
      if (road > 0.02) {
        const rut = Math.sin(y * 0.55 + n1 * 3) * 0.5 + 0.5;
        const dirt = mix([150, 126, 94], [190, 164, 124], clamp(n2 * 1.2 + rut * 0.12));
        col = mix(col, dirt, clamp(road * 0.85));
        h = h * (1 - road) + (0.35 + n2 * 0.1) * road;
      }

      // cliffs
      const edgeNoise = (noise2.fbm(x * 0.09, y * 0.09, 3) - 0.5) * 0.34;
      const rf = rockSoft[i] + edgeNoise;
      if (rf > 0.5) {
        const depth = clamp((rf - 0.5) / 0.5);
        const strata = noise.fbm(x * 0.05, y * 0.07, 4);
        const rt = clamp(strata * 0.9 + n2 * 0.4);
        let rc = mix(rockDark, rockLight, rt * (0.35 + depth * 0.65));
        // top-lit: lighter on the top-left rim, darker on the bottom-right
        const rim = clamp(1 - depth * 1.6);
        rc = mix(rc, [30, 24, 20], rim * 0.55);
        col = rc;
        h = 0.55 + depth * 0.9 + rt * 0.2;
      } else {
        // soft cast shadow from cliffs on the open ground
        const sh = clamp(shadowMask[i] * 1.1 - 0.05);
        const sx = shadowMask[clamp(i + 6 * W + 5, 0, W * H - 1)] || 0;
        col = mix(col, [14, 9, 8], clamp(Math.max(sh * 0.5, sx * 0.55)) * 0.6);
      }

      // Waystation platform
      const bs = baseSoft[i];
      if (bs > 0.04) {
        const sx = Math.sin(x * 0.4) * Math.sin(y * 0.4);
        const stone = mix([88, 80, 70], [132, 122, 108], clamp(n2 + sx * 0.04));
        col = mix(col, stone, clamp(bs * 1.2));
        h = h * (1 - bs) + (0.62 + n2 * 0.06) * bs;
      }

      const o = i * 4;
      d[o] = col[0];
      d[o + 1] = col[1];
      d[o + 2] = col[2];
      d[o + 3] = 255;
      height[i] = h;
    }
  }
  actx.putImageData(img, 0, 0);

  // --- hand-painted details -----------------------------------------------------------------
  const openCell = (cx, cy) => grid.inside(cx, cy) && grid.kind[cy * COLS + cx] === K.OPEN;

  // pebbles
  for (let n = 0; n < 520; n++) {
    const x = rand() * W;
    const y = rand() * H;
    if (!openCell(Math.floor(x / CELL), Math.floor(y / CELL))) continue;
    const r = 1.2 + rand() * 3.2;
    const g = 90 + rand() * 70;
    actx.fillStyle = 'rgba(10,6,4,0.35)';
    actx.beginPath();
    actx.ellipse(x + 1.2, y + 1.6, r * 1.15, r * 0.8, 0, 0, Math.PI * 2);
    actx.fill();
    actx.fillStyle = `rgb(${g + 20},${g + 4},${g - 18})`;
    actx.beginPath();
    actx.ellipse(x, y, r, r * 0.78, rand() * 3, 0, Math.PI * 2);
    actx.fill();
    actx.fillStyle = 'rgba(255,240,210,0.35)';
    actx.beginPath();
    actx.ellipse(x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.28, 0, 0, Math.PI * 2);
    actx.fill();
  }

  // cracks
  actx.lineCap = 'round';
  for (let n = 0; n < 34; n++) {
    let x = rand() * W;
    let y = rand() * H;
    if (!openCell(Math.floor(x / CELL), Math.floor(y / CELL))) continue;
    let a = rand() * Math.PI * 2;
    actx.strokeStyle = 'rgba(18,10,6,0.42)';
    actx.lineWidth = 1 + rand() * 1.3;
    actx.beginPath();
    actx.moveTo(x, y);
    for (let s = 0; s < 7; s++) {
      a += (rand() - 0.5) * 0.9;
      x += Math.cos(a) * (9 + rand() * 10);
      y += Math.sin(a) * (9 + rand() * 10);
      actx.lineTo(x, y);
    }
    actx.stroke();
  }

  // Waystation: stone circle with sigul inlay on each base cell block
  const bx0 = Math.min(...grid.baseCells.map(c => c.cx)) * CELL;
  const bx1 = (Math.max(...grid.baseCells.map(c => c.cx)) + 1) * CELL;
  const by0 = Math.min(...grid.baseCells.map(c => c.cy)) * CELL;
  const by1 = (Math.max(...grid.baseCells.map(c => c.cy)) + 1) * CELL;
  const bcx = (bx0 + bx1) / 2;
  const bcy = (by0 + by1) / 2;
  actx.save();
  actx.strokeStyle = 'rgba(120,230,215,0.55)';
  actx.lineWidth = 2;
  actx.shadowColor = 'rgba(100,240,220,0.7)';
  actx.shadowBlur = 6;
  const rr = Math.max(bx1 - bx0, by1 - by0) * 0.5 + 6;
  actx.beginPath();
  actx.arc(bcx, bcy, Math.min(rr, (by1 - by0) / 2 + 10), 0, Math.PI * 2);
  actx.stroke();
  actx.beginPath();
  actx.moveTo(bcx - 16, by0 - 18);
  actx.lineTo(bcx - 16, by1 + 18);
  actx.moveTo(bcx - 16, by0 + 2);
  actx.lineTo(bx1, by0 + 2);
  actx.moveTo(bcx - 16, by1 - 2);
  actx.lineTo(bx1, by1 - 2);
  actx.stroke();
  actx.restore();

  // Doorways: a dark scar in the ground
  for (const cells of grid.spawnCells.values()) {
    const sx = (cells.reduce((a, c) => a + c.cx, 0) / cells.length + 0.5) * CELL;
    const sy = (cells.reduce((a, c) => a + c.cy, 0) / cells.length + 0.5) * CELL;
    const rad = Math.max(CELL * 1.4, (cells.length * CELL) / 2 + 10);
    const g = actx.createRadialGradient(sx, sy, 4, sx, sy, rad);
    g.addColorStop(0, 'rgba(12,2,16,0.95)');
    g.addColorStop(0.6, 'rgba(40,8,30,0.7)');
    g.addColorStop(1, 'rgba(40,8,30,0)');
    actx.fillStyle = g;
    actx.beginPath();
    actx.ellipse(sx, sy, rad * 0.7, rad, 0, 0, Math.PI * 2);
    actx.fill();
    actx.strokeStyle = 'rgba(190,60,90,0.35)';
    actx.lineWidth = 1.4;
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + rand() * 0.4;
      actx.beginPath();
      actx.moveTo(sx + Math.cos(a) * rad * 0.35, sy + Math.sin(a) * rad * 0.5);
      actx.lineTo(sx + Math.cos(a) * rad * (0.75 + rand() * 0.3), sy + Math.sin(a) * rad * (0.95 + rand() * 0.3));
      actx.stroke();
    }
  }

  // --- normal map from the (blurred) heightfield -------------------------------------------
  // Pebbles/cracks drawn above are part of the albedo only; fold their luminance back into height.
  const ad = actx.getImageData(0, 0, W, H).data;
  for (let i = 0; i < W * H; i++) {
    const lum = (ad[i * 4] * 0.3 + ad[i * 4 + 1] * 0.59 + ad[i * 4 + 2] * 0.11) / 255;
    height[i] = height[i] * 0.8 + lum * 0.45;
  }
  const hs = blurField(height, W, H, 1);
  const normal = document.createElement('canvas');
  normal.width = W;
  normal.height = H;
  const nctx = normal.getContext('2d');
  const nimg = nctx.createImageData(W, H);
  const nd = nimg.data;
  const strength = 5.5;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const xl = hs[y * W + Math.max(0, x - 1)];
      const xr = hs[y * W + Math.min(W - 1, x + 1)];
      const yu = hs[Math.max(0, y - 1) * W + x];
      const yd = hs[Math.min(H - 1, y + 1) * W + x];
      // Surface normal with x to the right and y UP the screen (OpenGL convention).
      let nx = -(xr - xl) * strength;
      let ny = (yd - yu) * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const o = (y * W + x) * 4;
      nd[o] = (nx * 0.5 + 0.5) * 255;
      nd[o + 1] = (ny * 0.5 + 0.5) * 255;
      nd[o + 2] = (nz * 0.5 + 0.5) * 255;
      nd[o + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);

  return { albedo, normal, rockCells };
}

/** Greedy decomposition of rock cells into maximal rectangles (for placing ruin sprites). */
export function rockRects(grid) {
  const used = new Uint8Array(COLS * ROWS);
  const rects = [];
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      const i = cy * COLS + cx;
      if (used[i] || grid.kind[i] !== K.ROCK) continue;
      let w = 1;
      while (cx + w < COLS && grid.kind[cy * COLS + cx + w] === K.ROCK && !used[cy * COLS + cx + w]) w++;
      let h = 1;
      outer: for (; cy + h < ROWS; h++) {
        for (let x = cx; x < cx + w; x++) if (grid.kind[(cy + h) * COLS + x] !== K.ROCK || used[(cy + h) * COLS + x]) break outer;
      }
      for (let y = cy; y < cy + h; y++) for (let x = cx; x < cx + w; x++) used[y * COLS + x] = 1;
      rects.push({ cx, cy, w, h });
    }
  }
  return rects;
}
