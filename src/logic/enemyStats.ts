// Enemy stat types plus difficulty/elite scaling. Base values live in
// src/data/enemies.ts; these functions keep scaled values in safe bounds.

export type EnemyKind = "chaser" | "tank" | "ranged" | "boss";
export type AttackPattern = "aimed" | "radial";

export interface EnemyAttack {
  readonly pattern: AttackPattern;
  readonly cooldownMs: number;
  /** Telegraph time before the shot. */
  readonly windupMs: number;
  readonly bulletSpeed: number;
  /** Bullets per shot (aimed: spread fan; radial: full circle). */
  readonly count: number;
  /** Total fan angle for aimed shots with count > 1. */
  readonly spreadDeg: number;
  readonly damage: number;
}

export interface EnemyStats {
  readonly kind: EnemyKind;
  readonly maxHealth: number;
  readonly speed: number;
  readonly contactDamage: number;
  /** Visual and body scale. */
  readonly scale: number;
  readonly attack: EnemyAttack | null;
  /** Ranged enemies try to stay inside this distance band. */
  readonly preferredRange: { readonly min: number; readonly max: number } | null;
  readonly elite: boolean;
}

export interface Difficulty {
  readonly healthMul: number;
  readonly speedMul: number;
}

export const LIMITS = {
  healthMul: { min: 0.5, max: 3 },
  speedMul: { min: 0.5, max: 2 },
  maxHealth: { min: 1, max: 999 },
  speed: { min: 0, max: 240 },
} as const;

const clamp = (v: number, lo: number, hi: number): number => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo);

/** Applies a level's difficulty multipliers; bosses only scale health. */
export function scaleForDifficulty(stats: EnemyStats, d: Difficulty): EnemyStats {
  const hpMul = clamp(d.healthMul, LIMITS.healthMul.min, LIMITS.healthMul.max);
  const spMul = clamp(d.speedMul, LIMITS.speedMul.min, LIMITS.speedMul.max);
  return {
    ...stats,
    maxHealth: Math.round(clamp(stats.maxHealth * hpMul, LIMITS.maxHealth.min, LIMITS.maxHealth.max)),
    speed: stats.kind === "boss" ? stats.speed : clamp(stats.speed * spMul, LIMITS.speed.min, LIMITS.speed.max),
  };
}

/** Elite variant used for each level's final room: tougher, bigger, faster attacks. */
export function makeElite(stats: EnemyStats): EnemyStats {
  if (stats.elite || stats.kind === "boss") return stats;
  return {
    ...stats,
    elite: true,
    maxHealth: Math.round(clamp(stats.maxHealth * 3, LIMITS.maxHealth.min, LIMITS.maxHealth.max)),
    contactDamage: stats.contactDamage + 1,
    scale: stats.scale * 1.35,
    attack: stats.attack ? { ...stats.attack, cooldownMs: Math.round(stats.attack.cooldownMs * 0.8), count: stats.attack.count + 2 } : null,
  };
}

/** Boss enrages below half health: denser, more frequent bursts. */
export function bossAttackFor(attack: EnemyAttack, healthFraction: number): EnemyAttack {
  if (healthFraction > 0.5) return attack;
  return { ...attack, count: Math.round(attack.count * 1.6), cooldownMs: Math.round(attack.cooldownMs * 0.7) };
}
