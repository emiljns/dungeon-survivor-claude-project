// The five levels, played in order. Each level is a start room, combat rooms
// and a final room with an elite (level 5: the boss). Layouts are reused across
// levels with different enemy sets, themes and difficulty.

import type { EncounterDef } from "../logic/encounter.ts";
import { FOREST_BESTIARY, RIVER_BESTIARY, SNOW_BESTIARY, VILLAGE_BESTIARY, type Bestiary } from "./bestiary.ts";
import { ABANDONED_VILLAGE } from "./abandonedLevel.ts";
import { BAMBOO_FOREST } from "./forestLevel.ts";
import { RIVER } from "./riverLevel.ts";
import { SNOWY_MOUNTAIN } from "./snowLevel.ts";
import type { MapDef } from "./maps.ts";
import type { PlacedCritter, PlacedNpc, PlacedObject } from "./decor.ts";
import type { Difficulty, EnemyKind } from "../logic/enemyStats.ts";
import { ARENA, CROSSROADS, ENTRY_HALL, FURNACE, GALLERY, type RoomLayout } from "./rooms.ts";
import { THEMES, type Theme } from "./themes.ts";

export interface EnemySpec {
  readonly kind: EnemyKind;
  readonly elite: boolean;
}

export interface LevelRoom {
  readonly layout: RoomLayout;
  /** Spawned at the layout's 'E' points in reading order (cycling if more enemies than points). */
  readonly enemies: readonly EnemySpec[];
  /** Clearing this room offers the three-choice upgrade panel. */
  readonly reward: boolean;
  /**
   * v2 maps: encounter areas that spawn their own waves when entered. When
   * present, `enemies` lists every enemy of every wave (for counting), and
   * nothing spawns at room start.
   */
  readonly encounters?: readonly EncounterDef[];
  /** v2 maps: placed decoration and ambient animals. */
  readonly objects?: readonly PlacedObject[];
  readonly critters?: readonly PlacedCritter[];
  /** Shopkeeper or travelling merchant standing in this room. */
  readonly npcs?: readonly PlacedNpc[];
}

export interface LevelDefinition {
  readonly number: number;
  readonly name: string;
  readonly theme: Theme;
  readonly difficulty: Difficulty;
  readonly rooms: readonly LevelRoom[];
  /** This level's enemy looks, mini-boss and boss (defaults when absent). */
  readonly bestiary?: Bestiary;
}

const c: EnemySpec = { kind: "chaser", elite: false };
const t: EnemySpec = { kind: "tank", elite: false };
const r: EnemySpec = { kind: "ranged", elite: false };
const boss: EnemySpec = { kind: "boss", elite: false };
/** Each level's arrival room; the travelling merchant waits beside the start. */
const start: LevelRoom = { layout: ENTRY_HALL, enemies: [], reward: false, npcs: [{ kind: "merchant", col: 24, row: 11 }] };
/**
 * A combat room. `reward` marks the level's upgrade opportunities: the room
 * before the final room, plus the elite room on levels 1–4 (9 upgrades a run).
 */
const room = (layout: RoomLayout, enemies: readonly EnemySpec[], reward = false): LevelRoom => ({ layout, enemies, reward });

/**
 * A v2 level: a single room holding the whole map. Every wave of every
 * encounter is listed in `enemies` (the room's clear count); nothing spawns
 * at the start, and the exit opens once every encounter is cleared.
 */
function mapLevel(number: number, name: string, theme: Theme, difficulty: Difficulty, map: MapDef, bestiary: Bestiary): LevelDefinition {
  return {
    number,
    name,
    theme,
    difficulty,
    bestiary,
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

export const LEVELS: readonly LevelDefinition[] = [
  // v2 levels: one continuous hand-made map each (src/data/*Level.ts).
  mapLevel(1, "Bamboo Forest", THEMES.forest, { healthMul: 1, speedMul: 1 }, BAMBOO_FOREST, FOREST_BESTIARY),
  mapLevel(2, "River", THEMES.river, { healthMul: 1.1, speedMul: 1.2 }, RIVER, RIVER_BESTIARY),
  mapLevel(3, "Snowy Mountain", THEMES.snow, { healthMul: 1.25, speedMul: 1.1 }, SNOWY_MOUNTAIN, SNOW_BESTIARY),
  mapLevel(4, "Abandoned Village", THEMES.abandoned, { healthMul: 1.4, speedMul: 1.15 }, ABANDONED_VILLAGE, VILLAGE_BESTIARY),
  {
    number: 5,
    name: "The Void",
    theme: THEMES.void,
    difficulty: { healthMul: 1.6, speedMul: 1.2 },
    rooms: [
      start,
      room(CROSSROADS, [t, t, r, r, c]),
      room(FURNACE, [r, r, r, t, c, c]),
      room(GALLERY, [t, r, r, r, c, c], true),
      room(ARENA, [boss, c, c]),
    ],
  },
];

export const ROOMS_PER_LEVEL: readonly number[] = LEVELS.map((l) => l.rooms.length);
