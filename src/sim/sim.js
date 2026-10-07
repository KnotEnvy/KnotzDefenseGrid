// The BEAMFALL simulation. Pure JS, deterministic, no Phaser.
//
// The Phaser layer is a *view*: it steps this at a fixed rate, mirrors entities onto sprites and turns
// events into particles/lights/sound. The headless bot and unit tests drive the same object.
//
// Units: field-local pixels (a cell is CELL = 32 px), seconds.

import { Grid, CELL } from './grid.js';
import { RNG } from './rng.js';
import { POSTS, SELL_REFUND, ARMOR_FLOOR, TIME_VULN, totalInvested } from './data/posts.js';
import { ENEMIES } from './data/enemies.js';
import { endlessWave } from './data/endless.js';

export const SHARD_DROP_TIME = 4.5;
export const SHARD_RETURN_SPEED = 130;
export const PICK_RADIUS = 22;
export const FIXED_DT = 1 / 60;

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

export class Sim {
  /**
   * @param {object} level  level definition (see data/levels.js)
   * @param {{seed?:number, unlocked?:string[], hpScale?:number, rewardScale?:number}} [opts]
   *   hpScale / rewardScale implement the difficulty setting (1 = Normal).
   */
  constructor(level, opts = {}) {
    this.level = level;
    this.grid = new Grid(level.map);
    this.rng = new RNG(opts.seed ?? 1337);
    this.unlocked = new Set(opts.unlocked ?? level.unlocks);
    this.hpScale = opts.hpScale ?? 1;
    this.levelHp = level.hp ?? 1; // per-level tuning knob (see test/bot.mjs sweep)
    this.rewardScale = opts.rewardScale ?? 1;
    this.listeners = new Map();

    this.time = 0;
    this._nextId = 1;
    this.silver = level.startSilver;
    this._interestAcc = 0;

    this.enemies = [];
    this.posts = [];
    this.shells = [];
    this.shards = [];

    this.spawnQueue = [];
    this.waveIndex = 0; // waves started
    this.waveStats = [];
    this._spawning = false;
    this.nextWaveIn = level.firstWaveDelay ?? 25;
    this.state = 'play'; // 'play' | 'won' | 'lost'
    this._dirtyBuffs = false;

    this.stats = { kills: 0, shardsLost: 0, shardsRecovered: 0, silverEarned: 0, shots: 0 };

    this._initShards();
  }

  // ------------------------------------------------------------------ events
  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
    return this;
  }

  emit(type, data) {
    const l = this.listeners.get(type);
    if (l) for (const fn of l) fn(data);
    const any = this.listeners.get('*');
    if (any) for (const fn of any) fn(type, data);
  }

  // ------------------------------------------------------------------ setup
  _initShards() {
    const n = this.level.shards;
    const cells = this.grid.baseCells;
    const x0 = Math.min(...cells.map(c => c.cx)) * CELL;
    const x1 = (Math.max(...cells.map(c => c.cx)) + 1) * CELL;
    const y0 = Math.min(...cells.map(c => c.cy)) * CELL;
    const y1 = (Math.max(...cells.map(c => c.cy)) + 1) * CELL;
    const spacing = 13;
    const maxRows = Math.max(1, Math.floor((y1 - y0) / spacing));
    const cols = Math.ceil(n / maxRows);
    const rows = Math.ceil(n / cols);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    this.baseCenter = { x: cx, y: cy };
    for (let i = 0; i < n; i++) {
      const c = Math.floor(i / rows);
      const r = i % rows;
      const slot = {
        x: cx + (c - (cols - 1) / 2) * spacing,
        y: cy + (r - (rows - 1) / 2) * spacing
      };
      this.shards.push({ id: i + 1, state: 'home', slot, x: slot.x, y: slot.y, carrier: null, dropT: 0 });
    }
    // Doorway centre per spawn id (for flyers and exit checks).
    this.doorCenter = new Map();
    for (const [id, cs] of this.grid.spawnCells) {
      const sx = cs.reduce((a, c) => a + c.cx, 0) / cs.length;
      const sy = cs.reduce((a, c) => a + c.cy, 0) / cs.length;
      this.doorCenter.set(id, this.grid.center(sx, sy));
    }
  }

  get spawnIds() {
    return [...this.grid.spawnCells.keys()];
  }

  get shardsRemaining() {
    let n = 0;
    for (const s of this.shards) if (s.state !== 'lost') n++;
    return n;
  }

  get shardsHome() {
    let n = 0;
    for (const s of this.shards) if (s.state === 'home') n++;
    return n;
  }

  get totalWaves() {
    return this.level.endless ? Infinity : this.level.waves.length;
  }

  _waveDef(i) {
    return this.level.endless ? endlessWave(i, this.spawnIds.length) : this.level.waves[i];
  }

  /** Waves fully cleared so far (the score in endless mode). */
  get wavesHeld() {
    return this.waveStats.filter(w => w && w.cleared).length;
  }

  // ------------------------------------------------------------------ player actions
  statsOf(p) {
    const base = POSTS[p.type].levels[p.level];
    const b = p.buff;
    const out = { ...base };
    if (out.damage != null) out.damage *= b.dmg;
    if (out.dps0 != null) {
      out.dps0 *= b.dmg;
      out.dpsMax *= b.dmg;
    }
    if (out.range != null) out.range *= b.range;
    if (out.radius != null) out.radius *= b.range;
    if (out.rate != null) out.rate *= b.rate;
    if (out.cooldown != null) out.cooldown /= b.rate;
    return out;
  }

  upgradeCost(p) {
    const lv = POSTS[p.type].levels;
    return p.level + 1 < lv.length ? lv[p.level + 1].cost : null;
  }

  sellValue(p) {
    return Math.floor(totalInvested(POSTS[p.type], p.level) * SELL_REFUND);
  }

  _groundEnemyCells() {
    const out = [];
    for (const e of this.enemies) {
      if (e.flying || e.dead) continue;
      out.push(this.grid.cellOf(e.x, e.y));
    }
    return out;
  }

  canBuild(type, cx, cy) {
    const def = POSTS[type];
    if (!def) return { ok: false, reason: 'unknown' };
    if (!this.unlocked.has(type)) return { ok: false, reason: 'locked' };
    if (this.silver < def.levels[0].cost) return { ok: false, reason: 'silver' };
    // Enemies physically standing on the footprint.
    const x0 = cx * CELL;
    const y0 = cy * CELL;
    for (const e of this.enemies) {
      if (e.flying || e.dead) continue;
      const nx = Math.max(x0, Math.min(e.x, x0 + 2 * CELL));
      const ny = Math.max(y0, Math.min(e.y, y0 + 2 * CELL));
      if (dist(e.x, e.y, nx, ny) < e.radius) return { ok: false, reason: 'enemy' };
    }
    return this.grid.canPlace(cx, cy, 2, 2, this._groundEnemyCells());
  }

  build(type, cx, cy) {
    const chk = this.canBuild(type, cx, cy);
    if (!chk.ok) return null;
    const def = POSTS[type];
    this.silver -= def.levels[0].cost;
    const id = this._nextId++;
    const post = {
      id, type, level: 0, cx, cy,
      x: (cx + 1) * CELL, // centre = shared corner of the 2x2 footprint
      y: (cy + 1) * CELL,
      cd: 0, aim: 0, mode: 'thief', disabled: 0,
      buff: { dmg: 1, range: 1, rate: 1 },
      beam: [], beamState: new Map(), builtAt: this.time, kills: 0
    };
    this.posts.push(post);
    this.grid.place(id, cx, cy, 2, 2);
    this._dirtyBuffs = true;
    this.emit('build', { post });
    return post;
  }

  upgrade(post) {
    const cost = this.upgradeCost(post);
    if (cost == null || this.silver < cost) return false;
    this.silver -= cost;
    post.level++;
    this._dirtyBuffs = true;
    this.emit('upgrade', { post });
    return true;
  }

  sell(post) {
    const i = this.posts.indexOf(post);
    if (i < 0) return 0;
    const value = this.sellValue(post);
    this.silver += value;
    this.posts.splice(i, 1);
    this.grid.remove(post.cx, post.cy, 2, 2);
    this._dirtyBuffs = true;
    this.emit('sell', { post, value });
    return value;
  }

  setMode(post, mode) {
    post.mode = mode;
  }

  get canCallWave() {
    return this.state === 'play' && this.nextWaveIn !== null && this.waveIndex < this.totalWaves;
  }

  callWave() {
    if (!this.canCallWave) return 0;
    const bonus = Math.floor(this.nextWaveIn);
    this.silver += bonus;
    this.stats.silverEarned += bonus;
    this.emit('earlyCall', { bonus });
    this._startWave();
    return bonus;
  }

  // ------------------------------------------------------------------ main step
  update(dt = FIXED_DT) {
    if (this.state !== 'play') return;
    this.time += dt;

    this._waves(dt);
    if (this._dirtyBuffs) this._recomputeBuffs();
    this._auras(dt);
    for (const e of this.enemies) this._updateEnemy(e, dt);
    this._updatePosts(dt);
    this._updateShells(dt);
    this._updateShards(dt);
    this._economy(dt);

    // Cull the dead / escaped.
    if (this.enemies.some(e => e.dead)) this.enemies = this.enemies.filter(e => !e.dead);

    if (this.shardsRemaining === 0) {
      this.state = 'lost';
      this.emit('lose', {});
    } else if (this.waveIndex >= this.totalWaves && !this.spawnQueue.length && !this.enemies.length) {
      this.state = 'won';
      this.emit('win', { stars: this.stars() });
    }
  }

  stars() {
    const frac = this.shardsRemaining / this.level.shards;
    return frac >= 0.9 ? 3 : frac >= 0.6 ? 2 : 1;
  }

  // ------------------------------------------------------------------ waves
  _startWave() {
    const idx = this.waveIndex;
    const w = this._waveDef(idx);
    this.waveIndex++;
    const doors = this.spawnIds;
    let total = 0;
    let altCounter = 0;
    for (const g of w.groups) {
      for (let k = 0; k < g.count; k++) {
        let spawn;
        if (typeof g.spawn === 'number') spawn = g.spawn;
        else if (g.spawn === 'rand') spawn = this.rng.pick(doors);
        else spawn = doors[altCounter++ % doors.length]; // 'alt' / default
        this.spawnQueue.push({
          t: this.time + (g.delay ?? 0) + k * (g.interval ?? 1),
          type: g.type, spawn, hp: g.hp ?? 1, wave: idx
        });
        total++;
      }
    }
    this.spawnQueue.sort((a, b) => a.t - b.t);
    this.waveStats[idx] = { total, spawned: 0, alive: 0, cleared: false, bonus: w.bonus ?? 0 };
    this._spawning = true;
    this.nextWaveIn = null;
    this.emit('waveStart', { index: idx, wave: w, total: this.totalWaves });
  }

  _waves(dt) {
    if (this.nextWaveIn !== null) {
      this.nextWaveIn -= dt;
      if (this.nextWaveIn <= 0) this._startWave();
    }
    while (this.spawnQueue.length && this.spawnQueue[0].t <= this.time) {
      const q = this.spawnQueue.shift();
      this.spawnEnemy(q.type, q.spawn, q.hp, q.wave);
      this.waveStats[q.wave].spawned++;
    }
    if (this._spawning && !this.spawnQueue.length) {
      this._spawning = false;
      const w = this._waveDef(this.waveIndex - 1);
      this.nextWaveIn = this.waveIndex < this.totalWaves ? (w.gap ?? this.level.waveGap ?? 16) : null;
    }
  }

  spawnEnemy(type, spawnId, hpMul = 1, wave = 0, at = null) {
    const def = ENEMIES[type];
    const cells = this.grid.spawnCells.get(spawnId);
    const cell = this.rng.pick(cells);
    const p = this.grid.center(cell.cx, cell.cy);
    const door = this.doorCenter.get(spawnId);
    const e = {
      id: this._nextId++, type, def,
      x: at ? at.x : p.x + this.rng.range(-5, 5),
      y: at ? at.y : p.y + this.rng.range(-5, 5),
      vx: 0, vy: 0,
      hp: def.hp * hpMul * this.levelHp * this.hpScale, maxHp: def.hp * hpMul * this.levelHp * this.hpScale,
      speed: def.speed, armor: def.armor, radius: def.radius, flying: !!def.flying, boss: !!def.boss,
      carrying: null, spawnId, wave, state: 'toBase',
      slow: 1, stunUntil: 0, stasisUntil: 0, hasteUntil: 0, flash: 0,
      threat: 0, age: 0, dead: false, enraged: false,
      roarCd: def.roar ? def.roar.every * 0.6 : 0,
      hexCd: def.hex ? def.hex.every * 0.7 : 0,
      summonCd: def.summon ? def.summon.every : 0
    };
    if (this.waveStats[wave]) this.waveStats[wave].alive++;
    this.enemies.push(e);
    this.emit('spawn', { enemy: e, door });
    return e;
  }

  // ------------------------------------------------------------------ enemies
  _auras(dt) {
    // Breaker regen auras.
    for (const b of this.enemies) {
      const a = b.def.aura;
      if (!a || b.dead) continue;
      for (const e of this.enemies) {
        if (e === b || e.dead || e.hp >= e.maxHp) continue;
        if (dist(b.x, b.y, e.x, e.y) <= a.radius) e.hp = Math.min(e.maxHp, e.hp + a.regen * dt);
      }
    }
  }

  _updateEnemy(e, dt) {
    if (e.dead) return;
    e.age += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.boss) this._bossLogic(e, dt);

    const frozen = e.stunUntil > this.time || e.stasisUntil > this.time;
    let spd = e.speed * e.slow;
    if (e.enraged) spd *= e.def.enrage.speed;
    if (e.hasteUntil > this.time) spd *= 1.3;
    if (frozen) spd = 0;
    e.vx = 0;
    e.vy = 0;

    if (e.state === 'loiter') {
      this._tryPickAtBase(e);
    } else if (e.flying) {
      this._moveFlyer(e, spd, dt);
    } else {
      this._moveGround(e, spd, dt);
    }
    if (e.dead) return;

    // Opportunistic pickup of fallen shards.
    if (e.carrying === null && (e.state === 'toBase' || e.state === 'loiter')) {
      for (const s of this.shards) {
        if ((s.state === 'dropped' || s.state === 'returning') && dist(e.x, e.y, s.x, s.y) <= PICK_RADIUS) {
          this._pickShard(e, s);
          break;
        }
      }
    }

    // Threat metric: lower = more urgent.
    if (e.carrying !== null) {
      const d = e.flying
        ? dist(e.x, e.y, this.doorCenter.get(e.spawnId).x, this.doorCenter.get(e.spawnId).y) / CELL
        : this.grid.exitDistAt(e.spawnId, e.x, e.y);
      e.threat = -1000 + (isFinite(d) ? d : 999);
    } else if (e.state === 'loiter') {
      e.threat = -500;
    } else {
      const d = e.flying
        ? dist(e.x, e.y, this.baseCenter.x, this.baseCenter.y) / CELL
        : this.grid.baseDistAt(e.x, e.y);
      e.threat = isFinite(d) ? d : 999;
    }
  }

  _moveGround(e, spd, dt) {
    const { cx, cy } = this.grid.cellOf(e.x, e.y);
    const field = e.carrying !== null ? e.spawnId : 'base';
    const i = this.grid.idx(cx, cy);
    const atSource = field === 'base' ? this.grid.toBase[i] === 0 : this.grid.toExit.get(field).dist[i] === 0;
    if (atSource) {
      if (field === 'base') this._tryPickAtBase(e);
      else this._exit(e);
      return;
    }
    const step = this.grid.step(field, cx, cy);
    if (!step) return; // sealed (should not happen thanks to build validation)
    const t = this.grid.center(step.cx, step.cy);
    const dx = t.x - e.x;
    const dy = t.y - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return;
    const move = Math.min(d, spd * dt);
    e.x += (dx / d) * move;
    e.y += (dy / d) * move;
    e.vx = (dx / d) * spd;
    e.vy = (dy / d) * spd;
  }

  _moveFlyer(e, spd, dt) {
    const door = this.doorCenter.get(e.spawnId);
    const tx = e.carrying !== null ? door.x : this.baseCenter.x;
    const ty = e.carrying !== null ? door.y : this.baseCenter.y;
    const d = dist(e.x, e.y, tx, ty);
    if (d < 14) {
      if (e.carrying !== null) this._exit(e);
      else this._tryPickAtBase(e);
      return;
    }
    const move = Math.min(d, spd * dt);
    const ux = (tx - e.x) / d;
    const uy = (ty - e.y) / d;
    e.x += ux * move;
    e.y += uy * move;
    e.vx = ux * spd; // direction from before the step: after it, (tx - e.x) / d is shorter than a unit vector
    e.vy = uy * spd;
  }

  _tryPickAtBase(e) {
    if (e.carrying !== null) return;
    let best = null;
    let bestD = Infinity;
    for (const s of this.shards) {
      if (s.state !== 'home') continue;
      const d = dist(e.x, e.y, s.x, s.y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (best) this._pickShard(e, best);
    else e.state = 'loiter';
  }

  _pickShard(e, s) {
    const wasLoose = s.state !== 'home';
    s.state = 'carried';
    s.carrier = e.id;
    e.carrying = s.id;
    e.state = 'toExit';
    this.emit('shardPick', { enemy: e, shard: s, stolenBack: wasLoose });
  }

  _exit(e) {
    const s = this.shards.find(x => x.id === e.carrying);
    if (s) {
      s.state = 'lost';
      s.carrier = null;
      this.stats.shardsLost++;
      this.emit('shardLost', { enemy: e, shard: s });
    }
    this._remove(e, false);
  }

  _remove(e, killed) {
    e.dead = true;
    const ws = this.waveStats[e.wave];
    if (ws) {
      ws.alive--;
      if (ws.spawned >= ws.total && ws.alive <= 0 && !ws.cleared) {
        ws.cleared = true;
        this.silver += ws.bonus;
        this.stats.silverEarned += ws.bonus;
        this.emit('waveClear', { index: e.wave, bonus: ws.bonus });
      }
    }
    if (!killed) this.emit('exit', { enemy: e });
  }

  _kill(e, post) {
    if (e.dead) return;
    this.stats.kills++;
    if (post) post.kills++;
    const reward = Math.round(e.def.reward * this.rewardScale);
    this.silver += reward;
    this.stats.silverEarned += reward;
    if (e.carrying !== null) {
      const s = this.shards.find(x => x.id === e.carrying);
      if (s) {
        s.state = 'dropped';
        s.carrier = null;
        s.x = e.x;
        s.y = e.y;
        s.dropT = SHARD_DROP_TIME;
        this.emit('shardDrop', { enemy: e, shard: s });
      }
    }
    this.emit('kill', { enemy: e, reward, post });
    this._remove(e, true);
  }

  /** Apply damage with armor. opts: {post, armorMul, pierce, kind, quiet} */
  damage(e, raw, opts = {}) {
    if (e.dead) return 0;
    let armor = opts.pierce ? 0 : e.armor * (opts.armorMul ?? 1);
    let dmg = Math.max(raw * ARMOR_FLOOR, raw - armor);
    if (e.stasisUntil > this.time) dmg *= TIME_VULN;
    e.hp -= dmg;
    if (!opts.quiet) {
      e.flash = 0.09;
      this.emit('hit', { enemy: e, dmg, kind: opts.kind ?? 'gun', post: opts.post });
    }
    if (e.hp <= 0) this._kill(e, opts.post);
    return dmg;
  }

  _bossLogic(e, dt) {
    const d = e.def;
    if (d.enrage && !e.enraged && e.hp <= e.maxHp * d.enrage.at) {
      e.enraged = true;
      e.armor = Math.max(0, e.armor + d.enrage.armor);
      this.emit('enrage', { enemy: e });
    }
    if (d.roar) {
      e.roarCd -= dt;
      if (e.roarCd <= 0) {
        e.roarCd = d.roar.every;
        for (const o of this.enemies) {
          if (o !== e && !o.dead && dist(o.x, o.y, e.x, e.y) <= d.roar.radius) o.hasteUntil = this.time + d.roar.time;
        }
        this.emit('roar', { enemy: e });
      }
    }
    if (d.hex) {
      e.hexCd -= dt;
      if (e.hexCd <= 0) {
        e.hexCd = d.hex.every;
        const near = this.posts.filter(p => dist(p.x, p.y, e.x, e.y) <= d.hex.range && p.disabled <= this.time);
        if (near.length) {
          const p = this.rng.pick(near);
          p.disabled = this.time + d.hex.time;
          this.emit('hex', { enemy: e, post: p, time: d.hex.time });
        }
      }
    }
    if (d.summon) {
      e.summonCd -= dt;
      if (e.summonCd <= 0) {
        e.summonCd = d.summon.every;
        for (let k = 0; k < d.summon.count; k++) {
          let at = { x: e.x + this.rng.range(-10, 10), y: e.y + this.rng.range(-10, 10) };
          // the boss walks within a few px of rock: a summon dropped inside it could never move, and the wave never clears
          if (!this._reachable(at.x, at.y)) at = { x: e.x, y: e.y };
          this.spawnEnemy(d.summon.type, e.spawnId, 1, e.wave, at);
        }
        this.emit('summon', { enemy: e });
      }
    }
  }

  // ------------------------------------------------------------------ shards
  _updateShards(dt) {
    for (const s of this.shards) {
      if (s.state === 'carried') {
        const c = this.enemies.find(e => e.id === s.carrier);
        if (c) {
          s.x = c.x;
          s.y = c.y;
        }
      } else if (s.state === 'dropped') {
        s.dropT -= dt;
        if (s.dropT <= 0) {
          s.state = 'returning';
          this.emit('shardReturning', { shard: s });
        }
      } else if (s.state === 'returning') {
        const d = dist(s.x, s.y, s.slot.x, s.slot.y);
        const m = SHARD_RETURN_SPEED * dt;
        if (d <= m) {
          s.x = s.slot.x;
          s.y = s.slot.y;
          s.state = 'home';
          this.stats.shardsRecovered++;
          this.emit('shardHome', { shard: s });
        } else {
          s.x += ((s.slot.x - s.x) / d) * m;
          s.y += ((s.slot.y - s.y) / d) * m;
        }
      }
    }
  }

  // ------------------------------------------------------------------ economy
  _economy(dt) {
    const { rate = 0, cap = 0 } = this.level.interest ?? {};
    if (!rate) return;
    this._interestAcc += Math.min(cap, this.silver * rate) * dt;
    if (this._interestAcc >= 1) {
      const whole = Math.floor(this._interestAcc);
      this._interestAcc -= whole;
      this.silver += whole;
      this.stats.silverEarned += whole;
      this.emit('interest', { amount: whole });
    }
  }

  // ------------------------------------------------------------------ posts
  _recomputeBuffs() {
    this._dirtyBuffs = false;
    for (const p of this.posts) p.buff = { dmg: 1, range: 1, rate: 1 };
    for (const f of this.posts) {
      if (POSTS[f.type].behavior !== 'buff') continue;
      const s = POSTS[f.type].levels[f.level];
      for (const p of this.posts) {
        if (p === f) continue;
        if (dist(p.x, p.y, f.x, f.y) <= s.radius) {
          p.buff.dmg = Math.max(p.buff.dmg, s.dmg);
          p.buff.range = Math.max(p.buff.range, s.range);
          p.buff.rate = Math.max(p.buff.rate, s.rate);
        }
      }
    }
  }

  _candidates(p, range, filter) {
    const out = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (filter && !filter(e)) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d - e.radius * 0.5 <= range) out.push({ e, d });
    }
    return out;
  }

  _rank(list, mode) {
    // Carriers are always the top priority in 'thief'; threat is built so that carriers sort first.
    if (mode === 'closest') list.sort((a, b) => a.d - b.d);
    else if (mode === 'strongest') list.sort((a, b) => b.e.hp - a.e.hp);
    else list.sort((a, b) => a.e.threat - b.e.threat);
    return list;
  }

  _pickTargets(p, range, n = 1, filter = null, minRange = 0) {
    let c = this._candidates(p, range, filter);
    if (minRange) c = c.filter(x => x.d >= minRange);
    if (!c.length) return [];
    return this._rank(c, p.mode).slice(0, n).map(x => x.e);
  }

  _updatePosts(dt) {
    // Slow auras set e.slow below and enemies move with it next tick. Resetting it any earlier in the tick (it used
    // to happen in _auras, before movement) wiped every Sigul Ward slow before it took effect.
    for (const e of this.enemies) e.slow = 1;
    for (const p of this.posts) {
      if (p.disabled > this.time) {
        p.beam = [];
        p.beamState.clear();
        continue;
      }
      const def = POSTS[p.type];
      const s = this.statsOf(p);
      p.cd = Math.max(0, p.cd - dt);
      switch (def.behavior) {
        case 'hitscan': this._hitscan(p, s); break;
        case 'cone': this._cone(p, s); break;
        case 'beam': this._beam(p, s, dt); break;
        case 'mortar': this._mortar(p, s); break;
        case 'chain': this._chain(p, s); break;
        case 'slowAura': this._slowAura(p, s, dt); break;
        case 'stasis': this._stasis(p, s); break;
        default: break; // buff posts are passive
      }
    }
  }

  _aim(p, t) {
    p.aim = Math.atan2(t.y - p.y, t.x - p.x);
  }

  _hitscan(p, s) {
    const [t] = this._pickTargets(p, s.range);
    if (!t) return;
    this._aim(p, t);
    if (p.cd > 0) return;
    p.cd = 1 / s.rate;
    p.hand = (p.hand ?? 0) ^ 1;
    this.stats.shots++;
    this.emit('shot', { post: p, kind: 'hitscan', target: t, hand: p.hand, dual: !!s.dual });
    this.damage(t, s.damage, { post: p, kind: 'gun' });
  }

  _cone(p, s) {
    const [t] = this._pickTargets(p, s.range);
    if (!t) return;
    this._aim(p, t);
    if (p.cd > 0) return;
    p.cd = 1 / s.rate;
    this.stats.shots++;
    const half = (s.angle * Math.PI) / 360;
    const hits = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d - e.radius > s.range) continue;
      let da = Math.atan2(e.y - p.y, e.x - p.x) - p.aim;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      // allow for the enemy's own width
      const slack = d > 1 ? Math.atan2(e.radius, d) : Math.PI;
      if (Math.abs(da) - slack <= half) hits.push({ e, d });
    }
    this.emit('shot', { post: p, kind: 'cone', target: t, angle: p.aim, range: s.range, spread: s.angle });
    for (const { e, d } of hits) {
      const coverage = Math.max(0.35, 1 - 0.55 * (d / s.range));
      const pellets = Math.max(1, Math.round(s.pellets * coverage));
      let total = 0;
      for (let i = 0; i < pellets; i++) {
        const per = Math.max(s.damage * ARMOR_FLOOR, s.damage - e.armor);
        total += per * (e.stasisUntil > this.time ? TIME_VULN : 1);
      }
      e.hp -= total;
      e.flash = 0.09;
      this.emit('hit', { enemy: e, dmg: total, kind: 'shot', post: p });
      if (s.knockback && !e.boss && !e.flying) this._knock(e, p, s.knockback);
      if (e.hp <= 0) this._kill(e, p);
    }
  }

  /** Walkable AND connected to the Waystation (a walkable pocket reachable only diagonally is not). */
  _reachable(x, y) {
    return this.grid.baseDistAt(x, y) < Infinity;
  }

  _knock(e, p, amt) {
    const d = dist(p.x, p.y, e.x, e.y) || 1;
    const nx = e.x + ((e.x - p.x) / d) * amt;
    const ny = e.y + ((e.y - p.y) / d) * amt;
    if (this._reachable(nx, ny)) {
      e.x = nx;
      e.y = ny;
    }
  }

  _beam(p, s, dt) {
    const targets = this._pickTargets(p, s.range, s.targets);
    const next = new Map();
    p.beam = [];
    if (targets.length) this._aim(p, targets[0]);
    for (const t of targets) {
      const time = (p.beamState.get(t.id) ?? 0) + dt;
      next.set(t.id, time);
      const power = Math.min(1, time / s.ramp);
      const dps = s.dps0 + (s.dpsMax - s.dps0) * power;
      p.beam.push({ id: t.id, power, x: t.x, y: t.y });
      this.damage(t, dps * dt, { post: p, pierce: true, kind: 'beam', quiet: true });
    }
    p.beamState = next;
  }

  _mortar(p, s) {
    const [t] = this._pickTargets(p, s.range, 1, e => !e.flying, s.minRange);
    if (!t) return;
    this._aim(p, t);
    if (p.cd > 0) return;
    p.cd = 1 / s.rate;
    this.stats.shots++;
    const d = dist(p.x, p.y, t.x, t.y);
    const flight = d / s.shellSpeed;
    // lead the target
    let tx = t.x + t.vx * flight;
    let ty = t.y + t.vy * flight;
    const dd = dist(p.x, p.y, tx, ty);
    if (dd > s.range) {
      tx = p.x + ((tx - p.x) / dd) * s.range;
      ty = p.y + ((ty - p.y) / dd) * s.range;
    }
    const shell = {
      id: this._nextId++, x0: p.x, y0: p.y, x1: tx, y1: ty, x: p.x, y: p.y,
      t: 0, dur: Math.max(0.25, dist(p.x, p.y, tx, ty) / s.shellSpeed),
      damage: s.damage, radius: s.radius, post: p
    };
    this.shells.push(shell);
    this.emit('shell', { post: p, shell });
  }

  _updateShells(dt) {
    for (const sh of this.shells) {
      sh.t += dt;
      const k = Math.min(1, sh.t / sh.dur);
      sh.x = sh.x0 + (sh.x1 - sh.x0) * k;
      sh.y = sh.y0 + (sh.y1 - sh.y0) * k;
      if (k >= 1) {
        sh.done = true;
        this.emit('blast', { x: sh.x1, y: sh.y1, radius: sh.radius, post: sh.post });
        for (const e of this.enemies) {
          if (e.dead || e.flying) continue;
          const d = dist(sh.x1, sh.y1, e.x, e.y);
          if (d > sh.radius + e.radius * 0.5) continue;
          const f = 1 - 0.5 * Math.min(1, d / sh.radius);
          this.damage(e, sh.damage * f, { post: sh.post, kind: 'blast' });
        }
      }
    }
    if (this.shells.some(s => s.done)) this.shells = this.shells.filter(s => !s.done);
  }

  _chain(p, s) {
    const [t] = this._pickTargets(p, s.range);
    if (!t) return;
    this._aim(p, t);
    if (p.cd > 0) return;
    p.cd = 1 / s.rate;
    this.stats.shots++;
    const hit = new Set([t.id]);
    const pts = [{ x: p.x, y: p.y }, { x: t.x, y: t.y }];
    const victims = [t];
    let last = t;
    for (let j = 0; j < s.jumps; j++) {
      let best = null;
      let bd = s.jumpRange;
      for (const e of this.enemies) {
        if (e.dead || hit.has(e.id)) continue;
        const d = dist(last.x, last.y, e.x, e.y);
        if (d <= bd) {
          bd = d;
          best = e;
        }
      }
      if (!best) break;
      hit.add(best.id);
      victims.push(best);
      pts.push({ x: best.x, y: best.y });
      last = best;
    }
    this.emit('chain', { post: p, points: pts });
    victims.forEach((e, i) => {
      const dmg = s.damage * Math.pow(s.falloff, i);
      if (s.stun && this.rng.next() < s.stun && !e.boss) e.stunUntil = this.time + s.stunTime;
      this.damage(e, dmg, { post: p, armorMul: s.armorMul, kind: 'arc' });
    });
  }

  _slowAura(p, s, dt) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (dist(p.x, p.y, e.x, e.y) <= s.radius) {
        e.slow = Math.min(e.slow, 1 - s.slow);
        if (s.dps) this.damage(e, s.dps * dt, { post: p, pierce: true, quiet: true, kind: 'sigul' });
      }
    }
  }

  _stasis(p, s) {
    if (p.cd > 0) return;
    const inside = this.enemies.filter(e => !e.dead && dist(p.x, p.y, e.x, e.y) <= s.radius);
    if (!inside.length) return;
    p.cd = s.cooldown;
    for (const e of inside) e.stasisUntil = this.time + s.duration * (e.boss ? 0.5 : 1); // bosses resist
    this.emit('pulse', { post: p, radius: s.radius, duration: s.duration });
  }

  // ------------------------------------------------------------------ queries for the view / UI
  postAt(cx, cy) {
    const id = this.grid.occupied[this.grid.idx(cx, cy)];
    return id > 0 ? this.posts.find(p => p.id === id) ?? null : null;
  }

  /** Cell routes from each doorway to the Waystation, for the path overlay. */
  paths() {
    const out = [];
    for (const [id, cells] of this.grid.spawnCells) {
      out.push({ id, route: this.grid.route('base', cells[0].cx, cells[0].cy) });
    }
    return out;
  }
}
