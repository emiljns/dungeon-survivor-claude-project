// Pure lighting helpers: where torch light lands and how it flickers.

import type { ParsedLayout } from "./layout.ts";
import type { Vec2 } from "./vector.ts";

export interface TorchLight {
  /** Where the flame is drawn (on the wall face, toward the room). */
  readonly flame: Vec2;
  /** Centre of the light pool, pushed out onto the floor. */
  readonly pool: Vec2;
  /** Stable per-torch value so torches do not flicker in sync. */
  readonly seed: number;
  /** Glow colour (default: the theme's torch colour). */
  readonly color?: number;
  /** Light pool radius in px (default: the torch radius). */
  readonly radius?: number;
  /** Draw an animated flame (default true). */
  readonly showFlame?: boolean;
}

const DIRS: readonly { dc: number; dr: number }[] = [
  { dc: 0, dr: 1 }, // facing down (top wall) is preferred
  { dc: 1, dr: 0 },
  { dc: -1, dr: 0 },
  { dc: 0, dr: -1 },
];

/**
 * Light positions for every torch: each faces its first open (floor) neighbour.
 * A torch with no floor next to it would light nothing and is skipped.
 */
export function torchLights(layout: ParsedLayout, tile: number): TorchLight[] {
  const isOpen = (c: number, r: number): boolean => layout.wall[r]?.[c] === false;
  const lights: TorchLight[] = [];
  for (const { col, row } of layout.torches) {
    const facing = DIRS.find(({ dc, dr }) => isOpen(col + dc, row + dr));
    if (!facing) continue;
    const cx = (col + 0.5) * tile;
    const cy = (row + 0.5) * tile;
    lights.push({
      flame: { x: cx + facing.dc * tile * 0.45, y: cy + facing.dr * tile * 0.45 },
      pool: { x: cx + facing.dc * tile * 1.6, y: cy + facing.dr * tile * 1.6 },
      seed: (col * 92821 + row * 68917) % 1000,
    });
  }
  return lights;
}

/**
 * Cheap deterministic flicker factor around 1.0 (two out-of-phase sines, no
 * per-frame randomness). Always within [1 - amount, 1 + amount].
 */
export function flicker(timeMs: number, seed: number, amount = 0.06): number {
  const t = timeMs / 1000;
  const wave = Math.sin(t * 7.3 + seed) * 0.6 + Math.sin(t * 13.1 + seed * 1.7) * 0.4;
  return 1 + wave * amount;
}

/** Clamps a darkness/alpha value into [0, max]; non-finite becomes 0. */
export function clampDarkness(alpha: number, max = 0.8): number {
  return Number.isFinite(alpha) ? Math.min(max, Math.max(0, alpha)) : 0;
}
