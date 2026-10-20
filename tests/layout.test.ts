import { describe, expect, it } from "vitest";
import { TEST_ARENA } from "../src/data/arenas.ts";
import { pointInRect } from "../src/logic/collision.ts";
import { parseLayout } from "../src/logic/layout.ts";

const TILE = 16;

describe("parseLayout", () => {
  it("parses spawns at tile centres", () => {
    const l = parseLayout(["#####", "#P.E#", "#####"], TILE);
    expect(l.cols).toBe(5);
    expect(l.rows).toBe(3);
    expect(l.playerSpawn).toEqual({ x: 24, y: 24 });
    expect(l.enemySpawns).toEqual([{ x: 56, y: 24 }]);
  });

  it("merges walls into rects that exactly cover every wall tile and no floor tile", () => {
    const l = parseLayout(TEST_ARENA, TILE);
    let wallTiles = 0;
    for (let r = 0; r < l.rows; r++) {
      for (let c = 0; c < l.cols; c++) {
        const centre = { x: (c + 0.5) * TILE, y: (r + 0.5) * TILE };
        const covering = l.wallRects.filter((rect) => pointInRect(centre, rect)).length;
        const isWall = l.wall[r]?.[c] === true;
        if (isWall) wallTiles++;
        expect(covering, `tile ${c},${r}`).toBe(isWall ? 1 : 0);
      }
    }
    const area = l.wallRects.reduce((sum, rect) => sum + rect.width * rect.height, 0);
    expect(area).toBe(wallTiles * TILE * TILE);
    // Merging should collapse ~150 wall tiles into a handful of bodies.
    expect(l.wallRects.length).toBeLessThan(20);
  });

  it("the test arena is fully enclosed and has a player and enemy spawn", () => {
    const l = parseLayout(TEST_ARENA, TILE);
    expect(l.cols).toBe(40);
    expect(l.rows).toBe(22);
    for (let c = 0; c < l.cols; c++) {
      expect(l.wall[0]?.[c]).toBe(true);
      expect(l.wall[l.rows - 1]?.[c]).toBe(true);
    }
    for (let r = 0; r < l.rows; r++) {
      expect(l.wall[r]?.[0]).toBe(true);
      expect(l.wall[r]?.[l.cols - 1]).toBe(true);
    }
    expect(l.enemySpawns.length).toBeGreaterThan(0);
  });

  it("rejects malformed layouts", () => {
    expect(() => parseLayout([], TILE)).toThrow();
    expect(() => parseLayout(["###", "#P"], TILE)).toThrow(/length/);
    expect(() => parseLayout(["#X#"], TILE)).toThrow(/Unknown/);
    expect(() => parseLayout(["#..#"], TILE)).toThrow(/player spawn/);
    expect(() => parseLayout(["#PP#"], TILE)).toThrow(/more than one/);
  });
});
