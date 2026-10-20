/**
 * Tracks the fire cooldown of a weapon. `tryFire` returns true at most once per
 * `intervalMs` while the trigger is held.
 */
export class FireCooldown {
  private nextReadyAt = 0;

  constructor(private readonly intervalMs: number) {}

  tryFire(now: number): boolean {
    if (now < this.nextReadyAt) return false;
    this.nextReadyAt = now + this.intervalMs;
    return true;
  }
}
