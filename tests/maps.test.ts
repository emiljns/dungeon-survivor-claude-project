import { beforeEach, describe, expect, it } from "vitest";
import { DECOR } from "../src/data/decor.ts";
import { biomeFor, resolveObject } from "../src/data/biomes.ts";
import { TEST_MAP, type MapDef } from "../src/data/maps.ts";
import { WORLD_MAPS } from "../src/data/worldMaps.ts";
import { LEVELS } from "../src/data/levels.ts";
import { HOME_VILLAGE } from "../src/data/village.ts";
import { parseVillage, villageLevel } from "../src/data/maps.ts";
import { Tuning } from "../src/game/config.ts";
import { solidObjectGrid } from "../src/logic/objects.ts";
import { blockingTiles, coveredTiles } from "../src/logic/objects.ts";
import { GAME_HEIGHT, GAME_WIDTH } from "../src/game/config.ts";
import { inRect, triggerRect, type TileRect } from "../src/logic/encounter.ts";
import { parseLayout, type ParsedLayout, type TilePos } from "../src/logic/layout.ts";

const T = 16;
const MAPS: readonly MapDef[] = [TEST_MAP, ...Object.values(WORLD_MAPS), HOME_VILLAGE];

const key = (p: TilePos): string => `${p.col},${p.row}`;
const tileOf = (x: number, y: number): TilePos => ({ col: Math.floor(x / T), row: Math.floor(y / T) });

function isDoor(l: ParsedLayout, c: number, r: number): boolean {
  return l.doorRects.some((d) => c * T >= d.x && c * T < d.x + d.width && r * T >= d.y && r * T < d.y + d.height);
}

/** Tiles blocked by objects: layout props and every placed object (breakables count, as if never broken). */
let objectBlocked = new Set<string>();

function isPropTile(l: ParsedLayout, c: number, r: number): boolean {
  return objectBlocked.has(`${c},${r}`) || l.props.some((p) => p.rect.x === c * T && p.rect.y === r * T);
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
  // Objects as they will appear: generic slots resolved for the map's biome.
  const objects = (map.objects ?? []).map((o) => resolveObject(o, map.theme ?? "ruins"));
  // Hurdles count as passable here: the player can always dash over them.
  const blocked = new Set(objects.filter((o) => DECOR[o.id].kind !== "hurdle").flatMap((o) => blockingTiles(DECOR[o.id], o)).map(key));
  beforeEach(() => {
    objectBlocked = blocked;
  });

  it("objects lie inside the map; their blocking tiles sit on plain open floor (no wall, water, gate, door, spawn or start)", () => {
    const gateSet = new Set(l.gates.map(key));
    const special = new Set([...l.enemySpawns.map((s) => tileOf(s.x, s.y)), tileOf(l.playerSpawn.x, l.playerSpawn.y)].map(key));
    const seen = new Set<string>();
    for (const o of objects) {
      const def = DECOR[o.id];
      for (const t of coveredTiles(def, o)) {
        expect(t.col >= 0 && t.row >= 0 && t.col < l.cols && t.row < l.rows, `${o.id} at ${key(o)} inside`).toBe(true);
      }
      for (const t of blockingTiles(def, o)) {
        const where = `${o.id} at ${key(o)} blocks ${key(t)}`;
        expect(l.wall[t.row]?.[t.col], where).toBe(false);
        expect(l.low[t.row]?.[t.col], where).toBe(false);
        expect(isDoor(l, t.col, t.row) || gateSet.has(key(t)) || special.has(key(t)), where).toBe(false);
        expect(seen.has(key(t)), `${where}: overlaps another object`).toBe(false);
        seen.add(key(t));
      }
    }
  });

  it("NPCs stand on open floor clear of objects, spawns and the start, and can be reached on foot", () => {
    const reach = flood(l, tileOf(l.playerSpawn.x, l.playerSpawn.y), { gatesClosed: false, doorOpen: true });
    const special = new Set([...l.enemySpawns.map((s) => tileOf(s.x, s.y)), tileOf(l.playerSpawn.x, l.playerSpawn.y)].map(key));
    for (const n of map.npcs ?? []) {
      const where = `${n.kind} at ${key(n)}`;
      expect(l.wall[n.row]?.[n.col] === false && !l.low[n.row]?.[n.col] && !blocked.has(key(n)) && !special.has(key(n)), where).toBe(true);
      const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dc, dr]) => `${n.col + (dc ?? 0)},${n.row + (dr ?? 0)}`);
      expect(neighbours.some((k) => reach.has(k)), `${where} reachable`).toBe(true);
    }
  });

  it("critters start where they can live (open ground; water for fish), and only animals of the biome are placed", () => {
    const biome = biomeFor(map.theme ?? "");
    for (const c of map.critters ?? []) {
      if (biome) expect(biome.critters, `${c.kind} does not live in ${map.theme}`).toContain(c.kind);
      const where = `${c.kind} at ${key(c)}`;
      if (c.kind === "fish") expect(l.low[c.row]?.[c.col], where).toBe(true);
      else expect(l.wall[c.row]?.[c.col] === false && !l.low[c.row]?.[c.col] && !blocked.has(key(c)), where).toBe(true);
    }
  });

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

  it("every gate belongs to exactly one encounter area (maps with encounters have gates)", () => {
    expect(l.gates.length > 0).toBe(map.encounters.length > 0);
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

  it("water (where a map has it) blocks walking but is not a wall (bullets fly over it)", () => {
    for (let r = 0; r < l.rows; r++) for (let c = 0; c < l.cols; c++) if (l.low[r]?.[c]) expect(l.wall[r]?.[c]).toBe(false);
  });
});

describe("shops on maps and levels", () => {
  it("the village map has the shopkeeper; every other world map has a travelling merchant", () => {
    expect(WORLD_MAPS.village.npcs?.map((n) => n.kind)).toEqual(["shopkeeper"]);
    for (const key of ["forest", "river", "snow"] as const) expect(WORLD_MAPS[key].npcs?.map((n) => n.kind), key).toEqual(["merchant"]);
  });

  it("every level's arrival room has the merchant on open floor beside the start", () => {
    for (const level of LEVELS) {
      const room = level.rooms[0];
      expect(room?.npcs?.map((n) => n.kind), level.name).toEqual(["merchant"]);
      if (!room?.npcs?.[0]) continue;
      const l = parseLayout(room.layout.rows, T);
      const n = room.npcs[0];
      expect(l.wall[n.row]?.[n.col], level.name).toBe(false);
      expect(l.props.some((p) => p.rect.x === n.col * T && p.rect.y === n.row * T), level.name).toBe(false);
      expect(Math.hypot(n.col * T - l.playerSpawn.x, n.row * T - l.playerSpawn.y), level.name).toBeGreaterThan(T);
    }
  });
});

describe("Home Village prologue", () => {
  const l = parseLayout(HOME_VILLAGE.layout.rows, T);
  const start = tileOf(l.playerSpawn.x, l.playerSpawn.y);
  const objects = (HOME_VILLAGE.objects ?? []).map((o) => resolveObject(o, "village"));

  it("is peaceful: no encounters, enemies, spawns or coins to collect", () => {
    const level = villageLevel();
    expect(level.number).toBe(0);
    expect(level.theme.id).toBe("village");
    expect(level.rooms[0]?.enemies).toEqual([]);
    expect(l.enemySpawns).toEqual([]);
    expect(objects.some((o) => DECOR[o.id].kind === "breakable")).toBe(false);
  });

  it("the gate is a few steps from where you start (repeat runs stay quick)", () => {
    const door = l.doorRects[0];
    expect(door).toBeDefined();
    if (door) expect(Math.hypot(door.x - l.playerSpawn.x, door.y - l.playerSpawn.y) / T).toBeLessThan(10);
  });

  it("has the tutorial and the shop: signs, training dummies, low fences, the shopkeeper", () => {
    const kinds = (HOME_VILLAGE.npcs ?? []).map((n) => n.kind);
    expect(kinds).toContain("shopkeeper");
    expect(kinds.filter((k) => k === "sign").length).toBeGreaterThanOrEqual(3);
    for (const n of HOME_VILLAGE.npcs ?? []) if (n.kind === "sign") expect(n.text?.length ?? 0, key(n)).toBeGreaterThan(20);
    expect(objects.filter((o) => DECOR[o.id].kind === "dummy").length).toBeGreaterThan(0);
    expect(objects.filter((o) => DECOR[o.id].kind === "hurdle").length).toBeGreaterThan(0);
  });

  it("the end of the dash lane can only be reached by dashing over the fences", () => {
    const end = (HOME_VILLAGE.npcs ?? []).find((n) => n.kind === "sign" && n.text?.startsWith("Nicely dashed"));
    expect(end).toBeDefined();
    if (!end) return;
    const near = (reach: Set<string>): boolean => [[0, -1], [-1, 0], [1, 0]].some(([dc, dr]) => reach.has(`${end.col + (dc ?? 0)},${end.row + (dr ?? 0)}`));
    objectBlocked = new Set(objects.flatMap((o) => blockingTiles(DECOR[o.id], o)).map(key)); // hurdles block walking
    expect(near(flood(l, start, { gatesClosed: false, doorOpen: true }))).toBe(false);
    objectBlocked = new Set(objects.filter((o) => DECOR[o.id].kind !== "hurdle").flatMap((o) => blockingTiles(DECOR[o.id], o)).map(key));
    expect(near(flood(l, start, { gatesClosed: false, doorOpen: true }))).toBe(true);
  });

  it("a dash carries the player clear over a one-tile fence (plus the player's body)", () => {
    const dashPx = (Tuning.dash.speed * Tuning.dash.durationMs) / 1000;
    expect(dashPx).toBeGreaterThan(T + 10 + 8); // fence depth + body + margin
  });

  it("hurdles block paths (enemies never cross them), unlike walk-over decoration", () => {
    const grid = solidObjectGrid(10, 10, [
      { def: DECOR.fence, at: { col: 2, row: 2 } },
      { def: DECOR.daisy, at: { col: 6, row: 6 } },
    ]);
    expect([grid[3]?.[2], grid[3]?.[3], grid[3]?.[4]]).toEqual([true, true, true]);
    expect(grid[6]?.[6]).toBe(false);
  });

  it("scene data asks for the village only explicitly", () => {
    expect(parseVillage({ village: true })).toBe(true);
    expect(parseVillage({ village: "yes" })).toBe(false);
    expect(parseVillage(null)).toBe(false);
  });
});
