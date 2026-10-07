// Sprite contact sheet: renders every hand-authored SVG sprite (src/game/art/svgs.js) on a labelled grid.
// Needs no dev server, so it is the fastest way to iterate on a sprite.
//
//   npm run sheet                                 # all sprites, 3x  -> tools/out/sheet.png
//   npm run sheet -- --only=enemy_,post_beam      # keys containing any of these substrings
//   npm run sheet -- --scale=5 --out=my.png

import fs from 'node:fs';
import path from 'node:path';
import { buildSvgs } from '../src/game/art/svgs.js';
import { launch, OUT_DIR } from './lib.mjs';

const arg = (name, fallback) => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const scale = Number(arg('scale', 3));
const only = arg('only', '')?.split(',').filter(Boolean);
const out = path.resolve(arg('out', path.join(OUT_DIR, 'sheet.png')));

const items = buildSvgs().filter(i => !only.length || only.some(o => i.key.includes(o)));
if (!items.length) throw new Error(`no sprite key matches --only=${only}`);

const cell = i => {
  const src = `data:image/svg+xml;base64,${Buffer.from(i.svg).toString('base64')}`;
  return `<div class="c"><img src="${src}" style="width:${i.w * scale}px;height:${i.h * scale}px"><div>${i.key} <small>${i.w}x${i.h}</small></div></div>`;
};
const html = `<!doctype html><meta charset="utf-8"><style>
  body { margin: 0; background: #5a4630; font: 11px monospace; color: #fff }
  .g { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px }
  .c { text-align: center; background: #6b5238; padding: 4px }
  img { display: block } small { opacity: .6 }
</style><div class="g">${items.map(cell).join('')}</div>`;

fs.mkdirSync(path.dirname(out), { recursive: true });
const tmp = path.join(OUT_DIR, 'sheet.html');
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(tmp, html);

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
await page.goto('file://' + tmp);
await page.waitForTimeout(500);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`${items.length} sprites -> ${path.relative(process.cwd(), out)}`);
