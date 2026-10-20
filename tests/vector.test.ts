import { describe, expect, it } from "vitest";
import { directionTo, length, movementVelocity, normalize } from "../src/logic/vector.ts";

const none = { up: false, down: false, left: false, right: false };

describe("movementVelocity", () => {
  it("is zero with no keys held", () => {
    const v = movementVelocity(none, 200);
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });

  it("moves at full speed along a single axis", () => {
    expect(movementVelocity({ ...none, right: true }, 200)).toEqual({ x: 200, y: 0 });
    expect(movementVelocity({ ...none, up: true }, 200)).toEqual({ x: 0, y: -200 });
  });

  it("normalizes diagonals to the same speed as cardinal movement", () => {
    for (const diag of [
      { ...none, up: true, right: true },
      { ...none, up: true, left: true },
      { ...none, down: true, right: true },
      { ...none, down: true, left: true },
    ]) {
      const v = movementVelocity(diag, 200);
      expect(length(v)).toBeCloseTo(200, 9);
      expect(Math.abs(v.x)).toBeCloseTo(Math.abs(v.y), 9);
    }
  });

  it("cancels opposing keys", () => {
    expect(length(movementVelocity({ up: true, down: true, left: true, right: true }, 200))).toBe(0);
    expect(movementVelocity({ ...none, left: true, right: true, up: true }, 200)).toEqual({ x: 0, y: -200 });
  });
});

describe("normalize / directionTo", () => {
  it("returns a unit vector", () => {
    expect(length(normalize({ x: 3, y: 4 }))).toBeCloseTo(1, 12);
  });

  it("returns zero instead of NaN for a zero vector", () => {
    const v = normalize({ x: 0, y: 0 });
    expect(Number.isNaN(v.x) || Number.isNaN(v.y)).toBe(false);
    expect(length(v)).toBe(0);
  });

  it("points from origin toward target in world space", () => {
    const d = directionTo({ x: 100, y: 100 }, { x: 100, y: 50 });
    expect(d.x).toBeCloseTo(0, 12);
    expect(d.y).toBeCloseTo(-1, 12);
  });
});
