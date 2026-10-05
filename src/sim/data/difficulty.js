// Difficulty only scales numbers; the sim and levels are otherwise identical.
export const DIFFICULTY = {
  easy: { id: 'easy', name: 'Pilgrim', blurb: 'Gentler Tithe, fatter purse.', hp: 0.75, reward: 1.2, silver: 1.25 },
  normal: { id: 'normal', name: 'Gunslinger', blurb: 'The intended road.', hp: 1, reward: 1, silver: 1 },
  hard: { id: 'hard', name: 'Last Line', blurb: 'The Tithe has done this before.', hp: 1.35, reward: 0.9, silver: 0.9 }
};
export const DIFFICULTY_ORDER = ['easy', 'normal', 'hard'];
