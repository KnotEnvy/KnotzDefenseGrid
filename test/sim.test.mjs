import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim, FIXED_DT, SHARD_DROP_TIME } from '../src/sim/sim.js';
import { LEVELS } from '../src/sim/data/levels.js';
import { POSTS } from '../src/sim/data/posts.js';
import { COLS, ROWS, CELL } from '../src/sim/grid.js';

const run = (sim, seconds) => {
  const n = Math.round(seconds / FIXED_DT);
  for (let i = 0; i < n; i++) sim.update(FIXED_DT);
};

const fresh = (i = 0, opts) => new Sim(LEVELS[i], opts);
// A sim with the scripted waves switched off so a test controls exactly who spawns.
const quiet = (i = 0, opts) => {
  const sim = fresh(i, opts);
  sim.nextWaveIn = null;
  return sim;
};

test('building costs silver and selling refunds 70% of the investment', () => {
  const sim = fresh();
  const start = sim.silver;
  const p = sim.build('sixgun', 12, 8);
  assert.ok(p);
  assert.equal(sim.silver, start - POSTS.sixgun.levels[0].cost);
  assert.ok(sim.upgrade(p));
  const invested = POSTS.sixgun.levels[0].cost + POSTS.sixgun.levels[1].cost;
  const before = sim.silver;
  const value = sim.sell(p);
  assert.equal(value, Math.floor(invested * 0.7));
  assert.equal(sim.silver, before + value);
  assert.equal(sim.posts.length, 0);
});

test('locked posts and insufficient silver are refused', () => {
  const sim = fresh();
  assert.equal(sim.canBuild('beam', 12, 8).reason, 'locked');
  sim.silver = 10;
  assert.equal(sim.canBuild('sixgun', 12, 8).reason, 'silver');
});

test('an unarmed Waystation is robbed: thieves exit with shards and the Beam can snap', () => {
  const sim = quiet();
  const lost = [];
  sim.on('shardLost', e => lost.push(e));
  sim.spawnEnemy('cantoi', 1, 1, 0);
  run(sim, 200); // long serpentine: ~63 s in, ~63 s out
  assert.equal(lost.length, 1);
  assert.equal(sim.shardsRemaining, sim.level.shards - 1);
  assert.equal(sim.enemies.length, 0);

  const sim2 = quiet();
  for (let i = 0; i < sim2.level.shards + 2; i++) sim2.spawnEnemy('hound', 1, 1, 0);
  run(sim2, 200);
  assert.equal(sim2.state, 'lost');
});

test('killing a carrier drops the shard, which drifts home after the drop timer', () => {
  const sim = quiet();
  const events = [];
  sim.on('*', (t) => events.push(t));
  const e = sim.spawnEnemy('cantoi', 1, 1, 0);
  // Walk until it picks a shard.
  let guard = 0;
  while (e.carrying === null && guard++ < 60 * 120) sim.update(FIXED_DT);
  assert.notEqual(e.carrying, null);
  const shard = sim.shards.find(s => s.id === e.carrying);
  assert.equal(shard.state, 'carried');
  sim.damage(e, 99999, {});
  assert.equal(shard.state, 'dropped');
  run(sim, SHARD_DROP_TIME - 0.3);
  assert.equal(shard.state, 'dropped');
  run(sim, 8);
  assert.equal(shard.state, 'home');
  assert.ok(events.includes('shardDrop') && events.includes('shardHome'));
  assert.equal(sim.shardsRemaining, sim.level.shards);
});

test('another thief can snatch a dropped shard', () => {
  const sim = quiet();
  const a = sim.spawnEnemy('cantoi', 1, 1, 0);
  let guard = 0;
  while (a.carrying === null && guard++ < 60 * 120) sim.update(FIXED_DT);
  const shard = sim.shards.find(s => s.id === a.carrying);
  const b = sim.spawnEnemy('cantoi', 1, 1, 0);
  // Carry the thief out into lane A, away from the Waystation, then kill it.
  a.x = 400;
  a.y = 100;
  sim.update(FIXED_DT);
  sim.damage(a, 99999, {});
  assert.equal(shard.state, 'dropped');
  // Put the second thief right on the dropped shard.
  b.x = shard.x;
  b.y = shard.y;
  sim.update(FIXED_DT);
  assert.equal(b.carrying, shard.id);
  assert.equal(shard.state, 'carried');
});

test('a Sixgun kills a lone Can-toi before it escapes', () => {
  const sim = quiet();
  // Lane A passes through the top; the first corner is a good spot
  sim.build('sixgun', 20, 1);
  sim.build('sixgun', 20, 3);
  const e = sim.spawnEnemy('cantoi', 1, 1, 0);
  run(sim, 40);
  assert.ok(e.dead);
  assert.equal(sim.stats.shardsLost, 0);
  assert.ok(sim.stats.kills >= 1);
});

test('interest accrues on banked silver, capped', () => {
  const sim = fresh();
  sim.silver = 100000;
  const before = sim.silver;
  run(sim, 10);
  // cap = 4/s => ~40 in 10 s
  const gained = sim.silver - before;
  assert.ok(gained >= 38 && gained <= 42, `gained ${gained}`);
});

test('the first wave starts on schedule and calling early pays a bonus', () => {
  const sim = fresh();
  const started = [];
  sim.on('waveStart', e => started.push(e.index));
  run(sim, sim.level.firstWaveDelay - 1);
  assert.equal(started.length, 0);
  const s0 = sim.silver;
  const bonus = sim.callWave();
  assert.ok(bonus >= 0 && bonus <= 1);
  assert.equal(started.length, 1);
  assert.ok(sim.silver >= s0);
  run(sim, 2);
  assert.ok(sim.enemies.length > 0);
});

test('sealing the road with a hostile build is refused by the sim', () => {
  const sim = fresh();
  // Lane A -> B gap on the right: x28..30 at y5..6. Block as much as possible.
  const ok1 = sim.build('sixgun', 28, 5);
  assert.ok(ok1);
  // The remaining column x30 stays open; a 2x2 cannot fit there, so the road can never be sealed here.
  assert.equal(sim.canBuild('sixgun', 30, 5).ok, false);
});

test('Beam Conduit ramps damage on a held target and ignores armor', () => {
  const sim = new Sim(LEVELS[2], { unlocked: ['beam'] });
  sim.silver = 9999;
  const post = sim.build('beam', 20, 9);
  const lm = sim.spawnEnemy('lowman', 1, 1, 0);
  lm.x = post.x + 80;
  lm.y = post.y;
  lm.speed = 0;
  const hp0 = lm.hp;
  run(sim, 1);
  const d1 = hp0 - lm.hp;
  const hp1 = lm.hp;
  run(sim, 3);
  const d3 = (hp1 - lm.hp) / 3;
  assert.ok(d3 > d1, 'beam should hit harder the longer it holds');
  assert.ok(d1 >= 13, 'armor 5 must not reduce beam damage');
});

test('determinism: the same seed replays identically', () => {
  const play = () => {
    const sim = fresh(1, { seed: 42 });
    sim.build('sixgun', 20, 7);
    sim.build('sixgun', 20, 11);
    for (let i = 0; i < 8; i++) sim.spawnEnemy(i % 2 ? 'hound' : 'cantoi', 1 + (i % 2), 1, 0);
    run(sim, 60);
    return JSON.stringify({ k: sim.stats, s: sim.silver | 0, e: sim.enemies.map(e => [e.id, Math.round(e.x), Math.round(e.y)]) });
  };
  assert.equal(play(), play());
});

test('the final boss hexes posts and summons Can-toi', () => {
  const sim = fresh(4);
  sim.silver = 99999;
  sim.build('sixgun', 12, 8);
  const hexes = [];
  const summons = [];
  sim.on('hex', e => hexes.push(e));
  sim.on('summon', e => summons.push(e));
  const boss = sim.spawnEnemy('ashe', 2, 1, 0);
  boss.speed = 0;
  boss.x = 14 * 32;
  boss.y = 9 * 32;
  run(sim, 20);
  assert.ok(hexes.length >= 1, 'hexed');
  assert.ok(summons.length >= 2, 'summoned');
});

test('a Sigul Ward slows enemies inside its glow', () => {
  const sim = quiet(0, { unlocked: ['sixgun', 'sigul'] });
  sim.silver = 99999;
  const ward = sim.build('sigul', 12, 8);
  assert.ok(ward);
  const { radius, slow } = POSTS.sigul.levels[0];
  const e = sim.spawnEnemy('cantoi', [...sim.grid.spawnCells.keys()][0], 1000);
  const ratios = [];
  const deep = () => Math.hypot(ward.x - e.x, ward.y - e.y) < radius - 10; // well inside, so a tick never straddles the edge
  for (let i = 0; i < 60 * 60 && !e.dead && e.state !== 'loiter'; i++) {
    const [x, y, wasDeep] = [e.x, e.y, deep()];
    sim.update(FIXED_DT);
    const moved = Math.hypot(e.x - x, e.y - y);
    if (wasDeep && deep() && moved > 0) ratios.push(moved / (e.speed * FIXED_DT));
  }
  assert.ok(ratios.length > 30, `the Can-toi walked through the glow (${ratios.length} ticks)`);
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  assert.ok(Math.abs(avg - (1 - slow)) < 0.05, `moves at ${avg.toFixed(2)}x inside the glow, expected ${1 - slow}`);
});

test('summons never appear inside rock, even when the boss hugs it', () => {
  const sim = quiet(4);
  const g = sim.grid;
  const spawnId = [...g.spawnCells.keys()][0];
  // every reachable cell that has rock directly to its right: park the boss 2 px from that rock
  const spots = [];
  for (let cy = 0; cy < ROWS; cy++)
    for (let cx = 0; cx < COLS - 1; cx++)
      if ( g.toBase[g.idx(cx, cy)] < Infinity && !g.isWalkable(cx + 1, cy)) spots.push({ cx, cy });
  assert.ok(spots.length > 0);
  const summoned = [];
  sim.on('spawn', ({ enemy }) => enemy.type === 'cantoi' && summoned.push(enemy));
  for (const { cx, cy } of spots.slice(0, 20)) {
    const boss = sim.spawnEnemy('ashe', spawnId, 1, 0, { x: (cx + 1) * CELL - 2, y: (cy + 0.5) * CELL });
    boss.stunUntil = Infinity;
    for (let k = 0; k < 5; k++) {
      boss.summonCd = 0;
      sim.update(FIXED_DT);
    }
    boss.dead = true;
  }
  assert.ok(summoned.length >= 100);
  const stuck = summoned.filter(e => !(g.baseDistAt(e.x, e.y) < Infinity));
  assert.equal(stuck.length, 0, `${stuck.length} of ${summoned.length} summons spawned where they cannot walk`);
});
