import { POSTS, TARGET_MODE_LABEL } from '../../sim/data/posts.js';
import { fmt } from './kit.js';

/** Human-readable stat lines for a post at a tier (0-based), using already-buffed stats when given. */
export function statLines(type, level, s = null) {
  const def = POSTS[type];
  const L = s ?? def.levels[level];
  switch (def.behavior) {
    case 'hitscan': return [`Damage ${fmt(L.damage)}  ·  ${fmt(L.rate)} shots/s`, `DPS ${Math.round(L.damage * L.rate)}  ·  Range ${fmt(L.range)}`, L.dual ? 'Dual-wield' : 'Single target'];
    case 'cone': return [`${L.pellets} pellets × ${fmt(L.damage)}  ·  ${fmt(L.rate)}/s`, `Range ${fmt(L.range)}  ·  Spread ${L.angle}°`, L.knockback ? 'Knocks enemies back' : 'Hits everything in the cone'];
    case 'beam': return [`DPS ${fmt(L.dps0)} → ${fmt(L.dpsMax)} (ramps ${L.ramp}s)`, `Range ${fmt(L.range)}  ·  Targets ${L.targets}`, 'Ignores armor'];
    case 'mortar': return [`Damage ${fmt(L.damage)}  ·  Splash ${fmt(L.radius)}`, `${fmt(L.rate)} shells/s  ·  Range ${fmt(L.range)}`, 'Ground only · min range ' + L.minRange];
    case 'chain': return [`Damage ${fmt(L.damage)}  ·  ${L.jumps} jumps`, `Range ${fmt(L.range)}  ·  ${fmt(L.rate)}/s`, L.stun ? `Armor halved · ${Math.round(L.stun * 100)}% stun` : 'Armor halved'];
    case 'slowAura': return [`Slows ${Math.round(L.slow * 100)}%  ·  Radius ${fmt(L.radius)}`, L.dps ? `Burns ${fmt(L.dps)}/s` : 'No damage', 'Strongest slow applies'];
    case 'stasis': return [`Freezes ${fmt(L.duration)}s every ${fmt(L.cooldown)}s`, `Radius ${fmt(L.radius)}`, 'Frozen enemies take +25% damage'];
    case 'buff': return [`+${Math.round((L.dmg - 1) * 100)}% damage  ·  +${Math.round((L.range - 1) * 100)}% range`, L.rate > 1 ? `+${Math.round((L.rate - 1) * 100)}% fire rate` : 'No fire-rate bonus', `Radius ${fmt(L.radius)}`];
    default: return [];
  }
}

export { TARGET_MODE_LABEL };
