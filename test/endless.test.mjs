import test from 'node:test';
import assert from 'node:assert/strict';
import { endlessWave } from '../src/sim/data/endless.js';
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
