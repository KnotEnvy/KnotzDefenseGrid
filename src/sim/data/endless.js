// "The Wheel Turns": endless mode. Waves are generated from a threat budget that grows every wave; bosses return
// every tenth wave. Deterministic (no RNG) so a given wave is always the same.

// Threat cost of one of each enemy (roughly proportional to how hard it is to put down).
const COST = { cantoi: 1, hound: 0.8, swarm: 0.3, crow: 1.2, lowman: 3, breaker: 3, brute: 7 };

const NAMES = [
  'The Wheel Turns', 'Again, and Again', 'The Tithe Remembers', 'Ka Has No Mercy', 'A Thinner Place', 'Red Tide',
  'The Doorway Breathes', 'Long Days', 'Pleasant Nights', 'No End to It', 'Another Turn', 'The Road Goes On'
];

/** Which enemy types are in play at wave number n (1-based). */
function poolAt(n) {
  const pool = ['cantoi', 'hound'];
  if (n >= 4) pool.push('lowman');
  if (n >= 6) pool.push('swarm', 'crow');
  if (n >= 9) pool.push('breaker');
  if (n >= 12) pool.push('brute');
  return pool;
}

export function endlessWave(index, doorCount = 1) {
  const n = index + 1;
  const pool = poolAt(n);
  // Pick up to three types, rotating through the pool so waves feel different.
  const types = [];
  for (let k = 0; k < Math.min(3, pool.length); k++) {
    let j = n * 3 + k * 5 + Math.floor(n / 3);
    while (types.includes(pool[j % pool.length])) j++; // k*5 is 0 mod 5: waves 6-8 used to be a single type
    types.push(pool[j % pool.length]);
  }
  const budget = 9 + n * 2.6;
  const hp = 1 + 0.11 * n + 0.004 * n * n;
  const groups = [];
  let delay = 0;
  types.forEach((type, k) => {
    const share = (budget / types.length) * (k === 0 ? 1.15 : 0.92);
    const count = Math.max(1, Math.round(share / COST[type]));
    const interval = Math.max(0.16, Math.min(1.4, (type === 'swarm' ? 0.22 : 0.9) - n * 0.012));
    groups.push({ type, count, interval, delay, hp, spawn: 'alt' });
    delay += 2.2;
  });
  let say = null;
  if (n % 10 === 0) {
    const boss = (n / 10) % 2 === 1 ? 'bear' : 'ashe';
    groups.push({ type: boss, count: 1, interval: 1, delay: 3, hp: 1 + 0.25 * (n / 10 - 1), spawn: doorCount > 1 ? 2 : 1 });
    say = 'The Wheel has turned, and something big has come around with it.';
  }
  return {
    name: n % 10 === 0 ? 'The Wheel Brings a Guest' : NAMES[index % NAMES.length],
    bonus: 12 + n * 3,
    say,
    groups
  };
}

/** Build an endless level definition from a campaign level (same map, same posts, a bigger purse). */
export function makeEndlessLevel(base) {
  return {
    ...base,
    id: `${base.id}-endless`,
    baseId: base.id,
    endless: true,
    name: `${base.name}: The Wheel Turns`,
    subtitle: 'Endless',
    unlocks: ['sixgun', 'sigul', 'scattergun', 'mortar', 'beam', 'fire', 'orb', 'glass'],
    startSilver: base.startSilver + 250,
    firstWaveDelay: 25,
    waveGap: 14,
    hp: base.hp ?? 1,
    waves: []
  };
}
