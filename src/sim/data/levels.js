// Waystations along the Path of the Beam. Pure data; the simulation interprets it.
//
// Wave DSL:  W(name, groups, bonus, hpMul, say)   G(type, count, interval, extra)
//   group extras: delay (s into the wave), spawn (door id | 'alt' | 'rand'), hp (per-group HP multiplier)

import { DRY_CREEK, CINDER_ROAD, THUNDERCLAP, LUDS_SPUR, ALGUL } from './maps.js';

const G = (type, count, interval = 1, extra = {}) => ({ type, count, interval, ...extra });
const W = (name, groups, bonus = 10, hp = 1, say = null) => ({
  name,
  bonus,
  say,
  groups: groups.map(g => ({ hp, ...g }))
});

export const LEVELS = [
  // ===================================================================== 1
  {
    id: 'dry-creek',
    hp: 3.4,
    number: 1,
    name: 'Dry Creek',
    subtitle: 'The first Waystation',
    map: DRY_CREEK,
    shards: 8,
    startSilver: 320,
    interest: { rate: 0.006, cap: 4 },
    firstWaveDelay: 35,
    waveGap: 20,
    unlocks: ['sixgun', 'sigul'],
    palette: { sky: [0x1a0b2e, 0x6b2740, 0xe48a3e], dust: 0xc9a46a, ground: 0x6b5236 },
    waves: [
      W('The Doorway Opens', [G('cantoi', 6, 1.7)], 14, 1, 'First of them. Shoot the one that picks something up.'),
      W('More Thieves', [G('cantoi', 9, 1.3)], 14),
      W('Hounds on the Wind', [G('cantoi', 6, 1.4), G('hound', 6, 0.7, { delay: 6 })], 16),
      W('A Crowd of Can-toi', [G('cantoi', 12, 1.0)], 18, 1.15),
      W('Fast Ones', [G('hound', 10, 0.55), G('cantoi', 6, 1.2, { delay: 4 })], 18, 1.15),
      W('The Long Line', [G('cantoi', 16, 0.9)], 20, 1.3),
      W('Pack and Pack', [G('hound', 12, 0.5), G('cantoi', 10, 1.0, { delay: 3 })], 22, 1.3),
      W('Wall of Coats', [G('cantoi', 20, 0.75)], 24, 1.5),
      W('Thinny Fever', [G('hound', 16, 0.4), G('cantoi', 14, 0.9, { delay: 2 })], 28, 1.55),
      W('The Whole Tithe', [G('cantoi', 24, 0.7), G('hound', 14, 0.45, { delay: 8 })], 40, 1.8, 'Everything they have. Hold, ’prentice.')
    ]
  },

  // ===================================================================== 2
  {
    id: 'cinder-road',
    hp: 1.6,
    number: 2,
    name: "Gilead's Cinder-Road",
    subtitle: 'Ruins that remember being walls',
    map: CINDER_ROAD,
    shards: 10,
    startSilver: 460,
    interest: { rate: 0.006, cap: 5 },
    firstWaveDelay: 35,
    waveGap: 20,
    unlocks: ['sixgun', 'sigul', 'scattergun', 'mortar'],
    palette: { sky: [0x120a24, 0x5a2238, 0xd9703a], dust: 0xb08a64, ground: 0x5d4631 },
    waves: [
      W('Two Doors', [G('cantoi', 8, 1.2, { spawn: 'alt' })], 14, 1, 'Two doorways now. They split to see which of us blinks.'),
      W('Hounds Both Ways', [G('hound', 10, 0.6, { spawn: 'alt' }), G('cantoi', 6, 1.2, { spawn: 'alt', delay: 4 })], 16),
      W('Yellow Coats', [G('lowman', 4, 2.2, { spawn: 'alt' }), G('cantoi', 8, 1.2, { spawn: 'alt', delay: 3 })], 20, 1, 'Low Men. Lead glances off their coats. Try something that does not care.'),
      W('Rat Tide', [G('swarm', 24, 0.35, { spawn: 'alt' })], 18, 1),
      W('Marching Coats', [G('lowman', 8, 1.6, { spawn: 'alt' }), G('hound', 8, 0.6, { spawn: 'alt', delay: 6 })], 24, 1.1),
      W('Crowd Control', [G('cantoi', 20, 0.8, { spawn: 'alt' }), G('swarm', 16, 0.3, { spawn: 'alt', delay: 4 })], 24, 1.3),
      W('The Breaker', [G('breaker', 2, 5, { spawn: 'alt' }), G('cantoi', 14, 1.0, { spawn: 'alt' })], 28, 1.3, 'That hum is a Breaker. Kill it first, or everything near it heals.'),
      W('Hound Storm', [G('hound', 24, 0.35, { spawn: 'alt' })], 26, 1.5),
      W('Coat Parade', [G('lowman', 14, 1.1, { spawn: 'alt' }), G('cantoi', 12, 0.9, { spawn: 'alt', delay: 3 })], 32, 1.5),
      W('Breakers & Brutes', [G('brute', 3, 4, { spawn: 'alt' }), G('breaker', 3, 4, { spawn: 'alt', delay: 2 }), G('swarm', 20, 0.3, { spawn: 'alt', delay: 6 })], 36, 1.6),
      W('Dust and Teeth', [G('hound', 20, 0.35, { spawn: 'alt' }), G('lowman', 12, 1.0, { spawn: 'alt', delay: 3 })], 40, 1.9),
      W('The Cinder Tithe', [G('brute', 5, 3.5, { spawn: 'alt' }), G('lowman', 14, 1.0, { spawn: 'alt', delay: 4 }), G('cantoi', 24, 0.6, { spawn: 'alt', delay: 8 })], 60, 2.1, 'All of it, both doors. Stand.')
    ]
  },

  // ===================================================================== 3
  {
    id: 'thunderclap',
    hp: 1.4,
    number: 3,
    name: 'Thunderclap Flats',
    subtitle: 'Flat as a table, twice as exposed',
    map: THUNDERCLAP,
    shards: 10,
    startSilver: 560,
    interest: { rate: 0.006, cap: 6 },
    firstWaveDelay: 35,
    waveGap: 20,
    unlocks: ['sixgun', 'sigul', 'scattergun', 'mortar', 'beam', 'fire'],
    palette: { sky: [0x0d0820, 0x3d1c3a, 0xc9603a], dust: 0xa9835a, ground: 0x5a432d },
    waves: [
      W('Open Ground', [G('cantoi', 10, 1.1)], 14, 1, 'Nothing to hide behind out here. Build a trap, not a wall.'),
      W('First Crows', [G('crow', 8, 0.9)], 16, 1, 'Crows fly straight over your maze. Your mortar will not touch them.'),
      W('Hounds & Coats', [G('hound', 12, 0.5), G('lowman', 5, 2)], 20, 1.1),
      W('Black Sky', [G('crow', 14, 0.6), G('cantoi', 10, 1, { delay: 3 })], 22, 1.2),
      W('The Hum', [G('breaker', 3, 4), G('cantoi', 16, 0.8, { delay: 1 })], 26, 1.3),
      W('Brutes on the Flat', [G('brute', 4, 4), G('swarm', 20, 0.3, { delay: 5 })], 28, 1.4),
      W('Wings and Wolves', [G('crow', 16, 0.5), G('hound', 16, 0.4, { delay: 2 })], 28, 1.5),
      W('Coat Wall', [G('lowman', 16, 1.0), G('breaker', 2, 6, { delay: 2 })], 34, 1.6),
      W('Carrion Storm', [G('crow', 24, 0.4), G('swarm', 18, 0.3, { delay: 3 })], 34, 1.7),
      W('Iron Thunder', [G('brute', 7, 2.8), G('lowman', 10, 1.1, { delay: 3 })], 40, 1.8),
      W('Thin Air', [G('crow', 20, 0.4), G('hound', 20, 0.35, { delay: 2 }), G('breaker', 3, 4, { delay: 4 })], 42, 2.0),
      W('Blackbird Run', [G('crow', 30, 0.3), G('lowman', 14, 0.9, { delay: 3 })], 46, 2.1),
      W('Hush', [G('cantoi', 30, 0.5), G('breaker', 4, 3, { delay: 2 }), G('brute', 4, 3.5, { delay: 6 })], 50, 2.2, 'It got quiet. That is the Bear walking.'),
      W('The Iron Bear', [G('bear', 1, 1), G('hound', 12, 0.6, { delay: 6 }), G('cantoi', 14, 0.8, { delay: 10 })], 120, 1, 'A Guardian once. Put it out of its misery, Wren.')
    ]
  },

  // ===================================================================== 4
  {
    id: 'luds-spur',
    hp: 1.7,
    number: 4,
    name: "Lud's Spur",
    subtitle: 'Rails to a city that is not there',
    map: LUDS_SPUR,
    shards: 12,
    startSilver: 680,
    interest: { rate: 0.006, cap: 7 },
    firstWaveDelay: 35,
    waveGap: 20,
    unlocks: ['sixgun', 'sigul', 'scattergun', 'mortar', 'beam', 'fire', 'orb'],
    palette: { sky: [0x0b0719, 0x34193a, 0xb85a42], dust: 0x9a8268, ground: 0x4f3e30 },
    waves: [
      W('Switchbacks', [G('cantoi', 12, 1.0), G('hound', 8, 0.6, { delay: 4 })], 16, 1.1, 'Long road, lots of corners. The Orb likes a crowd; show it one.'),
      W('Rat Tide', [G('swarm', 30, 0.3)], 18, 1.2),
      W('Coats on the Rails', [G('lowman', 10, 1.4), G('breaker', 2, 5, { delay: 3 })], 26, 1.3),
      W('Wings Over Iron', [G('crow', 18, 0.5), G('cantoi', 14, 0.9, { delay: 3 })], 26, 1.4),
      W('Brute Force', [G('brute', 6, 3), G('swarm', 24, 0.3, { delay: 4 })], 32, 1.5),
      W('Dogs of the Spur', [G('hound', 30, 0.3), G('lowman', 8, 1.2, { delay: 3 })], 32, 1.6),
      W('Humming Line', [G('breaker', 6, 2.5), G('lowman', 14, 1.0, { delay: 2 }), G('cantoi', 20, 0.6, { delay: 4 })], 38, 1.7),
      W('Crow Court', [G('crow', 30, 0.35), G('brute', 5, 3, { delay: 3 })], 38, 1.8),
      W('Iron Rain', [G('brute', 10, 2.2), G('swarm', 30, 0.25, { delay: 3 })], 44, 1.9),
      W('Coat Tide', [G('lowman', 24, 0.8), G('breaker', 4, 3, { delay: 2 })], 46, 2.0),
      W('Thin Places', [G('hound', 36, 0.28), G('crow', 24, 0.4, { delay: 3 })], 48, 2.1),
      W('Rusk Says Stand', [G('brute', 10, 2.0), G('lowman', 16, 0.9, { delay: 2 }), G('breaker', 5, 3, { delay: 4 })], 54, 2.3, 'Stand, Wren. I am right here. Stand.'),
      W('The Siege Gang', [G('cantoi', 40, 0.4), G('crow', 24, 0.4, { delay: 4 }), G('brute', 6, 3, { delay: 6 })], 58, 2.4),
      W('Last Train', [G('lowman', 20, 0.8), G('brute', 10, 1.8, { delay: 2 }), G('breaker', 6, 2.5, { delay: 3 })], 64, 2.6),
      W('The Spur Tithe', [G('brute', 14, 1.5), G('lowman', 24, 0.7, { delay: 2 }), G('crow', 24, 0.4, { delay: 5 }), G('swarm', 30, 0.2, { delay: 8 })], 90, 2.8)
    ]
  },

  // ===================================================================== 5
  {
    id: 'algul-siento',
    hp: 1.15,
    number: 5,
    name: 'The Doorway at Algul Siento',
    subtitle: 'Where Breakers are made',
    map: ALGUL,
    shards: 12,
    startSilver: 820,
    interest: { rate: 0.006, cap: 8 },
    firstWaveDelay: 40,
    waveGap: 20,
    unlocks: ['sixgun', 'sigul', 'scattergun', 'mortar', 'beam', 'fire', 'orb', 'glass'],
    palette: { sky: [0x07040f, 0x2a1236, 0x9a3a46], dust: 0x8a7a70, ground: 0x44362e },
    waves: [
      W('Three Doors', [G('cantoi', 15, 0.9, { spawn: 'alt' })], 16, 1.3, 'Three doorways. Mind the middle one.'),
      W('Hounds from Everywhere', [G('hound', 24, 0.4, { spawn: 'alt' })], 20, 1.4),
      W('Spire Guard', [G('lowman', 12, 1.2, { spawn: 'alt' }), G('breaker', 3, 4, { spawn: 'alt', delay: 2 })], 30, 1.5),
      W('Wings', [G('crow', 24, 0.45, { spawn: 'alt' }), G('swarm', 24, 0.3, { spawn: 'alt', delay: 3 })], 30, 1.6),
      W('Brute Squad', [G('brute', 9, 2.4, { spawn: 'alt' }), G('cantoi', 20, 0.7, { spawn: 'alt', delay: 3 })], 38, 1.7),
      W('The Breakers Hum', [G('breaker', 9, 2, { spawn: 'alt' }), G('lowman', 18, 0.9, { spawn: 'alt', delay: 2 })], 40, 1.8),
      W('Carrion Court', [G('crow', 36, 0.3, { spawn: 'alt' }), G('hound', 24, 0.35, { spawn: 'alt', delay: 3 })], 42, 1.9),
      W('Iron Procession', [G('brute', 14, 1.8, { spawn: 'alt' }), G('lowman', 16, 1.0, { spawn: 'alt', delay: 3 })], 48, 2.0),
      W('Static', [G('swarm', 60, 0.18, { spawn: 'alt' }), G('hound', 24, 0.35, { spawn: 'alt', delay: 4 })], 46, 2.1),
      W('The Coat Wall', [G('lowman', 30, 0.7, { spawn: 'alt' }), G('breaker', 6, 2.5, { spawn: 'alt', delay: 2 })], 54, 2.3),
      W('Black Flock', [G('crow', 40, 0.28, { spawn: 'alt' }), G('brute', 8, 2.5, { spawn: 'alt', delay: 3 })], 56, 2.4),
      W('Breaking Point', [G('breaker', 12, 1.6, { spawn: 'alt' }), G('brute', 12, 1.6, { spawn: 'alt', delay: 2 }), G('cantoi', 40, 0.4, { spawn: 'alt', delay: 4 })], 62, 2.6),
      W('All the Dogs', [G('hound', 60, 0.2, { spawn: 'alt' }), G('lowman', 20, 0.8, { spawn: 'alt', delay: 3 })], 62, 2.7),
      W('Tithe-Day', [G('brute', 18, 1.4, { spawn: 'alt' }), G('lowman', 24, 0.7, { spawn: 'alt', delay: 2 }), G('crow', 30, 0.3, { spawn: 'alt', delay: 4 })], 70, 2.9),
      W('Gray Coats', [G('lowman', 36, 0.55, { spawn: 'alt' }), G('breaker', 10, 1.8, { spawn: 'alt', delay: 2 }), G('swarm', 40, 0.2, { spawn: 'alt', delay: 4 })], 76, 3.1),
      W('The Last Road', [G('brute', 24, 1.1, { spawn: 'alt' }), G('crow', 40, 0.25, { spawn: 'alt', delay: 3 }), G('hound', 40, 0.25, { spawn: 'alt', delay: 6 })], 90, 3.3),
      W('He Aims With His Hand', [G('ashe', 1, 1, { spawn: 2 }), G('cantoi', 30, 0.5, { spawn: 'alt', delay: 6 }), G('lowman', 20, 0.9, { spawn: 'alt', delay: 12 })], 200, 1, 'Corvin Ashe. Aims with his hand. Forgot the face of his father. Remind him.')
    ]
  }
];
