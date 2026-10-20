import { describe, expect, it } from "vitest";
import { ENEMY_STATS } from "../src/data/enemies.ts";
import { LEVELS, ROOMS_PER_LEVEL } from "../src/data/levels.ts";
import { scaleForDifficulty, LIMITS } from "../src/logic/enemyStats.ts";
import { parseLayout } from "../src/logic/layout.ts";

describe("level data", () => {
  it("has exactly five levels numbered 1–5 in order with distinct themes", () => {
    expect(LEVELS.map((l) => l.number)).toEqual([1, 2, 3, 4, 5]);
    expect(LEVELS.map((l) => l.name)).toEqual([
      "Dungeon Ruins",
      "Toxic Sewers",
      "Ancient Temple",
      "Forgotten Foundry",
      "The Void",
    ]);
    expect(new Set(LEVELS.map((l) => l.theme.id)).size).toBe(5);
    expect(ROOMS_PER_LEVEL).toEqual(LEVELS.map((l) => l.rooms.length));
  });

  it.each(LEVELS.map((l) => [l.number, l] as const))("level %i: start room, 3–5 rooms, combat in between", (_n, level) => {
    expect(level.rooms.length).toBeGreaterThanOrEqual(3);
    expect(level.rooms.length).toBeLessThanOrEqual(5);
    expect(level.rooms[0]?.enemies).toHaveLength(0);
    for (const room of level.rooms.slice(1)) expect(room.enemies.length).toBeGreaterThan(0);
  });

  it.each(LEVELS.map((l) => [l.number, l] as const))("level %i: every room has spawn points for its enemies", (_n, level) => {
    for (const room of level.rooms) {
      const spawns = parseLayout(room.layout.rows, 16).enemySpawns.length;
      if (room.enemies.length > 0) expect(spawns, room.layout.id).toBeGreaterThan(0);
    }
  });

  it("levels 1–4 end with exactly one elite; level 5 ends with the boss", () => {
    LEVELS.forEach((level, i) => {
      const final = level.rooms[level.rooms.length - 1];
      const elites = final?.enemies.filter((e) => e.elite) ?? [];
      const bosses = final?.enemies.filter((e) => e.kind === "boss") ?? [];
      if (i < 4) {
        expect(elites, `level ${level.number}`).toHaveLength(1);
        expect(bosses).toHaveLength(0);
      } else {
        expect(bosses).toHaveLength(1);
      }
    });
    // The boss appears nowhere else, and the elite/boss spawns first (at the arena's top spawn).
    const allBosses = LEVELS.flatMap((l) => l.rooms.flatMap((r) => r.enemies)).filter((e) => e.kind === "boss");
    expect(allBosses).toHaveLength(1);
    for (const level of LEVELS) {
      const first = level.rooms[level.rooms.length - 1]?.enemies[0];
      expect(first?.elite || first?.kind === "boss").toBe(true);
    }
  });

  it("uses all three regular enemy types, reuses layouts, and enemy toughness never decreases", () => {
    const kinds = new Set(LEVELS.flatMap((l) => l.rooms.flatMap((r) => r.enemies.map((e) => e.kind))));
    for (const k of ["chaser", "tank", "ranged"] as const) expect(kinds.has(k)).toBe(true);

    const layoutUses = LEVELS.flatMap((l) => l.rooms.map((r) => r.layout.id));
    expect(new Set(layoutUses).size).toBeLessThan(layoutUses.length);

    // Health scaling rises every level. Speed is a theme trait (the sewers are
    // deliberately "fast"), so it only has to stay in a modest band.
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i]?.difficulty.healthMul).toBeGreaterThan(LEVELS[i - 1]?.difficulty.healthMul ?? 0);
    }
    for (const level of LEVELS) {
      expect(level.difficulty.speedMul).toBeGreaterThanOrEqual(1);
      expect(level.difficulty.speedMul).toBeLessThanOrEqual(1.25);
    }
    expect(LEVELS[1]?.difficulty.speedMul).toBe(Math.max(...LEVELS.slice(0, 4).map((l) => l.difficulty.speedMul)));
  });

  it("every scaled enemy stays inside safe stat bounds", () => {
    for (const level of LEVELS) {
      for (const stats of Object.values(ENEMY_STATS)) {
        const s = scaleForDifficulty(stats, level.difficulty);
        expect(s.maxHealth).toBeGreaterThanOrEqual(LIMITS.maxHealth.min);
        expect(s.maxHealth).toBeLessThanOrEqual(LIMITS.maxHealth.max);
        expect(s.speed).toBeLessThanOrEqual(LIMITS.speed.max);
        // Enemies must stay slower than the player (120 px/s) so they can be outrun or dashed past.
        expect(s.speed).toBeLessThan(120);
      }
    }
  });
});
