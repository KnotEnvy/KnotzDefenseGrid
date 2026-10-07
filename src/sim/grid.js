// The build grid: terrain kinds, post occupancy, and Dijkstra flow fields.
//
// Everything here is engine-free (no Phaser) so it can be unit-tested and used by the
// headless balance bot. Coordinates: cell (cx, cy) with (0,0) at the top-left of the
// field; world pixels inside the field are cell * CELL.

export const COLS = 32;
export const ROWS = 20;
export const CELL = 32;

export const K = Object.freeze({ OPEN: 0, ROCK: 1, ROAD: 2, BASE: 3, SPAWN: 4 });

const SQRT2 = Math.SQRT2;
const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2]
];

// Minimal binary min-heap keyed on a parallel priority array.
class Heap {
  constructor() {
    this.items = [];
    this.keys = [];
  }

  get size() {
    return this.items.length;
  }

  push(item, key) {
    const { items, keys } = this;
    let i = items.length;
    items.push(item);
    keys.push(key);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= keys[i]) break;
      [items[p], items[i]] = [items[i], items[p]];
      [keys[p], keys[i]] = [keys[i], keys[p]];
      i = p;
    }
  }

  pop() {
    const { items, keys } = this;
    const top = items[0];
    const lastItem = items.pop();
    const lastKey = keys.pop();
    if (items.length) {
      items[0] = lastItem;
      keys[0] = lastKey;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < items.length && keys[l] < keys[m]) m = l;
        if (r < items.length && keys[r] < keys[m]) m = r;
        if (m === i) break;
        [items[m], items[i]] = [items[i], items[m]];
        [keys[m], keys[i]] = [keys[i], keys[m]];
        i = m;
      }
    }
    return top;
  }
}

export class Grid {
  /** @param {string[]} ascii ROWS strings of COLS chars. Legend: . open  # rock  - road  B base  1-4 doorway */
  constructor(ascii) {
    if (ascii.length !== ROWS) throw new Error(`map needs ${ROWS} rows, got ${ascii.length}`);
    this.cols = COLS;
    this.rows = ROWS;
    this.kind = new Uint8Array(COLS * ROWS);
    this.spawnId = new Uint8Array(COLS * ROWS);
    this.occupied = new Int32Array(COLS * ROWS); // post id, 0 = free
    this.baseCells = [];
    this.spawnCells = new Map(); // id -> [{cx,cy}]

    for (let cy = 0; cy < ROWS; cy++) {
      const row = ascii[cy];
      if (row.length !== COLS) throw new Error(`map row ${cy} needs ${COLS} chars, got ${row.length}`);
      for (let cx = 0; cx < COLS; cx++) {
        const ch = row[cx];
        const i = cy * COLS + cx;
        if (ch === '#') this.kind[i] = K.ROCK;
        else if (ch === '-') this.kind[i] = K.ROAD;
        else if (ch === 'B') {
          this.kind[i] = K.BASE;
          this.baseCells.push({ cx, cy });
        } else if (ch >= '1' && ch <= '4') {
          const id = Number(ch);
          this.kind[i] = K.SPAWN;
          this.spawnId[i] = id;
          if (!this.spawnCells.has(id)) this.spawnCells.set(id, []);
          this.spawnCells.get(id).push({ cx, cy });
        } else this.kind[i] = K.OPEN;
      }
    }
    if (!this.baseCells.length) throw new Error('map has no base (B)');
    if (!this.spawnCells.size) throw new Error('map has no doorway (1-4)');

    this.toBase = null; // Float32Array of path distance (in cells) to the Waystation
    this.toBaseNext = null; // Int16Array: index of the next cell on the way, -1 if none
    this.toExit = new Map(); // spawn id -> { dist, next }
    this.rebuild();
  }

  idx(cx, cy) {
    return cy * COLS + cx;
  }

  inside(cx, cy) {
    return cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS;
  }

  isWalkable(cx, cy) {
    if (!this.inside(cx, cy)) return false;
    const i = cy * COLS + cx;
    return this.kind[i] !== K.ROCK && this.occupied[i] === 0;
  }

  isBuildable(cx, cy) {
    if (!this.inside(cx, cy)) return false;
    const i = cy * COLS + cx;
    return this.kind[i] === K.OPEN && this.occupied[i] === 0;
  }

  /** Cell centre in field-local pixels. */
  center(cx, cy) {
    return { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 };
  }

  cellOf(x, y) {
    return { cx: Math.floor(x / CELL), cy: Math.floor(y / CELL) };
  }

  /**
   * Dijkstra (8-neighbour, no diagonal corner cutting) from a set of source cell indices.
   * Returns { dist: Float32Array, next: Int16Array }.
   */
  _flow(sources) {
    const n = COLS * ROWS;
    const dist = new Float32Array(n).fill(Infinity);
    const heap = new Heap();
    for (const s of sources) {
      dist[s] = 0;
      heap.push(s, 0);
    }
    while (heap.size) {
      const cur = heap.pop();
      const cx = cur % COLS;
      const cy = (cur / COLS) | 0;
      const d = dist[cur];
      for (const [dx, dy, w] of DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!this.isWalkable(nx, ny)) continue;
        if (dx !== 0 && dy !== 0 && (!this.isWalkable(cx + dx, cy) || !this.isWalkable(cx, cy + dy))) continue;
        const ni = ny * COLS + nx;
        const nd = d + w;
        if (nd < dist[ni]) {
          dist[ni] = nd;
          heap.push(ni, nd);
        }
      }
    }
    // Next-step table: follow the steepest descent.
    const next = new Int16Array(n).fill(-1);
    for (let cy = 0; cy < ROWS; cy++) {
      for (let cx = 0; cx < COLS; cx++) {
        const i = cy * COLS + cx;
        if (!isFinite(dist[i]) || dist[i] === 0) continue;
        let best = -1;
        let bestD = dist[i];
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (!this.isWalkable(nx, ny)) continue;
          if (dx !== 0 && dy !== 0 && (!this.isWalkable(cx + dx, cy) || !this.isWalkable(cx, cy + dy))) continue;
          const ni = ny * COLS + nx;
          if (dist[ni] < bestD) {
            bestD = dist[ni];
            best = ni;
          }
        }
        next[i] = best;
      }
    }
    return { dist, next };
  }

  rebuild() {
    const base = this._flow(this.baseCells.map(c => this.idx(c.cx, c.cy)));
    this.toBase = base.dist;
    this.toBaseNext = base.next;
    this.toExit.clear();
    for (const [id, cells] of this.spawnCells) {
      this.toExit.set(id, this._flow(cells.map(c => this.idx(c.cx, c.cy))));
    }
  }

  /** Every doorway cell (and optionally given cells) can still reach the Waystation. */
  _allConnected(extraCells = []) {
    for (const cells of this.spawnCells.values()) {
      for (const c of cells) if (!isFinite(this.toBase[this.idx(c.cx, c.cy)])) return false;
    }
    for (const c of extraCells) {
      if (!this.inside(c.cx, c.cy)) continue;
      if (!isFinite(this.toBase[this.idx(c.cx, c.cy)])) return false;
    }
    return true;
  }

  /**
   * Can a w*h post be placed with its top-left at (cx, cy)?
   * @param {{cx:number,cy:number}[]} enemyCells cells currently holding ground enemies; none may be
   *   sealed off or covered by the new post.
   * @returns {{ok:boolean, reason?:string}}
   */
  canPlace(cx, cy, w = 2, h = 2, enemyCells = []) {
    for (let y = cy; y < cy + h; y++) {
      for (let x = cx; x < cx + w; x++) {
        if (!this.inside(x, y)) return { ok: false, reason: 'edge' };
        const i = this.idx(x, y);
        if (this.kind[i] !== K.OPEN) return { ok: false, reason: 'terrain' };
        if (this.occupied[i] !== 0) return { ok: false, reason: 'occupied' };
      }
    }
    for (const e of enemyCells) {
      if (e.cx >= cx && e.cx < cx + w && e.cy >= cy && e.cy < cy + h) return { ok: false, reason: 'enemy' };
    }
    // Hypothetically occupy and test connectivity.
    this._mark(cx, cy, w, h, -1);
    const base = this._flow(this.baseCells.map(c => this.idx(c.cx, c.cy)));
    const savedDist = this.toBase;
    this.toBase = base.dist;
    const connected = this._allConnected(enemyCells);
    this.toBase = savedDist;
    this._mark(cx, cy, w, h, 0);
    if (!connected) return { ok: false, reason: 'blocks' };
    return { ok: true };
  }

  _mark(cx, cy, w, h, value) {
    for (let y = cy; y < cy + h; y++) for (let x = cx; x < cx + w; x++) this.occupied[this.idx(x, y)] = value;
  }

  place(id, cx, cy, w = 2, h = 2) {
    this._mark(cx, cy, w, h, id);
    this.rebuild();
  }

  remove(cx, cy, w = 2, h = 2) {
    this._mark(cx, cy, w, h, 0);
    this.rebuild();
  }

  /** Path distance (cells) from a world position to the Waystation. Infinity if sealed. */
  baseDistAt(x, y) {
    const { cx, cy } = this.cellOf(x, y);
    if (!this.inside(cx, cy)) return Infinity;
    return this.toBase[this.idx(cx, cy)];
  }

  exitDistAt(spawnId, x, y) {
    const { cx, cy } = this.cellOf(x, y);
    const f = this.toExit.get(spawnId);
    if (!f || !this.inside(cx, cy)) return Infinity;
    return f.dist[this.idx(cx, cy)];
  }

  /**
   * Next cell centre to walk towards. `field` is 'base' or a spawn id (number) for the way home.
   * Returns null when already at a source cell or the cell is sealed.
   */
  step(field, cx, cy) {
    const f = field === 'base' ? { next: this.toBaseNext } : this.toExit.get(field);
    if (!f || !this.inside(cx, cy)) return null;
    const n = f.next[this.idx(cx, cy)];
    if (n < 0) return null;
    return { cx: n % COLS, cy: (n / COLS) | 0 };
  }

  /** Full cell route from a cell to the nearest source, for UI path previews and tests. */
  route(field, cx, cy, limit = 400) {
    const out = [{ cx, cy }];
    let guard = 0;
    for (;;) {
      const s = this.step(field, out[out.length - 1].cx, out[out.length - 1].cy);
      if (!s || guard++ > limit) break;
      out.push(s);
    }
    return out;
  }
}
