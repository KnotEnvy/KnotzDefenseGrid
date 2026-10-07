// Fully synthesised audio: no sound files ship with BEAMFALL.
//   * SFX are generated as Float32 DSP (noise bursts, chirps, Karplus-Strong plucks, FM bells).
//   * Music is a generative loop: wind bed + drone + sparse guitar-ish plucks with a feedback echo.
// Buffers are handed to Phaser's sound manager through `cache.audio.add(key, AudioBuffer)`.

const TAU = Math.PI * 2;
const rnd = () => Math.random() * 2 - 1;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const tick = () => new Promise(r => setTimeout(r, 0));

/** Run `fn(t, i)` for n samples into a fresh Float32Array. */
function gen(sr, secs, fn) {
  const n = Math.max(1, Math.floor(sr * secs));
  const d = new Float32Array(n);
  for (let i = 0; i < n; i++) d[i] = fn(i / sr, i);
  return d;
}

function normalize(d, peak = 0.9) {
  let m = 0;
  for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
  if (m > 0) for (let i = 0; i < d.length; i++) d[i] = (d[i] / m) * peak;
  return d;
}

/** One-pole low-pass state helper. */
const lp = k => {
  let y = 0;
  return x => (y += k * (x - y));
};

const phaseOf = f0 => {
  let p = 0;
  return (f, sr) => ((p += (TAU * f) / sr), Math.sin(p));
};

function pluck(out, start, freq, dur, amp, sr, decay = 0.997, bright = 0.6) {
  const N = Math.max(2, Math.round(sr / freq));
  const line = new Float32Array(N);
  const f = lp(bright);
  for (let i = 0; i < N; i++) line[i] = f(rnd());
  let idx = 0;
  const n = Math.floor(dur * sr);
  for (let i = 0; i < n && start + i < out.length; i++) {
    const y = line[idx];
    const nx = line[(idx + 1) % N];
    line[idx] = (y + nx) * 0.5 * decay;
    out[start + i] += y * amp;
    idx = (idx + 1) % N;
  }
}

/** Feedback delay that wraps around the buffer so a looped track has no seam. */
function echo(d, sr, delay = 0.375, fb = 0.34, mix = 0.5) {
  const n = d.length;
  const D = Math.floor(delay * sr);
  const wet = new Float32Array(n);
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < n; i++) {
      const j = (i - D + n) % n;
      wet[i] = d[j] + fb * wet[j];
    }
  }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = d[i] + wet[i] * mix;
  return out;
}

const SFX = {
  shot: sr => {
    const ph = phaseOf();
    const tail = lp(0.08);
    return normalize(gen(sr, 0.4, t => {
      const crack = rnd() * Math.exp(-t * 110);
      const thump = ph(40 + 150 * Math.exp(-t * 26), sr) * Math.exp(-t * 20) * 0.9;
      const rev = tail(rnd()) * Math.exp(-t * 8) * 0.7;
      return crack * 0.9 + thump + rev;
    }), 0.8);
  },
  shot2: sr => {
    const ph = phaseOf();
    const tail = lp(0.05);
    return normalize(gen(sr, 0.45, t => rnd() * Math.exp(-t * 75) * 0.8 + ph(55 + 190 * Math.exp(-t * 20), sr) * Math.exp(-t * 17) + tail(rnd()) * Math.exp(-t * 7) * 0.8), 0.85);
  },
  scatter: sr => {
    const ph = phaseOf();
    const tail = lp(0.06);
    return normalize(gen(sr, 0.6, t => rnd() * Math.exp(-t * 38) * 0.9 + ph(34 + 120 * Math.exp(-t * 14), sr) * Math.exp(-t * 11) * 1.1 + tail(rnd()) * Math.exp(-t * 5)), 0.95);
  },
  mortar_fire: sr => {
    const ph = phaseOf();
    const f = lp(0.05);
    return normalize(gen(sr, 0.6, t => ph(34 + 110 * Math.exp(-t * 12), sr) * Math.exp(-t * 7) + f(rnd()) * Math.exp(-t * 9) * 0.9), 0.9);
  },
  boom: sr => {
    const ph = phaseOf();
    let k = 0.4;
    let y = 0;
    return normalize(gen(sr, 1.3, t => {
      k = 0.02 + 0.5 * Math.exp(-t * 5);
      y += k * (rnd() - y);
      return y * Math.exp(-t * 3.2) * 1.4 + ph(28 + 60 * Math.exp(-t * 9), sr) * Math.exp(-t * 4);
    }), 0.95);
  },
  zap: sr => {
    const ph = phaseOf();
    return normalize(gen(sr, 0.32, t => {
      const crackle = Math.random() < 0.25 ? rnd() : 0;
      return crackle * Math.exp(-t * 14) * 0.8 + ph(2400 * Math.exp(-t * 9) + 160, sr) * Math.exp(-t * 11) * 0.7 + ph(900 * Math.exp(-t * 6) + 60, sr) * Math.exp(-t * 8) * 0.5;
    }), 0.8);
  },
  beam_loop: sr => {
    // Integer number of cycles so the loop is click-free.
    const base = 110;
    const n = Math.floor(sr / base) * base; // exactly `base` cycles in ~1 s
    const d = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const p = (i / n) * base * TAU;
      d[i] = (Math.sin(p) + 0.5 * Math.sin(p * 2) + 0.35 * Math.sin(p * 3 + 0.5) + 0.25 * Math.sin(p * 5) + 0.1 * Math.sin(p * 8 * 1.01)) * (0.7 + 0.3 * Math.sin((i / n) * TAU * 3));
    }
    return normalize(d, 0.6);
  },
  glass: sr => {
    return normalize(gen(sr, 1.8, t => {
      const swell = (rnd() * 0.5) * Math.pow(Math.min(1, t / 0.5), 2) * Math.exp(-Math.max(0, t - 0.5) * 6) * 0.35;
      const tb = Math.max(0, t - 0.5);
      const bell = tb > 0 ? (Math.sin(TAU * 523 * tb) + 0.6 * Math.sin(TAU * 523 * 2.76 * tb) + 0.4 * Math.sin(TAU * 523 * 5.4 * tb) + 0.5 * Math.sin(TAU * 261 * tb)) * Math.exp(-tb * 3.4) : 0;
      return swell + bell * 0.5;
    }), 0.8);
  },
  build: sr => {
    const ph = phaseOf();
    const f = lp(0.2);
    return normalize(gen(sr, 0.3, t => ph(190 * Math.exp(-t * 10) + 70, sr) * Math.exp(-t * 17) + f(rnd()) * Math.exp(-t * 40) * 0.6), 0.8);
  },
  upgrade: sr => {
    const d = new Float32Array(Math.floor(sr * 0.7));
    [392, 523.25, 659.25, 784].forEach((f, i) => pluck(d, Math.floor(i * 0.075 * sr), f, 0.45, 0.4, sr, 0.9985, 0.8));
    return normalize(d, 0.75);
  },
  sell: sr => normalize(gen(sr, 0.35, t => (Math.sin(TAU * 1760 * t) + 0.5 * Math.sin(TAU * 2637 * t)) * Math.exp(-t * 16) + (t > 0.07 ? (Math.sin(TAU * 2093 * (t - 0.07)) * Math.exp(-(t - 0.07) * 20)) : 0)), 0.6),
  error: sr => {
    const ph = phaseOf();
    return normalize(gen(sr, 0.25, t => (ph(t < 0.12 ? 150 : 110, sr) > 0 ? 1 : -1) * 0.5 * Math.exp(-t * 10)), 0.5);
  },
  kill: sr => {
    const ph = phaseOf();
    let y = 0;
    return normalize(gen(sr, 0.25, t => {
      y += (0.3 * Math.exp(-t * 18) + 0.03) * (rnd() - y);
      return y * Math.exp(-t * 14) + ph(95 * Math.exp(-t * 15) + 40, sr) * Math.exp(-t * 20) * 0.7;
    }), 0.65);
  },
  hit: sr => normalize(gen(sr, 0.07, t => rnd() * Math.exp(-t * 90)), 0.35),
  alarm: sr => {
    const ph = phaseOf();
    return normalize(gen(sr, 0.45, t => (ph(t % 0.3 < 0.15 ? 740 : 988, sr) > 0 ? 0.5 : -0.5) * Math.exp(-(t % 0.15) * 7) * (t < 0.3 ? 1 : 0.6)), 0.45);
  },
  lost: sr => {
    const ph = phaseOf();
    return normalize(gen(sr, 1.4, t => (Math.sin(TAU * (330 - 150 * t) * t) * 0.6 + ph(55, sr) * 0.5) * Math.exp(-t * 2.6) + (rnd() * Math.exp(-t * 30) * 0.3)), 0.8);
  },
  home: sr => normalize(gen(sr, 0.7, t => (Math.sin(TAU * 880 * t) + 0.5 * Math.sin(TAU * 1320 * t) + 0.3 * Math.sin(TAU * 1760 * t)) * Math.exp(-t * 6)), 0.5),
  wave: sr => {
    const f = lp(0.012);
    return normalize(gen(sr, 2.2, t => {
      const swell = Math.sin(Math.PI * Math.min(1, t / 2.2));
      const saw = (((t * 55) % 1) * 2 - 1) * 0.6 + (((t * 82.4) % 1) * 2 - 1) * 0.4;
      const tom = Math.sin(TAU * (90 * Math.exp(-(t - 0.0) * 6) + 45) * t) * Math.exp(-t * 6);
      return f(saw) * swell * 1.6 + tom * 0.9;
    }), 0.8);
  },
  roar: sr => {
    const ph = phaseOf();
    let y = 0;
    return normalize(gen(sr, 1.4, t => {
      y += 0.12 * (rnd() - y);
      const env = Math.sin(Math.PI * Math.min(1, t / 1.4));
      const saw = ph(75 - 20 * t + 8 * Math.sin(t * 40), sr);
      return Math.tanh((saw * 1.8 + y * 2.2) * env);
    }), 0.8);
  },
  thunder: sr => {
    const f = lp(0.03);
    return normalize(gen(sr, 3, t => f(rnd()) * (Math.exp(-t * 1.2) * (0.6 + 0.4 * Math.sin(t * 17)))), 0.8);
  },
  click: sr => normalize(gen(sr, 0.06, t => Math.sin(TAU * 1200 * t) * Math.exp(-t * 90) + rnd() * Math.exp(-t * 200) * 0.3), 0.45),
  hover: sr => normalize(gen(sr, 0.04, t => Math.sin(TAU * 700 * t) * Math.exp(-t * 120)), 0.25),
  win: sr => {
    const d = new Float32Array(Math.floor(sr * 3));
    [[196, 0], [246.9, 0.35], [293.7, 0.7], [392, 1.05], [493.9, 1.4]].forEach(([f, t]) => pluck(d, Math.floor(t * sr), f, 1.5, 0.5, sr, 0.9993, 0.7));
    return normalize(d, 0.8);
  },
  lose: sr => {
    const d = new Float32Array(Math.floor(sr * 3));
    [[164.8, 0], [155.6, 0.5], [146.8, 1.0], [130.8, 1.6]].forEach(([f, t]) => pluck(d, Math.floor(t * sr), f, 1.6, 0.55, sr, 0.9993, 0.45));
    return normalize(d, 0.8);
  }
};

export { SFX as SFX_GENERATORS };

// E-phrygian-ish scale (Hz): E3 F3 G3 A3 B3 C4 D4 E4
const SCALE = [164.81, 174.61, 196.0, 220.0, 246.94, 261.63, 293.66, 329.63];

export function musicBuffer(ctx, kind) {
  const sr = ctx.sampleRate;
  const secs = kind === 'menu' ? 36 : 32;
  const n = Math.floor(sr * secs);
  const buf = ctx.createBuffer(2, n, sr);
  const L = buf.getChannelData(0);
  const R = buf.getChannelData(1);
  const rr = (a, b) => a + Math.random() * (b - a);

  // Wind bed (separate noise per channel, slowly swept low-pass)
  for (const [ch, off] of [[L, 0], [R, 1.7]]) {
    let y = 0;
    let z = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const k = 0.012 + 0.01 * (0.5 + 0.5 * Math.sin(TAU * (t / secs) * 2 + off));
      y += k * (rnd() - y);
      z += 0.002 * (y - z);
      ch[i] += (y * 3.4 + z * 5) * (0.5 + 0.5 * Math.sin(TAU * (t / secs) * 3 + off)) * 0.16;
    }
  }
  // Drone: E1 + B1 + E2, slow beating (cycles per loop are whole numbers for seamlessness)
  const loopHz = 1 / secs;
  const droneF = [41.2, 61.74, 82.41].map(f => Math.round(f / loopHz) * loopHz);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const lfo = 0.65 + 0.35 * Math.sin(TAU * loopHz * 2 * t);
    const v = (Math.sin(TAU * droneF[0] * t) * 0.5 + Math.sin(TAU * droneF[1] * t) * 0.28 + Math.sin(TAU * droneF[2] * t + Math.sin(TAU * loopHz * 3 * t)) * 0.2) * lfo * 0.16;
    L[i] += v;
    R[i] += v;
  }

  // Plucks
  const mono = new Float32Array(n);
  const beat = kind === 'menu' ? 0.9 : 0.75;
  const steps = Math.floor(secs / beat);
  const motif = [0, -1, 2, 3, 4, -1, 3, 2, 0, -1, 1, 0, 6, -1, 4, 3];
  for (let s = 0; s < steps; s++) {
    let idx = motif[s % motif.length];
    if (kind === 'menu') {
      if (Math.random() < 0.55) continue;
      idx = Math.floor(rr(0, 7));
    } else if (Math.random() < 0.18) idx = -1;
    if (idx < 0) continue;
    const f = SCALE[idx] * (Math.random() < 0.2 ? 2 : 1);
    pluck(mono, Math.floor(s * beat * sr), f, 2.2, kind === 'menu' ? 0.2 : 0.17, sr, 0.9984, 0.55);
    if (kind === 'menu' && Math.random() < 0.3) pluck(mono, Math.floor((s * beat + 0.05) * sr), f * 1.5, 1.5, 0.1, sr, 0.998, 0.4);
  }
  // Heartbeat/kick for the battle loop
  if (kind === 'game') {
    for (let s = 0; s < steps; s++) {
      if (s % 2 !== 0) continue;
      const st = Math.floor(s * beat * sr);
      const ph = phaseOf();
      for (let i = 0; i < sr * 0.35 && st + i < n; i++) {
        const t = i / sr;
        mono[st + i] += ph(46 + 70 * Math.exp(-t * 30), sr) * Math.exp(-t * 13) * 0.55;
      }
    }
  }
  const ec = echo(mono, sr, beat * 0.5, 0.42, 0.7);
  for (let i = 0; i < n; i++) {
    L[i] += ec[i];
    R[i] += ec[(i + Math.floor(sr * 0.018)) % n];
  }
  let m = 0;
  for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.7 / (m || 1);
  for (let i = 0; i < n; i++) {
    L[i] *= g;
    R[i] *= g;
  }
  return buf;
}

export class Sfx {
  constructor(game) {
    this.game = game;
    this.sound = game.sound;
    this.ctx = game.sound.context;
    this.ok = !!this.ctx && typeof game.sound.decodeAudio === 'function';
    this.sfxVol = 0.8;
    this.musicVol = 0.5;
    this.muted = false;
    this.last = new Map();
    this.music = null;
    this.musicKind = null;
    this.loops = new Map();
    try {
      const s = JSON.parse(localStorage.getItem('beamfall.audio') || '{}');
      if (typeof s.sfx === 'number') this.sfxVol = s.sfx;
      if (typeof s.music === 'number') this.musicVol = s.music;
      if (typeof s.muted === 'boolean') this.muted = s.muted;
    } catch {
      /* ignore */
    }
    this.sound.mute = this.muted;
  }

  async bake() {
    if (!this.ok) return;
    const cache = this.game.cache.audio;
    const sr = this.ctx.sampleRate;
    for (const [key, fn] of Object.entries(SFX)) {
      if (cache.exists(key)) continue;
      const data = fn(sr);
      const ab = this.ctx.createBuffer(1, data.length, sr);
      ab.copyToChannel(data, 0);
      cache.add(key, ab);
      await tick();
    }
    for (const kind of ['menu', 'game']) {
      if (!cache.exists(`music_${kind}`)) {
        cache.add(`music_${kind}`, musicBuffer(this.ctx, kind));
        await tick();
      }
    }
  }

  save() {
    try {
      localStorage.setItem('beamfall.audio', JSON.stringify({ sfx: this.sfxVol, music: this.musicVol, muted: this.muted }));
    } catch {
      /* ignore */
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    this.sound.mute = this.muted;
    this.save();
    return this.muted;
  }

  setMusicVolume(v) {
    this.musicVol = clamp(v, 0, 1);
    if (this.music) this.music.setVolume(this.musicVol);
    this.save();
  }

  setSfxVolume(v) {
    this.sfxVol = clamp(v, 0, 1);
    this.save();
  }

  /** Fire-and-forget effect. opts: volume, rate (pitch), pan (-1..1), gap (min seconds between plays). */
  play(key, { volume = 1, rate = 1, pan = 0, gap = 0.035, detune = 0 } = {}) {
    if (!this.ok || this.sound.locked || !this.game.cache.audio.exists(key)) return;
    const now = this.ctx.currentTime;
    if (now - (this.last.get(key) ?? -9) < gap) return;
    this.last.set(key, now);
    this.sound.play(key, { volume: volume * this.sfxVol, rate, pan: clamp(pan, -1, 1), detune });
  }

  /** Position -> stereo pan for field-local x. */
  pan(x) {
    return clamp((x / 1024) * 2 - 1, -1, 1) * 0.7;
  }

  playMusic(kind) {
    if (!this.ok) return;
    const start = () => {
      if (this.musicKind === kind && this.music?.isPlaying) return;
      this.stopMusic();
      if (!this.game.cache.audio.exists(`music_${kind}`)) return;
      this.music = this.sound.add(`music_${kind}`, { loop: true, volume: this.musicVol });
      this.music.play();
      this.musicKind = kind;
    };
    if (this.sound.locked) this.sound.once('unlocked', start);
    else start();
  }

  stopMusic() {
    if (this.music) {
      this.music.stop();
      this.music.destroy();
      this.music = null;
      this.musicKind = null;
    }
  }

  /** Looping hum (e.g. a Beam Conduit) whose volume tracks how many emitters are active. */
  loop(key, volume) {
    if (!this.ok || this.sound.locked) return;
    let s = this.loops.get(key);
    if (!s) {
      if (!this.game.cache.audio.exists(key)) return;
      s = this.sound.add(key, { loop: true, volume: 0 });
      this.loops.set(key, s);
    }
    if (volume > 0.001) {
      if (!s.isPlaying) s.play();
      const v = volume * this.sfxVol;
      if (s._v !== v) s.setVolume((s._v = v)); // called every frame; setVolume schedules a gain change each time
    } else if (s.isPlaying) s.pause();
  }

  stopLoops() {
    for (const s of this.loops.values()) {
      s.stop();
      s.destroy();
    }
    this.loops.clear();
  }
}
