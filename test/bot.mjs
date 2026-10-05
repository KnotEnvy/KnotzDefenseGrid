// A heuristic headless player used to sanity-check balance. It is deliberately *not* clever:
// it never builds deliberate mazes, it just places posts where they cover the most road and
// upgrades whatever is getting kills. A human should beat it; if the bot can't win, or wins
// everything with all stars, the numbers need work.
//
//   node test/bot.mjs            # all levels
//   node test/bot.mjs 3          # just level 3
//   node test/bot.mjs 3 --verbose

import { Sim, FIXED_DT } from '../src/sim/sim.js';
import { LEVELS } from '../src/sim/data/levels.js';
import { POSTS } from '../src/sim/data/posts.js';
import { CELL, COLS, ROWS } from '../src/sim/grid.js';

const VALUE = { sixgun: 1.0, scattergun: 0.85, mortar: 1.0, beam: 1.25, orb: 1.15, sigul: 0.55, fire: 0.0, glass: 0.7 };

function routeCells(sim) {
  const cells = new Map();
  for (const { route } of sim.paths()) {
    route.forEach((c, i) => {
      // weight cells nearer the Waystation more
      const w = 0.5 + (i / route.length);
      const k = c.cy * COLS + c.cx;
      cells.set(k, Math.max(cells.get(k) ?? 0, w));
    });
  }
  return cells;
}

function coverage(sim, cells, post, cx, cy, range) {
  const px = (cx + 1) * CELL;
  const py = (cy + 1) * CELL;
  let s = 0;
  for (const [k, w] of cells) {
    const x = (k % COLS) * CELL + CELL / 2;
    const y = Math.floor(k / COLS) * CELL + CELL / 2;
    if (Math.hypot(x - px, y - py) <= range) s += w;
  }
  return s;
}

function bestSpot(sim, type, cells, rng) {
  const def = POSTS[type];
  const range = def.levels[0].range ?? def.levels[0].radius ?? 120;
  // Rank every free footprint by road coverage (cheap), then validate only the best few
  // (validation runs a flow-field rebuild, which is the expensive part).
  const ranked = [];
  for (let cy = 1; cy < ROWS - 2; cy++) {
    for (let cx = 1; cx < COLS - 2; cx++) {
      const g = sim.grid;
      if (!(g.isBuildable(cx, cy) && g.isBuildable(cx + 1, cy) && g.isBuildable(cx, cy + 1) && g.isBuildable(cx + 1, cy + 1))) continue;
      ranked.push({ cx, cy, score: coverage(sim, cells, type, cx, cy, range) + rng() * 0.5 });
    }
  }
  ranked.sort((a, b) => b.score - a.score);
  for (let i = 0; i < Math.min(ranked.length, 12); i++) {
    if (sim.canBuild(type, ranked[i].cx, ranked[i].cy).ok) return ranked[i];
  }
  return null;
}

export function playLevel(index, { seed = 7, verbose = false, maxTime = 3600, lazy = 0, hpScale = 1 } = {}) {
  const sim = new Sim(LEVELS[index], { seed, hpScale });
  let rs = seed;
  const rng = () => ((rs = (rs * 1664525 + 1013904223) >>> 0) / 4294967296);
  const wavesCleared = [];
  sim.on('waveClear', e => wavesCleared.push(e.index));
  let nextDecision = 0;
  let cache = null;
  let cacheFor = -1;

  while (sim.state === 'play' && sim.time < maxTime) {
    sim.update(FIXED_DT);
    if (sim.time < nextDecision) continue;
    nextDecision = sim.time + 0.4;
    if (sim.silver < 55) continue;
    // Call waves early only when comfortably ahead and the field is empty.
    if (sim.canCallWave && sim.enemies.length === 0 && sim.posts.length >= 4 && sim.nextWaveIn > 5) sim.callWave();

    // Compute best action by value/cost.
    if (cacheFor !== sim.posts.length) {
      cache = routeCells(sim);
      cacheFor = sim.posts.length;
    }
    const counts = {};
    for (const p of sim.posts) counts[p.type] = (counts[p.type] ?? 0) + 1;
    let best = null;

    for (const type of sim.unlocked) {
      const base = VALUE[type];
      if (!base) continue;
      const def = POSTS[type];
      const cost = def.levels[0].cost;
      const spot = bestSpot(sim, type, cache, rng);
      if (!spot) continue;
      const v = (base * (0.3 + spot.score / 25)) / (1 + 0.28 * (counts[type] ?? 0)) / cost;
      if (!best || v > best.v) best = { v, kind: 'build', type, spot, cost };
    }
    for (const p of sim.posts) {
      const cost = sim.upgradeCost(p);
      if (cost == null) continue;
      const v = ((VALUE[p.type] || 0.3) * (0.7 + p.kills / 40) * (1 + p.level * 0.1)) / cost * 1.15;
      if (!best || v > best.v) best = { v, kind: 'up', post: p, cost };
    }
    // Fire posts only once there are several posts to buff.
    if (sim.unlocked.has('fire') && !counts.fire && sim.posts.length >= 5) {
      const spot = bestSpot(sim, 'fire', cache, rng);
      if (spot) {
        const v = 0.02;
        if (!best || v > best.v) best = { v, kind: 'build', type: 'fire', spot, cost: POSTS.fire.levels[0].cost };
      }
    }
    if (best && sim.silver >= best.cost && rng() >= lazy) {
      if (best.kind === 'build') sim.build(best.type, best.spot.cx, best.spot.cy);
      else sim.upgrade(best.post);
    }
  }

  const res = {
    level: LEVELS[index].name,
    result: sim.state,
    time: Math.round(sim.time),
    wave: `${sim.waveIndex}/${sim.totalWaves}`,
    shards: `${sim.shardsRemaining}/${sim.level.shards}`,
    stars: sim.state === 'won' ? sim.stars() : 0,
    posts: sim.posts.length,
    silverLeft: Math.floor(sim.silver),
    kills: sim.stats.kills,
    mix: sim.posts.reduce((m, p) => ((m[p.type] = (m[p.type] ?? 0) + 1), m), {}),
    avgTier: (sim.posts.reduce((a, p) => a + p.level + 1, 0) / Math.max(1, sim.posts.length)).toFixed(1)
  };
  if (verbose) res.wavesCleared = wavesCleared.length;
  return res;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const raw = process.argv.slice(2);
  const args = raw.filter((a, i) => !a.startsWith('--') && raw[i - 1] !== '--lazy' && raw[i - 1] !== '--hp');
  const verbose = process.argv.includes('--verbose');
  const only = args[0] ? Number(args[0]) - 1 : null;
  const seeds = process.argv.includes('--seeds') ? [3, 7, 11] : [7];
  const li = process.argv.indexOf('--lazy');
  const lazy = li > 0 ? Number(process.argv[li + 1]) : 0;
  const hi = process.argv.indexOf('--hp');
  const hpScale = hi > 0 ? Number(process.argv[hi + 1]) : 1;
  for (let i = 0; i < LEVELS.length; i++) {
    if (only !== null && i !== only) continue;
    for (const seed of seeds) {
      const r = playLevel(i, { seed, verbose, lazy, hpScale });
      console.log(JSON.stringify(r));
    }
  }
}
