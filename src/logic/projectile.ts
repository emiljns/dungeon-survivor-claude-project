import { sweepCircle, type Rect } from "./collision.ts";

export interface ProjectileState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly radius: number;
  /** Remaining lifetime in milliseconds. */
  readonly lifeMs: number;
}

export type ProjectileStep =
  | { readonly kind: "flying"; readonly state: ProjectileState }
  | { readonly kind: "wall"; readonly x: number; readonly y: number }
  | { readonly kind: "target"; readonly index: number; readonly x: number; readonly y: number }
  | { readonly kind: "expired"; readonly x: number; readonly y: number };

/**
 * Advances a projectile by `dtMs` using a swept segment test against walls and
 * targets. Whichever is touched first along the path wins; a target standing
 * behind a wall is therefore protected by it.
 */
export function stepProjectile(
  p: ProjectileState,
  dtMs: number,
  walls: readonly Rect[],
  targets: readonly Rect[],
): ProjectileStep {
  const dt = Math.max(0, dtMs) / 1000;
  const from = { x: p.x, y: p.y };
  const to = { x: p.x + p.vx * dt, y: p.y + p.vy * dt };

  const wallHit = sweepCircle(from, to, p.radius, walls);
  const targetHit = sweepCircle(from, to, p.radius, targets);
  const at = (t: number) => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });

  if (targetHit && (!wallHit || targetHit.t <= wallHit.t)) {
    return { kind: "target", index: targetHit.index, ...at(targetHit.t) };
  }
  if (wallHit) return { kind: "wall", ...at(wallHit.t) };

  const lifeMs = p.lifeMs - Math.max(0, dtMs);
  if (lifeMs <= 0) return { kind: "expired", ...to };
  return { kind: "flying", state: { ...p, ...to, lifeMs } };
}

/**
 * Turns a velocity toward `target` by at most `maxTurnRad`, keeping its speed
 * (homing shots curve; they never stop or speed up).
 */
export function steerToward(vx: number, vy: number, from: { x: number; y: number }, target: { x: number; y: number }, maxTurnRad: number): { vx: number; vy: number } {
  const speed = Math.hypot(vx, vy);
  if (speed === 0 || maxTurnRad <= 0) return { vx, vy };
  const current = Math.atan2(vy, vx);
  const wanted = Math.atan2(target.y - from.y, target.x - from.x);
  let diff = wanted - current;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  const turn = Math.max(-maxTurnRad, Math.min(maxTurnRad, diff));
  return { vx: Math.cos(current + turn) * speed, vy: Math.sin(current + turn) * speed };
}
