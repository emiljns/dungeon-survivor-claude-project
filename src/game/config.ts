// Shared constants. Logical resolution is small and scaled up with
// nearest-neighbour filtering for a crisp 16-bit-inspired look.

export const TILE = 16;
export const GAME_WIDTH = 640; // 40 tiles
export const GAME_HEIGHT = 352; // 22 tiles

export const FONT_FAMILY = '"Courier New", monospace';

/**
 * Render order: floor/walls → props → blob shadows → actors → darkness overlay
 * → torch glow → vignette → emissive gameplay layers → HUD.
 *
 * Projectiles and effects (bullets, telegraph lines, health bars, spawn
 * markers, score popups, door state) are drawn *above* the darkness: they are
 * "glowing" and must never be hidden by lighting. Actors sit under it but get
 * a small presence light each (see LightingSystem).
 */
export const Depth = {
  tiles: 0,
  props: 5,
  shadows: 10,
  actors: 20,
  /** Wall tops drawn over actors (walk-behind), below the darkness. */
  foreground: 50,
  /** Faint outlines of actors hidden behind wall tops. */
  silhouettes: 52,
  lighting: 60,
  glow: 62,
  vignette: 65,
  projectiles: 70,
  effects: 72,
  hud: 100,
  overlay: 110,
} as const;

/**
 * HUD placement. The HUD keeps to the top corners because rooms put doors at
 * the top centre; `zones` are the screen areas it may cover, and a unit test
 * checks that no room's door sits under them.
 */
export const HudLayout = {
  /** Score/time start after the HP hearts (8 hearts max end at x = 112). */
  scoreX: 124,
  zones: [
    { x: 0, y: 0, width: 262, height: 26 }, // HP, dash, score/time
    { x: 430, y: 0, width: 210, height: 36 }, // room label, status, reward hint
  ],
  /** Boss bar at the bottom centre (boss rooms only). */
  bossZone: { x: 196, y: GAME_HEIGHT - 30, width: 248, height: 30 },
} as const;

/** Tuning values; expected to change with playtesting. */
export const Tuning = {
  player: { maxHealth: 5, speed: 120, invulnerableMs: 900, knockback: 220, knockbackMs: 120 },
  dash: { speed: 360, durationMs: 150, cooldownMs: 750 },
  gun: { intervalMs: 140, bulletSpeed: 420, bulletLifeMs: 1100, bulletRadius: 2, damage: 1 },
  chaser: { maxHealth: 6, speed: 62, contactDamage: 1 },
  room: { enemySpawnDelayMs: 900, doorInteractRange: 14, transitionFadeMs: 220 },
} as const;

export const PALETTE = {
  background: 0x080d18,
  text: "#e9f1ff",
  textDim: "#9dc8f5",
  accent: "#ffd166",
  danger: "#ff5d73",
} as const;
