import { describe, expect, it } from "vitest";
import { advanceRun, canExit, enemyDefeated, newRun, sanitizeRunState, startRoom } from "../src/logic/room.ts";

describe("room clear", () => {
  it("an empty room is cleared immediately and can be exited", () => {
    const r = startRoom(0);
    expect(r.phase).toBe("cleared");
    expect(canExit(r)).toBe(true);
  });

  it("locks the exit until every enemy is defeated", () => {
    let r = startRoom(3);
    expect(canExit(r)).toBe(false);
    r = enemyDefeated(r);
    r = enemyDefeated(r);
    expect(r.enemiesRemaining).toBe(1);
    expect(canExit(r)).toBe(false);
    r = enemyDefeated(r);
    expect(r.phase).toBe("cleared");
    expect(canExit(r)).toBe(true);
  });

  it("extra defeat events after clearing cannot underflow", () => {
    const r = enemyDefeated(enemyDefeated(startRoom(1)));
    expect(r.enemiesRemaining).toBe(0);
    expect(r.phase).toBe("cleared");
  });

  it("clamps nonsense enemy counts", () => {
    expect(startRoom(-2)).toMatchObject({ enemiesTotal: 0, phase: "cleared" });
    expect(startRoom(2.7).enemiesTotal).toBe(2);
  });
});

describe("run state across transitions", () => {
  it("advances through rooms in order, carrying health", () => {
    let run = newRun(5);
    run = advanceRun(run, 3, 4);
    expect(run).toEqual({ roomIndex: 1, playerHealth: 4, roomsCleared: 1 });
    run = advanceRun(run, 3, 2);
    expect(run).toEqual({ roomIndex: 2, playerHealth: 2, roomsCleared: 2 });
  });

  it("loops the room sequence (Milestone 2 placeholder for level progression)", () => {
    const run = advanceRun({ roomIndex: 2, playerHealth: 5, roomsCleared: 2 }, 3, 5);
    expect(run.roomIndex).toBe(0);
    expect(run.roomsCleared).toBe(3);
  });

  it("sanitizes missing or malformed scene data to a fresh run", () => {
    const fresh = newRun(5);
    expect(sanitizeRunState(undefined, 3, 5)).toEqual(fresh);
    expect(sanitizeRunState(null, 3, 5)).toEqual(fresh);
    expect(sanitizeRunState({}, 3, 5)).toEqual(fresh);
    expect(sanitizeRunState("room 2", 3, 5)).toEqual(fresh);
  });

  it("keeps valid fields and replaces invalid ones individually", () => {
    expect(sanitizeRunState({ roomIndex: 2, playerHealth: 3, roomsCleared: 7 }, 3, 5)).toEqual({
      roomIndex: 2,
      playerHealth: 3,
      roomsCleared: 7,
    });
    expect(sanitizeRunState({ roomIndex: 3, playerHealth: 0, roomsCleared: -1 }, 3, 5)).toEqual(newRun(5));
    expect(sanitizeRunState({ roomIndex: 1.5, playerHealth: 9, roomsCleared: Number.NaN }, 3, 5)).toEqual(newRun(5));
  });
});
