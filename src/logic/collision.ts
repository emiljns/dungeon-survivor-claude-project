// Pure swept-collision helpers. Projectiles are tested as a segment from their
// previous to their next position, so a fast bullet cannot skip over a thin
// wall between two frames (tunnelling).

import type { Vec2 } from "./vector.ts";

/** Axis-aligned rectangle; (x, y) is the top-left corner. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function expandRect(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, width: r.width + by * 2, height: r.height + by * 2 };
}

export function pointInRect(p: Vec2, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

/**
 * Liang–Barsky segment/AABB test. Returns the fraction t ∈ [0, 1] along
 * p0→p1 where the segment first touches `r`, or null if it never does.
 * A segment that starts inside the rectangle returns 0.
 */
export function segmentRectEntry(p0: Vec2, p1: Vec2, r: Rect): number | null {
  let tMin = 0;
  let tMax = 1;
  const d = [p1.x - p0.x, p1.y - p0.y] as const;
  const start = [p0.x, p0.y] as const;
  const min = [r.x, r.y] as const;
  const max = [r.x + r.width, r.y + r.height] as const;

  for (let axis = 0; axis < 2; axis++) {
    const delta = d[axis] as number;
    const s = start[axis] as number;
    const lo = min[axis] as number;
    const hi = max[axis] as number;
    if (Math.abs(delta) < 1e-12) {
      if (s < lo || s > hi) return null;
      continue;
    }
    let t1 = (lo - s) / delta;
    let t2 = (hi - s) / delta;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  return tMin;
}

export interface SweepHit {
  readonly t: number;
  readonly index: number;
}

/**
 * Sweeps a circle of `radius` from p0 to p1 against `rects` and returns the
 * earliest hit. Rects are inflated by the radius (a slightly generous
 * approximation at corners, which is fine for small bullets).
 */
export function sweepCircle(p0: Vec2, p1: Vec2, radius: number, rects: readonly Rect[]): SweepHit | null {
  let best: SweepHit | null = null;
  rects.forEach((rect, index) => {
    const t = segmentRectEntry(p0, p1, expandRect(rect, radius));
    if (t !== null && (best === null || t < best.t)) best = { t, index };
  });
  return best;
}
