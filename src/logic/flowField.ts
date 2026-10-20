// Flow-field pathfinding. One breadth-first search from the player's tile
// gives every walkable tile its step distance to the player; each enemy then
// steps toward the neighbouring tile with the smallest distance. One search
// serves any number of enemies, and it is recomputed only when the player
// changes tile (a few times per second at most).

import { normalize, type Vec2 } from "./vector.ts";
import type { TilePos } from "./layout.ts";

export interface FlowField {
  readonly cols: number;
  readonly rows: number;
  /** Steps to the target per tile, row-major; -1 = unreachable or blocked. */
  readonly dist: Int32Array;
  readonly target: TilePos;
}

export type Walkable = (col: number, row: number) => boolean;

/** 4-neighbour BFS from `target` over walkable tiles. */
export function computeFlowField(walkable: Walkable, cols: number, rows: number, target: TilePos): FlowField {
  const dist = new Int32Array(cols * rows).fill(-1);
  const inside = (c: number, r: number): boolean => c >= 0 && r >= 0 && c < cols && r < rows;
  if (!inside(target.col, target.row) || !walkable(target.col, target.row)) return { cols, rows, dist, target };

  const queue = new Int32Array(cols * rows);
  let head = 0;
  let tail = 0;
  dist[target.row * cols + target.col] = 0;
  queue[tail++] = target.row * cols + target.col;
  while (head < tail) {
    const i = queue[head++] ?? 0;
    const c = i % cols;
    const r = (i - c) / cols;
    const d = (dist[i] ?? 0) + 1;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nc = c + dc;
      const nr = r + dr;
      if (!inside(nc, nr)) continue;
      const ni = nr * cols + nc;
      if (dist[ni] !== -1 || !walkable(nc, nr)) continue;
      dist[ni] = d;
      queue[tail++] = ni;
    }
  }
  return { cols, rows, dist, target };
}

/**
 * Walkability for bodies about one tile wide or larger: a tile counts only if
 * its whole 3x3 neighbourhood is walkable, so routes keep a tile of clearance
 * from walls and big enemies do not snag on corners. Tiles next to the target
 * only need to be walkable, so a player hugging a wall can still be reached.
 */
export function withClearance(walkable: Walkable, target: TilePos): Walkable {
  return (c, r) => {
    if (Math.abs(c - target.col) <= 1 && Math.abs(r - target.row) <= 1) return walkable(c, r);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (!walkable(c + dc, r + dr)) return false;
    return true;
  };
}

export function distanceAt(field: FlowField, col: number, row: number): number {
  if (col < 0 || row < 0 || col >= field.cols || row >= field.rows) return -1;
  return field.dist[row * field.cols + col] ?? -1;
}

/**
 * Direction for something at `pos` (world pixels) to follow the field.
 * Considers all 8 neighbours, but a diagonal step is only allowed when both
 * orthogonal neighbours are open (no cutting wall corners). Something standing
 * on a tile outside the field (e.g. a big enemy too close to a wall for the
 * clearance field) steps to its best neighbour that is in the field. Returns
 * null when already on the target tile or when no route exists.
 */
export function flowDirection(field: FlowField, pos: Vec2, tile: number): Vec2 | null {
  const c = Math.floor(pos.x / tile);
  const r = Math.floor(pos.y / tile);
  const here = distanceAt(field, c, r);
  if (here === 0) return null;

  let best: { c: number; r: number; d: number } | null = null;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dc === 0 && dr === 0) continue;
      const d = distanceAt(field, c + dc, r + dr);
      if (d < 0 || (here > 0 && d >= here)) continue;
      if (dc !== 0 && dr !== 0 && (distanceAt(field, c + dc, r) < 0 || distanceAt(field, c, r + dr) < 0)) continue;
      // Prefer the lowest distance; among equals, prefer diagonals (shorter real path).
      if (!best || d < best.d || (d === best.d && dc !== 0 && dr !== 0)) best = { c: c + dc, r: r + dr, d };
    }
  }
  if (!best) return null;
  return normalize({ x: (best.c + 0.5) * tile - pos.x, y: (best.r + 0.5) * tile - pos.y });
}
