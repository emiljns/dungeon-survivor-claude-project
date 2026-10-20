import { describe, expect, it } from "vitest";
import { ALL_LAYOUTS } from "../src/data/rooms.ts";
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

  it("parses doors as merged rects and props as single tiles, separate from walls", () => {
    const l = parseLayout(["##DD##", "#Pcb.#", "######"], TILE);
    expect(l.doorRects).toEqual([{ x: 32, y: 0, width: 32, height: 16 }]);
    expect(l.props).toEqual([
      { kind: "crate", rect: { x: 32, y: 16, width: 16, height: 16 } },
      { kind: "barrel", rect: { x: 48, y: 16, width: 16, height: 16 } },
    ]);
    expect(l.wall[0]?.[2]).toBe(false); // door tile is not a wall tile
    expect(l.wall[1]?.[2]).toBe(false); // nor is a crate
  });

  it("rejects malformed layouts", () => {
    expect(() => parseLayout([], TILE)).toThrow();
    expect(() => parseLayout(["###", "#P"], TILE)).toThrow(/length/);
    expect(() => parseLayout(["#X#"], TILE)).toThrow(/Unknown/);
    expect(() => parseLayout(["#..#"], TILE)).toThrow(/player spawn/);
    expect(() => parseLayout(["#PP#"], TILE)).toThrow(/more than one/);
  });
});

describe.each(ALL_LAYOUTS.map((room) => [room.id, room] as const))("layout %s", (_id, room) => {
  const l = parseLayout(room.rows, TILE);
  const solidAt = (c: number, r: number): boolean =>
    l.wall[r]?.[c] !== false || l.props.some((p) => p.rect.x === c * TILE && p.rect.y === r * TILE);
  const isDoorTile = (c: number, r: number): boolean =>
    l.doorRects.some((d) => pointInRect({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE }, d));

  it("is 40 × 22 tiles", () => {
    expect(l.cols).toBe(40);
    expect(l.rows).toBe(22);
  });

  it("is enclosed by walls except for exactly one door on the outer edge", () => {
    expect(l.doorRects).toHaveLength(1);
    for (let r = 0; r < l.rows; r++) {
      for (let c = 0; c < l.cols; c++) {
        const edge = r === 0 || c === 0 || r === l.rows - 1 || c === l.cols - 1;
        if (edge) expect(l.wall[r]?.[c] || isDoorTile(c, r), `edge tile ${c},${r}`).toBe(true);
        else expect(isDoorTile(c, r), `interior door tile ${c},${r}`).toBe(false);
      }
    }
  });

  it("merged wall rects exactly cover the wall tiles", () => {
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
    expect(l.wallRects.length).toBeLessThan(30);
  });

  it("the door and every enemy spawn are reachable from the player spawn", () => {
    const start = { c: Math.floor(l.playerSpawn.x / TILE), r: Math.floor(l.playerSpawn.y / TILE) };
    const seen = new Set<string>([`${start.c},${start.r}`]);
    const queue = [start];
    let reachedDoor = false;
    while (queue.length > 0) {
      const cur = queue.shift();
      if (!cur) break;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const c = cur.c + dc;
        const r = cur.r + dr;
        if (seen.has(`${c},${r}`)) continue;
        if (isDoorTile(c, r)) reachedDoor = true;
        if (solidAt(c, r) || isDoorTile(c, r)) continue;
        seen.add(`${c},${r}`);
        queue.push({ c, r });
      }
    }
    expect(reachedDoor).toBe(true);
    for (const e of l.enemySpawns) {
      expect(seen.has(`${Math.floor(e.x / TILE)},${Math.floor(e.y / TILE)}`)).toBe(true);
    }
  });
});
