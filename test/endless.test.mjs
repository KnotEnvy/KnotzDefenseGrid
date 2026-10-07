import test from 'node:test';
import assert from 'node:assert/strict';
import { endlessWave, makeEndlessLevel } from '../src/sim/data/endless.js';
import { LEVELS } from '../src/sim/data/levels.js';
import { Sim, FIXED_DT } from '../src/sim/sim.js';
import { ENEMIES } from '../src/sim/data/enemies.js';

test('endless waves are valid, deterministic and escalate', () => {
  let prev = 0;
  for (let i = 0; i < 60; i++) {
    const w = endlessWave(i, 3);
    assert.ok(w.groups.length >= 1);
    for (const g of w.groups) {
      assert.ok(ENEMIES[g.type], `unknown enemy ${g.type}`);
      assert.ok(g.count >= 1 && g.interval > 0);
    }
    assert.deepEqual(endlessWave(i, 3), w, 'deterministic');
    const hp = w.groups[0].hp;
    assert.ok(hp >= prev - 1e-9, 'hp multiplier never decreases');
    prev = hp;
  }
  assert.ok(endlessWave(9).groups.some(g => g.type === 'bear'), 'wave 10 brings the Bear');
  assert.ok(endlessWave(19).groups.some(g => g.type === 'ashe'), 'wave 20 brings Ashe');
});

test('an endless sim never "wins" and keeps producing waves', () => {
  const lvl = makeEndlessLevel(LEVELS[2]);
  const sim = new Sim(lvl, { seed: 3 });
  assert.equal(sim.totalWaves, Infinity);
  sim.nextWaveIn = 0.1;
  let started = 0;
  sim.on('waveStart', () => started++);
  sim.silver = 99999;
  for (let i = 0; i < 60 * 120 && sim.state === 'play'; i++) {
    sim.update(FIXED_DT);
    if (sim.enemies.length === 0 && sim.canCallWave) sim.callWave();
  }
  assert.ok(started >= 3, `started ${started} waves`);
  assert.notEqual(sim.state, 'won');
});

test('endless waves mix enemy types once there are enough to mix', () => {
  for (let i = 3; i < 40; i++) {
    const types = new Set(endlessWave(i, 1).groups.map(g => g.type));
    assert.ok(types.size >= 3, `wave ${i + 1} has only ${[...types].join(', ')}`);
  }
});
