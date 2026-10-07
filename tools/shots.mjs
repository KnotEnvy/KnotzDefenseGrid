// Review screenshots: capture the same set of scenes every time so a GFX change can be compared
// before/after (attach both to the PR).
//
//   npm run shots                         # everything          -> tools/out/shots/*.png
//   npm run shots -- menu,map,stress      # a subset
//   npm run shots -- level3 --fx=low      # Effects: Low
//
// Names: menu, map, level1..level5 (a bot-built defence mid-fight), stress (a ring of tier-3 posts around
// a boss and a pack of enemies, the worst case for lights and particles), selected (a tier-3 post selected).
// Uses the dev server on BASE_URL (default http://127.0.0.1:5199) or starts one. Software GL renders at ~2 fps,
// so each shot waits for a few seconds of frames; expect a couple of minutes for the full set.

import fs from 'node:fs';
import path from 'node:path';
import { launch, startServer, watchErrors, settle, gameReady, loadBot, OUT_DIR } from './lib.mjs';

const args = process.argv.slice(2);
const fx = args.find(a => a.startsWith('--fx='))?.split('=')[1] ?? 'high';
const ALL = ['menu', 'map', 'level1', 'level2', 'level3', 'level4', 'level5', 'stress', 'selected'];
const want = args.find(a => !a.startsWith('--'))?.split(',') ?? ALL;
const bad = want.filter(n => !ALL.includes(n));
if (bad.length) throw new Error(`unknown shot(s): ${bad}. Choose from ${ALL.join(', ')}`);

const dir = path.join(OUT_DIR, 'shots');
fs.mkdirSync(dir, { recursive: true });
const server = await startServer();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
watchErrors(page, errors);

const snap = async (name, waitMs = 3000, opts = {}) => {
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: path.join(dir, `${name}.png`), ...opts });
  console.log('  ', name);
};
const open = async query => {
  await page.goto(`${server.base}/?fx=${fx}&${query}`);
  await gameReady(page);
};

try {
  if (want.includes('menu') || want.includes('map')) {
    await page.goto(`${server.base}/?fx=${fx}&unlock`);
    await settle(page, 'Menu', 2500);
    if (want.includes('menu')) await snap('menu', 0);
    if (want.includes('map')) {
      await page.evaluate("window.__beam.game.scene.getScene('Menu').go('Select')");
      await settle(page, 'Select', 2500);
      await page.evaluate(() => {
        const sc = window.__beam.game.scene.getScene('Select');
        sc.prog = { 'dry-creek': { stars: 3, done: true }, 'cinder-road': { stars: 2, done: true } };
        sc.nodes.forEach(n => n.draw());
      });
      await snap('map', 500);
    }
  }

  for (let lv = 1; lv <= 5; lv++) {
    if (!want.includes(`level${lv}`)) continue;
    await open(`level=${lv}&all&silver=1500`);
    await loadBot(page);
    await page.evaluate(() => {
      const { sim } = window.__beam.scene;
      const bot = new window.__Bot(sim, { seed: 21 });
      sim.nextWaveIn = 0.5;
      for (let i = 0; i < 60 * 95; i++) {
        sim.update(1 / 60);
        bot.tick();
      }
    });
    await snap(`level${lv}`, 6000);
  }

  if (want.includes('selected')) {
    await open('level=3&all&silver=1500');
    await loadBot(page);
    await page.evaluate(() => {
      const s = window.__beam.scene;
      const bot = new window.__Bot(s.sim, { seed: 21 });
      s.sim.nextWaveIn = 0.5;
      for (let i = 0; i < 60 * 95; i++) {
        s.sim.update(1 / 60);
        bot.tick();
      }
      s.select(s.sim.posts.find(p => p.type === 'beam') ?? s.sim.posts[0]);
    });
    await snap('selected', 8000);
  }

  if (want.includes('stress')) {
    await open('level=3&all&silver=9000');
    await page.evaluate(() => {
      const s = window.__beam.scene;
      const sim = s.sim;
      sim.nextWaveIn = 9999;
      for (const [t, x, y] of [['beam', 12, 7], ['orb', 12, 12], ['mortar', 18, 4], ['scattergun', 18, 12], ['sixgun', 20, 8], ['fire', 14, 9], ['glass', 10, 9], ['sigul', 16, 14]]) sim.build(t, x, y);
      sim.posts.forEach(p => { while (sim.upgrade(p)) { /* max tier */ } });
      const dummy = (type, x, y) => {
        const e = sim.spawnEnemy(type, 1, 1, 0);
        Object.assign(e, { x, y, speed: 0, hp: 1e6, maxHp: 1e6 });
      };
      dummy('bear', 16 * 32 + 20, 10 * 32);
      dummy('lowman', 16 * 32 - 40, 9 * 32);
      dummy('cantoi', 16 * 32 + 70, 11 * 32);
      dummy('hound', 16 * 32 - 30, 12 * 32);
      s.select(sim.posts[0]);
    });
    await snap('stress', 6000);
  }
} finally {
  await browser.close();
  server.stop();
}
console.log(errors.length ? `${errors.length} browser error(s):\n${errors.join('\n')}` : 'no browser errors');
console.log(`screenshots in ${path.relative(process.cwd(), dir)}`);
process.exit(errors.length ? 1 : 0);
