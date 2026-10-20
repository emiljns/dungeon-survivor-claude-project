export interface HealthState {
  readonly current: number;
  readonly max: number;
  /** Timestamp (ms) until which further damage is ignored. */
  readonly invulnerableUntil: number;
}

export interface DamageResult {
  readonly state: HealthState;
  /** False when ignored (invulnerable, already dead, or non-positive amount). */
  readonly applied: boolean;
  /** True only on the hit that takes health from above zero to zero. */
  readonly died: boolean;
}

export function createHealth(max: number): HealthState {
  const safeMax = Number.isFinite(max) ? Math.max(1, Math.round(max)) : 1;
  return { current: safeMax, max: safeMax, invulnerableUntil: 0 };
}

export function isDead(h: HealthState): boolean {
  return h.current <= 0;
}

/**
 * Applies damage at time `now`. `invulnerableMs` grants a grace window after a
 * successful hit, which doubles as the enemy contact-damage cooldown so
 * touching an enemy does not drain health every frame.
 */
export function applyDamage(h: HealthState, amount: number, now: number, invulnerableMs = 0): DamageResult {
  if (isDead(h) || !(amount > 0) || !Number.isFinite(amount) || now < h.invulnerableUntil) {
    return { state: h, applied: false, died: false };
  }
  const current = Math.max(0, h.current - amount);
  return {
    state: { ...h, current, invulnerableUntil: now + Math.max(0, invulnerableMs) },
    applied: true,
    died: current === 0,
  };
}

export function healthFraction(h: HealthState): number {
  return h.max > 0 ? Math.min(1, Math.max(0, h.current / h.max)) : 0;
}
