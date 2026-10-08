// Scene flow helpers: briefing -> game -> result, and typewriter text.
import { LEVELS } from '../../sim/data/levels.js';
import { LEVEL_LORE } from '../../sim/data/lore.js';

/**
 * Fade out, then start `key`. Only the first call per scene run counts: a second click during the fade (say "Ride out"
 * then "Menu") would otherwise start BOTH scenes, leaving one running invisibly and still taking clicks. The flag
 * lives on the camera because Phaser recreates cameras on every scene start, so it can't go stale like a scene field.
 */
export function leaveTo(scene, key, data, ms = 500) {
  const cam = scene.cameras.main;
  if (cam.leaving) return false;
  cam.leaving = true;
  cam.fadeOut(ms, 7, 5, 10);
  cam.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
  return true;
}

export function startLevelFlow(scene, levelIndex, difficulty = 'normal', { skipBriefing = false, endless = false } = {}) {
  const level = LEVELS[levelIndex];
  const lore = LEVEL_LORE[level.id];
  if (skipBriefing || endless || !lore) return leaveTo(scene, 'Game', { level: levelIndex, difficulty, endless });
  return leaveTo(scene, 'Story', {
    title: `${level.number}. ${level.name}`,
    subtitle: level.subtitle,
    speaker: lore.speaker,
    slides: lore.briefing,
    palette: level.palette,
    next: { scene: 'Game', data: { level: levelIndex, difficulty } }
  });
}

/** Reveal `str` into a Text object a few characters at a time. Returns { skip(), done }. */
export function typewriter(scene, textObj, str, { cps = 55, onDone, sfx } = {}) {
  let i = 0;
  const state = { done: false };
  textObj.setText('');
  const ev = scene.time.addEvent({
    delay: 1000 / cps,
    loop: true,
    callback: () => {
      i = Math.min(str.length, i + 1);
      textObj.setText(str.slice(0, i));
      if (i % 4 === 0 && str[i - 1] !== ' ') sfx?.play('hover', { volume: 0.25, gap: 0.05, rate: 0.7 + Math.random() * 0.3 });
      if (i >= str.length) finish();
    }
  });
  const finish = () => {
    if (state.done) return;
    state.done = true;
    ev.remove(false);
    textObj.setText(str);
    onDone?.();
  };
  state.skip = finish;
  return state;
}
