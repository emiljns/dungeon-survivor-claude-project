// Pure, Phaser-free vector helpers. Safe to unit test in Node.

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const ZERO: Vec2 = { x: 0, y: 0 };

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

/** Unit vector in the direction of `v`, or zero for a (near-)zero vector. */
export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len < 1e-9) return ZERO;
  return { x: v.x / len, y: v.y / len };
}

export interface DirectionalInput {
  readonly up: boolean;
  readonly down: boolean;
  readonly left: boolean;
  readonly right: boolean;
}

/**
 * Converts held direction keys into a velocity. Diagonals are normalized so
 * moving diagonally is exactly as fast as moving along one axis, and opposing
 * keys cancel out.
 */
export function movementVelocity(input: DirectionalInput, speed: number): Vec2 {
  const raw: Vec2 = {
    x: (input.right ? 1 : 0) - (input.left ? 1 : 0),
    y: (input.down ? 1 : 0) - (input.up ? 1 : 0),
  };
  const dir = normalize(raw);
  return { x: dir.x * speed, y: dir.y * speed };
}

/** Unit direction from `from` toward `to` (e.g. player → world-space mouse). */
export function directionTo(from: Vec2, to: Vec2): Vec2 {
  return normalize({ x: to.x - from.x, y: to.y - from.y });
}
