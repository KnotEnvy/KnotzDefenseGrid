// Bakes every texture the game needs at boot: SVG sprites (rasterised at TEX_SCALE), glow/particle
// sprites drawn with canvas gradients, and per-level terrain (+ normal map).

import { buildSvgs } from './svgs.js';
import { paintTerrain } from './terrain.js';
import { TEX_SCALE } from '../config.js';

async function bakeSvg(scene, { key, w, h, svg }) {
  if (scene.textures.exists(key)) return;
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement('canvas');
  c.width = w * TEX_SCALE;
  c.height = h * TEX_SCALE;
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  scene.textures.addCanvas(key, c);
}

export async function bakeSvgTextures(scene, onProgress) {
  const items = buildSvgs();
  let done = 0;
  await Promise.all(
    items.map(async it => {
      await bakeSvg(scene, it);
      onProgress?.(++done / items.length);
    })
  );
}

const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

function radial(scene, key, size, stops) {
  if (scene.textures.exists(key)) return;
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  scene.textures.addCanvas(key, c);
}

/** Glow, spark, smoke, flare etc: white canvas sprites that are tinted/blended at use. */
export function makeFxTextures(scene) {
  radial(scene, 'glow', 128, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.55)'], [0.6, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']]);
  radial(scene, 'glow_hard', 64, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]);
  radial(scene, 'spark', 16, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]);
  radial(scene, 'puff', 64, [[0, 'rgba(255,255,255,0.8)'], [0.5, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);

  if (!scene.textures.exists('flare')) {
    const c = canvas(96, 96);
    const ctx = c.getContext('2d');
    ctx.translate(48, 48);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 48);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.2, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? 46 : 12;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    scene.textures.addCanvas('flare', c);
  }

  // Swaying devil-grass blade (white: tinted per member on the GPU layer). 16x32 is a POT-friendly size.
  if (!scene.textures.exists('tuft')) {
    const c = canvas(32, 64);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    const blade = (x, lean, h, w) => {
      ctx.beginPath();
      ctx.moveTo(x - w, 64);
      ctx.quadraticCurveTo(x - w * 0.4 + lean * 0.4, 64 - h * 0.55, x + lean, 64 - h);
      ctx.quadraticCurveTo(x + w * 0.4 + lean * 0.4, 64 - h * 0.55, x + w, 64);
      ctx.closePath();
      ctx.fill();
    };
    blade(16, -7, 54, 3.6);
    blade(12, -12, 40, 3);
    blade(21, 9, 46, 3.2);
    blade(17, 3, 34, 2.6);
    scene.textures.addCanvas('tuft', c);
  }

  // A thin soft line used for beams/tracers when drawn as an image.
  radial(scene, 'dot', 8, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
}

/** Paint + register a level's terrain with its normal map. Returns the texture key. */
export function makeTerrainTexture(scene, level) {
  // endless reuses its campaign level's map, palette and number, so it reuses the painted terrain too
  const id = level.baseId ?? level.id;
  const key = `terrain_${id}`;
  if (scene.textures.exists(key)) return { key, rockCells: scene.registry.get(`rocks_${id}`) };
  const { albedo, normal, rockCells } = paintTerrain(level, level.number * 17 + 3);
  const tex = scene.textures.addCanvas(key, albedo);
  tex.setDataSource(normal);
  scene.registry.set(`rocks_${id}`, rockCells);
  return { key, rockCells };
}
