// The abyss (The Void): pits between broken platforms. Enemies and their
// paths treat it like water. The player may step off an edge on purpose
// (and fall: 1 HP, back to the last safe tile, briefly invulnerable) or
// dash across a gap of 1–2 tiles; nothing else can push the player in
// (GAME_DESIGN §4: knockback never pushes you over an edge).

import { Tuning } from "../game/config.ts";
import type { TilePos } from "./layout.ts";

/** Distance a dash covers, in px. */
export const DASH_REACH = (Tuning.dash.speed * Tuning.dash.durationMs) / 1000;
/** Gaps a dash is meant to cross, in tiles... */
export const JUMP_GAP_TILES = 2;
/** ...and the narrowest gap that is meant to stop the player (no 3-tile gaps). */
export const WIDE_GAP_TILES = 4;

/**
 * Whether the abyss edge holds the player back this frame: always, except
 * while dashing or while the player is walking by choice (and not reeling
 * from a hit). Shoves and knockback therefore never push the player in.
 */
export function edgeHolds(state: { readonly dashing: boolean; readonly knockedBack: boolean; readonly walking: boolean }): boolean {
  if (state.dashing) return false;
  return state.knockedBack || !state.walking;
}

/** After a fall, movement input is ignored this long (a held key would walk straight back off). */
export const FALL_FREEZE_MS = 450;

/**
 * Where a fall brings the player back: the nearest open tile to `start` with
 * no abyss among its eight neighbours (away from the edge), or failing that
 * the nearest open tile at all.
 */
export function respawnTile(
  start: TilePos,
  isOpen: (col: number, row: number) => boolean,
  isAbyss: (col: number, row: number) => boolean,
): TilePos | null {
  const awayFromEdge = (c: number, r: number): boolean => {
    if (!isOpen(c, r)) return false;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (isAbyss(c + dc, r + dr)) return false;
    return true;
  };
  return nearestSafeTile(start, awayFromEdge, 6) ?? nearestSafeTile(start, isOpen);
}

/** The player falls when standing (not dashing) with their centre over the abyss. */
export function shouldFall(overAbyss: boolean, dashing: boolean): boolean {
  return overAbyss && !dashing;
}

/**
 * The nearest tile to `start` where the player can safely respawn (breadth
 * first, up to `maxSteps` rings), or null. Used when the last safe tile has
 * become blocked, e.g. by a gate that closed.
 */
export function nearestSafeTile(start: TilePos, isSafe: (col: number, row: number) => boolean, maxSteps = 12): TilePos | null {
  const key = (c: number, r: number): string => `${c},${r}`;
  const seen = new Set([key(start.col, start.row)]);
  let ring: TilePos[] = [start];
  for (let step = 0; step <= maxSteps && ring.length > 0; step++) {
    const found = ring.find((p) => isSafe(p.col, p.row));
    if (found) return found;
    const next: TilePos[] = [];
    for (const p of ring) {
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const n = { col: p.col + dc, row: p.row + dr };
        if (seen.has(key(n.col, n.row))) continue;
        seen.add(key(n.col, n.row));
        next.push(n);
      }
    }
    ring = next;
  }
  return null;
}
