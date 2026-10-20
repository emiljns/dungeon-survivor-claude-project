import { describe, expect, it } from "vitest";
import { dashReadiness, dashVelocity, IDLE_DASH, isDashing, tryStartDash, type DashConfig } from "../src/logic/dash.ts";
import { length } from "../src/logic/vector.ts";

const cfg: DashConfig = { speed: 400, durationMs: 150, cooldownMs: 800 };
const right = { x: 1, y: 0 };
const still = { x: 0, y: 0 };

describe("dash", () => {
  it("dashes in the movement direction", () => {
    const d = tryStartDash(IDLE_DASH, 1000, { x: 0, y: -1 }, right, cfg);
    expect(d?.dir).toEqual({ x: 0, y: -1 });
  });

  it("falls back to the aim direction when standing still", () => {
    const d = tryStartDash(IDLE_DASH, 1000, still, { x: 0, y: 5 }, cfg);
    expect(d?.dir).toEqual({ x: 0, y: 1 });
  });

  it("returns null when there is no direction at all", () => {
    expect(tryStartDash(IDLE_DASH, 1000, still, still, cfg)).toBeNull();
  });

  it("dashes diagonally at the same speed as cardinal", () => {
    const d = tryStartDash(IDLE_DASH, 0, { x: 1, y: 1 }, right, cfg);
    expect(d).not.toBeNull();
    if (d) expect(length(dashVelocity(d, cfg))).toBeCloseTo(400, 9);
  });

  it("is active only for its duration", () => {
    const d = tryStartDash(IDLE_DASH, 1000, right, right, cfg);
    expect(d).not.toBeNull();
    if (!d) return;
    expect(isDashing(d, 1000)).toBe(true);
    expect(isDashing(d, 1149)).toBe(true);
    expect(isDashing(d, 1150)).toBe(false);
  });

  it("enforces the cooldown and reports readiness for the HUD", () => {
    const d = tryStartDash(IDLE_DASH, 1000, right, right, cfg);
    expect(d).not.toBeNull();
    if (!d) return;
    expect(tryStartDash(d, 1200, right, right, cfg)).toBeNull();
    expect(tryStartDash(d, 1799, right, right, cfg)).toBeNull();
    expect(tryStartDash(d, 1800, right, right, cfg)).not.toBeNull();
    expect(dashReadiness(d, 1000, cfg)).toBe(0);
    expect(dashReadiness(d, 1400, cfg)).toBeCloseTo(0.5, 9);
    expect(dashReadiness(d, 1800, cfg)).toBe(1);
    expect(dashReadiness(IDLE_DASH, 0, cfg)).toBe(1);
  });
});
