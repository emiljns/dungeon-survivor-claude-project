// Pure camera/visibility helpers for scrolling maps.

import type { Rect } from "./collision.ts";
import type { Vec2 } from "./vector.ts";

/** How far the camera leans toward the cursor: a fraction of the aim offset, capped. */
export const AIM_LEAN = { factor: 0.18, max: 36 } as const;

/**
 * Camera offset (world px) toward the aim point, so the player sees more of
 * where they are shooting. Clamped to `max` in length.
 */
export function cameraLean(player: Vec2, aim: Vec2, factor: number = AIM_LEAN.factor, max: number = AIM_LEAN.max): Vec2 {
  const x = (aim.x - player.x) * factor;
  const y = (aim.y - player.y) * factor;
  const len = Math.hypot(x, y);
  if (!Number.isFinite(len) || len === 0) return { x: 0, y: 0 };
  const k = Math.min(1, max / len);
  return { x: x * k, y: y * k };
}

/** Screen area of the boss bar and its name (screen px, for a 640x352 view). */
export const BOSS_BAR_BAND: Rect = { x: 190, y: 352 - 34, width: 260, height: 30 };

/**
 * Whether any of the world points sits under a screen-space HUD band, given
 * the camera's world view. `margin` covers half an actor's size.
 */
export function underHudBand(points: readonly Vec2[], view: Rect, screen: { readonly width: number; readonly height: number }, band: Rect, margin = 10): boolean {
  return points.some((p) => {
    const sx = ((p.x - view.x) / view.width) * screen.width;
    const sy = ((p.y - view.y) / view.height) * screen.height;
    return sx >= band.x - margin && sx <= band.x + band.width + margin && sy >= band.y - margin && sy <= band.y + band.height + margin;
  });
}

/** True when `p` lies within the view rectangle grown by `margin` on all sides. */
export function inView(p: Vec2, view: Rect, margin = 0): boolean {
  return p.x >= view.x - margin && p.x <= view.x + view.width + margin && p.y >= view.y - margin && p.y <= view.y + view.height + margin;
}

/**
 * Tall walls draw each wall's top one tile above it. An actor is hidden
 * behind a wall top when the tile directly below the one it stands in is a
 * wall (checked at the actor's left, centre and right).
 */
export function behindWallTop(wall: readonly (readonly boolean[])[], p: Vec2, halfWidth: number, tile: number): boolean {
  const row = Math.floor(p.y / tile);
  for (const x of [p.x - halfWidth, p.x, p.x + halfWidth]) {
    if (wall[row + 1]?.[Math.floor(x / tile)] === true) return true;
  }
  return false;
}

/**
 * Whether an actor stands under the foreground layer (`top[row][col]` marks
 * tiles where wall tops or canopies are drawn), checked at its left, centre
 * and right.
 */
export function underTopLayer(top: readonly (readonly boolean[])[], p: Vec2, halfWidth: number, tile: number): boolean {
  const row = Math.floor(p.y / tile);
  for (const x of [p.x - halfWidth, p.x, p.x + halfWidth]) {
    if (top[row]?.[Math.floor(x / tile)] === true) return true;
  }
  return false;
}
