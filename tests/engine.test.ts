import { describe, expect, it } from "vitest";
import type { EnemySpec } from "../src/data/levels.ts";
import {
  IDLE,
  MIN_SPAWN_DISTANCE,
  pickSpawnPoints,
  shouldTrigger,
  startEncounter,
  stepEncounter,
  totalEnemies,
  triggerRect,
  type EncounterDef,
} from "../src/logic/encounter.ts";
import { computeFlowField, distanceAt, flowDirection, withClearance } from "../src/logic/flowField.ts";
import { parseLayout } from "../src/logic/layout.ts";

const T = 16;

/** Builds a walkable() from ASCII ('#' and '~' block). */
function grid(rows: string[]) {
  const l = parseLayout(rows, T);
  return { l, walk: (c: number, r: number) => l.wall[r]?.[c] === false && l.low[r]?.[c] === false };
}

describe("layout: water and gates", () => {
  it("'~' is a low obstacle, not a wall; 'G' is a gate on open floor", () => {
    const { l } = grid(["#####", "#P~G#", "#####"]);
    expect(l.wall[1]?.[2]).toBe(false);
    expect(l.low[1]?.[2]).toBe(true);
    expect(l.lowRects).toEqual([{ x: 32, y: 16, width: 16, height: 16 }]);
    expect(l.gates).toEqual([{ col: 3, row: 1 }]);
    expect(l.wall[1]?.[3]).toBe(false);
  });
});

describe("flow field", () => {
  it("measures step distance around walls", () => {
    const { l, walk } = grid([
      "#######",
      "#P....#",
      "####..#",
      "#.....#",
      "#######",
    ]);
    const f = computeFlowField(walk, l.cols, l.rows, { col: 1, row: 1 });
    expect(distanceAt(f, 1, 1)).toBe(0);
    expect(distanceAt(f, 1, 3)).toBe(8); // around the wall: right 3, down 2, left 3
    expect(distanceAt(f, 0, 0)).toBe(-1); // wall
  });

  it("routes around water (low obstacles block walking)", () => {
    const { l, walk } = grid([
      "#######",
      "#P.~..#",
      "#..~..#",
      "#.....#",
      "#######",
    ]);
    const f = computeFlowField(walk, l.cols, l.rows, { col: 1, row: 1 });
    expect(distanceAt(f, 3, 1)).toBe(-1);
    expect(distanceAt(f, 4, 1)).toBe(7); // down under the water and back up
  });

  it("points an enemy along the shortest route, not straight through a wall", () => {
    const { l, walk } = grid([
      "#######",
      "#P..#.#",
      "#...#.#",
      "#.....#",
      "#######",
    ]);
    const f = computeFlowField(walk, l.cols, l.rows, { col: 1, row: 1 });
    // Enemy at (5,1): straight left is a wall, so it must go down first.
    const dir = flowDirection(f, { x: 5.5 * T, y: 1.5 * T }, T);
    expect(dir?.y).toBeGreaterThan(0.9);
    expect(Math.abs(dir?.x ?? 1)).toBeLessThan(0.1);
  });

  it("never cuts a wall corner diagonally", () => {
    const { l, walk } = grid([
      "#####",
      "#P#.#",
      "#...#",
      "#####",
    ]);
    const f = computeFlowField(walk, l.cols, l.rows, { col: 1, row: 1 });
    // From (3,1) the diagonal to (2,2) is fine, but (2,1) is a wall, so a
    // diagonal from (2,2) to (1,1) would cut the corner and must not be used.
    const dir = flowDirection(f, { x: 2.5 * T, y: 2.5 * T }, T);
    expect(dir).toEqual({ x: -1, y: 0 });
  });

  it("returns no direction on the target tile or where no route exists", () => {
    const { l, walk } = grid([
      "######",
      "#P#..#",
      "######",
    ]);
    const f = computeFlowField(walk, l.cols, l.rows, { col: 1, row: 1 });
    expect(flowDirection(f, { x: 1.5 * T, y: 1.5 * T }, T)).toBeNull();
    expect(flowDirection(f, { x: 3.5 * T, y: 1.5 * T }, T)).toBeNull(); // sealed off
  });

  it("the clearance field keeps big bodies a tile away from walls, and steps them out", () => {
    const { l, walk } = grid([
      "############",
      "#P.........#",
      "#..........#",
      "#....#.....#",
      "#..........#",
      "#..........#",
      "#..........#",
      "#..........#",
      "############",
    ]);
    const target = { col: 1, row: 1 };
    const big = computeFlowField(withClearance(walk, target), l.cols, l.rows, target);
    expect(distanceAt(big, 1, 1)).toBe(0); // target counts even next to walls
    expect(distanceAt(big, 2, 2)).toBeGreaterThan(0); // 3x3 all open
    expect(distanceAt(big, 6, 2)).toBe(-1); // touches the pillar diagonally
    expect(distanceAt(big, 7, 3)).toBeGreaterThan(0);
    expect(distanceAt(big, 3, 7)).toBe(-1); // next to the outer wall
    // A big enemy on (6,2), next to the pillar, steps to a clear neighbour.
    const dir = flowDirection(big, { x: 6.5 * T, y: 2.5 * T }, T);
    expect(dir).not.toBeNull();
    expect(dir?.x).toBeGreaterThan(0); // away from the pillar, onto (7,y)
  });

  it("handles a large map quickly", () => {
    const rows = Array.from({ length: 120 }, (_, r) => (r === 0 || r === 119 ? "#".repeat(200) : "#" + ".".repeat(198) + "#"));
    rows[60] = "#P" + ".".repeat(197) + "#";
    const { l, walk } = grid(rows);
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) computeFlowField(walk, l.cols, l.rows, { col: 1 + i, row: 60 });
    expect((performance.now() - t0) / 10).toBeLessThan(10); // ms per field, 24k tiles
  });
});

const c: EnemySpec = { kind: "chaser", elite: false };
const def = (over: Partial<EncounterDef> = {}): EncounterDef => ({
  id: "e",
  area: { col: 10, row: 10, cols: 10, rows: 8 },
  waves: [[c, c, c], [c, c]],
  reward: false,
  ...over,
});

describe("encounters", () => {
  it("triggers only once the player is well inside (gates never close on the player)", () => {
    const d = def();
    expect(triggerRect(d)).toEqual({ col: 12, row: 12, cols: 6, rows: 4 });
    expect(shouldTrigger(d, IDLE, { col: 10, row: 12 })).toBe(false); // on the edge
    expect(shouldTrigger(d, IDLE, { col: 13, row: 13 })).toBe(true);
    expect(shouldTrigger(d, { phase: "cleared", wave: 1 }, { col: 13, row: 13 })).toBe(false);
  });

  it("an ambush uses its own small trigger", () => {
    const d = def({ trigger: { col: 15, row: 10, cols: 2, rows: 2 } });
    expect(shouldTrigger(d, IDLE, { col: 13, row: 13 })).toBe(false);
    expect(shouldTrigger(d, IDLE, { col: 15, row: 11 })).toBe(true);
  });

  it("spawns the next wave when one enemy is left, and clears after the last", () => {
    const d = def();
    let { state } = startEncounter();
    expect(state).toEqual({ phase: "active", wave: 0 });
    let r = stepEncounter(d, state, 3);
    expect(r.spawnWave).toBeNull();
    r = stepEncounter(d, state, 1);
    expect(r.spawnWave).toBe(1);
    state = r.state;
    r = stepEncounter(d, state, 2);
    expect(r.cleared).toBe(false);
    r = stepEncounter(d, state, 0);
    expect(r.cleared).toBe(true);
    expect(r.state.phase).toBe("cleared");
    expect(totalEnemies(d)).toBe(5);
  });

  it("a single-wave encounter clears when everything is dead", () => {
    const d = def({ waves: [[c, c]] });
    const { state } = startEncounter();
    expect(stepEncounter(d, state, 1).cleared).toBe(false);
    expect(stepEncounter(d, state, 0).cleared).toBe(true);
  });

  it("spawn points respect the minimum distance from the player, farthest first", () => {
    const player = { x: 0, y: 0 };
    const pts = [{ x: 20, y: 0 }, { x: 200, y: 0 }, { x: 120, y: 0 }];
    const chosen = pickSpawnPoints(pts, 4, player);
    expect(chosen.map((p) => Math.hypot(p.x, p.y) >= MIN_SPAWN_DISTANCE)).toEqual([true, true, true, true]);
    expect(chosen[0]).toEqual({ x: 200, y: 0 });
    // Cycling past the far points nudges repeats sideways.
    expect(chosen[2]).toEqual({ x: 218, y: 0 });
  });

  it("still spawns (as far as possible) when every point is close", () => {
    expect(pickSpawnPoints([{ x: 10, y: 0 }, { x: 30, y: 0 }], 2, { x: 0, y: 0 })[0]).toEqual({ x: 30, y: 0 });
    expect(pickSpawnPoints([], 3, { x: 0, y: 0 })).toEqual([]);
  });
});

import { behindWallTop, cameraLean, inView } from "../src/logic/view.ts";

describe("camera and visibility", () => {
  it("leans toward the aim, capped in length", () => {
    expect(cameraLean({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.2, 36)).toEqual({ x: 20, y: 0 });
    const far = cameraLean({ x: 0, y: 0 }, { x: 1000, y: 1000 }, 0.2, 36);
    expect(Math.hypot(far.x, far.y)).toBeCloseTo(36);
    expect(cameraLean({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({ x: 0, y: 0 });
    expect(cameraLean({ x: 0, y: 0 }, { x: Number.NaN, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it("inView respects the margin", () => {
    const view = { x: 100, y: 100, width: 640, height: 352 };
    expect(inView({ x: 400, y: 300 }, view)).toBe(true);
    expect(inView({ x: 90, y: 300 }, view)).toBe(false);
    expect(inView({ x: 90, y: 300 }, view, 16)).toBe(true);
    expect(inView({ x: 800, y: 300 }, view, 16)).toBe(false);
  });

  it("an actor just north of a wall is behind its top; south of it is not", () => {
    const { l } = grid(["#####", "#..P#", "#.#.#", "#...#", "#####"]);
    expect(behindWallTop(l.wall, { x: 2.5 * T, y: 1.5 * T }, 5, T)).toBe(true); // wall below at (2,2)
    expect(behindWallTop(l.wall, { x: 2.5 * T, y: 3.5 * T }, 5, T)).toBe(true); // outer wall row 4 below
    expect(behindWallTop(l.wall, { x: 1.5 * T, y: 2.5 * T }, 5, T)).toBe(false);
    expect(behindWallTop(l.wall, { x: 1.9 * T, y: 1.5 * T }, 5, T)).toBe(true); // right edge overlaps
  });
});
