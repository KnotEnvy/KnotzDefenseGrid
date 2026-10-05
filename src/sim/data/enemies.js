// The Red Tithe. speed in px/s (a cell is 32 px).

export const ENEMIES = {
  cantoi: {
    id: 'cantoi', name: 'Can-toi', hp: 40, speed: 46, armor: 0, reward: 6, radius: 10,
    blurb: 'Low creatures. They come in numbers, and they steal.'
  },
  hound: {
    id: 'hound', name: 'Thinny Hound', hp: 22, speed: 92, armor: 0, reward: 5, radius: 9,
    blurb: 'Out of the thinny, lean and fast. Loves a straight line.'
  },
  lowman: {
    id: 'lowman', name: 'Low Man', hp: 130, speed: 40, armor: 5, reward: 14, radius: 12,
    blurb: 'Yellow coat, dead eyes. Lead glances off.'
  },
  swarm: {
    id: 'swarm', name: 'Rat-Taheen', hp: 9, speed: 68, armor: 0, reward: 2, radius: 7,
    blurb: 'A tide of small bodies. Feed them to the scattergun.'
  },
  crow: {
    id: 'crow', name: 'Carrion Crow', hp: 34, speed: 78, armor: 0, reward: 8, radius: 9, flying: true,
    blurb: 'Flies straight over your maze. Mortars cannot touch it.'
  },
  breaker: {
    id: 'breaker', name: 'Breaker Acolyte', hp: 95, speed: 38, armor: 1, reward: 18, radius: 11,
    aura: { radius: 90, regen: 9 },
    blurb: 'Hums the wrong note. Allies near it knit their wounds. Kill it first.'
  },
  brute: {
    id: 'brute', name: 'Mutie Brute', hp: 360, speed: 34, armor: 3, reward: 34, radius: 15,
    blurb: 'Slow, huge, and very hard to put down.'
  },
  bear: {
    id: 'bear', name: 'The Iron Bear', hp: 3200, speed: 26, armor: 7, reward: 240, radius: 22, boss: true,
    enrage: { at: 0.5, speed: 1.45, armor: -2 },
    roar: { every: 9, radius: 150, haste: 1.3, time: 4 },
    blurb: 'Once a Guardian of the Beam. Now a thing with a hole where the oath was.'
  },
  ashe: {
    id: 'ashe', name: 'Corvin Ashe', hp: 8500, speed: 30, armor: 6, reward: 600, radius: 16, boss: true,
    hex: { every: 8, time: 3.5, range: 240 },
    summon: { type: 'cantoi', every: 5, count: 2 },
    blurb: 'The Ashen Gunslinger. Same guns as you. Broken oath.'
  }
};
