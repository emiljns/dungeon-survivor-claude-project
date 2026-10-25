import { describe, expect, it } from "vitest";
import { DASH_REACH, edgeHolds, JUMP_GAP_TILES, nearestSafeTile, respawnTile, shouldFall, WIDE_GAP_TILES } from "../src/logic/abyss.ts";
import { parseLayout } from "../src/logic/layout.ts";
import { PLAYER_BODY } from "../src/data/hitboxes.ts";

const T = 16;

describe("abyss", () => {
  it("a dash clears a 2-tile gap with room to spare, and can never clear a 4-tile one", () => {
    // From standing at an edge (the body may hang over it by half its width)
    // the player's centre must land past the gap on the far platform.
    const bodyHalf = PLAYER_BODY / 2;
    expect(DASH_REACH).toBeGreaterThan(JUMP_GAP_TILES * T + bodyHalf + 8);
    expect(DASH_REACH).toBeLessThan(WIDE_GAP_TILES * T);
  });

  it("the edge holds the player unless they dash or step off on purpose; knockback never pushes them in", () => {
    expect(edgeHolds({ dashing: false, knockedBack: false, walking: false })).toBe(true); // shoved while standing
    expect(edgeHolds({ dashing: false, knockedBack: true, walking: true })).toBe(true); // reeling from a hit
    expect(edgeHolds({ dashing: false, knockedBack: false, walking: true })).toBe(false); // stepping off
    expect(edgeHolds({ dashing: true, knockedBack: false, walking: false })).toBe(false); // dash-jump
    expect(edgeHolds({ dashing: true, knockedBack: true, walking: false })).toBe(false); // a dash cancels knockback
  });

  it("the player falls only when over the abyss and not dashing (a dash that ends over it falls)", () => {
    expect(shouldFall(true, false)).toBe(true);
    expect(shouldFall(true, true)).toBe(false);
    expect(shouldFall(false, false)).toBe(false);
  });

  it("respawn: the last safe tile, or the nearest safe one if it has become blocked", () => {
    const open = new Set(["5,5", "7,5"]);
    const isSafe = (c: number, r: number): boolean => open.has(`${c},${r}`);
    expect(nearestSafeTile({ col: 5, row: 5 }, isSafe)).toEqual({ col: 5, row: 5 });
    open.delete("5,5"); // say, a gate closed on it
    expect(nearestSafeTile({ col: 5, row: 5 }, isSafe)).toEqual({ col: 7, row: 5 });
    expect(nearestSafeTile({ col: 5, row: 5 }, () => false, 3)).toBeNull();
  });

  it("a fall brings the player back away from the edge, so a held key does not walk them straight off again", () => {
    // Row 1 is a platform edge (abyss above it on row 0); rows 2–4 are inner floor.
    const l = parseLayout(["#______#", "#......#", "#......#", "#..P...#", "########"], T);
    const isOpen = (c: number, r: number): boolean => l.wall[r]?.[c] === false && !l.abyss[r]?.[c];
    const isAbyss = (c: number, r: number): boolean => l.abyss[r]?.[c] === true;
    expect(respawnTile({ col: 3, row: 1 }, isOpen, isAbyss)).toEqual({ col: 3, row: 2 });
    // A one-tile ledge has no inner tile: fall back to the nearest open one.
    const ledge = parseLayout(["#___#", "#_._#", "#_P_#", "#####"], T);
    const open2 = (c: number, r: number): boolean => ledge.wall[r]?.[c] === false && !ledge.abyss[r]?.[c];
    expect(respawnTile({ col: 2, row: 1 }, open2, (c, r) => ledge.abyss[r]?.[c] === true)).toEqual({ col: 2, row: 1 });
  });

  it("'_' in a layout is abyss: not floor, wall or water, with merged edge bodies", () => {
    const l = parseLayout(["######", "#P__.#", "######"], T);
    expect(l.abyss[1]).toEqual([false, false, true, true, false, false]);
    expect(l.wall[1]?.[2]).toBe(false);
    expect(l.low[1]?.[2]).toBe(false);
    expect(l.abyssRects).toEqual([{ x: 2 * T, y: T, width: 2 * T, height: T }]);
  });
});
