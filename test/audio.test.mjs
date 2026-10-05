import test from 'node:test';
import assert from 'node:assert/strict';
import { SFX_GENERATORS, musicBuffer } from '../src/game/audio/Sfx.js';

// Audio can't be listened to in CI, so check the synthesis for the failure modes that matter:
// NaN/Infinity samples, silence, clipping, absurd lengths.
const SR = 22050;

test('every synthesised effect is finite, audible, unclipped and a sane length', () => {
  for (const [name, fn] of Object.entries(SFX_GENERATORS)) {
    const d = fn(SR);
    assert.ok(d.length > SR * 0.03 && d.length < SR * 4, `${name}: length ${d.length}`);
    let peak = 0;
    let sumSq = 0;
    for (let i = 0; i < d.length; i++) {
      assert.ok(Number.isFinite(d[i]), `${name}: non-finite sample at ${i}`);
      peak = Math.max(peak, Math.abs(d[i]));
      sumSq += d[i] * d[i];
    }
    assert.ok(peak > 0.1, `${name}: nearly silent (peak ${peak})`);
    assert.ok(peak <= 1.0001, `${name}: clips (peak ${peak})`);
    assert.ok(Math.sqrt(sumSq / d.length) > 0.005, `${name}: RMS too low`);
  }
});

test('the beam hum loops without a click', () => {
  const d = SFX_GENERATORS.beam_loop(SR);
  assert.ok(Math.abs(d[0] - d[d.length - 1]) < 0.35, 'start and end of the loop are close in value');
});

test('both music tracks are finite stereo and loop-safe', () => {
  const fakeCtx = {
    sampleRate: 8000,
    createBuffer(ch, n) {
      const data = Array.from({ length: ch }, () => new Float32Array(n));
      return { numberOfChannels: ch, length: n, getChannelData: i => data[i] };
    }
  };
  for (const kind of ['menu', 'game']) {
    const b = musicBuffer(fakeCtx, kind);
    assert.equal(b.numberOfChannels, 2);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let peak = 0;
      for (let i = 0; i < d.length; i++) {
        assert.ok(Number.isFinite(d[i]), `${kind}: non-finite`);
        peak = Math.max(peak, Math.abs(d[i]));
      }
      assert.ok(peak > 0.2 && peak <= 1, `${kind}: peak ${peak}`);
    }
  }
});
