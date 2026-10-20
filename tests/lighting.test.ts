import { describe, expect, it } from "vitest";
import { biomeFor } from "../src/data/biomes.ts";
import { ALL_LAYOUTS } from "../src/data/rooms.ts";
import { THEMES } from "../src/data/themes.ts";
import { parseLayout } from "../src/logic/layout.ts";
import { clampDarkness, flicker, torchLights } from "../src/logic/lighting.ts";

const TILE = 16;

describe("torch symbol", () => {
  it("'T' is a solid wall tile that also records a torch", () => {
    const l = parseLayout(["##T##", "#P..#", "#####"], TILE);
    expect(l.wall[0]?.[2]).toBe(true);
    expect(l.torches).toEqual([{ col: 2, row: 0 }]);
    // Torch tiles merge into wall bodies like '#'.
    expect(l.wallRects.some((r) => r.x === 0 && r.y === 0 && r.width === 80)).toBe(true);
  });
});

describe("torchLights", () => {
  it("a top-wall torch lights the floor below it", () => {
    const l = parseLayout(["##T##", "#P..#", "#...#", "#####"], TILE);
    const [light] = torchLights(l, TILE);
    expect(light?.flame.x).toBe(40);
    expect(light?.pool.x).toBe(40);
    expect(light?.pool.y).toBeGreaterThan(light?.flame.y ?? 0);
  });

  it("side-wall torches face sideways into the room", () => {
    const l = parseLayout(["#####", "T.P.T", "#####"], TILE);
    const [left, right] = torchLights(l, TILE);
    expect(left?.pool.x).toBeGreaterThan(left?.flame.x ?? 0);
    expect(right?.pool.x).toBeLessThan(right?.flame.x ?? 0);
  });

  it("skips a buried torch with no floor next to it", () => {
    const l = parseLayout(["###", "#T#", "###", "#P#", "###"], TILE);
    expect(torchLights(l, TILE)).toEqual([]);
  });

  it.each(ALL_LAYOUTS.map((l) => [l.id, l] as const))("every torch in %s faces the floor, 4–6 per room", (_id, layout) => {
    const l = parseLayout(layout.rows, TILE);
    expect(l.torches.length).toBeGreaterThanOrEqual(4);
    expect(l.torches.length).toBeLessThanOrEqual(6);
    const lights = torchLights(l, TILE);
    expect(lights).toHaveLength(l.torches.length);
    // Every pool centre lands inside the room on an open tile.
    for (const light of lights) {
      const c = Math.floor(light.pool.x / TILE);
      const r = Math.floor(light.pool.y / TILE);
      expect(l.wall[r]?.[c], `${layout.id} pool at ${c},${r}`).toBe(false);
    }
    // Torches do not flicker in lockstep.
    expect(new Set(lights.map((t) => t.seed)).size).toBe(lights.length);
  });
});

describe("flicker and darkness", () => {
  it("flicker stays within its amplitude and actually varies", () => {
    const values = Array.from({ length: 500 }, (_, i) => flicker(i * 16, 123, 0.06));
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0.94);
      expect(v).toBeLessThanOrEqual(1.06);
    }
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.03);
  });

  it("is deterministic for the same time and seed", () => {
    expect(flicker(1234, 7)).toBe(flicker(1234, 7));
    expect(flicker(1234, 7)).not.toBe(flicker(1234, 8));
  });

  it("darkness is clamped so the room is never fully black", () => {
    expect(clampDarkness(2)).toBe(0.8);
    expect(clampDarkness(-1)).toBe(0);
    expect(clampDarkness(Number.NaN)).toBe(0);
  });

  it("every theme's ambient darkness keeps threats readable (≤ 0.7); dungeons are dark, outdoor levels follow the day", () => {
    for (const theme of Object.values(THEMES)) {
      if (biomeFor(theme.id)) expect(theme.light.darkness, theme.id).toBeGreaterThanOrEqual(0);
      else expect(theme.light.darkness, theme.id).toBeGreaterThan(0.3);
      expect(theme.light.darkness, theme.id).toBeLessThanOrEqual(0.7);
      expect(theme.light.playerRadius, theme.id).toBeGreaterThanOrEqual(110);
    }
  });
});
