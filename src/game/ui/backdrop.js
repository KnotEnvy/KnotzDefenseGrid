// Cinematic backdrop shared by the menu, story and map scenes.
//   Gradient game objects (sky, tower glow, Beam streaks), SpriteGPULayer (stars and foreground grass that
//   twinkle/sway on the GPU forever), Graphics silhouettes (dunes, the Tower, a gunslinger).

import Phaser from 'phaser';
import { GAME_W as W, GAME_H as H } from '../config.js';

const rr = (a, b) => a + Math.random() * (b - a);

/** Silhouette of a gunslinger (side view, facing right), baked once as a texture. */
export function ensureSilhouette(scene) {
  if (scene.textures.exists('gunslinger_sil')) return;
  const w = 150;
  const h = 300;
  const c = document.createElement('canvas');
  c.width = w * 2;
  c.height = h * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#07040a');
  grad.addColorStop(0.7, '#0b0610');
  grad.addColorStop(1, '#3a1d22');
  g.fillStyle = grad;
  // duster coat
  g.beginPath();
  g.moveTo(58, 92);
  g.quadraticCurveTo(40, 120, 38, 200);
  g.lineTo(30, 292);
  g.lineTo(62, 296);
  g.lineTo(70, 220);
  g.lineTo(84, 296);
  g.lineTo(112, 290);
  g.quadraticCurveTo(100, 170, 96, 112);
  g.quadraticCurveTo(80, 86, 58, 92);
  g.fill();
  // arm with gun, extended
  g.beginPath();
  g.moveTo(92, 108);
  g.lineTo(128, 128);
  g.lineTo(132, 136);
  g.lineTo(150, 138);
  g.lineTo(150, 146);
  g.lineTo(128, 146);
  g.lineTo(88, 128);
  g.closePath();
  g.fill();
  // head + hat
  g.beginPath();
  g.ellipse(72, 82, 12, 14, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(72, 66, 40, 7, -0.06, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(52, 64);
  g.quadraticCurveTo(54, 36, 72, 34);
  g.quadraticCurveTo(92, 36, 92, 64);
  g.closePath();
  g.fill();
  // rim light on the hat brim
  g.strokeStyle = 'rgba(255,150,90,0.55)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.ellipse(72, 66, 40, 7, -0.06, -0.3, 0.9);
  g.stroke();
  scene.textures.addCanvas('gunslinger_sil', c);
}

export function skyBackdrop(scene, { sky = [0x0b0719, 0x34193a, 0xd9703a], tower = true, silhouette = false, grass = true, stars = true, towerX = 880, towerH = 470 } = {}) {
  const out = { objs: [], update: () => {} };
  const add = o => (out.objs.push(o), o);

  // --- sky
  add(scene.add.gradient({
    bands: [
      { start: 0, end: 0.55, colorStart: sky[0], colorEnd: sky[1] },
      { start: 0.55, end: 1, colorStart: sky[1], colorEnd: sky[2], interpolation: 2 }
    ],
    shapeMode: 0, start: { x: 0.5, y: 0 }, shape: { x: 0, y: 0.82 }, dither: true
  }, W / 2, H / 2, W, H).setDepth(0));

  // --- stars: a GPU layer whose twinkle animations run forever with no per-frame code
  if (stars) {
    const N = 260;
    const layer = scene.add.spriteGPULayer('spark', N).setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
    layer.setAnimationEnabled('Sine.easeInOut', true);
    layer.setTimerResetPeriod(40000);
    const m = {};
    for (let i = 0; i < N; i++) {
      m.x = rr(0, W);
      m.y = Math.pow(Math.random(), 1.6) * H * 0.62;
      m.scaleX = m.scaleY = rr(0.25, 0.8) * 0.5;
      const dur = [1000, 2000, 2500, 4000][Math.floor(Math.random() * 4)];
      m.alpha = { base: rr(0.1, 0.35), amplitude: rr(0.3, 0.7), duration: dur, ease: 'Sine.easeInOut', yoyo: true, delay: rr(0, 4000) };
      m.tintTopLeft = m.tintTopRight = m.tintBottomLeft = m.tintBottomRight = [0xffffff, 0xcfe0ff, 0xffe6c0][i % 3];
      layer.addMember(m);
    }
    add(layer);
  }

  // --- Beams: two luminous streaks converging on the Tower, with energy flowing along them
  const beams = [];
  if (tower) {
    for (const [sx, sy] of [[-60, H * 0.78], [W + 60, H * 0.7]]) {
      const len = Math.hypot(towerX - sx, towerH * 0 + 150 - sy);
      const ang = Math.atan2(150 - sy, towerX - sx);
      const b = scene.add.gradient({
        bands: [
          { start: 0, end: 0.5, colorStart: [0, 0, 0, 0], colorEnd: [0.8, 0.95, 1, 0.55], interpolation: 2 },
          { start: 0.5, end: 1, colorStart: [0.8, 0.95, 1, 0.55], colorEnd: [0, 0, 0, 0], interpolation: 2 }
        ],
        shapeMode: 0, repeatMode: 2, start: { x: 0, y: 0.5 }, shape: { x: 0.18, y: 0 }
      }, (sx + towerX) / 2, (sy + 150) / 2, len, 5).setBlendMode(Phaser.BlendModes.ADD).setRotation(ang).setDepth(2);
      beams.push(b);
      add(b);
      const halo = scene.add.gradient({
        bands: [{ start: 0, end: 0.5, colorStart: [0, 0, 0, 0], colorEnd: [0.5, 0.85, 1, 0.12], interpolation: 2 }, { start: 0.5, end: 1, colorStart: [0.5, 0.85, 1, 0.12], colorEnd: [0, 0, 0, 0], interpolation: 2 }],
        shapeMode: 1, start: { x: 0.5, y: 0.5 }, shape: { x: 0, y: 0.5 }
      }, (sx + towerX) / 2, (sy + 150) / 2, len, 60).setBlendMode(Phaser.BlendModes.ADD).setRotation(ang).setDepth(2);
      add(halo);
    }
  }

  // --- dunes (three parallax ridges)
  const dunes = scene.add.graphics().setDepth(3);
  const ridge = (base, amp, col, seed) => {
    dunes.fillStyle(col, 1);
    dunes.beginPath();
    dunes.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) {
      const y = base + Math.sin(x * 0.006 + seed) * amp + Math.sin(x * 0.017 + seed * 2.3) * amp * 0.35;
      dunes.lineTo(x, y);
    }
    dunes.lineTo(W, H);
    dunes.closePath();
    dunes.fillPath();
  };
  ridge(H * 0.74, 22, 0x2a1730, 1.2);
  // --- the Tower
  if (tower) {
    const tx = towerX;
    const ty = H * 0.74 - 6;
    const glow = scene.add.gradient({
      bands: [
        { start: 0, end: 0.2, colorStart: [1, 0.3, 0.2, 0.7], colorEnd: [0.8, 0.15, 0.2, 0.45] },
        { start: 0.2, end: 1, colorStart: [0.8, 0.15, 0.2, 0.45], colorEnd: [0, 0, 0, 0], interpolation: 3 }
      ],
      shapeMode: 2, start: { x: 0.5, y: 0.5 }, shape: { x: 0.5, y: 0 }, dither: true
    }, tx, ty - towerH + 8, 520, 520).setBlendMode(Phaser.BlendModes.ADD).setDepth(3);
    add(glow);
    out.towerGlow = glow;
    const g = scene.add.graphics().setDepth(4);
    g.fillStyle(0x08040c, 1);
    // tapered column, slightly crooked, with a ragged crown
    g.beginPath();
    g.moveTo(tx - 54, ty);
    g.lineTo(tx - 40, ty - towerH * 0.45);
    g.lineTo(tx - 30, ty - towerH * 0.8);
    g.lineTo(tx - 34, ty - towerH * 0.93);
    g.lineTo(tx - 22, ty - towerH);
    g.lineTo(tx - 10, ty - towerH * 0.97);
    g.lineTo(tx + 2, ty - towerH * 1.02);
    g.lineTo(tx + 14, ty - towerH * 0.97);
    g.lineTo(tx + 26, ty - towerH * 0.99);
    g.lineTo(tx + 34, ty - towerH * 0.9);
    g.lineTo(tx + 32, ty - towerH * 0.78);
    g.lineTo(tx + 44, ty - towerH * 0.42);
    g.lineTo(tx + 58, ty);
    g.closePath();
    g.fillPath();
    // banding and a few lit windows
    g.lineStyle(2, 0x2b1626, 0.9);
    for (let i = 1; i < 12; i++) {
      const f = i / 12;
      const w = 54 - 22 * f;
      g.lineBetween(tx - w, ty - towerH * f * 0.92, tx + w + 4, ty - towerH * f * 0.92);
    }
    g.fillStyle(0xff8a50, 0.9);
    for (const f of [0.18, 0.31, 0.44, 0.57, 0.7, 0.82]) {
      g.fillRect(tx - 4 + Math.sin(f * 30) * 10, ty - towerH * f, 4, 7);
    }
    g.lineStyle(1.5, 0xff6a5a, 0.35);
    g.lineBetween(tx - 38, ty - towerH * 0.44, tx - 22, ty - towerH * 0.97);
    add(g);
  }
  ridge(H * 0.8, 18, 0x170c1c, 3.1);
  ridge(H * 0.9, 14, 0x0a050e, 5.4);
  add(dunes);

  if (silhouette) {
    ensureSilhouette(scene);
    add(scene.add.image(1120, H * 0.9, 'gunslinger_sil').setOrigin(0.5, 1).setScale(0.5 * 1.7).setDepth(6));
  }

  // --- foreground grass, swaying
  if (grass) {
    const N = 420;
    const layer = scene.add.spriteGPULayer('tuft', N).setDepth(7);
    layer.setAnimationEnabled('Sine.easeInOut', true);
    layer.setTimerResetPeriod(40000);
    const m = {};
    for (let i = 0; i < N; i++) {
      const x = rr(-10, W + 10);
      const y = rr(H * 0.88, H + 8);
      m.x = x;
      m.y = y;
      m.originX = 0.5;
      m.originY = 1;
      m.scaleX = m.scaleY = 0.5 + (y - H * 0.88) / 60;
      const amp = rr(0.16, 0.3);
      m.rotation = { base: rr(0.02, 0.1) - amp / 2, amplitude: amp, duration: 2000, ease: 'Sine.easeInOut', yoyo: true, delay: x * 2.4 + y };
      const c = i % 5 === 0 ? 0x2a1636 : 0x120a16;
      m.tintBottomLeft = m.tintBottomRight = 0x050207;
      m.tintTopLeft = m.tintTopRight = c;
      layer.addMember(m);
    }
    add(layer);
  }

  // slow flow on the Beam streaks, and a faint tower pulse
  out.update = (time, delta) => {
    for (const b of beams) b.offset -= delta * 0.00006;
    if (out.towerGlow) out.towerGlow.setScale(1 + 0.04 * Math.sin(time * 0.0012));
  };
  return out;
}
