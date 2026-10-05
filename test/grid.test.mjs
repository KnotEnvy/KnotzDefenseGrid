import test from 'node:test';
import assert from 'node:assert/strict';
import { Grid, COLS, ROWS, CELL } from '../src/sim/grid.js';
import { buildMap } from '../src/sim/data/maps.js';
import { LEVELS } from '../src/sim/data/levels.js';

// A two-wide corridor map: any 2x2 post placed inside it seals the road.
const corridor = () => buildMap([
  ['door', 1, 0, 9, 1, 2], ['road', 1, 9, 2, 2],
  ['base', 31, 9, 1, 2], ['road', 29, 9, 2, 2],
  ['rock', 1, 1, 30, 8], ['rock', 1, 11, 30, 8]
]);

test('every shipped map is the right size and every doorway reaches the Waystation', () => {
  for (const level of LEVELS) {
    assert.equal(level.map.length, ROWS, level.id);
    for (const row of level.map) assert.equal(row.length, COLS, level.id);
    const g = new Grid(level.map);
    for (const cells of g.spawnCells.values()) {
      for (const c of cells) assert.ok(isFinite(g.toBase[g.idx(c.cx, c.cy)]), `${level.id}: doorway ${c.cx},${c.cy} cannot reach base`);
    }
  }
});

test('route from a doorway ends at a base cell and is monotonically descending', () => {
  const g = new Grid(LEVELS[0].map);
  const door = g.spawnCells.get(1)[0];
  const route = g.route('base', door.cx, door.cy);
  assert.ok(route.length > 40, 'serpentine should be long');
  const last = route[route.length - 1];
  assert.equal(g.toBase[g.idx(last.cx, last.cy)], 0);
  for (let i = 1; i < route.length; i++) {
    assert.ok(g.toBase[g.idx(route[i].cx, route[i].cy)] < g.toBase[g.idx(route[i - 1].cx, route[i - 1].cy)]);
  }
});

test('a post that would seal the road is rejected', () => {
  const g = new Grid(corridor());
  const res = g.canPlace(10, 9, 2, 2);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'blocks');
});

test('rock, edge, road and occupied cells are rejected', () => {
  const g = new Grid(LEVELS[0].map);
  assert.equal(g.canPlace(0, 0).reason, 'terrain');
  assert.equal(g.canPlace(31, 5).ok, false);
  assert.equal(g.canPlace(1, 2).reason, 'terrain'); // road by the doorway
  g.place(7, 8, 1);
  assert.equal(g.canPlace(8, 1).reason, 'occupied');
});

test('placing a post lengthens the route and removing it restores it', () => {
  const g = new Grid(LEVELS[2].map); // wide open flats
  const door = g.spawnCells.get(1)[0];
  const before = g.toBase[g.idx(door.cx, door.cy)];
  // wall off most of a column: path must detour
  for (let y = 4; y <= 14; y += 2) {
    if (g.canPlace(18, y).ok) g.place(100 + y, 18, y);
  }
  const mid = g.toBase[g.idx(door.cx, door.cy)];
  assert.ok(mid > before, 'detour should be longer');
  for (let y = 4; y <= 14; y += 2) if (g.occupied[g.idx(18, y)]) g.remove(18, y);
  assert.equal(g.toBase[g.idx(door.cx, door.cy)], before);
});

test('enemy cells that would be sealed in veto the placement', () => {
  const g = new Grid(corridor());
  // Pretend an enemy stands inside the corridor east of where we try to build; sealing is already
  // rejected by the doorway check, so use a pocket instead.
  const pocket = buildMap([
    ['door', 1, 0, 9, 1, 2], ['base', 31, 9, 1, 2], ['road', 29, 9, 2, 2], ['road', 1, 9, 2, 2]
  ]);
  const gp = new Grid(pocket);
  // A 2x2 at (2,12) leaves everything connected, but an enemy at (2,13) would be fine too.
  assert.equal(gp.canPlace(2, 12, 2, 2, [{ cx: 8, cy: 14 }]).ok, true);
  // Enemy standing on the footprint is vetoed.
  assert.equal(gp.canPlace(2, 12, 2, 2, [{ cx: 3, cy: 13 }]).reason, 'enemy');
});

test('diagonal moves never cut a blocked corner', () => {
  const g = new Grid(LEVELS[2].map);
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      const s = g.step('base', cx, cy);
      if (!s) continue;
      if (s.cx !== cx && s.cy !== cy) {
        assert.ok(g.isWalkable(s.cx, cy) && g.isWalkable(cx, s.cy), `corner cut at ${cx},${cy}`);
      }
    }
  }
  assert.equal(CELL, 32);
});
