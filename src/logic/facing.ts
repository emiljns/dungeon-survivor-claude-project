// Which of the four sprite directions a vector points in.

import type { Direction } from "../data/artManifest.ts";
import type { Vec2 } from "./vector.ts";

/**
 * Dominant-axis facing. Exact diagonals face sideways (reads better for
 * left/right-heavy combat). A (near-)zero vector returns `fallback`.
 */
export function facingFromVector(v: Vec2, fallback: Direction): Direction {
  const ax = Math.abs(v.x);
  const ay = Math.abs(v.y);
  if (ax < 1e-6 && ay < 1e-6) return fallback;
  if (ax >= ay) return v.x < 0 ? "left" : "right";
  return v.y < 0 ? "up" : "down";
}
