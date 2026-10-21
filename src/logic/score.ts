// Score rules. Enemy points grow with the level number so deeper progress is
// worth more; room and level completion add flat bonuses.

import type { EnemyKind } from "./enemyStats.ts";

export const SCORE = {
  enemy: { chaser: 100, tank: 250, ranged: 150, boss: 5000, miniboss: 1500 } satisfies Record<EnemyKind, number>,
  eliteMultiplier: 3,
  roomClear: 200,
  levelClear: 1000,
  victory: 10000,
} as const;

/** Level multiplier: 1.0 on level 1, +25% per level after that. */
export function levelMultiplier(levelNumber: number): number {
  const n = Number.isFinite(levelNumber) ? Math.min(5, Math.max(1, Math.floor(levelNumber))) : 1;
  return 1 + 0.25 * (n - 1);
}

export function enemyScore(kind: EnemyKind, elite: boolean, levelNumber: number): number {
  const base = SCORE.enemy[kind] * (elite ? SCORE.eliteMultiplier : 1);
  return Math.round(base * levelMultiplier(levelNumber));
}

export function roomClearScore(levelNumber: number, finalRoom: boolean): number {
  const bonus = finalRoom ? SCORE.levelClear : SCORE.roomClear;
  return Math.round(bonus * levelMultiplier(levelNumber));
}

/** mm:ss for the HUD and results (minutes are not capped at 59). */
export function formatTime(ms: number): string {
  const total = Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 1000)) : 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
