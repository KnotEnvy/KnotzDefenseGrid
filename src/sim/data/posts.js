// Gunslinger posts ("towers"). Pure data, tuned with the headless bot (see test/bot.mjs).
//
// levels[0].cost is the build price; levels[n].cost is the price to upgrade *to* tier n+1.
// Sell value is SELL_REFUND of everything invested.

export const SELL_REFUND = 0.7;

export const POSTS = {
  sixgun: {
    id: 'sixgun',
    name: 'Sixgun',
    epithet: 'The Gunslinger',
    blurb: 'Fast, accurate, honest lead. Falls short against armor.',
    behavior: 'hitscan',
    tiers: ['Sixgun', 'Twin Sixguns', 'Sandalwood Pair'],
    levels: [
      { cost: 60, damage: 8, rate: 3.0, range: 150 },
      { cost: 70, damage: 12, rate: 3.6, range: 165 },
      { cost: 110, damage: 18, rate: 4.6, range: 180, dual: true }
    ]
  },
  sigul: {
    id: 'sigul',
    name: 'Sigul Ward',
    epithet: "Mercy's carved stones",
    blurb: 'Does no harm itself. Enemies caught in its glow wade through honey.',
    behavior: 'slowAura',
    tiers: ['Sigul Ward', 'Deep Sigul', 'Binding Sigul'],
    levels: [
      { cost: 80, radius: 110, slow: 0.3, dps: 0 },
      { cost: 80, radius: 125, slow: 0.4, dps: 0 },
      { cost: 120, radius: 140, slow: 0.5, dps: 6 }
    ]
  },
  scattergun: {
    id: 'scattergun',
    name: 'Scattergun',
    epithet: 'Close-quarters scattershot',
    blurb: 'A cone of buckshot. Devastating up close, wasted at range.',
    behavior: 'cone',
    tiers: ['Scattergun', 'Double Barrel', 'Dragon Load'],
    levels: [
      { cost: 90, damage: 6, pellets: 7, rate: 1.1, range: 105, angle: 46 },
      { cost: 90, damage: 7, pellets: 9, rate: 1.25, range: 112, angle: 50 },
      { cost: 130, damage: 9, pellets: 11, rate: 1.4, range: 120, angle: 54, knockback: 14 }
    ]
  },
  mortar: {
    id: 'mortar',
    name: 'Powder Mortar',
    epithet: "Powder Finch's contraption",
    blurb: 'Lobs a keg of black powder. Splash damage; cannot hit flyers or very close targets.',
    behavior: 'mortar',
    tiers: ['Powder Mortar', 'Long Fuse', 'Hellfire Keg'],
    levels: [
      { cost: 120, damage: 42, radius: 54, rate: 0.55, range: 250, minRange: 70, shellSpeed: 230 },
      { cost: 110, damage: 64, radius: 60, rate: 0.6, range: 275, minRange: 70, shellSpeed: 240 },
      { cost: 160, damage: 92, radius: 68, rate: 0.68, range: 300, minRange: 70, shellSpeed: 250 }
    ]
  },
  beam: {
    id: 'beam',
    name: 'Beam Conduit',
    epithet: 'A shard-fed lens',
    blurb: 'A steady lance of Beam-light. Burns hotter the longer it holds. Ignores armor.',
    behavior: 'beam',
    tiers: ['Beam Conduit', 'Focused Lens', 'Twin Lens'],
    levels: [
      { cost: 130, dps0: 14, dpsMax: 38, ramp: 3.0, range: 170, targets: 1 },
      { cost: 120, dps0: 20, dpsMax: 54, ramp: 2.6, range: 185, targets: 1 },
      { cost: 170, dps0: 28, dpsMax: 74, ramp: 2.2, range: 200, targets: 2 }
    ]
  },
  fire: {
    id: 'fire',
    name: 'Ka-Tet Fire',
    epithet: 'Where the ka-tet gathers',
    blurb: 'A campfire. Posts gathered close fight harder: more damage, range, and speed.',
    behavior: 'buff',
    tiers: ['Ka-Tet Fire', 'Long Night', 'Many Made One'],
    levels: [
      { cost: 110, radius: 112, dmg: 1.2, range: 1.08, rate: 1.0 },
      { cost: 100, radius: 120, dmg: 1.3, range: 1.12, rate: 1.1 },
      { cost: 150, radius: 130, dmg: 1.45, range: 1.16, rate: 1.25 }
    ]
  },
  orb: {
    id: 'orb',
    name: "Maerlyn's Orb",
    epithet: 'A pink sphere that remembers lightning',
    blurb: 'Lightning that leaps from foe to foe. Halves armor. Stuns at the last tier.',
    behavior: 'chain',
    tiers: ["Maerlyn's Orb", 'Storm Memory', 'Pink Tempest'],
    levels: [
      { cost: 150, damage: 22, rate: 1.0, range: 145, jumps: 4, jumpRange: 90, falloff: 0.86, armorMul: 0.5 },
      { cost: 140, damage: 30, rate: 1.1, range: 155, jumps: 6, jumpRange: 95, falloff: 0.88, armorMul: 0.5 },
      { cost: 190, damage: 40, rate: 1.2, range: 165, jumps: 8, jumpRange: 100, falloff: 0.9, armorMul: 0.5, stun: 0.2, stunTime: 0.9 }
    ]
  },
  glass: {
    id: 'glass',
    name: "Wizard's Glass",
    epithet: 'The Glass that shows what was',
    blurb: 'Periodically stops time around itself. Frozen enemies take extra damage.',
    behavior: 'stasis',
    tiers: ["Wizard's Glass", 'Clear Glass', 'The Seeing Glass'],
    levels: [
      { cost: 200, radius: 105, duration: 1.6, cooldown: 9 },
      { cost: 180, radius: 120, duration: 2.4, cooldown: 8.5 },
      { cost: 260, radius: 140, duration: 3.2, cooldown: 8 }
    ]
  }
};

export const POST_ORDER = ['sixgun', 'sigul', 'scattergun', 'mortar', 'beam', 'fire', 'orb', 'glass'];

/** Targeting priorities selectable per post. */
export const TARGET_MODES = ['thief', 'closest', 'strongest'];
export const TARGET_MODE_LABEL = { thief: 'Thieves first', closest: 'Closest', strongest: 'Strongest' };

/** Fraction of a hit that always gets through armor. */
export const ARMOR_FLOOR = 0.25;

export const TIME_VULN = 1.25; // damage multiplier on enemies frozen by the Glass

export function buildCost(post) {
  return post.levels[0].cost;
}

export function totalInvested(post, level) {
  let sum = 0;
  for (let i = 0; i <= level; i++) sum += post.levels[i].cost;
  return sum;
}
