import { describe, expect, it } from "vitest";
import { DECOR } from "../src/data/decor.ts";
import { CRITTER, newCritter, stepCritter, type CritterState } from "../src/logic/critter.ts";
import { blockingTiles, coveredTiles, solidObjectGrid } from "../src/logic/objects.ts";
import { PARTICLE_STYLES, stepParticle, wrap } from "../src/logic/particles.ts";
import { cliffColumn, groundVariant, tileHash, waterPiece } from "../src/logic/terrainArt.ts";

/** IsTile from ASCII: '~' (or '#' for faces) marks true. */
function tiles(rows: string[], mark = "~") {
  return (c: number, r: number): boolean => rows[r]?.[c] === mark;
}

describe("terrain art selection", () => {
  it("tileHash is deterministic, in [0,1), and varies between tiles", () => {
    expect(tileHash(3, 7)).toBe(tileHash(3, 7));
    const values = new Set<number>();
    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 20; c++) {
        const h = tileHash(c, r);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(1);
        values.add(Math.floor(h * 10));
      }
    }
    expect(values.size).toBe(10); // spread over every tenth
  });

  it("ground variants are mostly plain, with roughly the asked share of detail", () => {
    let detail = 0;
    for (let r = 0; r < 100; r++) {
      for (let c = 0; c < 100; c++) {
        const v = groundVariant(c, r, 5, 0.2);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(5);
        if (v > 0) detail++;
      }
    }
    expect(detail / 10000).toBeGreaterThan(0.15);
    expect(detail / 10000).toBeLessThan(0.25);
    expect(groundVariant(4, 4, 1, 1)).toBe(0); // a single tile has no variants
  });

  it("water shores: corners, edges, centre, narrow channels and single ponds", () => {
    const pool = tiles([".....", ".~~~.", ".~~~.", ".~~~.", "....."]);
    expect(waterPiece(pool, 1, 1)).toEqual({ col: 0, row: 0 }); // top-left corner
    expect(waterPiece(pool, 2, 1)).toEqual({ col: 1, row: 0 }); // top edge
    expect(waterPiece(pool, 3, 3)).toEqual({ col: 2, row: 2 }); // bottom-right corner
    expect(waterPiece(pool, 2, 2)).toEqual({ col: 1, row: 1 }); // centre
    const channel = tiles(["..~..", "..~..", "..~.."]);
    expect(waterPiece(channel, 2, 0)).toEqual({ col: 3, row: 0 }); // off the map counts as land: a cap
    const v = tiles([".....", "..~..", "..~..", "..~..", "....."]);
    expect(waterPiece(v, 2, 1)).toEqual({ col: 3, row: 0 });
    expect(waterPiece(v, 2, 2)).toEqual({ col: 3, row: 1 });
    expect(waterPiece(v, 2, 3)).toEqual({ col: 3, row: 2 });
    const h = tiles([".....", ".~~~.", "....."]);
    expect(waterPiece(h, 1, 1)).toEqual({ col: 0, row: 3 });
    expect(waterPiece(h, 2, 1)).toEqual({ col: 1, row: 3 });
    expect(waterPiece(tiles(["...", ".~.", "..."]), 1, 1)).toEqual({ col: 3, row: 3 });
  });

  it("cliff faces get end pieces at both ends of a run", () => {
    const faces = tiles(["####.##"], "#");
    expect(cliffColumn(faces, 0, 0)).toBe(0);
    expect(cliffColumn(faces, 1, 0)).toBe(1);
    expect(cliffColumn(faces, 3, 0)).toBe(2);
    expect(cliffColumn(faces, 5, 0)).toBe(0);
    expect(cliffColumn(faces, 6, 0)).toBe(2);
  });
});

describe("placed objects", () => {
  it("covered and blocking tiles follow the catalogue (tree: 2x2 art, trunk row blocks)", () => {
    const at = { col: 10, row: 5 };
    expect(coveredTiles(DECOR.treeRound, at)).toHaveLength(4);
    expect(blockingTiles(DECOR.treeRound, at)).toEqual([
      { col: 10, row: 6 },
      { col: 11, row: 6 },
    ]);
    expect(blockingTiles(DECOR.daisy, at)).toEqual([]); // walk-over
    expect(blockingTiles(DECOR.pot, at)).toEqual([at]);
  });

  it("the solid grid marks static solids only (breakables are tracked live)", () => {
    const grid = solidObjectGrid(20, 10, [
      { def: DECOR.rockGrey, at: { col: 2, row: 2 } },
      { def: DECOR.pot, at: { col: 8, row: 8 } },
      { def: DECOR.tuft, at: { col: 5, row: 5 } },
    ]);
    expect(grid[2]?.[2] && grid[3]?.[3]).toBe(true);
    expect(grid[8]?.[8]).toBe(false);
    expect(grid[5]?.[5]).toBe(false);
  });
});

describe("critters", () => {
  const open = (): boolean => true;
  const home = { x: 100, y: 100 };
  const seq = (values: number[]) => {
    let i = 0;
    return () => values[i++ % values.length] ?? 0.5;
  };

  it("flee from a nearby player at flee speed, directly away", () => {
    const s = newCritter(home, 0, seq([0.5]));
    const next = stepCritter(s, home, { x: 80, y: 100 }, 16, 16, seq([0.5]), open);
    expect(next.mode).toBe("flee");
    expect(next.vx).toBeCloseTo(CRITTER.fleeSpeed);
    expect(next.x).toBeGreaterThan(s.x);
    expect(next.facing).toBe(1);
  });

  it("alternate idle and walk spells when the player is far away", () => {
    let s: CritterState = { ...newCritter(home, 0, seq([0.5])), until: 0 };
    const far = { x: 900, y: 900 };
    s = stepCritter(s, home, far, 1, 16, seq([0.25, 0.5]), open);
    expect(s.mode).toBe("walk");
    expect(Math.hypot(s.vx, s.vy)).toBeCloseTo(CRITTER.walkSpeed);
    s = stepCritter({ ...s, until: 0 }, home, far, 2000, 16, seq([0.5]), open);
    expect(s.mode).toBe("idle");
  });

  it("head back toward home when beyond the leash", () => {
    const s: CritterState = { x: home.x + 200, y: home.y, vx: 0, vy: 0, mode: "idle", until: 0, facing: 1 };
    const next = stepCritter(s, home, { x: 2000, y: 2000 }, 10, 16, seq([0.5]), open);
    expect(next.vx).toBeLessThan(0); // toward home (to the left)
  });

  it("never step onto ground they cannot stand on (walls, or land for fish)", () => {
    const s = newCritter(home, 0, seq([0.5]));
    const next = stepCritter(s, home, { x: 85, y: 100 }, 16, 100, seq([0.5]), () => false);
    expect(next.x).toBe(s.x);
    expect(next.y).toBe(s.y);
  });
});

describe("ambient particles", () => {
  it("wrap keeps coordinates within the margin band", () => {
    expect(wrap(650, 640, 16)).toBe(650);
    expect(wrap(660, 640, 16)).toBe(-12);
    expect(wrap(-20, 640, 16)).toBe(652);
  });

  it("drift with their style, shift with the camera, and stay on screen", () => {
    const style = PARTICLE_STYLES.snow;
    const view = { width: 640, height: 352 };
    let p = { x: 100, y: 100, phase: 0 };
    p = stepParticle(p, { ...style, sway: 0 }, 1000, 0, { dx: 0, dy: 0 }, view, 16);
    expect(p.y).toBeCloseTo(100 + style.vy);
    const moved = stepParticle(p, { ...style, sway: 0 }, 0, 0, { dx: 10, dy: 0 }, view, 16);
    expect(moved.x).toBeCloseTo(p.x - 10 * style.parallax);
    for (let i = 0; i < 500; i++) {
      p = stepParticle(p, style, 50, i * 50, { dx: 3, dy: -2 }, view, 16);
      expect(p.x).toBeGreaterThanOrEqual(-16);
      expect(p.x).toBeLessThan(656);
      expect(p.y).toBeGreaterThanOrEqual(-16);
      expect(p.y).toBeLessThan(368);
    }
  });
});
