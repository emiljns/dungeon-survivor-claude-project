// Ambient critters (chickens, cats, frogs, fish): wander near home, flee the
// player. They have no health, never hurt anyone and ignore bullets.

import type { Vec2 } from "./vector.ts";

export type CritterMode = "idle" | "walk" | "flee";

export interface CritterState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly mode: CritterMode;
  /** Simulation time when the current idle/walk spell ends. */
  readonly until: number;
  /** -1 faces left (the art's direction), 1 faces right. */
  readonly facing: -1 | 1;
}

export const CRITTER = {
  walkSpeed: 18,
  fleeSpeed: 72,
  /** The player closer than this makes a critter run. */
  fleeRadius: 52,
  /** Wanders back toward home when farther than this. */
  leash: 56,
  idleMs: [700, 2600],
  walkMs: [500, 1500],
} as const;

export function newCritter(home: Vec2, now: number, rng: () => number): CritterState {
  return { x: home.x, y: home.y, vx: 0, vy: 0, mode: "idle", until: now + rng() * CRITTER.idleMs[1], facing: rng() < 0.5 ? -1 : 1 };
}

const between = (range: readonly [number, number], rng: () => number): number => range[0] + rng() * (range[1] - range[0]);

/**
 * One step. `canStand(x, y)` says whether a point is open ground for this
 * critter (water for fish). A blocked move stops the critter instead of
 * pushing it into a wall.
 */
export function stepCritter(
  s: CritterState,
  home: Vec2,
  player: Vec2,
  now: number,
  dtMs: number,
  rng: () => number,
  canStand: (x: number, y: number) => boolean,
): CritterState {
  let { vx, vy, mode, until, facing } = s;
  const dx = s.x - player.x;
  const dy = s.y - player.y;
  const d = Math.hypot(dx, dy);

  if (d < CRITTER.fleeRadius) {
    const k = d > 0.001 ? CRITTER.fleeSpeed / d : 0;
    vx = d > 0.001 ? dx * k : CRITTER.fleeSpeed;
    vy = dy * k;
    mode = "flee";
    until = now + 400;
  } else if (now >= until) {
    if (mode === "walk" || mode === "flee") {
      mode = "idle";
      vx = 0;
      vy = 0;
      until = now + between(CRITTER.idleMs, rng);
    } else {
      mode = "walk";
      const away = Math.hypot(s.x - home.x, s.y - home.y);
      const angle =
        away > CRITTER.leash ? Math.atan2(home.y - s.y, home.x - s.x) + (rng() - 0.5) * 0.8 : rng() * Math.PI * 2;
      vx = Math.cos(angle) * CRITTER.walkSpeed;
      vy = Math.sin(angle) * CRITTER.walkSpeed;
      until = now + between(CRITTER.walkMs, rng);
    }
  }

  const t = dtMs / 1000;
  let x = s.x;
  let y = s.y;
  // Move per axis so a critter slides along an edge rather than sticking.
  if (vx !== 0 && canStand(x + vx * t, y)) x += vx * t;
  else if (mode !== "flee") vx = 0;
  if (vy !== 0 && canStand(x, y + vy * t)) y += vy * t;
  else if (mode !== "flee") vy = 0;
  if (mode === "walk" && vx === 0 && vy === 0) {
    mode = "idle";
    until = now + between(CRITTER.idleMs, rng);
  }
  if (Math.abs(vx) > 1) facing = vx > 0 ? 1 : -1;
  return { x, y, vx, vy, mode, until, facing };
}
