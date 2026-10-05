// Camera post-processing built from Phaser 4 Filters.
//
//   lens effects (ParallelFilters + Mask)   localized "thinny" ripple at the Doorway, Wizard's Glass negative
//   bloom        (Actions.AddEffectBloom)   makes the Beam, muzzle flashes and shards glow
//   grade        (ColorMatrix)              dusty, warm Mid-World colour grade
//   danger       (ColorMatrix, tweened)     red wash when a shard is stolen
//   vignette                                 darkened edges
//
// Cameras are destroyed with their Scene, so this is rebuilt on every GameScene create().

import Phaser from 'phaser';
import { isLow } from '../settings.js';

function circleMask(scene, soft = 0.22) {
  return scene.make.gradient({
    x: 0, y: 0, width: 256, height: 256,
    config: {
      shapeMode: 2, start: { x: 0.5, y: 0.5 }, shape: { x: 0.5, y: 0 },
      bands: [
        { start: 0, end: 1 - soft, colorStart: [1, 1, 1, 1], colorEnd: [1, 1, 1, 1] },
        { start: 1 - soft, end: 1, colorStart: [1, 1, 1, 1], colorEnd: [1, 1, 1, 0], interpolation: 2 }
      ]
    }
  }, false);
}

class Lens {
  /** @param build (filterList) => void  adds the effect filters to the parallel "top" path */
  constructor(scene, cam, build) {
    this.scene = scene;
    this.cam = cam;
    this.mask = circleMask(scene);
    this.pf = cam.filters.internal.addParallelFilters();
    this.pf.active = false;
    build(this.pf.top, this);
    this.maskFx = this.pf.top.addMask(this.mask, false, cam);
    this.pf.blend.blendMode = Phaser.BlendModes.NORMAL;
    this.tween = null;
  }

  /** Grow a circular region of the effect at world (x, y). */
  play(x, y, radius, ms, { ease = 'Cubic.easeOut', onUpdate, onDone } = {}) {
    this.tween?.stop();
    this.mask.setPosition(x, y).setScale(0.05);
    this.pf.active = true;
    const state = { k: 0 };
    this.tween = this.scene.tweens.add({
      targets: state, k: 1, duration: ms, ease,
      onUpdate: () => {
        const s = (2 * radius * (0.05 + 0.95 * state.k)) / 256;
        this.mask.setScale(s);
        onUpdate?.(state.k);
      },
      onComplete: () => {
        this.pf.active = false;
        onDone?.();
      }
    });
  }

  destroy() {
    this.tween?.stop();
    try {
      this.pf.top.clear();
      this.pf.bottom.clear();
    } catch {
      /* camera already gone */
    }
    this.mask.destroy();
  }
}

const VIGNETTE = 0.1;

/** 4x5 colour matrix: saturation (1 = unchanged) followed by per-channel gain. */
function gradeMatrix(sat, [gr, gg, gb]) {
  const lr = 0.3086;
  const lg = 0.6094;
  const lb = 0.082;
  const m = (c, gain) => [(lr * (1 - sat) + (c === 0 ? sat : 0)) * gain, (lg * (1 - sat) + (c === 1 ? sat : 0)) * gain, (lb * (1 - sat) + (c === 2 ? sat : 0)) * gain, 0, 0];
  return [...m(0, gr), ...m(1, gg), ...m(2, gb), 0, 0, 0, 1, 0];
}

export function installPostFx(scene) {
  const cam = scene.cameras.main;
  const list = cam.filters.internal;
  const fx = { cam };

  const low = isLow();

  // --- thinny ripple: displace the picture with an animated simplex normal field, only inside a circle
  if (!low) try {
    const key = `riftMap_${scene.scene.key}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    fx.riftMapObj = scene.add.noisesimplex2d({
      noiseCells: [3, 3], noiseIterations: 2, noiseWarpAmount: 0.3, noiseNormalMap: true, noiseNormalScale: 6, noiseSeed: [5, 9]
    }, 0, 0, 256, 256).setRenderToTexture(key);
    fx.riftKey = key;
    fx.rift = new Lens(scene, cam, top => {
      fx.riftDisp = top.addDisplacement(key, 0, 0);
    });
  } catch (e) {
    console.warn('rift lens unavailable', e);
  }

  // --- Wizard's Glass: inside the pulse the world is shown as a desaturated, inverted negative
  if (!low) try {
    fx.glass = new Lens(scene, cam, top => {
      const cm = top.addColorMatrix();
      cm.colorMatrix.negative();
      cm.colorMatrix.saturate(-0.65, true);
      const tint = top.addColorMatrix();
      tint.colorMatrix.multiply([0.8, 0, 0, 0, 0, 0, 0.85, 0.05, 0, 0, 0.1, 0.1, 1.1, 0, 0, 0, 0, 0, 1, 0]);
    });
  } catch (e) {
    console.warn('glass lens unavailable', e);
  }

  // --- bloom, assembled by hand rather than with Actions.AddEffectBloom. The stock Threshold also thresholds
  // *alpha*, so the bloom layer comes out fully opaque and ADD-blending it pushes the frame alpha to 2.0; the next
  // filter then un-premultiplies and halves the picture. Thresholding RGB only and zeroing alpha keeps the bloom a
  // pure additive light layer.
  if (!low) try {
    const pf = list.addParallelFilters();
    pf.top.addThreshold([0.66, 0.66, 0.66, 2], [1, 1, 1, 3]);
    fx.bloomBlur = pf.top.addBlur(0, 3, 3, 1, 0xffffff, 3);
    pf.blend.blendMode = Phaser.BlendModes.ADD;
    pf.blend.amount = 0.75;
    fx.bloom = pf;
  } catch (e) {
    console.warn('bloom unavailable', e);
  }

  // --- grade: slightly desaturated, warm highlights. Built as one explicit 4x5 matrix (saturation x tint gain)
  // so it is predictable: the preset helpers reset the matrix on every call.
  const grade = list.addColorMatrix();
  grade.colorMatrix.set(gradeMatrix(0.9, [1.07, 1.01, 0.95]));
  fx.grade = grade;

  // --- danger wash (kept inactive until needed)
  const danger = list.addColorMatrix();
  danger.colorMatrix.set([1.1, 0, 0, 0, 0, 0, 0.55, 0, 0, 0, 0, 0, 0.55, 0, 0, 0, 0, 0, 1, 0]);
  danger.colorMatrix.alpha = 0;
  danger.setActive(false);
  fx.danger = danger;

  // --- vignette. The shader blends the vignette colour by sin(d / radius * PI * strength), with d in UV units,
  // so a subtle edge falloff needs a *small* strength (0.14 darkens the corners by roughly a quarter).
  fx.vignette = list.addVignette(0.5, 0.5, 1.2, VIGNETTE, 0x05030a);
  fx.vignetteBase = VIGNETTE;
  return fx;
}

/** Red wash + deeper vignette; call when a shard is lost. */
export function dangerPulse(scene, fx) {
  if (!fx?.danger) return;
  fx.danger.setActive(true);
  scene.tweens.add({
    targets: fx.danger.colorMatrix, alpha: { from: 0.55, to: 0 }, duration: 700, ease: 'Quad.easeOut',
    onComplete: () => fx.danger.setActive(false)
  });
  if (fx.vignette) {
    fx.vignette.setColor(0x40000c);
    scene.tweens.add({ targets: fx.vignette, strength: { from: 0.4, to: VIGNETTE }, duration: 900, ease: 'Quad.easeOut', onComplete: () => fx.vignette.setColor(0x05030a) });
  }
}

export function destroyPostFx(fx) {
  if (!fx) return;
  fx.rift?.destroy();
  fx.glass?.destroy();
  fx.riftMapObj?.destroy();
}

/** Lighter stack for the menu/story/map scenes: bloom + grade + vignette. */
export function installBasicFx(scene, { bloom = isLow() ? 0 : 0.8 } = {}) {
  const cam = scene.cameras.main;
  const list = cam.filters.internal;
  if (bloom > 0) {
    const pf = list.addParallelFilters();
    pf.top.addThreshold([0.6, 0.6, 0.6, 2], [1, 1, 1, 3]);
    pf.top.addBlur(0, 3, 3, 1, 0xffffff, 3);
    pf.blend.blendMode = Phaser.BlendModes.ADD;
    pf.blend.amount = bloom;
  }
  const grade = list.addColorMatrix();
  grade.colorMatrix.set(gradeMatrix(0.95, [1.05, 1.0, 0.97]));
  list.addVignette(0.5, 0.5, 1.2, 0.12, 0x05030a);
}
