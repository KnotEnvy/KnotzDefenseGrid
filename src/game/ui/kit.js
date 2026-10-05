// Tiny UI kit for the HUD and menus: parchment-and-leather panels and buttons built from Phaser shapes.
import Phaser from 'phaser';
import { FONT, COLOR } from '../config.js';

export const STYLE = {
  title: { fontFamily: FONT.title, color: COLOR.goldCss },
  body: { fontFamily: FONT.body, color: COLOR.boneCss },
  mono: { fontFamily: FONT.mono, color: COLOR.boneCss }
};

export const txt = (scene, x, y, str, style = {}) =>
  scene.add.text(x, y, str, { resolution: 2, ...style });

/** Only touches the Text object (which re-renders its canvas) when the string actually changed. */
export function setText(t, str) {
  if (t._last !== str) {
    t._last = str;
    t.setText(str);
  }
}

export function panel(scene, x, y, w, h, { fill = 0x1a120d, alpha = 0.96, edge = 0x6b4a2b, radius = 8 } = {}) {
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha).fillRoundedRect(x, y, w, h, radius);
  g.fillStyle(0xffffff, 0.03).fillRoundedRect(x + 2, y + 2, w - 4, (h - 4) / 2, { tl: radius - 2, tr: radius - 2, bl: 0, br: 0 });
  g.lineStyle(2, edge, 1).strokeRoundedRect(x, y, w, h, radius);
  g.lineStyle(1, 0x000000, 0.6).strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, radius - 2);
  return g;
}

/**
 * A rounded button. Returns { zone, bg, label, setEnabled(bool), setLabel(str), on(fn) }.
 * `opts`: fontSize, color, fill, edge, font
 */
export function button(scene, x, y, w, h, label, onClick, opts = {}) {
  const { fontSize = 16, fill = 0x2b1d12, edge = 0x8a6a3c, color = COLOR.boneCss, font = FONT.body, hover = 0x3d2918, radius = 7 } = opts;
  const bg = scene.add.graphics();
  const t = txt(scene, x + w / 2, y + h / 2, label, { fontFamily: font, fontSize, color, align: 'center' }).setOrigin(0.5);
  const zone = scene.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
  const state = { enabled: true, hover: false };
  const draw = () => {
    bg.clear();
    const f = !state.enabled ? 0x1a1410 : state.hover ? hover : fill;
    bg.fillStyle(f, 1).fillRoundedRect(x, y, w, h, radius);
    bg.fillStyle(0xffffff, state.enabled ? 0.05 : 0.01).fillRoundedRect(x + 2, y + 2, w - 4, h / 2 - 2, radius - 2);
    bg.lineStyle(2, state.enabled ? (state.hover ? 0xffe08a : edge) : 0x4a3a28, 1).strokeRoundedRect(x, y, w, h, radius);
    t.setAlpha(state.enabled ? 1 : 0.4);
  };
  draw();
  zone.on('pointerover', () => {
    state.hover = true;
    draw();
    opts.onHover?.();
  });
  zone.on('pointerout', () => {
    state.hover = false;
    draw();
    opts.onOut?.();
  });
  zone.on('pointerdown', (p, lx, ly, ev) => {
    ev?.stopPropagation?.();
    if (state.enabled) onClick?.();
  });
  return {
    zone, bg, label: t, state,
    setEnabled(v) {
      if (state.enabled !== v) {
        state.enabled = v;
        draw();
      }
    },
    setLabel(s) {
      setText(t, s);
    },
    setVisible(v) {
      bg.setVisible(v);
      t.setVisible(v);
      if (v) zone.setInteractive();
      else zone.disableInteractive();
    },
    destroy() {
      bg.destroy();
      t.destroy();
      zone.destroy();
    }
  };
}

export const fmt = n => (Math.abs(n) >= 100 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString());
export const clamp = Phaser.Math.Clamp;
