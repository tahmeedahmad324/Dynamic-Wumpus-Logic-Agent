import { KnowledgeBase } from './KnowledgeBase.js';

// ─── Cell state constants (used for grid visualisation) ───────────────────────
export const CELL_UNKNOWN  = 0; // Gray   — unvisited, unknown
export const CELL_VISITED  = 1; // Yellow — visited (past position)
export const CELL_SAFE     = 2; // Green  — proven safe, not yet visited
export const CELL_CURRENT  = 3; // Orange — agent's current position
export const CELL_HAZARD   = 4; // Red    — confirmed pit or wumpus

// ─── Agent class ─────────────────────────────────────────────────────────────

export class Agent {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this._init();
  }

  /** (Re)initialise a fresh episode. Accepts optional new dimensions. */
  reset(rows, cols) {
    if (rows !== undefined) this.rows = rows;
    if (cols !== undefined) this.cols = cols;
    this._init();
  }

  // ─── Initialisation ────────────────────────────────────────────────────────

  _init() {
    this.kb             = new KnowledgeBase();
    this.visitedSet     = new Set();
    this.safeSet        = new Set();
    this.position       = { r: 0, c: 0 };
    this.status         = 'exploring'; // 'exploring' | 'won' | 'dead'
    this.inferenceSteps = 0;
    this.moveCount      = 0;
    this.percepts       = { breeze: false, stench: false };

    // Visual grid — values are CELL_* constants
    this.grid = Array.from({ length: this.rows }, () =>
      Array(this.cols).fill(CELL_UNKNOWN)
    );

    // Wumpus-uniqueness tracking (separate from KB for efficiency)
    // stenchSets: each entry is the Set of adj-cell keys from one stench detection
    this.stenchSets       = [];
    // wumpusFreeKeys: cells directly proven wumpus-free via no-stench observations
    this.wumpusFreeKeys   = new Set();

    this._placeHazards();

    // Origin is always safe
    this.kb.tell(['-P_0_0']);
    this.kb.tell(['-W_0_0']);
    this.wumpusFreeKeys.add('0_0');
    this.safeSet.add('0_0');

    this._processCell();
  }

  _placeHazards() {
    // Build a shuffled list of all cells except the origin
    const pool = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (r !== 0 || c !== 0) pool.push(`${r}_${c}`);
      }
    }
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // ~15 % of total cells become pits (at least 1)
    const numPits = Math.max(1, Math.floor(this.rows * this.cols * 0.15));
    this.pits = new Set(pool.slice(0, Math.min(numPits, pool.length)));

    // Place wumpus in a non-pit, non-origin cell
    const wumpusCandidates = pool.filter(k => !this.pits.has(k));
    if (wumpusCandidates.length === 0) {
      // Degenerate grid — put wumpus at the first pit cell anyway
      const [wr, wc] = [...this.pits][0].split('_').map(Number);
      this.wumpus = { r: wr, c: wc };
    } else {
      const idx = Math.floor(Math.random() * wumpusCandidates.length);
      const [wr, wc] = wumpusCandidates[idx].split('_').map(Number);
      this.wumpus = { r: wr, c: wc };
    }
  }

  // ─── Cell helpers ──────────────────────────────────────────────────────────

  _key(r, c) { return `${r}_${c}`; }

  _isHazard(r, c) {
    return this.pits.has(this._key(r, c)) ||
           (this.wumpus.r === r && this.wumpus.c === c);
  }

  _getAdjacent(r, c) {
    const adj = [];
    if (r > 0)              adj.push({ r: r - 1, c });
    if (r < this.rows - 1)  adj.push({ r: r + 1, c });
    if (c > 0)              adj.push({ r, c: c - 1 });
    if (c < this.cols - 1)  adj.push({ r, c: c + 1 });
    return adj;
  }

  // ─── Core cell-processing logic ────────────────────────────────────────────

  _processCell() {
    const { r, c } = this.position;
    const key = this._key(r, c);
    this.visitedSet.add(key);
    this.moveCount++;

    // Check for hazard first (agent steps on it → dies)
    if (this._isHazard(r, c)) {
      this.status = 'dead';
      this.grid[r][c] = CELL_HAZARD;
      this._revealAll();
      return;
    }

    this.grid[r][c] = CELL_CURRENT;

    // Compute percepts
    const adj = this._getAdjacent(r, c);
    let breeze = false, stench = false;
    for (const { r: ar, c: ac } of adj) {
      if (this.pits.has(this._key(ar, ac)))               breeze = true;
      if (this.wumpus.r === ar && this.wumpus.c === ac)   stench = true;
    }
    this.percepts = { breeze, stench };

    // TELL the KB
    if (breeze) {
      // At least one adjacent cell is a pit
      this.kb.tell(adj.map(({ r: ar, c: ac }) => `P_${ar}_${ac}`));
    } else {
      for (const { r: ar, c: ac } of adj) this.kb.tell([`-P_${ar}_${ac}`]);
    }

    if (stench) {
      // At least one adjacent cell has the wumpus
      this.kb.tell(adj.map(({ r: ar, c: ac }) => `W_${ar}_${ac}`));
      // Record this stench observation for uniqueness reasoning
      this.stenchSets.push(new Set(adj.map(({ r: ar, c: ac }) => this._key(ar, ac))));
    } else {
      for (const { r: ar, c: ac } of adj) {
        this.kb.tell([`-W_${ar}_${ac}`]);
        this.wumpusFreeKeys.add(this._key(ar, ac));
      }
    }

    // Infer safety of unvisited cells
    this._inferSafeCells();

    // Win check
    if (this._allNonHazardsVisited()) {
      this.status = 'won';
    }
  }

  _inferSafeCells() {
    // Use stench-intersection reasoning to locate the wumpus and propagate uniqueness
    this._propagateWumpusUniqueness();

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const key = this._key(r, c);
        if (this.visitedSet.has(key) || this.safeSet.has(key)) continue;

        const noPit     = this.kb.ask(`-P_${r}_${c}`);
        this.inferenceSteps += noPit.steps;

        const noWumpus  = this.kb.ask(`-W_${r}_${c}`);
        this.inferenceSteps += noWumpus.steps;

        if (noPit.entailed && noWumpus.entailed) {
          this.safeSet.add(key);
          this.grid[r][c] = CELL_SAFE;
        }
      }
    }
  }

  /**
   * Use the intersection of all stench-adjacent sets minus known-wumpus-free cells
   * to locate the wumpus. If exactly one candidate remains, assert it in the KB
   * and mark all other cells wumpus-free. This encodes the "unique wumpus" constraint
   * without needing O(n²) pairwise clauses.
   */
  _propagateWumpusUniqueness() {
    if (this.stenchSets.length === 0) return; // No stench observed — nothing to do

    // Candidates = intersection of all stench-adjacent sets
    let candidates = null;
    for (const sSet of this.stenchSets) {
      if (candidates === null) {
        candidates = new Set(sSet);
      } else {
        for (const k of candidates) {
          if (!sSet.has(k)) candidates.delete(k);
        }
      }
    }
    if (!candidates || candidates.size === 0) return;

    // Remove cells directly proven wumpus-free
    for (const k of this.wumpusFreeKeys) candidates.delete(k);

    if (candidates.size === 1) {
      // Wumpus must be at the sole remaining candidate
      const [wKey] = candidates;
      const [wr, wc] = wKey.split('_').map(Number);
      this.kb.tell([`W_${wr}_${wc}`]);
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (r !== wr || c !== wc) {
            const k = this._key(r, c);
            this.kb.tell([`-W_${r}_${c}`]);
            this.wumpusFreeKeys.add(k);
          }
        }
      }
    }
  }

  _allNonHazardsVisited() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this._isHazard(r, c) && !this.visitedSet.has(this._key(r, c))) return false;
      }
    }
    return true;
  }

  _revealAll() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this._isHazard(r, c)) this.grid[r][c] = CELL_HAZARD;
      }
    }
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  step() {
    if (this.status !== 'exploring') return false;

    const { r, c } = this.position;
    // Mark previous cell as visited (not current)
    this.grid[r][c] = CELL_VISITED;

    const next = this._chooseNextCell();
    if (!next) {
      if (this._allNonHazardsVisited()) this.status = 'won';
      return false;
    }

    this.position = next;
    this._processCell();
    return true;
  }

  _chooseNextCell() {
    const adj = this._getAdjacent(this.position.r, this.position.c);

    // Priority 1 — safe unvisited adjacent cell (immediate move)
    for (const cell of adj) {
      const key = this._key(cell.r, cell.c);
      if (this.safeSet.has(key) && !this.visitedSet.has(key)) return cell;
    }

    // Priority 2 — BFS backtrack to nearest safe unvisited cell (anywhere)
    // This must come BEFORE the risky move so the agent doesn't gamble
    // when proven-safe cells exist but require backtracking.
    const safePath = this._bfsToUnvisited(true);
    if (safePath && safePath.length > 1) return safePath[1];

    // Priority 3 — no safe unvisited cells remain; take a risk on adjacent cell
    for (const cell of adj) {
      if (!this.visitedSet.has(this._key(cell.r, cell.c))) return cell;
    }

    // Priority 4 — BFS through visited cells → nearest unvisited cell (risky)
    const anyPath = this._bfsToUnvisited(false);
    if (anyPath && anyPath.length > 1) return anyPath[1];

    return null;
  }

  /**
   * BFS from current position through visited cells.
   * Returns the full path (array of {r,c}) to the nearest qualifying unvisited cell,
   * or null if no such cell is reachable.
   *
   * @param {boolean} safeOnly  If true, destination must be in safeSet.
   */
  _bfsToUnvisited(safeOnly) {
    const start = this.position;
    const queue = [[start]];
    const seen  = new Set([this._key(start.r, start.c)]);

    while (queue.length > 0) {
      const path = queue.shift();
      const cur  = path[path.length - 1];

      for (const next of this._getAdjacent(cur.r, cur.c)) {
        const key = this._key(next.r, next.c);
        if (seen.has(key)) continue;
        seen.add(key);

        const nextPath = [...path, next];

        if (!this.visitedSet.has(key)) {
          // Unvisited cell — potential destination
          if (!safeOnly || this.safeSet.has(key)) return nextPath;
          // Unsafe unvisited cells are not traversed through
        } else {
          // Visited cell — traverse through
          queue.push(nextPath);
        }
      }
    }
    return null;
  }

  // ─── Public state snapshot ─────────────────────────────────────────────────

  getState() {
    return {
      grid:           this.grid.map(row => [...row]),
      position:       { ...this.position },
      status:         this.status,
      inferenceSteps: this.inferenceSteps,
      percepts:       { ...this.percepts },
      rows:           this.rows,
      cols:           this.cols,
      moveCount:      this.moveCount,
      // Expose hazard info only after game ends
      pits:           this.status !== 'exploring' ? new Set(this.pits)    : null,
      wumpus:         this.status !== 'exploring' ? { ...this.wumpus }    : null,
    };
  }
}
