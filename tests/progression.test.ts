import { describe, expect, it } from "vitest";
import {
  advanceRun,
  isFinalLevel,
  isFinalRoomOfLevel,
  newRun,
  sanitizeRunState,
  type RunState,
} from "../src/logic/progression.ts";

const ROOMS = [4, 4, 5, 5, 5] as const;
const MAX_HP = 5;

/** Walks a whole run room by room, returning the visited (level, room) pairs. */
function playThrough(): { visited: string[]; ending: string } {
  let run: RunState = newRun(MAX_HP);
  const visited = [`${run.levelIndex}:${run.roomIndex}`];
  for (let guard = 0; guard < 100; guard++) {
    const next = advanceRun(run, ROOMS, 3, MAX_HP);
    if (next.kind === "victory") return { visited, ending: `victory after ${next.roomsCleared}` };
    run = next.run;
    visited.push(`${run.levelIndex}:${run.roomIndex}`);
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
    const midLevel = advanceRun({ levelIndex: 0, roomIndex: 1, playerHealth: 4, roomsCleared: 1 }, ROOMS, 2, MAX_HP);
    expect(midLevel).toEqual({ kind: "nextRoom", run: { levelIndex: 0, roomIndex: 2, playerHealth: 2, roomsCleared: 2 } });

    const endOfLevel = advanceRun({ levelIndex: 1, roomIndex: 3, playerHealth: 1, roomsCleared: 7 }, ROOMS, 1, MAX_HP);
    expect(endOfLevel).toEqual({ kind: "nextLevel", run: { levelIndex: 2, roomIndex: 0, playerHealth: MAX_HP, roomsCleared: 8 } });
  });

  it("finishing the final room of level 5 is victory, never a level 6", () => {
    const last: RunState = { levelIndex: 4, roomIndex: 4, playerHealth: 3, roomsCleared: 22 };
    expect(isFinalLevel(last, ROOMS)).toBe(true);
    expect(isFinalRoomOfLevel(last, ROOMS)).toBe(true);
    expect(advanceRun(last, ROOMS, 3, MAX_HP)).toEqual({ kind: "victory", roomsCleared: 23 });
  });

  it("identifies final rooms only at the end of each level", () => {
    expect(isFinalRoomOfLevel({ levelIndex: 0, roomIndex: 3, playerHealth: 5, roomsCleared: 0 }, ROOMS)).toBe(true);
    expect(isFinalRoomOfLevel({ levelIndex: 2, roomIndex: 3, playerHealth: 5, roomsCleared: 0 }, ROOMS)).toBe(false);
    expect(isFinalLevel({ levelIndex: 3, roomIndex: 0, playerHealth: 5, roomsCleared: 0 }, ROOMS)).toBe(false);
  });
});

describe("sanitizeRunState", () => {
  it("returns a fresh run for missing or malformed data", () => {
    for (const bad of [undefined, null, {}, "level 3", 42]) {
      expect(sanitizeRunState(bad, ROOMS, MAX_HP)).toEqual(newRun(MAX_HP));
    }
  });

  it("keeps a valid state unchanged", () => {
    const ok = { levelIndex: 2, roomIndex: 4, playerHealth: 2, roomsCleared: 12 };
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

  it("clamps health and counters individually", () => {
    expect(sanitizeRunState({ levelIndex: 1, roomIndex: 1, playerHealth: 0, roomsCleared: -3 }, ROOMS, MAX_HP)).toEqual({
      levelIndex: 1,
      roomIndex: 1,
      playerHealth: MAX_HP,
      roomsCleared: 0,
    });
    expect(sanitizeRunState({ playerHealth: 99 }, ROOMS, MAX_HP).playerHealth).toBe(MAX_HP);
    expect(sanitizeRunState({ playerHealth: 2.5 }, ROOMS, MAX_HP).playerHealth).toBe(MAX_HP);
  });
});
