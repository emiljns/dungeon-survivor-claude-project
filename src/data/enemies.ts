import type { EnemyKind, EnemyStats } from "../logic/enemyStats.ts";

/** Base stats before level difficulty and elite scaling. */
export const ENEMY_STATS: Readonly<Record<EnemyKind, EnemyStats>> = {
  chaser: {
    kind: "chaser",
    maxHealth: 6,
    speed: 62,
    contactDamage: 1,
    scale: 1,
    attack: null,
    preferredRange: null,
    elite: false,
  },
  tank: {
    kind: "tank",
    maxHealth: 20,
    speed: 34,
    contactDamage: 2,
    scale: 1,
    attack: null,
    preferredRange: null,
    elite: false,
  },
  ranged: {
    kind: "ranged",
    maxHealth: 5,
    speed: 48,
    contactDamage: 1,
    scale: 1,
    attack: { pattern: "aimed", cooldownMs: 1900, windupMs: 500, bulletSpeed: 130, count: 1, spreadDeg: 30, damage: 1 },
    preferredRange: { min: 100, max: 170 },
    elite: false,
  },
  boss: {
    kind: "boss",
    // ×1.6 on level 5 → 120 HP (~17 s of sustained fire).
    maxHealth: 75,
    speed: 34,
    contactDamage: 2,
    scale: 1,
    attack: { pattern: "radial", cooldownMs: 2300, windupMs: 650, bulletSpeed: 105, count: 10, spreadDeg: 0, damage: 1 },
    preferredRange: null,
    elite: false,
  },
};

export const BOSS_NAME = "THE HOLLOW WARDEN";
