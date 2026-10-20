import { describe, expect, it } from "vitest";
import { TEST_MAP, type MapDef } from "../src/data/maps.ts";
import { GAME_HEIGHT, GAME_WIDTH } from "../src/game/config.ts";
import { inRect, triggerRect, type TileRect } from "../src/logic/encounter.ts";
import { parseLayout, type ParsedLayout, type TilePos } from "../src/logic/layout.ts";

const T = 16;
const MAPS: readonly MapDef[] = [TEST_MAP];

const key = (p: TilePos): string => `${p.col},${p.row}`;
const tileOf = (x: number, y: number): TilePos => ({ col: Math.floor(x / T), row: Math.floor(y / T) });

function isDoor(l: ParsedLayout, c: number, r: number): boolean {
  return l.doorRects.some((d) => c * T >= d.x && c * T < d.x + d.width && r * T >= d.y && r * T < d.y + d.height);
}

function isPropTile(l: ParsedLayout, c: number, r: number): boolean {
  return l.props.some((p) => p.rect.x === c * T && p.rect.y === r * T);
}

/** Tiles reachable on foot from `start`. Gates/door open or closed as asked. */
function flood(l: ParsedLayout, start: TilePos, opts: { gatesClosed: boolean; doorOpen: boolean }): Set<string> {
  const gateSet = new Set(l.gates.map(key));
  const open = (c: number, r: number): boolean => {
    if (l.wall[r]?.[c] !== false || l.low[r]?.[c] || isPropTile(l, c, r)) return false;
    if (isDoor(l, c, r)) return opts.doorOpen;
    if (opts.gatesClosed && gateSet.has(`${c},${r}`)) return false;
    return true;
  };
  const seen = new Set([key(start)]);
  const queue = [start];
  while (queue.length) {
    const p = queue.shift();
    if (!p) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = { col: p.col + dc, row: p.row + dr };
      if (seen.has(key(n)) || !open(n.col, n.row)) continue;
      seen.add(key(n));
      queue.push(n);
    }
  }
  return seen;
}

function firstOpenTile(l: ParsedLayout, rect: TileRect): TilePos | null {
  for (let r = rect.row; r < rect.row + rect.rows; r++) {
    for (let c = rect.col; c < rect.col + rect.cols; c++) {
      if (l.wall[r]?.[c] === false && !l.low[r]?.[c] && !isPropTile(l, c, r)) return { col: c, row: r };
    }
  }
  return null;
}

describe.each(MAPS.map((m) => [m.layout.id, m] as const))("map %s", (_id, map) => {
  const l = parseLayout(map.layout.rows, T);

  it("is larger than one screen in both directions (the camera must scroll)", () => {
    expect(l.cols * T).toBeGreaterThan(GAME_WIDTH);
    expect(l.rows * T).toBeGreaterThan(GAME_HEIGHT);
  });

  it("is fully enclosed (the outer ring is wall or door)", () => {
    for (let r = 0; r < l.rows; r++) {
      for (let c = 0; c < l.cols; c++) {
        const edge = r === 0 || c === 0 || r === l.rows - 1 || c === l.cols - 1;
        if (edge) expect(l.wall[r]?.[c] || isDoor(l, c, r), `edge ${c},${r}`).toBe(true);
      }
    }
  });

  it("every gate belongs to exactly one encounter area", () => {
    expect(l.gates.length).toBeGreaterThan(0);
    for (const gate of l.gates) {
      expect(map.encounters.filter((e) => inRect(gate, e.area)).length, key(gate)).toBe(1);
    }
  });

  it("every encounter has waves, spawn points inside its area, and a walkable trigger inside its area", () => {
    for (const e of map.encounters) {
      expect(e.waves.length, e.id).toBeGreaterThan(0);
      expect(e.waves.every((w) => w.length > 0), e.id).toBe(true);
      const spawns = l.enemySpawns.map((p) => tileOf(p.x, p.y)).filter((p) => inRect(p, e.area));
      expect(spawns.length, `${e.id} spawns`).toBeGreaterThan(0);
      const trig = triggerRect(e);
      expect(trig.col >= e.area.col && trig.row >= e.area.row && trig.col + trig.cols <= e.area.col + e.area.cols && trig.row + trig.rows <= e.area.row + e.area.rows, `${e.id} trigger inside area`).toBe(true);
      expect(firstOpenTile(l, trig), `${e.id} trigger walkable`).not.toBeNull();
    }
  });

  it("the start is safe: outside every encounter area", () => {
    const start = tileOf(l.playerSpawn.x, l.playerSpawn.y);
    for (const e of map.encounters) expect(inRect(start, e.area), e.id).toBe(false);
  });

  it("with gates open, the player can reach every trigger, every spawn and the exit door", () => {
    const reach = flood(l, tileOf(l.playerSpawn.x, l.playerSpawn.y), { gatesClosed: false, doorOpen: true });
    for (const e of map.encounters) {
      const trig = firstOpenTile(l, triggerRect(e));
      expect(trig && reach.has(key(trig)), `${e.id} trigger`).toBe(true);
    }
    for (const s of l.enemySpawns) expect(reach.has(key(tileOf(s.x, s.y))), `spawn ${s.x},${s.y}`).toBe(true);
    const door = l.doorRects[0];
    expect(door).toBeDefined();
    if (door) expect(reach.has(key(tileOf(door.x, door.y)))).toBe(true);
  });

  it("closed gates seal each encounter area: from its trigger you cannot leave the area", () => {
    for (const e of map.encounters) {
      const trig = firstOpenTile(l, triggerRect(e));
      expect(trig).not.toBeNull();
      if (!trig) continue;
      const inside = flood(l, trig, { gatesClosed: true, doorOpen: false });
      for (const k of inside) {
        const [c, r] = k.split(",").map(Number);
        expect(inRect({ col: c ?? -1, row: r ?? -1 }, e.area), `${e.id} leaks at ${k}`).toBe(true);
      }
    }
  });

  it("water exists, and blocks walking but is not a wall (bullets fly over it)", () => {
    const waterTiles = l.low.flat().filter(Boolean).length;
    expect(waterTiles).toBeGreaterThan(0);
    for (let r = 0; r < l.rows; r++) for (let c = 0; c < l.cols; c++) if (l.low[r]?.[c]) expect(l.wall[r]?.[c]).toBe(false);
  });
});
