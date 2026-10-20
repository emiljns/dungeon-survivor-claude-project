import { describe, expect, it } from "vitest";
import {
  advanceRun,
  effectiveMaxHealth,
  isFinalLevel,
  isFinalRoomOfLevel,
  newRun,
  sanitizeRunState,
  type RunState,
} from "../src/logic/progression.ts";
import { NO_UPGRADES } from "../src/logic/upgrades.ts";

const ROOMS = [4, 4, 5, 5, 5] as const;
const MAX_HP = 5;
const run = (over: Partial<RunState> = {}): RunState => ({ ...newRun(MAX_HP), ...over });

/** Walks a whole run room by room, returning the visited (level, room) pairs. */
function playThrough(): { visited: string[]; ending: string } {
  let r: RunState = newRun(MAX_HP);
  const visited = [`${r.levelIndex}:${r.roomIndex}`];
  for (let guard = 0; guard < 100; guard++) {
    const next = advanceRun(r, ROOMS, 3, MAX_HP);
    if (next.kind === "victory") return { visited, ending: `victory after ${next.roomsCleared}` };
    r = next.run;
    visited.push(`${r.levelIndex}:${r.roomIndex}`);
  }
  return { visited, ending: "no ending" };
}

describe("level progression", () => {
  it("visits every room of levels 1–5 in order, then ends in victory", () => {
    const { visited, ending } = playThrough();
    const expected = ROOMS.flatMap((count, level) => Array.from({ length: count }, (_, room) => `${level}:${room}`));
    expect(visited).toEqual(expected);
    expect(ending).toBe(`victory after ${expected.length}`);
  });

  it("carries health between rooms but restores it at the start of a new level", () => {
    const midLevel = advanceRun(run({ levelIndex: 0, roomIndex: 1, playerHealth: 4, roomsCleared: 1 }), ROOMS, 2, MAX_HP);
    expect(midLevel.kind).toBe("nextRoom");
    if (midLevel.kind === "nextRoom") expect(midLevel.run).toMatchObject({ levelIndex: 0, roomIndex: 2, playerHealth: 2, roomsCleared: 2 });

    const endOfLevel = advanceRun(run({ levelIndex: 1, roomIndex: 3, playerHealth: 1, roomsCleared: 7 }), ROOMS, 1, 7);
    expect(endOfLevel.kind).toBe("nextLevel");
    if (endOfLevel.kind === "nextLevel") expect(endOfLevel.run).toMatchObject({ levelIndex: 2, roomIndex: 0, playerHealth: 7, roomsCleared: 8 });
  });

  it("carries score, kills, time and upgrades through room and level transitions", () => {
    const upgrades = { ...NO_UPGRADES, damage: 2, maxHealth: 1 };
    const carried = { score: 4200, enemiesDefeated: 17, runTimeMs: 95_000, upgrades };
    const a = advanceRun(run({ roomIndex: 1, ...carried }), ROOMS, 3, 6);
    const b = advanceRun(run({ roomIndex: 3, ...carried }), ROOMS, 3, 6);
    for (const r of [a, b]) {
      expect(r.kind).not.toBe("victory");
      if (r.kind !== "victory") expect(r.run).toMatchObject(carried);
    }
  });

  it("finishing the final room of level 5 is victory, never a level 6", () => {
    const last = run({ levelIndex: 4, roomIndex: 4, playerHealth: 3, roomsCleared: 22 });
    expect(isFinalLevel(last, ROOMS)).toBe(true);
    expect(isFinalRoomOfLevel(last, ROOMS)).toBe(true);
    expect(advanceRun(last, ROOMS, 3, MAX_HP)).toEqual({ kind: "victory", roomsCleared: 23 });
  });

  it("identifies final rooms only at the end of each level", () => {
    expect(isFinalRoomOfLevel(run({ levelIndex: 0, roomIndex: 3 }), ROOMS)).toBe(true);
    expect(isFinalRoomOfLevel(run({ levelIndex: 2, roomIndex: 3 }), ROOMS)).toBe(false);
    expect(isFinalLevel(run({ levelIndex: 3 }), ROOMS)).toBe(false);
  });
});

describe("sanitizeRunState", () => {
  it("returns a fresh run for missing or malformed data", () => {
    for (const bad of [undefined, null, {}, "level 3", 42]) {
      expect(sanitizeRunState(bad, ROOMS, MAX_HP)).toEqual(newRun(MAX_HP));
    }
  });

  it("keeps a valid state unchanged", () => {
    const ok = run({ levelIndex: 2, roomIndex: 4, playerHealth: 6, roomsCleared: 12, score: 9000, enemiesDefeated: 40, runTimeMs: 1234.5, upgrades: { ...NO_UPGRADES, maxHealth: 2, fireRate: 3 } });
    expect(sanitizeRunState(ok, ROOMS, MAX_HP)).toEqual(ok);
  });

  it("rejects out-of-range levels and rooms (cannot skip or overflow)", () => {
    expect(sanitizeRunState({ levelIndex: 5, roomIndex: 0 }, ROOMS, MAX_HP).levelIndex).toBe(0);
    expect(sanitizeRunState({ levelIndex: -1, roomIndex: 0 }, ROOMS, MAX_HP).levelIndex).toBe(0);
    // Level 1 only has rooms 0–3.
    expect(sanitizeRunState({ levelIndex: 0, roomIndex: 4 }, ROOMS, MAX_HP).roomIndex).toBe(0);
    // An invalid level also resets the room.
    expect(sanitizeRunState({ levelIndex: 9, roomIndex: 2 }, ROOMS, MAX_HP)).toMatchObject({ levelIndex: 0, roomIndex: 0 });
  });

  it("bounds health by the max including Iron Heart upgrades", () => {
    expect(sanitizeRunState({ playerHealth: 7 }, ROOMS, MAX_HP).playerHealth).toBe(MAX_HP); // no upgrade: 7 > 5
    expect(sanitizeRunState({ playerHealth: 7, upgrades: { maxHealth: 2 } }, ROOMS, MAX_HP).playerHealth).toBe(7);
    expect(sanitizeRunState({ playerHealth: 0 }, ROOMS, MAX_HP).playerHealth).toBe(MAX_HP);
    expect(sanitizeRunState({ playerHealth: 2.5 }, ROOMS, MAX_HP).playerHealth).toBe(MAX_HP);
    expect(effectiveMaxHealth(5, { ...NO_UPGRADES, maxHealth: 3 })).toBe(8);
  });

  it("clamps counters, time and upgrade levels individually", () => {
    const s = sanitizeRunState(
      { roomsCleared: -3, score: 1.5, enemiesDefeated: "lots", runTimeMs: Number.NaN, upgrades: { damage: 99, fireRate: -1, moveSpeed: 1 } },
      ROOMS,
      MAX_HP,
    );
    expect(s).toMatchObject({ roomsCleared: 0, score: 0, enemiesDefeated: 0, runTimeMs: 0 });
    expect(s.upgrades).toEqual({ ...NO_UPGRADES, damage: 3, moveSpeed: 1 });
  });
});
