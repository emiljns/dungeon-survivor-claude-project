// Placed-object geometry: which tiles an object covers and which it blocks.

import type { DecorDef } from "../data/decor.ts";
import type { TilePos } from "./layout.ts";

interface Placed {
  readonly col: number;
  readonly row: number;
}

/** Every tile the object's art covers. */
export function coveredTiles(def: DecorDef, at: Placed): TilePos[] {
  const out: TilePos[] = [];
  for (let r = 0; r < def.h; r++) for (let c = 0; c < def.w; c++) out.push({ col: at.col + c, row: at.row + r });
  return out;
}

/** Tiles that block walking, paths and bullets (none for walk-over objects). */
export function blockingTiles(def: DecorDef, at: Placed): TilePos[] {
  if (def.kind === "walkover" || !def.solid) return [];
  const s = def.solid;
  const out: TilePos[] = [];
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) out.push({ col: at.col + s.col + c, row: at.row + s.row + r });
  return out;
}

/** Marks the blocking tiles of static solid objects into a fresh grid. */
export function solidObjectGrid(
  cols: number,
  rows: number,
  objects: readonly { readonly def: DecorDef; readonly at: Placed }[],
): boolean[][] {
  const grid = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
  for (const { def, at } of objects) {
    if (def.kind !== "solid") continue;
    for (const t of blockingTiles(def, at)) {
      const row = grid[t.row];
      if (row && t.col >= 0 && t.col < cols) row[t.col] = true;
    }
  }
  return grid;
}
