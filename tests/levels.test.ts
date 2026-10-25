import { describe, expect, it } from "vitest";
import { ENEMY_STATS } from "../src/data/enemies.ts";
import { LEVELS, ROOMS_PER_LEVEL, type LevelDefinition } from "../src/data/levels.ts";
import { lookFor, statsFor } from "../src/data/bestiary.ts";
import { SHEETS } from "../src/data/artManifest.ts";

/** v2 levels are one map with encounter areas; v1 levels are chains of rooms. */
const isMapLevel = (l: LevelDefinition): boolean => l.rooms.length === 1 && l.rooms[0]?.encounters !== undefined;
const ROOM_LEVELS = LEVELS.filter((l) => !isMapLevel(l));
const MAP_LEVELS = LEVELS.filter(isMapLevel);
import { scaleForDifficulty, LIMITS } from "../src/logic/enemyStats.ts";
import { parseLayout } from "../src/logic/layout.ts";

describe("level data", () => {
  it("has exactly five levels numbered 1–5 in order with distinct themes", () => {
    expect(LEVELS.map((l) => l.number)).toEqual([1, 2, 3, 4, 5]);
    expect(LEVELS.map((l) => l.name)).toEqual([
      "Bamboo Forest",
      "River",
      "Snowy Mountain",
      "Forgotten Foundry",
      "The Void",
    ]);
    expect(new Set(LEVELS.map((l) => l.theme.id)).size).toBe(5);
    expect(ROOMS_PER_LEVEL).toEqual(LEVELS.map((l) => l.rooms.length));
  });

  it.each(ROOM_LEVELS.map((l) => [l.number, l] as const))("v1 level %i: start room, 3–5 rooms, combat in between", (_n, level) => {
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

  it("v1 levels end with exactly one elite, except level 5, which ends with the boss", () => {
    for (const level of ROOM_LEVELS) {
      const final = level.rooms[level.rooms.length - 1];
      const elites = final?.enemies.filter((e) => e.elite) ?? [];
      const bosses = final?.enemies.filter((e) => e.kind === "boss") ?? [];
      if (level.number < 5) {
        expect(elites, `level ${level.number}`).toHaveLength(1);
        expect(bosses).toHaveLength(0);
      } else {
        expect(bosses).toHaveLength(1);
      }
      // The elite/boss spawns first (at the arena's top spawn).
      const first = final?.enemies[0];
      expect(first?.elite || first?.kind === "boss").toBe(true);
    }
  });

  it.each(MAP_LEVELS.map((l) => [l.number, l] as const))("v2 level %i: a merchant, a mini-boss with adds midway, and the boss in the last encounter", (_n, level) => {
    const room = level.rooms[0];
    const encounters = room?.encounters ?? [];
    expect(room?.npcs?.map((n) => n.kind)).toContain("merchant");
    const minibossAt = encounters.findIndex((e) => e.waves.flat().some((s) => s.kind === "miniboss"));
    const bossAt = encounters.findIndex((e) => e.waves.flat().some((s) => s.kind === "boss"));
    expect(minibossAt, "mini-boss encounter").toBeGreaterThan(0);
    expect(bossAt, "boss in the last encounter").toBe(encounters.length - 1);
    expect(minibossAt).toBeLessThan(bossAt);
    // The mini-boss comes with a wave of adds; the boss fight has reinforcements.
    const mini = encounters[minibossAt];
    expect(mini?.waves.flat().filter((s) => s.kind !== "miniboss").length).toBeGreaterThan(1);
    expect(encounters[bossAt]?.waves.length).toBeGreaterThan(1);
    // Exactly one of each, and one exit (past the boss).
    expect(room?.enemies.filter((s) => s.kind === "boss")).toHaveLength(1);
    expect(room?.enemies.filter((s) => s.kind === "miniboss")).toHaveLength(1);
    expect(parseLayout(room?.layout.rows ?? [], 16).doorRects.length).toBe(1);
  });

  it.each(MAP_LEVELS.map((l) => [l.number, l] as const))("v2 level %i: its bestiary uses real sheets, and the boss outclasses its mini-boss", (_n, level) => {
    for (const kind of ["chaser", "tank", "ranged", "boss", "miniboss"] as const) {
      const look = lookFor(level.bestiary, kind);
      expect(SHEETS[look.sheet], `${kind} sheet`).toBeDefined();
      if (kind === "boss" || kind === "miniboss") expect(look.idleAnim, kind).toBeTruthy();
    }
    const boss = statsFor(level.bestiary, "boss");
    const mini = statsFor(level.bestiary, "miniboss");
    expect(boss.maxHealth).toBeGreaterThan(mini.maxHealth);
    expect(boss.attack?.count ?? 0).toBeGreaterThan(mini.attack?.count ?? 0);
  });

  it("uses all three regular enemy types, reuses layouts, and enemy toughness never decreases", () => {
    const kinds = new Set(LEVELS.flatMap((l) => l.rooms.flatMap((r) => r.enemies.map((e) => e.kind))));
    for (const k of ["chaser", "tank", "ranged"] as const) expect(kinds.has(k)).toBe(true);

    const layoutUses = LEVELS.flatMap((l) => l.rooms.map((r) => r.layout.id));
    expect(new Set(layoutUses).size).toBeLessThan(layoutUses.length);

    // Health scaling rises every level. Speed only has to stay in a modest
    // band; level 2 (the River, which kept the v1 sewers' pace) is the fastest.
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i]?.difficulty.healthMul).toBeGreaterThan(LEVELS[i - 1]?.difficulty.healthMul ?? 0);
    }
    for (const level of LEVELS) {
      expect(level.difficulty.speedMul).toBeGreaterThanOrEqual(1);
      expect(level.difficulty.speedMul).toBeLessThanOrEqual(1.25);
    }
    expect(LEVELS[1]?.difficulty.speedMul).toBe(Math.max(...LEVELS.slice(0, 4).map((l) => l.difficulty.speedMul)));
  });

  it("rewards: every level offers an upgrade, start rooms and the victory room never do; 9 per run", () => {
    let total = 0;
    for (const level of LEVELS) {
      expect(level.rooms[0]?.reward, `level ${level.number} start`).toBe(false);
      const roomRewards = level.rooms.filter((r) => r.reward).length;
      const encounterRewards = level.rooms.flatMap((r) => r.encounters ?? []).filter((e) => e.reward).length;
      expect(roomRewards + encounterRewards, `level ${level.number}`).toBeGreaterThan(0);
      for (const r of level.rooms) if (r.reward) expect(r.enemies.length).toBeGreaterThan(0);
      total += roomRewards + encounterRewards;
    }
    const last = LEVELS[LEVELS.length - 1];
    expect(last?.rooms[last.rooms.length - 1]?.reward).toBe(false); // clearing it is victory
    // 9 upgrades per run: fewer than the 15 total upgrade levels, so choices never run dry.
    expect(total).toBe(9);
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
