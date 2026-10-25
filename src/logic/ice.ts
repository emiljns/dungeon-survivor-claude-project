// Ice (Snowy Mountain): on ice the player keeps momentum. Velocity eases
// toward the input instead of snapping to it, so the player slides on after
// letting go, turns wide and carries a dash further. Enemies are unaffected
// (GAME_DESIGN §4, first version).

import type { Vec2 } from "./vector.ts";

export const ICE = {
  /** Time constant of the ease, in ms: larger is slipperier. */
  gripMs: 420,
  /** Below this speed (px/s) a slide with no input stops dead. */
  restSpeed: 4,
} as const;

/** The player's next velocity: the input velocity off ice; on ice, eased toward it. */
export function slideVelocity(current: Vec2, target: Vec2, dtMs: number, onIce: boolean, gripMs: number = ICE.gripMs): Vec2 {
  if (!onIce) return target;
  const k = 1 - Math.exp(-Math.max(0, dtMs) / gripMs);
  const next = { x: current.x + (target.x - current.x) * k, y: current.y + (target.y - current.y) * k };
  if (target.x === 0 && target.y === 0 && Math.hypot(next.x, next.y) < ICE.restSpeed) return { x: 0, y: 0 };
  return next;
}
