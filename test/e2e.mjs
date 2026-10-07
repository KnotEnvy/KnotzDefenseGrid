// End-to-end smoke test in real Chromium (WebGL via SwiftShader if there is no GPU).
//
//   npm run e2e                       # starts its own Vite dev server if none is running
//   BASE_URL=http://127.0.0.1:5173 npm run e2e
//
// It walks the real flow (menu -> map -> level -> win -> results), loads every level with the heuristic bot,
// fires both boss encounters, saves screenshots to test/e2e-out/, and FAILS on any console error / page error.
// Don't edit src/ while it runs: Vite's hot reload restarts the page underneath the test.
// Chromium discovery, GL flags and the dev server live in tools/lib.mjs (CHROME_PATH, GL=hardware, BASE_URL).

import fs from 'node:fs';
import path from 'node:path';
import { launch, startServer, watchErrors, settle as settleScene, loadBot } from '../tools/lib.mjs';

const OUT = path.resolve('test/e2e-out');
fs.mkdirSync(OUT, { recursive: true });
let base;
let server = null;

const errors = [];
const log = (...a) => console.log(...a);
let failed = false;
const check = (cond, msg) => {
  if (cond) log('  ok  ', msg);
  else {
    failed = true;
    log('  FAIL', msg);
  }
};

async function main() {
  server = await startServer();
  base = server.base;
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  watchErrors(page, errors);

  const settle = key => settleScene(page, key);
  const shot = name => page.screenshot({ path: path.join(OUT, `${name}.png`) });
  const gameReady = () => page.waitForFunction(() => window.__beam?.scene?.sim && window.__beam.game.scene.isActive('Game'), null, { timeout: 180000 });

  // ------------------------------------------------------------------ menu -> map -> level 1
  log('menu / map');
  await page.goto(`${base}/?fx=low&unlock`);
  await settle('Menu');
  await shot('01-menu');
  await page.evaluate("window.__beam.game.scene.getScene('Menu').go('Select')");
  await settle('Select');
  await shot('02-map');
  check(await page.evaluate("window.__beam.game.scene.getScene('Select').nodes.length") === 5, 'map shows 5 Waystations');

  // ------------------------------------------------------------------ first journey: prologue -> map -> briefing -> level
  // The Story scene runs twice in a row here (prologue, then the level briefing); Phaser reuses the scene instance,
  // so state left over from the first run must not block the second. Driven with real clicks.
  log('first journey (prologue -> map -> briefing -> level)');
  await page.goto(`${base}/?fx=low`);
  await settle('Menu');
  await page.evaluate("window.__beam.game.scene.getScene('Menu').go('Story', { title: 'The Keeping', prologue: true })");
  await settle('Story');
  const storyDone = "(s => s.leaving && s.idx === s.slides.length - 1)(window.__beam.game.scene.getScene('Story'))";
  const clickThroughStory = async () => {
    for (let i = 0; i < 60 && !(await page.evaluate(storyDone)); i++) {
      await page.mouse.click(640, 300);
      await page.waitForTimeout(150);
    }
    return page.evaluate(storyDone);
  };
  check(await clickThroughStory(), 'clicking through the prologue finishes it');
  await settle('Select');
  await page.evaluate("(s => { s.sel = 0; s.endless = false; s.start(); })(window.__beam.game.scene.getScene('Select'))");
  await settle('Story');
  check(await clickThroughStory(), 'clicking through the level briefing after the prologue finishes it');
  await gameReady();
  check(await page.evaluate("window.__beam.game.scene.isActive('Game')"), 'the briefing leads into the level');

  // ------------------------------------------------------------------ every level loads and fights
  const bot = () => loadBot(page);
  for (let lv = 1; lv <= 5; lv++) {
    log(`level ${lv}`);
    await page.goto(`${base}/?fx=low&level=${lv}`);
    await gameReady();
    await page.waitForFunction(() => !window.__beam.scene.cameras.main.fadeEffect.isRunning, null, { timeout: 120000 });
    await bot();
    const info = await page.evaluate(async () => {
      const s = window.__beam.scene;
      const sim = s.sim;
      const b = new window.__Bot(sim, { seed: 5 });
      sim.nextWaveIn = 0.5;
      for (let i = 0; i < 60 * 150 && sim.state === 'play'; i++) {
        sim.update(1 / 60);
        b.tick();
      }
      return { t: Math.round(sim.time), posts: sim.posts.length, wave: sim.waveIndex, shards: sim.shardsRemaining, kills: sim.stats.kills, views: s.postViews.size };
    });
    await page.waitForTimeout(2500); // let a few frames render the aftermath
    await shot(`10-level${lv}`);
    check(info.posts >= 3 && info.views === info.posts, `level ${lv}: bot built ${info.posts} posts, views in sync (${info.views})`);
    check(info.kills > 0, `level ${lv}: ${info.kills} enemies killed in ${info.t}s`);
  }

  // ------------------------------------------------------------------ bosses
  for (const [lv, boss] of [[3, 'bear'], [5, 'ashe']]) {
    log(`boss ${boss}`);
    await page.goto(`${base}/?fx=low&level=${lv}&all`);
    await gameReady();
    await page.waitForFunction(() => !window.__beam.scene.cameras.main.fadeEffect.isRunning, null, { timeout: 120000 });
    await bot();
    const r = await page.evaluate(async b => {
      const s = window.__beam.scene;
      const sim = s.sim;
      const bt = new window.__Bot(sim, { seed: 9 });
      sim.silver = 4000;
      for (let i = 0; i < 60 * 40; i++) { sim.update(1 / 60); bt.tick(); }
      sim.waveIndex = sim.totalWaves - 1; // jump to the boss wave
      sim.nextWaveIn = 0.1;
      let seen = false;
      let hexes = 0;
      sim.on('hex', () => hexes++);
      for (let i = 0; i < 60 * 25; i++) { sim.update(1 / 60); bt.tick(); if (sim.enemies.some(e => e.type === b)) seen = true; }
      return { seen, hexes, alive: sim.enemies.some(e => e.type === b) };
    }, boss);
    await page.waitForTimeout(2500);
    await shot(`20-boss-${boss}`);
    check(r.seen, `${boss} spawned`);
    if (boss === 'ashe') check(r.hexes > 0 || !r.alive, 'Ashe hexed a post (or was already put down)');
  }

  // ------------------------------------------------------------------ full win -> results -> progress
  log('full win on level 1 + results');
  await page.goto(`${base}/?fx=low&level=1`);
  await gameReady();
  await page.waitForFunction(() => !window.__beam.scene.cameras.main.fadeEffect.isRunning, null, { timeout: 120000 });
  await bot();
  const win = await page.evaluate(async () => {
    const s = window.__beam.scene;
    const sim = s.sim;
    const b = new window.__Bot(sim, { seed: 7 });
    for (let i = 0; i < 60 * 900 && sim.state === 'play'; i++) {
      sim.update(1 / 60);
      b.tick();
    }
    return { state: sim.state, stars: sim.stars(), shards: sim.shardsRemaining };
  });
  check(win.state === 'won', `level 1 won by the bot (${win.shards} shards, ${win.stars} stars)`);
  await settle('Result');
  await shot('30-result');
  const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('beamfall.progress') || '{}'));
  check(prog['dry-creek']?.done === true && prog['dry-creek'].stars >= 1, 'progress saved to localStorage');

  // ------------------------------------------------------------------ a lost level
  log('defeat flow');
  await page.goto(`${base}/?fx=low&level=1`);
  await gameReady();
  await page.waitForFunction(() => !window.__beam.scene.cameras.main.fadeEffect.isRunning, null, { timeout: 120000 });
  await page.evaluate(() => {
    const s = window.__beam.scene;
    const sim = s.sim;
    sim.nextWaveIn = 0.1;
    for (let i = 0; i < 60 * 400 && sim.state === 'play'; i++) sim.update(1 / 60);
  });
  await settle('Result');
  await shot('31-defeat');
  check(await page.evaluate("window.__beam.game.scene.getScene('Result').r.won === false"), 'defeat reaches the Result scene');

  // ------------------------------------------------------------------ real mouse + keyboard
  log('real input (mouse + keyboard)');
  await page.goto(`${base}/?fx=low&level=1&silver=600`);
  await gameReady();
  await page.waitForFunction(() => !window.__beam.scene.cameras.main.fadeEffect.isRunning, null, { timeout: 120000 });
  const st = () => page.evaluate(() => { const s = window.__beam.scene; return { posts: s.sim.posts.length, build: s.buildType, sel: s.selected?.type ?? null, lvl: s.selected?.level ?? null, mode: s.selected?.mode ?? null, speed: s.speed, paused: s.paused, silver: Math.floor(s.sim.silver) }; });
  const act = async (fn, wait = 1500) => { await fn(); await page.waitForTimeout(wait); return st(); };
  let r = await act(() => page.mouse.click(1150, 55)); // HUD: Sixgun
  check(r.build === 'sixgun', 'clicking the HUD button enters build mode');
  await page.mouse.move(600, 150);
  await page.waitForTimeout(800);
  r = await act(() => page.mouse.click(600, 150), 2000);
  check(r.posts === 1 && r.silver < 600, 'clicking the field builds a post and spends silver');
  r = await act(() => page.mouse.click(300, 150, { button: 'right' }));
  check(r.build === null, 'right-click cancels build mode');
  r = await act(() => page.mouse.click(600, 150));
  check(r.sel === 'sixgun', 'clicking a post selects it');
  r = await act(() => page.keyboard.press('u'));
  check(r.lvl === 1, 'U upgrades the selected post');
  r = await act(() => page.keyboard.press('t'));
  check(r.mode === 'closest', 'T cycles the targeting mode');
  r = await act(() => page.keyboard.press('f'));
  check(r.speed === 2, 'F cycles game speed');
  const before = r.silver;
  r = await act(() => page.keyboard.press(' '));
  check(r.silver > before, 'Space calls the next wave early for a bonus');
  r = await act(() => page.mouse.click(300, 600));
  check(r.sel === null, 'clicking empty ground deselects');
  r = await act(() => page.keyboard.press('p'));
  check(r.paused === true, 'P pauses');
  r = await act(() => page.mouse.click(640, 319)); // pause menu: Resume
  check(r.paused === false, 'the pause menu Resume button resumes');

  // ------------------------------------------------------------------ endless mode
  log('endless mode (The Wheel Turns)');
  await page.goto(`${base}/?fx=low&level=3&endless`);
  await gameReady();
  await page.waitForFunction(() => !window.__beam.scene.cameras.main.fadeEffect.isRunning, null, { timeout: 120000 });
  await bot();
  const en = await page.evaluate(async () => {
    const s = window.__beam.scene;
    const sim = s.sim;
    const b = new window.__Bot(sim, { seed: 4 });
    sim.silver = 1500;
    for (let i = 0; i < 60 * 240 && sim.state === 'play'; i++) {
      sim.update(1 / 60);
      b.tick();
    }
    return { endless: sim.level.endless, started: sim.waveIndex, held: sim.wavesHeld, total: sim.totalWaves };
  });
  check(en.endless && en.total === Infinity && en.started >= 3, `endless: ${en.started} waves started, ${en.held} held`);
  await page.evaluate(() => {
    const sim = window.__beam.scene.sim;
    for (let i = 0; i < 60 * 3000 && sim.state === 'play'; i++) sim.update(1 / 60); // let it run until the Beam snaps
  });
  await settle('Result');
  await shot('32-endless-result');
  check(await page.evaluate("window.__beam.game.scene.getScene('Result').r.endless === true"), 'endless run reaches the Result scene');
  const eprog = await page.evaluate(() => JSON.parse(localStorage.getItem('beamfall.progress') || '{}'));
  check(typeof eprog['thunderclap-endless']?.best === 'number', 'endless best saved to localStorage');

  await browser.close();
  log(errors.length ? `\n${errors.length} browser error(s):\n${errors.join('\n')}` : '\nno browser errors');
  if (errors.length) failed = true;
}

main()
  .catch(e => {
    console.error(e);
    failed = true;
  })
  .finally(() => {
    server?.stop();
    process.exit(failed ? 1 : 0);
  });
