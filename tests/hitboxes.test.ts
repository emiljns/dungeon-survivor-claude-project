import { describe, expect, it } from "vitest";
import { ENEMY_BODY, PLAYER_BODY } from "../src/data/hitboxes.ts";
import { makeElite } from "../src/logic/enemyStats.ts";
import { ENEMY_STATS } from "../src/data/enemies.ts";

// Regression lock: the art milestone must not change collision boxes. These
// are the exact sizes the game shipped with in v1.0 (Milestone 6).
describe("hitboxes are unchanged by the art", () => {
  it("player body is 10px", () => {
    expect(PLAYER_BODY).toBe(10);
  });

  it("enemy bodies match v1.0", () => {
    expect(ENEMY_BODY).toEqual({ chaser: 12, tank: 16, ranged: 12, boss: 28 });
  });

  it("elite scaling (and therefore elite hitboxes) is unchanged", () => {
    expect(makeElite(ENEMY_STATS.chaser).scale).toBeCloseTo(1.35, 12);
    expect(ENEMY_BODY.chaser * makeElite(ENEMY_STATS.chaser).scale).toBeCloseTo(16.2, 9);
  });
});
