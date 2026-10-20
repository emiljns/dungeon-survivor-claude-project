// Ambient particles (leaves, snow, fireflies, motes) live in screen space and
// wrap around its edges, so a small fixed pool covers any map. Camera motion
// shifts them a little (parallax) so they feel part of the world.

export type ParticleKind = "leaves" | "snow" | "fireflies" | "motes";

export interface AmbientParticle {
  readonly x: number;
  readonly y: number;
  /** Per-particle phase for sway/pulse. */
  readonly phase: number;
}

export interface ParticleStyle {
  /** Drift in px/s. */
  readonly vx: number;
  readonly vy: number;
  /** Sideways sway amplitude (px/s) and speed (rad/s). */
  readonly sway: number;
  readonly swaySpeed: number;
  /** How much camera motion moves particles (1 = fixed to the world). */
  readonly parallax: number;
  readonly count: number;
}

export const PARTICLE_STYLES: Readonly<Record<ParticleKind, ParticleStyle>> = {
  leaves: { vx: 10, vy: 16, sway: 14, swaySpeed: 1.6, parallax: 0.9, count: 14 },
  snow: { vx: -6, vy: 22, sway: 8, swaySpeed: 2.2, parallax: 0.8, count: 40 },
  fireflies: { vx: 0, vy: -3, sway: 10, swaySpeed: 0.9, parallax: 1, count: 18 },
  motes: { vx: 0, vy: -8, sway: 6, swaySpeed: 1.2, parallax: 0.85, count: 24 },
};

/** Wraps a coordinate into [-margin, size + margin). */
export function wrap(v: number, size: number, margin: number): number {
  const span = size + 2 * margin;
  return ((((v + margin) % span) + span) % span) - margin;
}

/** Advances one particle; `cam` is how far the camera scrolled this step. */
export function stepParticle(
  p: AmbientParticle,
  style: ParticleStyle,
  dtMs: number,
  timeMs: number,
  cam: { readonly dx: number; readonly dy: number },
  view: { readonly width: number; readonly height: number },
  margin: number,
): AmbientParticle {
  const t = dtMs / 1000;
  const sway = Math.sin((timeMs / 1000) * style.swaySpeed + p.phase) * style.sway;
  const x = p.x + (style.vx + sway) * t - cam.dx * style.parallax;
  const y = p.y + style.vy * t - cam.dy * style.parallax;
  return { x: wrap(x, view.width, margin), y: wrap(y, view.height, margin), phase: p.phase };
}
