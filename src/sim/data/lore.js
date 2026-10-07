// Story text. Original writing set in the world of the Dark Tower (unofficial fan work).

export const TITLE = 'BEAMFALL';
export const SUBTITLE = 'A Dark Tower Defense';
export const TAGLINE = 'Hold the Beam.';

// Why gunslingers exist: the opening crawl. Each entry is one slide.
export const PROLOGUE = [
  'The world has moved on. Everyone says so, and everyone is right: the roads have forgotten where they were going, the rivers run the wrong way, and the sky has a crack in it that nobody mentions.',
  'But something still stands at the center of everything. A Tower, so tall its top is weather. Six Beams of force run to it from the rim of creation, and the Tower stands because the Beams hold.',
  'Arthur Eld’s line forged the guns for one purpose. Not conquest. Not law. Keeping. A gunslinger is a hinge: the hardware that keeps the door of the world from swinging off its post.',
  'So the Eld built Waystations along every Beam, and in each they set shards of the Beam’s own light, to nail it to the ground. Where a shard rests, the Beam holds. Where one is carried off through a doorway, the Beam thins, and the world behind it comes apart.',
  'Gilead has fallen. The old order is ash. The Crimson King does not need Mid-World conquered; he only needs the Beam thin enough to snap. So his Red Tithe do not come to kill. They come to steal.',
  'You are Wren Calloway, the last ’prentice. You were not ready. Nobody ever is. There is a Waystation at Dry Creek, eight shards, and a doorway about to open.'
];

export const PROLOGUE_FINAL = 'Hold the Beam.';

// Per-level briefing (before) and epilogue (after a win), keyed by level id.
export const LEVEL_LORE = {
  'dry-creek': {
    speaker: 'Sai Tobias Rusk',
    briefing: [
      'Eight shards. One road in, one road out, and it is the same road they will want to leave by. Put guns where it bends.',
      'Watch for the ones carrying something. Kill a thief and the shard drops. Let it lie a moment and it finds its own way home.',
      'And Wren: do not seal the road. Make it longer. A road with no end is a door that was never built.'
    ],
    tips: ['Shoot the one carrying a shard.', 'Walls make them walk further. Walking further makes them die.', 'Banked silver earns interest. Patience pays.'],
    outro: 'They came with knives and went away with less. Rusk said nothing, which from Rusk is a medal.'
  },
  'cinder-road': {
    speaker: 'Mercy Vale',
    briefing: [
      'Gilead stood here once. Now it is rubble that remembers being walls. Two doorways open on the Cinder-Road, and I can feel both of them in my teeth.',
      'I was a Breaker. I ran from the Spire. I know what they are doing, and I brought stones. Sigul-stones, carved to hold a Beam’s edge steady.',
      'Low Men wear yellow coats that turn lead aside. Mortars do not care. Neither does anything that burns.'
    ],
    tips: ['Armor shrugs off small bullets. Use powder, light, and lightning.', 'Two doors means two roads. Cover where they merge.'],
    outro: 'Mercy says the Tithe is taking shards from every Waystation on the Beam, not just ours. Somebody is counting.'
  },
  thunderclap: {
    speaker: 'Powder Finch',
    briefing: [
      'Flat as a table and twice as exposed! I rolled in on a handcar with a keg of black powder and a grin. Wren, you want a mortar. You want three.',
      'There are crows now, and crows do not respect a maze. A Beam will not miss one.',
      'There is something out on the flats that walks like it is made of anvils. I would not be here when it arrives, but I am going to be.'
    ],
    tips: ['Flyers ignore your maze and the mortar. Keep a Sixgun or Beam near the Waystation.', 'A campfire makes every post around it hit harder.'],
    outro: 'The Bear had been a Guardian once. In its last second its eyes cleared and it looked at Wren, and something like thanks crossed its face. Then it was only iron.'
  },
  'luds-spur': {
    speaker: 'Sai Tobias Rusk',
    briefing: [
      'The rails here run to a city that is not there. Walk them long enough and they run back to where you started. Ka is a wheel, Wren.',
      'My side has opened up again. Do not look. I will call the waves from this ammunition crate like a man reading a will.',
      'Mercy’s pink sphere remembers lightning. Feed it a crowd and it will tell you everything it knows.'
    ],
    tips: ['Chain lightning loves a crowd.', 'Breakers heal what you hurt. Shoot the hum.'],
    outro: 'Rusk did not die so much as stop talking, mid-sentence, as if he had decided the rest was obvious. Bix lay down across his boots and stayed there. His voice went on in Wren’s head, as old men’s voices do.'
  },
  'algul-siento': {
    speaker: 'Mercy Vale',
    briefing: [
      'Algul Siento. This is where Breakers are made. Three doorways, and behind the middle one, a gunslinger in a gray coat.',
      'Corvin Ashe. He was Rusk’s year. He aimed with his hand and forgot the face of his father. He will turn your posts to stone for a few breaths at a time.',
      'The Glass shows what was. Use it when the road is full.'
    ],
    tips: ['Ashe hexes one post at a time. Never rely on only one.', 'The Glass stops time. Use it on crowds and bosses.'],
    outro: 'The Beam hummed. Far away, a Tower that was not yet finished being tall acknowledged her, the way a very old man acknowledges a child at a gate. Ka is a wheel. The wheel turned. Wren Calloway, last ’prentice, reloaded.'
  }
};

// Rusk's running commentary, by event.
export const RUSK = {
  waveStart: ['Here they come.', 'Steady, ’prentice.', 'Doorway’s open.', 'Count your shards.', 'Eyes on the carriers.', 'Breathe. Aim. Breathe.', 'Spend what you have. Save what you can.'],
  waveClear: ['Quiet. Spend your silver.', 'That’s one. There is always another.', 'Good shooting. Do not get proud.', 'Reload while you can.', 'Mind the interest. A hoard is a weapon too.'],
  shardPick: ['That one’s carrying a shard! Shoot the thief!', 'Thief! He took one!', 'A shard is on the move. Put him down.'],
  shardLost: ['Gone through the Doorway. Do not look at the hole it leaves.', 'Lost one. The Beam feels thinner.', 'That one’s not coming back.'],
  shardDrop: ['It’s loose. Hold the ground until it finds its way home.', 'Dropped! Do not let another thief find it.'],
  shardHome: ['Back where it belongs.', 'Home. Good.'],
  build: ['Good ground.', 'Fine place for it.', 'That will do.'],
  blocked: ['Leave them a road, ’prentice. A sealed road is a doorway to nowhere.', 'No. They have to be able to walk, or the world stops making sense.'],
  boss: ['That is no thief. That is the Tithe’s collection plate.', 'Big one. Shoot it until it stops.'],
  low: ['Three shards left. Think carefully.', 'Do not lose another.'],
  win: ['Well. It held.', 'The Beam holds. For now.'],
  lose: ['The Beam is snapping. Run if you can.', 'It is thin. It is so thin.']
};

export const CAST = {
  rusk: 'Sai Tobias Rusk',
  mercy: 'Mercy Vale',
  powder: 'Powder Finch',
  bix: 'Bix'
};

export const ENDLESS_LORE = 'The Wheel turns. The doorway opens again, and you are standing where you were. Ka is a wheel; so is the road.';

export const CREDITS = [
  'BEAMFALL',
  'A Dark Tower defense, built on Phaser 4',
  '',
  'Unofficial fan project. Not affiliated with or endorsed by Stephen King or his publishers.',
  'Inspired in structure by Hidden Path Entertainment’s Defense Grid: The Awakening.',
  '',
  'Long days and pleasant nights.'
];
