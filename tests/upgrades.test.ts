import { describe, expect, it } from "vitest";
import {
  applyUpgrade,
  canUpgrade,
  computeStats,
  NO_UPGRADES,
  rollUpgradeChoices,
  sanitizeUpgrades,
  STAT_LIMITS,
  UPGRADE_IDS,
  UPGRADES,
  type BaseStats,
  type UpgradeId,
  type UpgradeLevels,
} from "../src/logic/upgrades.ts";

const BASE: BaseStats = { damage: 1, fireIntervalMs: 140, bulletSpeed: 420, moveSpeed: 120, maxHealth: 5 };

/**
 * Deterministic, well-mixed pseudo-random sequence (mulberry32). A plain LCG is
 * not suitable here: its first output is nearly identical for small seeds.
 */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STAT_FOR: Record<UpgradeId, keyof ReturnType<typeof computeStats>> = {
  damage: "damage",
  fireRate: "fireIntervalMs",
  projectileSpeed: "bulletSpeed",
  moveSpeed: "moveSpeed",
  maxHealth: "maxHealth",
  extraProjectile: "projectiles",
};

describe("upgrade definitions", () => {
  it("offers the six spec upgrades, each with a description and a cap", () => {
    expect(UPGRADE_IDS).toEqual(["damage", "fireRate", "projectileSpeed", "moveSpeed", "maxHealth", "extraProjectile"]);
    for (const u of UPGRADES) {
      expect(u.description.length).toBeGreaterThan(5);
      expect(u.maxLevel).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("applyUpgrade / computeStats", () => {
  it("base stats are unchanged with no upgrades", () => {
    expect(computeStats(BASE, NO_UPGRADES)).toMatchObject({ ...BASE, projectiles: 1 });
  });

  it.each(UPGRADE_IDS.map((id) => [id] as const))("%s changes only its own stat, in the right direction", (id) => {
    const before = computeStats(BASE, NO_UPGRADES);
    const after = computeStats(BASE, applyUpgrade(NO_UPGRADES, id));
    for (const key of Object.keys(before) as (keyof typeof before)[]) {
      if (key === STAT_FOR[id]) {
        if (id === "fireRate") expect(after[key]).toBeLessThan(before[key]);
        else expect(after[key]).toBeGreaterThan(before[key]);
      } else {
        expect(after[key], `${id} must not change ${key}`).toBe(before[key]);
      }
    }
  });

  it("applies the documented amounts", () => {
    const lv = (id: UpgradeId, n: number): UpgradeLevels => ({ ...NO_UPGRADES, [id]: n });
    expect(computeStats(BASE, lv("damage", 2)).damage).toBeCloseTo(2, 12);
    expect(computeStats(BASE, lv("fireRate", 1)).fireIntervalMs).toBe(119);
    expect(computeStats(BASE, lv("projectileSpeed", 2)).bulletSpeed).toBeCloseTo(588, 9);
    expect(computeStats(BASE, lv("moveSpeed", 2)).moveSpeed).toBeCloseTo(144, 9);
    expect(computeStats(BASE, lv("maxHealth", 3)).maxHealth).toBe(8);
    expect(computeStats(BASE, lv("extraProjectile", 2)).projectiles).toBe(3);
  });

  it("respects every cap: extra levels do nothing", () => {
    for (const def of UPGRADES) {
      let levels: UpgradeLevels = NO_UPGRADES;
      for (let i = 0; i < def.maxLevel + 5; i++) levels = applyUpgrade(levels, def.id);
      expect(levels[def.id]).toBe(def.maxLevel);
      expect(canUpgrade(levels, def.id)).toBe(false);
    }
  });

  it("keeps fully upgraded stats inside safe limits (player stays faster than all enemies)", () => {
    const maxed = Object.fromEntries(UPGRADES.map((u) => [u.id, u.maxLevel])) as UpgradeLevels;
    const s = computeStats(BASE, maxed);
    expect(s.fireIntervalMs).toBeGreaterThanOrEqual(STAT_LIMITS.minFireIntervalMs);
    expect(s.bulletSpeed).toBeLessThanOrEqual(STAT_LIMITS.maxBulletSpeed);
    expect(s.moveSpeed).toBeLessThanOrEqual(STAT_LIMITS.maxMoveSpeed);
    expect(s.maxHealth).toBeLessThanOrEqual(STAT_LIMITS.maxHealth);
    expect(s.projectiles).toBeLessThanOrEqual(STAT_LIMITS.maxProjectiles);
  });

  it("sanitizes garbage levels instead of trusting them", () => {
    expect(sanitizeUpgrades({ damage: 50, fireRate: -2, moveSpeed: 1.5, bogus: 3 })).toEqual({ ...NO_UPGRADES, damage: 3 });
    expect(sanitizeUpgrades(null)).toEqual(NO_UPGRADES);
  });
});

describe("rollUpgradeChoices", () => {
  it("offers three distinct options when possible", () => {
    for (let seed = 1; seed < 50; seed++) {
      const choices = rollUpgradeChoices(NO_UPGRADES, seeded(seed));
      expect(choices).toHaveLength(3);
      expect(new Set(choices).size).toBe(3);
    }
  });

  it("never offers a capped upgrade, and offers fewer when few remain", () => {
    const almost: UpgradeLevels = { damage: 3, fireRate: 3, projectileSpeed: 2, moveSpeed: 2, maxHealth: 2, extraProjectile: 2 };
    expect(rollUpgradeChoices(almost, seeded(7))).toEqual(["maxHealth"]);
    const maxed: UpgradeLevels = { ...almost, maxHealth: 3 };
    expect(rollUpgradeChoices(maxed, seeded(7))).toEqual([]);
  });

  it("offers every upgrade about equally often (the shuffle is unbiased)", () => {
    const counts = Object.fromEntries(UPGRADE_IDS.map((id) => [id, 0])) as Record<UpgradeId, number>;
    const random = seeded(12345);
    const rolls = 6000;
    for (let i = 0; i < rolls; i++) rollUpgradeChoices(NO_UPGRADES, random).forEach((id) => counts[id]++);
    // Each roll shows 3 of 6, so each upgrade should appear in ~50% of rolls.
    for (const id of UPGRADE_IDS) {
      expect(counts[id] / rolls, id).toBeGreaterThan(0.45);
      expect(counts[id] / rolls, id).toBeLessThan(0.55);
    }
  });

  it("tolerates a random source that returns 1 or out-of-range values", () => {
    expect(new Set(rollUpgradeChoices(NO_UPGRADES, () => 0.9999999)).size).toBe(3);
    expect(new Set(rollUpgradeChoices(NO_UPGRADES, () => 1)).size).toBe(3);
  });
});
