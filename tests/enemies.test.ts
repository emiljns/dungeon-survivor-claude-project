import { describe, expect, it } from "vitest";
import { hasLineOfSight, initialAttackCycle, radialDirections, rangedSteer, spreadDirections, stepAttack } from "../src/logic/ai.ts";
import type { Rect } from "../src/logic/collision.ts";
import { bossAttackFor, makeElite, scaleForDifficulty, type EnemyAttack, type EnemyStats } from "../src/logic/enemyStats.ts";
import { length } from "../src/logic/vector.ts";

const base: EnemyStats = {
  kind: "ranged",
  maxHealth: 5,
  speed: 50,
  contactDamage: 1,
  scale: 1,
  attack: { pattern: "aimed", cooldownMs: 1800, windupMs: 450, bulletSpeed: 140, count: 1, spreadDeg: 0, damage: 1 },
  preferredRange: { min: 100, max: 170 },
  elite: false,
};

describe("rangedSteer", () => {
  const range = { min: 100, max: 170 };
  const me = { x: 0, y: 0 };

  it("retreats when the player is too close", () => {
    expect(rangedSteer(me, { x: 50, y: 0 }, range, 1)).toEqual({ x: -1, y: -0 });
  });

  it("approaches when the player is too far", () => {
    expect(rangedSteer(me, { x: 300, y: 0 }, range, 1)).toEqual({ x: 1, y: 0 });
  });

  it("strafes perpendicular inside the preferred band", () => {
    const d = rangedSteer(me, { x: 130, y: 0 }, range, 1);
    expect(d.x).toBeCloseTo(0, 12);
    expect(Math.abs(d.y)).toBeCloseTo(1, 12);
    const other = rangedSteer(me, { x: 130, y: 0 }, range, -1);
    expect(other.y).toBeCloseTo(-d.y, 12);
  });

  it("returns zero (not NaN) when exactly on top of the player", () => {
    expect(rangedSteer(me, me, range, 1)).toEqual({ x: 0, y: 0 });
  });
});

describe("shot patterns", () => {
  it("radial bursts are unit vectors evenly spaced around the circle", () => {
    const dirs = radialDirections(8);
    expect(dirs).toHaveLength(8);
    for (const d of dirs) expect(length(d)).toBeCloseTo(1, 12);
    const sum = dirs.reduce((s, d) => ({ x: s.x + d.x, y: s.y + d.y }), { x: 0, y: 0 });
    expect(length(sum)).toBeCloseTo(0, 9); // symmetric
  });

  it("spread fans are centred on the aim direction and span the given angle", () => {
    const dirs = spreadDirections({ x: 0, y: 1 }, 3, Math.PI / 4);
    expect(dirs).toHaveLength(3);
    expect(dirs[1]?.x).toBeCloseTo(0, 12);
    expect(dirs[1]?.y).toBeCloseTo(1, 12);
    const a0 = Math.atan2(dirs[0]?.y ?? 0, dirs[0]?.x ?? 0);
    const a2 = Math.atan2(dirs[2]?.y ?? 0, dirs[2]?.x ?? 0);
    expect(Math.abs(a2 - a0)).toBeCloseTo(Math.PI / 4, 9);
  });

  it("a single aimed shot goes exactly at the target direction", () => {
    expect(spreadDirections({ x: 3, y: 4 }, 1, 1)).toEqual([{ x: 0.6, y: 0.8 }]);
  });
});

describe("attack cycle (telegraphed shots)", () => {
  const timing = { cooldownMs: 1000, windupMs: 400 };

  it("waits, telegraphs, then fires exactly once per cycle", () => {
    let s = initialAttackCycle(0, 500);
    const fired: number[] = [];
    const windups: number[] = [];
    for (let t = 0; t <= 3000; t += 50) {
      const r = stepAttack(s, t, timing, true);
      if (r.startedWindup) windups.push(t);
      if (r.fire) fired.push(t);
      s = r.state;
    }
    expect(windups).toEqual([500, 1900]);
    expect(fired).toEqual([900, 2300]); // windup + 400ms; next cycle 1000ms later + 400ms windup
  });

  it("does not start a windup without line of sight", () => {
    const r = stepAttack(initialAttackCycle(0, 0), 100, timing, false);
    expect(r.startedWindup).toBe(false);
    expect(r.state.phase).toBe("cooldown");
  });

  it("a started telegraph always fires, even if sight is lost", () => {
    const wind = stepAttack(initialAttackCycle(0, 0), 0, timing, true).state;
    expect(stepAttack(wind, 400, timing, false).fire).toBe(true);
  });
});

describe("line of sight", () => {
  const wall: Rect = { x: 40, y: -20, width: 16, height: 40 };
  it("is blocked by a wall between shooter and player", () => {
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 100, y: 0 }, [wall])).toBe(false);
  });
  it("is clear when nothing is in between", () => {
    expect(hasLineOfSight({ x: 0, y: 50 }, { x: 100, y: 50 }, [wall])).toBe(true);
  });
});

describe("difficulty and elite scaling", () => {
  it("scales health and speed by the level multipliers", () => {
    const s = scaleForDifficulty(base, { healthMul: 1.6, speedMul: 1.2 });
    expect(s.maxHealth).toBe(8);
    expect(s.speed).toBeCloseTo(60, 9);
  });

  it("clamps absurd multipliers to safe bounds", () => {
    const huge = scaleForDifficulty({ ...base, maxHealth: 900, speed: 200 }, { healthMul: 100, speedMul: 100 });
    expect(huge.maxHealth).toBe(999);
    expect(huge.speed).toBe(240);
    const tiny = scaleForDifficulty(base, { healthMul: 0, speedMul: Number.NaN });
    expect(tiny.maxHealth).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(tiny.speed)).toBe(true);
  });

  it("does not speed up the boss", () => {
    const boss = scaleForDifficulty({ ...base, kind: "boss", speed: 36 }, { healthMul: 1, speedMul: 2 });
    expect(boss.speed).toBe(36);
  });

  it("elites are tougher, bigger and attack more, and cannot stack", () => {
    const e = makeElite(base);
    expect(e.elite).toBe(true);
    expect(e.maxHealth).toBe(15);
    expect(e.contactDamage).toBe(2);
    expect(e.scale).toBeCloseTo(1.35, 12);
    expect(e.attack?.count).toBe(3);
    expect(e.attack?.cooldownMs).toBeLessThan(base.attack?.cooldownMs ?? 0);
    expect(makeElite(e)).toBe(e);
  });

  it("the boss enrages below half health", () => {
    const attack: EnemyAttack = { pattern: "radial", cooldownMs: 2400, windupMs: 600, bulletSpeed: 110, count: 10, spreadDeg: 0, damage: 1 };
    expect(bossAttackFor(attack, 0.8)).toBe(attack);
    const enraged = bossAttackFor(attack, 0.5);
    expect(enraged.count).toBe(16);
    expect(enraged.cooldownMs).toBe(1680);
  });
});
