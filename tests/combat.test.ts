import { describe, expect, it } from "vitest";
import { applyDamage, createHealth, healthFraction, isDead } from "../src/logic/health.ts";
import { FireCooldown } from "../src/logic/weapon.ts";

describe("health", () => {
  it("starts full and clamps nonsense max values", () => {
    expect(createHealth(5)).toMatchObject({ current: 5, max: 5 });
    expect(createHealth(0).max).toBe(1);
    expect(createHealth(Number.NaN).max).toBe(1);
  });

  it("subtracts damage and never goes below zero", () => {
    const r = applyDamage(createHealth(3), 10, 0);
    expect(r.state.current).toBe(0);
    expect(r.applied).toBe(true);
    expect(r.died).toBe(true);
  });

  it("reports death exactly once", () => {
    const first = applyDamage(createHealth(1), 1, 0);
    expect(first.died).toBe(true);
    const second = applyDamage(first.state, 1, 1000);
    expect(second.applied).toBe(false);
    expect(second.died).toBe(false);
    expect(isDead(second.state)).toBe(true);
  });

  it("ignores hits during the invulnerability window (contact cooldown)", () => {
    const hit = applyDamage(createHealth(5), 1, 1000, 800);
    expect(hit.state.current).toBe(4);
    // Enemy still touching on later frames inside the window.
    for (const t of [1001, 1400, 1799]) {
      expect(applyDamage(hit.state, 1, t, 800).applied).toBe(false);
    }
    expect(applyDamage(hit.state, 1, 1800, 800).state.current).toBe(3);
  });

  it("ignores zero, negative and non-finite damage", () => {
    const h = createHealth(5);
    for (const amount of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(applyDamage(h, amount, 0).applied).toBe(false);
    }
  });

  it("exposes a clamped fraction for health bars", () => {
    expect(healthFraction(applyDamage(createHealth(4), 1, 0).state)).toBeCloseTo(0.75, 12);
  });
});

describe("FireCooldown", () => {
  it("fires at most once per interval while held", () => {
    const gun = new FireCooldown(150);
    const shots = [0, 16, 100, 149, 150, 151, 299, 300].filter((t) => gun.tryFire(t));
    expect(shots).toEqual([0, 150, 300]);
  });
});
