// Per-level enemy looks and bosses (Milestone 11). Behaviour families stay
// the same everywhere (chaser, tank, ranged, boss); each level can dress them
// in its own biome's monsters and name its own mini-boss and final boss.
// Levels without a bestiary use the defaults below.

import type { EnemyKind, EnemyStats } from "../logic/enemyStats.ts";
import { ENEMY_SHEET, type SheetId } from "./artManifest.ts";
import { ENEMY_STATS } from "./enemies.ts";

export interface EnemyLook {
  readonly sheet: SheetId;
  /** Bosses float on a looping idle animation instead of walking. */
  readonly idleAnim?: string;
}

export interface BossDef {
  readonly name: string;
  readonly stats: EnemyStats;
  readonly look: EnemyLook;
}

export type RegularKind = Exclude<EnemyKind, "boss" | "miniboss">;

export interface Bestiary {
  readonly looks?: Partial<Readonly<Record<RegularKind, SheetId>>>;
  readonly boss?: BossDef;
  readonly miniboss?: BossDef;
}

/** The v1 final boss (level 5). */
export const HOLLOW_WARDEN: BossDef = {
  name: "THE HOLLOW WARDEN",
  stats: ENEMY_STATS.boss,
  look: { sheet: "bossIdle", idleAnim: "na-boss-idle" },
};

/** A generic mini-boss for levels that do not name one. */
const DEFAULT_MINIBOSS: BossDef = {
  name: "ELDER GUARDIAN",
  stats: ENEMY_STATS.miniboss,
  look: { sheet: "bossIdle", idleAnim: "na-boss-idle" },
};

/**
 * Bamboo Forest (level 1): spiders rush, pandas shove, mushrooms spit spores
 * (red and white read clearly on green). The orange Giant Bamboo guards the
 * middle of the forest; the green one waits at the end.
 */
export const FOREST_BESTIARY: Bestiary = {
  looks: { chaser: "forestChaser", tank: "forestTank", ranged: "forestRanged" },
  miniboss: {
    name: "YOUNG GIANT BAMBOO",
    stats: ENEMY_STATS.miniboss,
    look: { sheet: "minibossBamboo", idleAnim: "na-miniboss-bamboo-idle" },
  },
  boss: {
    name: "GIANT BAMBOO",
    // A first boss: less health and fewer bullets than the Hollow Warden.
    stats: {
      ...ENEMY_STATS.boss,
      maxHealth: 60,
      attack: { pattern: "radial", cooldownMs: 2400, windupMs: 700, bulletSpeed: 100, count: 8, spreadDeg: 0, damage: 1 },
    },
    look: { sheet: "bossBamboo", idleAnim: "na-boss-bamboo-idle" },
  },
};

export function isBossKind(kind: EnemyKind): boolean {
  return kind === "boss" || kind === "miniboss";
}

/** Base stats for a kind on a level (before difficulty and elite scaling). */
export function statsFor(bestiary: Bestiary | undefined, kind: EnemyKind): EnemyStats {
  if (kind === "boss") return (bestiary?.boss ?? HOLLOW_WARDEN).stats;
  if (kind === "miniboss") return (bestiary?.miniboss ?? DEFAULT_MINIBOSS).stats;
  return ENEMY_STATS[kind];
}

export function lookFor(bestiary: Bestiary | undefined, kind: EnemyKind): EnemyLook {
  if (kind === "boss") return (bestiary?.boss ?? HOLLOW_WARDEN).look;
  if (kind === "miniboss") return (bestiary?.miniboss ?? DEFAULT_MINIBOSS).look;
  return { sheet: bestiary?.looks?.[kind] ?? ENEMY_SHEET[kind] };
}

export function bossNameFor(bestiary: Bestiary | undefined, kind: EnemyKind): string {
  return kind === "miniboss" ? (bestiary?.miniboss ?? DEFAULT_MINIBOSS).name : (bestiary?.boss ?? HOLLOW_WARDEN).name;
}
