// Shuriken-family weapons (Milestone 10). A weapon scales the upgraded player
// stats (so every upgrade helps every weapon) and adds its own behaviour:
// piercing or homing. Every run starts with the basic shuriken; the others
// are unlocked forever in the village shop, then bought for a run from the
// travelling merchant.

import type { PlayerStats } from "../logic/upgrades.ts";

export type WeaponId = "shuriken" | "kunai" | "bigShuriken" | "magicShuriken";

export interface WeaponDef {
  readonly id: WeaponId;
  readonly name: string;
  readonly description: string;
  /** Multipliers on the upgraded stats. */
  readonly damageMul: number;
  readonly intervalMul: number;
  readonly speedMul: number;
  /** Bullet collision radius in px (the base shuriken is 2). */
  readonly radius: number;
  /** Extra enemies a bullet passes through before stopping. */
  readonly pierce: number;
  /** Turn rate toward the nearest enemy, radians per second (0 = none). */
  readonly homing: number;
  /** Saved coins to unlock it forever in the village shop (0 = always owned). */
  readonly unlockPrice: number;
  /** Pocket coins to carry it for one run (travelling merchant). */
  readonly runPrice: number;
}

export const WEAPONS: Readonly<Record<WeaponId, WeaponDef>> = {
  shuriken: {
    id: "shuriken", name: "Shuriken", description: "Balanced. Always carried at the start of a run.",
    damageMul: 1, intervalMul: 1, speedMul: 1, radius: 2, pierce: 0, homing: 0, unlockPrice: 0, runPrice: 0,
  },
  kunai: {
    id: "kunai", name: "Kunai", description: "Fast and narrow; pierces one enemy.",
    damageMul: 0.8, intervalMul: 0.7, speedMul: 1.35, radius: 1.5, pierce: 1, homing: 0, unlockPrice: 60, runPrice: 25,
  },
  bigShuriken: {
    id: "bigShuriken", name: "Big Shuriken", description: "Slow, large and heavy; pierces three enemies.",
    damageMul: 2.4, intervalMul: 1.9, speedMul: 0.75, radius: 5, pierce: 3, homing: 0, unlockPrice: 150, runPrice: 50,
  },
  magicShuriken: {
    id: "magicShuriken", name: "Magic Shuriken", description: "Curves gently toward the nearest enemy.",
    damageMul: 0.9, intervalMul: 1.05, speedMul: 0.9, radius: 2.5, pierce: 0, homing: 2.6, unlockPrice: 100, runPrice: 35,
  },
};

export const WEAPON_IDS: readonly WeaponId[] = ["shuriken", "kunai", "bigShuriken", "magicShuriken"];
export const STARTER_WEAPON: WeaponId = "shuriken";

export function isWeaponId(v: unknown): v is WeaponId {
  return typeof v === "string" && (WEAPON_IDS as readonly string[]).includes(v);
}

/** Final firing stats: the upgraded stats scaled by the weapon (move speed and health untouched). */
export interface WeaponStats extends PlayerStats {
  readonly bulletRadius: number;
  readonly pierce: number;
  readonly homing: number;
}

export function weaponStats(stats: PlayerStats, id: WeaponId): WeaponStats {
  const w = WEAPONS[id];
  return {
    ...stats,
    damage: Math.round(stats.damage * w.damageMul * 100) / 100,
    fireIntervalMs: Math.round(stats.fireIntervalMs * w.intervalMul),
    bulletSpeed: stats.bulletSpeed * w.speedMul,
    bulletRadius: w.radius,
    pierce: w.pierce,
    homing: w.homing,
  };
}
