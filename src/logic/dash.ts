import { normalize, type Vec2 } from "./vector.ts";

export interface DashConfig {
  readonly speed: number;
  readonly durationMs: number;
  /** Measured from the start of the dash. */
  readonly cooldownMs: number;
}

export interface DashState {
  readonly activeUntil: number;
  readonly readyAt: number;
  readonly dir: Vec2;
}

export const IDLE_DASH: DashState = { activeUntil: 0, readyAt: 0, dir: { x: 0, y: 0 } };

/**
 * Starts a dash if the cooldown allows. Direction is the movement direction,
 * or the aim direction when standing still. Returns null if not ready or no
 * direction is available.
 */
export function tryStartDash(
  state: DashState,
  now: number,
  moveDir: Vec2,
  aimDir: Vec2,
  cfg: DashConfig,
): DashState | null {
  if (now < state.readyAt) return null;
  const move = normalize(moveDir);
  const dir = move.x !== 0 || move.y !== 0 ? move : normalize(aimDir);
  if (dir.x === 0 && dir.y === 0) return null;
  return { activeUntil: now + cfg.durationMs, readyAt: now + cfg.cooldownMs, dir };
}

export function isDashing(state: DashState, now: number): boolean {
  return now < state.activeUntil;
}

export function dashVelocity(state: DashState, cfg: DashConfig): Vec2 {
  return { x: state.dir.x * cfg.speed, y: state.dir.y * cfg.speed };
}

/** 0 right after dashing, 1 when ready again (for the HUD meter). */
export function dashReadiness(state: DashState, now: number, cfg: DashConfig): number {
  if (now >= state.readyAt) return 1;
  const startedAt = state.readyAt - cfg.cooldownMs;
  return Math.min(1, Math.max(0, (now - startedAt) / cfg.cooldownMs));
}
