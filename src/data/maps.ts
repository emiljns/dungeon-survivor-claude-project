// Large, hand-authored maps for v2 (Milestone 8+). Same ASCII symbols as
// room layouts (see src/logic/layout.ts), plus encounter areas defined here.

import type { EncounterDef } from "../logic/encounter.ts";
import type { PlacedCritter, PlacedNpc, PlacedObject } from "./decor.ts";
import { LEVELS, type EnemySpec, type LevelDefinition } from "./levels.ts";
import type { RoomLayout } from "./rooms.ts";
import { THEMES } from "./themes.ts";
import { WORLD_MAPS } from "./worldMaps.ts";
import { HOME_VILLAGE } from "./village.ts";

export interface MapDef {
  /** Theme id the map is made for (decides slot variants and critters). */
  readonly theme?: string;
  readonly layout: RoomLayout;
  readonly encounters: readonly EncounterDef[];
  /** Placed decoration (Milestone 9); top-left tiles. */
  readonly objects?: readonly PlacedObject[];
  /** Ambient animals and their home tiles. */
  readonly critters?: readonly PlacedCritter[];
  /** Shopkeeper (village) or travelling merchant (arrival areas). */
  readonly npcs?: readonly PlacedNpc[];
}

const c: EnemySpec = { kind: "chaser", elite: false };
const t: EnemySpec = { kind: "tank", elite: false };
const r: EnemySpec = { kind: "ranged", elite: false };
const eliteChaser: EnemySpec = { kind: "chaser", elite: true };

/**
 * Engine test map (?testmap), 80 x 46 tiles, about 2 x 2 screens:
 * a safe start, a cluttered corridor, an irregular hall (two waves), a
 * water cistern with an ambush on its bridge, and a final chamber (two
 * waves, an upgrade, then the exit door).
 */
export const TEST_MAP: MapDef = {
  layout: {
    id: "test-map",
    name: "Engine Test Map",
    rows: [
    "################################################################################",
    "################################################################################",
    "######T######T######################T#####T####################T#####DD####T####",
    "###..............############.cc..............###############................###",
    "###.b............############.................###############................###",
    "###..............############...E.............###############................###",
    "###..............############.................###############............E...###",
    "###................cc.....b..G....##...............##########................###",
    "##T..........................G....##...............#####.....b.....E.........###",
    "###......P...................G..............##.....#####.....................###",
    "###...................b.c....G..............##..E..#####......E..............T##",
    "###..............############..........#...........#####.....................###",
    "###..............############..........#...........T####..............##.....###",
    "###.c..........c.############....##....#...........#####..............##.....###",
    "###..............############....##....#...........#####.....................###",
    "#############################..........#.......E...#####..................E..###",
    "#############################..E...................#####....E................###",
    "#############################............E.......b.#####.....................###",
    "#############################.....................b#####...................bc###",
    "###################################.........####################GGGG############",
    "###################################..E......####################....############",
    "###################################.........####################....############",
    "###################################.c...GGGG####################....############",
    "########################################....####################....############",
    "########################################....####################....############",
    "########################################....####################....############",
    "########################################....####################....############",
    "########################################....####################....############",
    "########################################....####################....############",
    "########################################....####################....############",
    "########################################GGGG####################GGGG############",
    "############################bc....................~~~~....b............#########",
    "############################......................~~~~.................#########",
    "############################....E.................~~~~......E..........#########",
    "############################......................~~~~.................#########",
    "############################................E.....~~~~.................#########",
    "############################...........................................T########",
    "###########################T...........................................#########",
    "############################...........................................#########",
    "############################......................~~~~.................#########",
    "############################......................~~~~............E....#########",
    "############################........E.............~~~~.................#########",
    "############################......................~~~~....E............#########",
    "############################.................c....~~~~...............bc#########",
    "###################################T##########################T#################",
    "################################################################################",
    ],
  },
  encounters: [
    { id: "hall", area: { col: 29, row: 3, cols: 22, rows: 20 }, waves: [[c, c, r], [c, t]], reward: false },
    {
      id: "cistern",
      area: { col: 28, row: 30, cols: 43, rows: 14 },
      // Ambush: it starts when the player steps onto the bridge.
      trigger: { col: 50, row: 36, cols: 4, rows: 3 },
      waves: [[c, c, r, r]],
      reward: false,
    },
    { id: "chamber", area: { col: 56, row: 3, cols: 21, rows: 17 }, waves: [[c, t, r], [eliteChaser, c, c]], reward: true },
  ],
};

export type TestMapKind = "engine" | "world";

export interface TestMapOptions {
  readonly map: TestMapKind;
  /** Which biome's world map (forest, village, river or snow). */
  readonly theme: keyof typeof WORLD_MAPS;
}

/** Validates untrusted scene data: the requested test map, or null. */
export function parseTestMap(data: unknown): TestMapOptions | null {
  if (typeof data !== "object" || data === null) return null;
  const t = (data as { testmap?: unknown }).testmap;
  if (typeof t !== "object" || t === null) return null;
  const { map, theme } = t as { map?: unknown; theme?: unknown };
  return {
    map: map === "world" ? "world" : "engine",
    theme: theme === "village" || theme === "river" || theme === "snow" ? theme : "forest",
  };
}

/** A test map as a one-room level (level 1 difficulty). */
export function testMapLevel(opts: TestMapOptions): LevelDefinition {
  const base = LEVELS[0];
  if (!base) throw new Error("No levels defined");
  const map = opts.map === "world" ? WORLD_MAPS[opts.theme] : TEST_MAP;
  const theme = map.theme ? Object.values(THEMES).find((t) => t.id === map.theme) : undefined;
  return {
    ...base,
    name: map.layout.name,
    theme: theme ?? base.theme,
    rooms: [
      {
        layout: map.layout,
        enemies: map.encounters.flatMap((e) => e.waves.flat()),
        reward: false,
        encounters: map.encounters,
        objects: map.objects ?? [],
        critters: map.critters ?? [],
        npcs: map.npcs ?? [],
      },
    ],
  };
}

/** Validates untrusted scene data: true when the Home Village prologue was requested. */
export function parseVillage(data: unknown): boolean {
  return typeof data === "object" && data !== null && (data as { village?: unknown }).village === true;
}

/**
 * The Home Village prologue as a one-room "level 0": peaceful (no
 * encounters), morning light. Leaving through its gate starts level 1.
 */
export function villageLevel(): LevelDefinition {
  const base = LEVELS[0];
  if (!base) throw new Error("No levels defined");
  return {
    number: 0,
    name: HOME_VILLAGE.layout.name,
    theme: THEMES.village,
    difficulty: base.difficulty,
    rooms: [
      {
        layout: HOME_VILLAGE.layout,
        enemies: [],
        reward: false,
        encounters: [],
        objects: HOME_VILLAGE.objects ?? [],
        critters: HOME_VILLAGE.critters ?? [],
        npcs: HOME_VILLAGE.npcs ?? [],
      },
    ],
  };
}
