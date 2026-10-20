import { describe, expect, it } from "vitest";
import { canExit, enemyDefeated, startRoom } from "../src/logic/room.ts";

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
