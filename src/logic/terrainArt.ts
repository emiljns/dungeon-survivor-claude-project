// Pure tile-selection rules for outdoor terrain: which variant of a ground
// tile to draw, which piece of a water shore, which edge of a cliff face.
// Deterministic, so a map always looks the same.

/** Stable pseudo-random value in [0, 1) for a tile (integer hash, no state). */
export function tileHash(col: number, row: number, seed = 0): number {
  let h = (Math.imul(col | 0, 374761393) + Math.imul(row | 0, 668265263) + Math.imul(seed | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * Index into a list of ground variants: 0 (the plain tile) most of the time,
 * otherwise one of the `count - 1` detail tiles.
 */
export function groundVariant(col: number, row: number, count: number, detailChance: number): number {
  if (count <= 1 || tileHash(col, row, 1) >= detailChance) return 0;
  return 1 + Math.floor(tileHash(col, row, 2) * (count - 1));
}

export type IsTile = (col: number, row: number) => boolean;

/**
 * Shore piece for a water tile, as an offset inside the pack's 4x4 water
 * block: a 3x3 pool (corners, edges, centre), a narrow vertical channel in
 * column 3, a narrow horizontal one in row 3, and a single pond at (3, 3).
 * Inside corners (land only diagonally) use the plain centre.
 */
export function waterPiece(isWater: IsTile, col: number, row: number): { col: number; row: number } {
  const n = isWater(col, row - 1);
  const s = isWater(col, row + 1);
  const w = isWater(col - 1, row);
  const e = isWater(col + 1, row);
  const narrowV = !w && !e;
  const narrowH = !n && !s;
  if (narrowV && narrowH) return { col: 3, row: 3 };
  if (narrowV) return { col: 3, row: !n ? 0 : !s ? 2 : 1 };
  if (narrowH) return { col: !w ? 0 : !e ? 2 : 1, row: 3 };
  return { col: !w ? 0 : !e ? 2 : 1, row: !n ? 0 : !s ? 2 : 1 };
}

/**
 * Cliff face column inside the pack's 3-wide cliff block: 0 = left end,
 * 1 = middle, 2 = right end. `isFace` says which tiles show a face.
 */
export function cliffColumn(isFace: IsTile, col: number, row: number): 0 | 1 | 2 {
  const left = isFace(col - 1, row);
  const right = isFace(col + 1, row);
  if (!left && right) return 0;
  if (left && !right) return 2;
  return 1;
}
