// Pure enemy behaviour helpers: steering, attack timing and shot patterns.

import { sweepCircle, type Rect } from "./collision.ts";
import { length, normalize, type Vec2 } from "./vector.ts";

/**
 * Ranged steering: back off when too close, approach when too far, and strafe
 * sideways inside the preferred band. Returns a unit vector (or zero).
 */
export function rangedSteer(self: Vec2, target: Vec2, range: { min: number; max: number }, strafeSign: 1 | -1): Vec2 {
  const toTarget = { x: target.x - self.x, y: target.y - self.y };
  const dist = length(toTarget);
  if (dist < 1e-6) return { x: 0, y: 0 };
  const dir = { x: toTarget.x / dist, y: toTarget.y / dist };
  if (dist < range.min) return { x: -dir.x, y: -dir.y };
  if (dist > range.max) return dir;
  return normalize({ x: -dir.y * strafeSign, y: dir.x * strafeSign });
}

/** `count` evenly spaced unit directions around a circle, rotated by `offset` radians. */
export function radialDirections(count: number, offset = 0): Vec2[] {
  const n = Math.max(1, Math.floor(count));
  return Array.from({ length: n }, (_, i) => {
    const a = offset + (i / n) * Math.PI * 2;
    return { x: Math.cos(a), y: Math.sin(a) };
  });
}

/** A fan of `count` unit directions centred on `base`, spanning `spreadRad` in total. */
export function spreadDirections(base: Vec2, count: number, spreadRad: number): Vec2[] {
  const n = Math.max(1, Math.floor(count));
  const centre = Math.atan2(base.y, base.x);
  if (n === 1) return [normalize(base)];
  return Array.from({ length: n }, (_, i) => {
    const a = centre - spreadRad / 2 + (spreadRad * i) / (n - 1);
    return { x: Math.cos(a), y: Math.sin(a) };
  });
}

export function hasLineOfSight(from: Vec2, to: Vec2, solids: readonly Rect[]): boolean {
  return sweepCircle(from, to, 0, solids) === null;
}

export interface AttackCycleState {
  readonly phase: "cooldown" | "windup";
  readonly until: number;
}

export function initialAttackCycle(now: number, firstDelayMs: number): AttackCycleState {
  return { phase: "cooldown", until: now + Math.max(0, firstDelayMs) };
}

/**
 * Cooldown → (telegraphed) windup → fire → cooldown. A windup only starts
 * when `canStartWindup` (e.g. line of sight); once started it always fires,
 * so the telegraph the player saw is honoured.
 */
export function stepAttack(
  state: AttackCycleState,
  now: number,
  timing: { readonly cooldownMs: number; readonly windupMs: number },
  canStartWindup: boolean,
): { readonly state: AttackCycleState; readonly fire: boolean; readonly startedWindup: boolean } {
  if (state.phase === "cooldown") {
    if (now >= state.until && canStartWindup) {
      return { state: { phase: "windup", until: now + timing.windupMs }, fire: false, startedWindup: true };
    }
    return { state, fire: false, startedWindup: false };
  }
  if (now >= state.until) {
    return { state: { phase: "cooldown", until: now + timing.cooldownMs }, fire: true, startedWindup: false };
  }
  return { state, fire: false, startedWindup: false };
}

