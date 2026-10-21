import { describe, expect, it } from "vitest";
import { WEAPONS, WEAPON_IDS, weaponStats } from "../src/data/weapons.ts";
import {
  breakableCoins,
  canBuy,
  COIN,
  coinsKept,
  dropCoin,
  enemyCoins,
  merchantStock,
  stepCoin,
  upgradePrice,
  villageStock,
} from "../src/logic/economy.ts";
import { newRun, sanitizeRunState } from "../src/logic/progression.ts";
import { steerToward } from "../src/logic/projectile.ts";
import { applyUpgrade, computeStats, NO_UPGRADES, UPGRADE_IDS } from "../src/logic/upgrades.ts";
import { STORAGE_KEY } from "../src/systems/HighScoreStore.ts";
import { buyUnlock, FRESH_SAVE, loadSave, parseSave, recordRun, SAVE_KEY, writeSave } from "../src/systems/SaveStore.ts";

const BASE = { damage: 1, fireIntervalMs: 140, bulletSpeed: 420, moveSpeed: 120, maxHealth: 5 };

class MemoryStorage {
  readonly data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
}

const blocked = {
  getItem(): string | null {
    throw new Error("SecurityError");
  },
  setItem(): void {
    throw new Error("QuotaExceededError");
  },
};

describe("weapons", () => {
  const stats = computeStats(BASE, NO_UPGRADES);

  it("the shuriken is the v1 gun unchanged", () => {
    const s = weaponStats(stats, "shuriken");
    expect([s.damage, s.fireIntervalMs, s.bulletSpeed, s.bulletRadius, s.pierce, s.homing]).toEqual([1, 140, 420, 2, 0, 0]);
  });

  it("each weapon changes only firing stats, never movement or health", () => {
    for (const id of WEAPON_IDS) {
      const s = weaponStats(stats, id);
      expect([s.moveSpeed, s.maxHealth, s.projectiles, s.spreadRad], id).toEqual([stats.moveSpeed, stats.maxHealth, stats.projectiles, stats.spreadRad]);
    }
    expect(weaponStats(stats, "kunai").fireIntervalMs).toBeLessThan(140); // fast
    expect(weaponStats(stats, "kunai").pierce).toBe(1);
    expect(weaponStats(stats, "bigShuriken").damage).toBeGreaterThan(2); // heavy
    expect(weaponStats(stats, "bigShuriken").fireIntervalMs).toBeGreaterThan(200); // slow
    expect(weaponStats(stats, "magicShuriken").homing).toBeGreaterThan(0);
  });

  it("every upgrade improves every weapon (upgrades apply to whichever weapon you carry)", () => {
    for (const id of WEAPON_IDS) {
      const before = weaponStats(stats, id);
      const dmg = weaponStats(computeStats(BASE, applyUpgrade(NO_UPGRADES, "damage")), id);
      const rate = weaponStats(computeStats(BASE, applyUpgrade(NO_UPGRADES, "fireRate")), id);
      const speed = weaponStats(computeStats(BASE, applyUpgrade(NO_UPGRADES, "projectileSpeed")), id);
      expect(dmg.damage, id).toBeGreaterThan(before.damage);
      expect(rate.fireIntervalMs, id).toBeLessThan(before.fireIntervalMs);
      expect(speed.bulletSpeed, id).toBeGreaterThan(before.bulletSpeed);
    }
  });

  it("only the starter is free; unlocks cost more than a run purchase", () => {
    expect(WEAPONS.shuriken.unlockPrice).toBe(0);
    for (const id of WEAPON_IDS.filter((w) => w !== "shuriken")) {
      expect(WEAPONS[id].unlockPrice, id).toBeGreaterThan(WEAPONS[id].runPrice);
      expect(WEAPONS[id].runPrice, id).toBeGreaterThan(0);
    }
  });
});

describe("coins", () => {
  it("tougher enemies drop more; elites double; the boss drops most", () => {
    expect(enemyCoins("chaser", false)).toBeLessThan(enemyCoins("ranged", false));
    expect(enemyCoins("ranged", false)).toBeLessThan(enemyCoins("tank", false));
    expect(enemyCoins("tank", false)).toBeLessThan(enemyCoins("boss", false));
    expect(enemyCoins("chaser", true)).toBe(2 * enemyCoins("chaser", false));
  });

  it("breakables drop 1–2 (pots) or 2–3 (crates)", () => {
    expect(breakableCoins("vase", () => 0.9)).toBe(1);
    expect(breakableCoins("vase", () => 0.1)).toBe(2);
    expect(breakableCoins("wood", () => 0.9)).toBe(2);
    expect(breakableCoins("wood", () => 0.1)).toBe(3);
  });

  it("victory banks every pocket coin; death and quitting bank half, rounded down", () => {
    expect(coinsKept(37, "victory")).toBe(37);
    expect(coinsKept(37, "defeat")).toBe(18);
    expect(coinsKept(37, "quit")).toBe(18);
    expect(coinsKept(1, "defeat")).toBe(0);
    expect(coinsKept(-5, "victory")).toBe(0);
  });

  it("a dropped coin settles, then flies to a nearby player and is collected", () => {
    let c = dropCoin({ x: 0, y: 0 }, 0, 1);
    const far = { x: 500, y: 0 };
    for (let i = 0; i < 60; i++) c = stepCoin(c, far, 16, false) ?? c;
    expect(c.magnet).toBe(false);
    expect(Math.hypot(c.vx, c.vy)).toBeLessThan(1); // settled
    const near = { x: c.x + COIN.magnetRadius - 2, y: c.y };
    let state: typeof c | null = c;
    let steps = 0;
    while (state && steps < 200) {
      state = stepCoin(state, near, 16, false);
      steps++;
    }
    expect(state).toBeNull();
    expect(steps).toBeLessThan(60); // under a second
  });

  it("an attracted coin flies in from anywhere (after an area is cleared)", () => {
    let c: ReturnType<typeof stepCoin> = dropCoin({ x: 0, y: 0 }, 0, 0);
    let steps = 0;
    while (c && steps < 400) {
      c = stepCoin(c, { x: 300, y: 200 }, 16, true);
      steps++;
    }
    expect(c).toBeNull();
  });
});

describe("shops", () => {
  it("village shop: every non-starter weapon, owned ones unavailable", () => {
    const stock = villageStock(["shuriken", "kunai"]);
    expect(stock.map((i) => i.id)).toEqual(["weapon:kunai", "weapon:bigShuriken", "weapon:magicShuriken"]);
    expect(stock[0]?.available).toBe(false);
    expect(stock[0]?.note).toBe("OWNED");
    expect(stock[1]?.available).toBe(true);
  });

  it("merchant: heal, three upgrades, and unlocked weapons only (at run prices)", () => {
    const stock = merchantStock(["shuriken", "kunai"], "shuriken", NO_UPGRADES, { current: 3, max: 5 }, 0);
    const ids = stock.map((i) => i.id);
    expect(ids[0]).toBe("heal");
    expect(ids.filter((i) => i.startsWith("upgrade:"))).toHaveLength(3);
    expect(ids).toContain("weapon:kunai");
    expect(ids).not.toContain("weapon:bigShuriken"); // not unlocked
    expect(ids).not.toContain("weapon:shuriken"); // already carried
    expect(stock.find((i) => i.id === "weapon:kunai")?.price).toBe(WEAPONS.kunai.runPrice);
  });

  it("merchant: carrying another weapon offers the shuriken back; full HP and capped upgrades are unavailable", () => {
    let maxed = NO_UPGRADES;
    for (const id of UPGRADE_IDS) for (let i = 0; i < 5; i++) maxed = applyUpgrade(maxed, id);
    const stock = merchantStock(["shuriken", "kunai"], "kunai", maxed, { current: 5, max: 5 }, 1);
    expect(stock.find((i) => i.id === "heal")?.available).toBe(false);
    expect(stock.filter((i) => i.id.startsWith("upgrade:")).every((i) => !i.available)).toBe(true);
    expect(stock.find((i) => i.id === "weapon:kunai")?.note).toBe("CARRIED");
    expect(stock.find((i) => i.id === "weapon:shuriken")?.available).toBe(true);
  });

  it("different levels' merchants offer different upgrades; prices rise with level", () => {
    const a = merchantStock(["shuriken"], "shuriken", NO_UPGRADES, { current: 1, max: 5 }, 0).map((i) => i.id);
    const b = merchantStock(["shuriken"], "shuriken", NO_UPGRADES, { current: 1, max: 5 }, 1).map((i) => i.id);
    expect(a).not.toEqual(b);
    expect(upgradePrice(2)).toBeGreaterThan(upgradePrice(0));
  });

  it("canBuy needs the item available and enough coins", () => {
    const item = { id: "heal" as const, name: "x", description: "", price: 20, available: true };
    expect(canBuy(item, 19)).toBe(false);
    expect(canBuy(item, 20)).toBe(true);
    expect(canBuy({ ...item, available: false }, 99)).toBe(false);
  });
});

describe("save v2", () => {
  it("fresh: nothing stored gives a fresh save with the starter unlocked", () => {
    expect(loadSave(new MemoryStorage())).toEqual(FRESH_SAVE);
    expect(loadSave(null)).toEqual(FRESH_SAVE);
  });

  it("migrates the v1 best score when there is no v2 save", () => {
    const s = new MemoryStorage();
    s.setItem(STORAGE_KEY, JSON.stringify({ bestScore: 4200, bestLevel: 3 }));
    expect(loadSave(s)).toEqual({ ...FRESH_SAVE, bestScore: 4200, bestLevel: 3 });
  });

  it("malformed or wrong-version data falls back (to the migrated v1 record)", () => {
    for (const raw of ["{not json", "null", "[]", JSON.stringify({ version: 1, coins: 50 })]) {
      const s = new MemoryStorage();
      s.setItem(SAVE_KEY, raw);
      expect(loadSave(s), raw).toEqual(FRESH_SAVE);
    }
  });

  it("validates fields: bad numbers become 0, unknown weapons are dropped, the starter is always owned", () => {
    const save = parseSave(JSON.stringify({ version: 2, bestScore: -5, bestLevel: 99, coins: 12.7, unlocks: ["kunai", "laser", "kunai", 3] }));
    expect(save).toEqual({ version: 2, bestScore: 0, bestLevel: 5, coins: 12, unlocks: ["shuriken", "kunai"] });
  });

  it("blocked storage never throws: loads fresh, saving reports false", () => {
    expect(loadSave(blocked)).toEqual(FRESH_SAVE);
    expect(writeSave(blocked, FRESH_SAVE)).toBe(false);
  });

  it("round-trips, records runs (best only improves, coins add up) and buys unlocks once", () => {
    const s = new MemoryStorage();
    let { save, newBestScore } = recordRun(FRESH_SAVE, 900, 2, 40);
    expect(newBestScore).toBe(true);
    expect(save.coins).toBe(40);
    ({ save, newBestScore } = recordRun(save, 500, 1, 30));
    expect(newBestScore).toBe(false);
    expect([save.bestScore, save.bestLevel, save.coins]).toEqual([900, 2, 70]);
    const bought = buyUnlock(save, "kunai", 60);
    expect(bought.ok).toBe(true);
    expect(bought.save.coins).toBe(10);
    expect(bought.save.unlocks).toEqual(["shuriken", "kunai"]);
    expect(buyUnlock(bought.save, "kunai", 60).ok).toBe(false); // already owned
    expect(buyUnlock(bought.save, "bigShuriken", 150).ok).toBe(false); // too expensive
    expect(writeSave(s, bought.save)).toBe(true);
    expect(loadSave(s)).toEqual(bought.save);
  });
});

describe("run state and homing", () => {
  it("a new run starts with no coins and the shuriken; bad coin/weapon data is sanitized", () => {
    expect([newRun(5).coins, newRun(5).weapon]).toEqual([0, "shuriken"]);
    const r = sanitizeRunState({ ...newRun(5), coins: 25, coinsEarned: 40, weapon: "kunai" }, [4, 4], 5);
    expect([r.coins, r.coinsEarned, r.weapon]).toEqual([25, 40, "kunai"]);
    const bad = sanitizeRunState({ ...newRun(5), coins: -3, weapon: "rocket" }, [4, 4], 5);
    expect([bad.coins, bad.weapon]).toEqual([0, "shuriken"]);
  });

  it("homing turns toward the target by at most the turn limit, keeping speed", () => {
    const v = steerToward(100, 0, { x: 0, y: 0 }, { x: 0, y: 100 }, 0.1);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(100);
    expect(Math.atan2(v.vy, v.vx)).toBeCloseTo(0.1);
    const done = steerToward(100, 0, { x: 0, y: 0 }, { x: 100, y: 1 }, 1);
    expect(Math.atan2(done.vy, done.vx)).toBeCloseTo(Math.atan2(1, 100));
    expect(steerToward(100, 0, { x: 0, y: 0 }, { x: 0, y: 100 }, 0)).toEqual({ vx: 100, vy: 0 });
  });
});
