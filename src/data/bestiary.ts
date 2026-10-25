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

/**
 * River (level 2): axolotls dart, kappa shove, octopuses spit water across
 * the channels. The red Giant Frog holds the pond; the Squid rules the lagoon.
 */
export const RIVER_BESTIARY: Bestiary = {
  looks: { chaser: "riverChaser", tank: "riverTank", ranged: "riverRanged" },
  miniboss: {
    name: "GIANT FROG",
    stats: {
      ...ENEMY_STATS.miniboss,
      maxHealth: 36,
      attack: { pattern: "radial", cooldownMs: 2400, windupMs: 650, bulletSpeed: 100, count: 7, spreadDeg: 0, damage: 1 },
    },
    look: { sheet: "minibossFrog", idleAnim: "na-miniboss-frog-idle" },
  },
  boss: {
    name: "SQUID",
    stats: {
      ...ENEMY_STATS.boss,
      maxHealth: 70,
      attack: { pattern: "radial", cooldownMs: 2200, windupMs: 650, bulletSpeed: 105, count: 10, spreadDeg: 0, damage: 1 },
    },
    look: { sheet: "bossSquid", idleAnim: "na-boss-squid-idle" },
  },
};

/**
 * Snowy Mountain (level 3): orange owls swoop, red bears shove, dark owls
 * throw from the ledges (warm and dark colours read on snow). The Blue Tengu
 * guards the shrine; the Giant Blue Samurai holds the summit.
 */
export const SNOW_BESTIARY: Bestiary = {
  looks: { chaser: "snowChaser", tank: "snowTank", ranged: "snowRanged" },
  miniboss: {
    name: "BLUE TENGU",
    stats: {
      ...ENEMY_STATS.miniboss,
      maxHealth: 38,
      attack: { pattern: "radial", cooldownMs: 2300, windupMs: 650, bulletSpeed: 100, count: 8, spreadDeg: 0, damage: 1 },
    },
    look: { sheet: "minibossTengu", idleAnim: "na-miniboss-tengu-idle" },
  },
  boss: {
    name: "GIANT BLUE SAMURAI",
    stats: {
      ...ENEMY_STATS.boss,
      maxHealth: 72,
      attack: { pattern: "radial", cooldownMs: 2200, windupMs: 650, bulletSpeed: 105, count: 11, spreadDeg: 0, damage: 1 },
    },
    look: { sheet: "bossSamurai", idleAnim: "na-boss-samurai-idle" },
  },
};

/**
 * Abandoned Village (level 4): white spirits drift out of the dark, red
 * raccoons shove, green ghost-lanterns spit fire from the alleys (pale and
 * bright colours read at night). The Giant Racoon haunts the graveyard; the
 * Giant Red Samurai waits in the square.
 */
export const VILLAGE_BESTIARY: Bestiary = {
  looks: { chaser: "villageChaser", tank: "villageTank", ranged: "villageRanged" },
  miniboss: {
    name: "GIANT RACOON",
    stats: {
      ...ENEMY_STATS.miniboss,
      maxHealth: 40,
      attack: { pattern: "radial", cooldownMs: 2200, windupMs: 650, bulletSpeed: 100, count: 9, spreadDeg: 0, damage: 1 },
    },
    look: { sheet: "minibossRacoon", idleAnim: "na-miniboss-racoon-idle" },
  },
  boss: {
    name: "GIANT RED SAMURAI",
    stats: {
      ...ENEMY_STATS.boss,
      maxHealth: 74,
      attack: { pattern: "radial", cooldownMs: 2100, windupMs: 650, bulletSpeed: 108, count: 12, spreadDeg: 0, damage: 1 },
    },
    look: { sheet: "bossRedSamurai", idleAnim: "na-boss-red-samurai-idle" },
  },
};

/**
 * The Void (level 5): blue wisps flicker in, red demon beasts charge, eyes
 * stare across the gaps. The Demon Cyclops guards the shattered bridge; The
 * Hollow Warden waits at the end of everything, stronger than in v1.
 */
export const VOID_BESTIARY: Bestiary = {
  looks: { chaser: "voidChaser", tank: "voidTank", ranged: "ranged" },
  miniboss: {
    name: "DEMON CYCLOPS",
    stats: {
      ...ENEMY_STATS.miniboss,
      maxHealth: 42,
      attack: { pattern: "radial", cooldownMs: 2200, windupMs: 650, bulletSpeed: 105, count: 10, spreadDeg: 0, damage: 1 },
    },
    look: { sheet: "minibossCyclops", idleAnim: "na-miniboss-cyclops-idle" },
  },
  boss: {
    name: HOLLOW_WARDEN.name,
    // The last boss outclasses every other (128 HP and 14-bullet bursts on level 5).
    stats: {
      ...ENEMY_STATS.boss,
      maxHealth: 80,
      attack: { pattern: "radial", cooldownMs: 2000, windupMs: 650, bulletSpeed: 110, count: 14, spreadDeg: 0, damage: 1 },
    },
    look: HOLLOW_WARDEN.look,
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
