// Shared constants. Logical resolution is small and scaled up with
// nearest-neighbour filtering for a crisp 16-bit-inspired look.

export const TILE = 16;
export const GAME_WIDTH = 640; // 40 tiles
export const GAME_HEIGHT = 352; // 22 tiles

export const FONT_FAMILY = '"Courier New", monospace';

/**
 * Render order. Gaps are reserved for later milestones (blob shadows,
 * foreground occlusion, lighting overlay) so they slot in without renumbering.
 */
export const Depth = {
  tiles: 0,
  shadows: 10,
  actors: 20,
  projectiles: 30,
  effects: 40,
  foreground: 50,
  lighting: 60,
  hud: 100,
  overlay: 110,
} as const;

/** Milestone 1 tuning values; expected to change with playtesting. */
export const Tuning = {
  player: { maxHealth: 5, speed: 120, invulnerableMs: 900, knockback: 220, knockbackMs: 120 },
  gun: { intervalMs: 140, bulletSpeed: 420, bulletLifeMs: 1100, bulletRadius: 2, damage: 1 },
  chaser: { maxHealth: 6, speed: 62, contactDamage: 1, respawnMs: 1500 },
} as const;

export const PALETTE = {
  background: 0x080d18,
  text: "#e9f1ff",
  textDim: "#9dc8f5",
  accent: "#ffd166",
  danger: "#ff5d73",
} as const;
