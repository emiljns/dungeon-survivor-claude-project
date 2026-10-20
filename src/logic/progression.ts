// Run progression through five ordered levels of hand-authored rooms, plus the
// run-wide state (score, upgrades, timer) carried across room transitions.

import { NO_UPGRADES, sanitizeUpgrades, STAT_LIMITS, type UpgradeLevels } from "./upgrades.ts";

/** Data passed to the game scene on every (re)start and room transition. */
export interface RunState {
  readonly levelIndex: number;
  /** Room index within the current level. */
  readonly roomIndex: number;
  readonly playerHealth: number;
  readonly roomsCleared: number;
  readonly score: number;
  readonly enemiesDefeated: number;
  /** Time spent actually playing (excludes pauses and upgrade panels). */
  readonly runTimeMs: number;
  readonly upgrades: UpgradeLevels;
}

export type RunAdvance =
  | { readonly kind: "nextRoom"; readonly run: RunState }
  | { readonly kind: "nextLevel"; readonly run: RunState }
  | { readonly kind: "victory"; readonly roomsCleared: number };

export function newRun(maxHealth: number): RunState {
  return {
    levelIndex: 0,
    roomIndex: 0,
    playerHealth: maxHealth,
    roomsCleared: 0,
    score: 0,
    enemiesDefeated: 0,
    runTimeMs: 0,
    upgrades: NO_UPGRADES,
  };
}

/** Max health including the Iron Heart upgrade, capped. */
export function effectiveMaxHealth(baseMaxHealth: number, upgrades: UpgradeLevels): number {
  return Math.min(STAT_LIMITS.maxHealth, baseMaxHealth + upgrades.maxHealth);
}

/**
 * Validates untrusted scene data against the level structure. Invalid fields
 * fall back to a fresh run's values; an invalid level resets the room too, so
 * a bad restart can never load a non-existent room.
 */
export function sanitizeRunState(data: unknown, roomsPerLevel: readonly number[], baseMaxHealth: number): RunState {
  const fresh = newRun(baseMaxHealth);
  if (typeof data !== "object" || data === null) return fresh;
  const d = data as Partial<Record<keyof RunState, unknown>>;
  const int = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) ? v : null);
  const nonNegInt = (v: unknown, fallback: number): number => {
    const n = int(v);
    return n !== null && n >= 0 ? n : fallback;
  };

  const level = int(d.levelIndex);
  const levelOk = level !== null && level >= 0 && level < roomsPerLevel.length;
  const levelIndex = levelOk ? level : fresh.levelIndex;
  const room = int(d.roomIndex);
  const roomCount = roomsPerLevel[levelIndex] ?? 0;
  const roomIndex = levelOk && room !== null && room >= 0 && room < roomCount ? room : fresh.roomIndex;

  const upgrades = sanitizeUpgrades(d.upgrades);
  const maxHp = effectiveMaxHealth(baseMaxHealth, upgrades);
  const hp = int(d.playerHealth);
  const time = typeof d.runTimeMs === "number" && Number.isFinite(d.runTimeMs) && d.runTimeMs >= 0 ? d.runTimeMs : 0;
  return {
    levelIndex,
    roomIndex,
    playerHealth: hp !== null && hp >= 1 && hp <= maxHp ? hp : maxHp,
    roomsCleared: nonNegInt(d.roomsCleared, 0),
    score: nonNegInt(d.score, 0),
    enemiesDefeated: nonNegInt(d.enemiesDefeated, 0),
    runTimeMs: time,
    upgrades,
  };
}

export function isFinalRoomOfLevel(run: RunState, roomsPerLevel: readonly number[]): boolean {
  return run.roomIndex === (roomsPerLevel[run.levelIndex] ?? 0) - 1;
}

export function isFinalLevel(run: RunState, roomsPerLevel: readonly number[]): boolean {
  return run.levelIndex === roomsPerLevel.length - 1;
}

/**
 * What happens after the current room is completed. Levels are strictly
 * ordered: rooms advance one at a time, a new level starts at its first room
 * (with health restored to `maxHealth`), and finishing the last room of the
 * last level is victory — there is no way to skip a level or run past the end.
 * `run` should already include this room's score/time/upgrades.
 */
export function advanceRun(
  run: RunState,
  roomsPerLevel: readonly number[],
  playerHealth: number,
  maxHealth: number,
): RunAdvance {
  const roomsCleared = run.roomsCleared + 1;
  if (!isFinalRoomOfLevel(run, roomsPerLevel)) {
    return { kind: "nextRoom", run: { ...run, roomIndex: run.roomIndex + 1, playerHealth, roomsCleared } };
  }
  if (!isFinalLevel(run, roomsPerLevel)) {
    return {
      kind: "nextLevel",
      run: { ...run, levelIndex: run.levelIndex + 1, roomIndex: 0, playerHealth: maxHealth, roomsCleared },
    };
  }
  return { kind: "victory", roomsCleared };
}
