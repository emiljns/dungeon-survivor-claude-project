// The five levels, played in order. Each is one continuous hand-made map
// (src/data/*Level.ts) with encounter areas, a mini-boss and a final boss;
// level 5 ends with The Hollow Warden. (The v1 room layouts in rooms.ts
// remain for the debug showcase.)

import type { EncounterDef } from "../logic/encounter.ts";
import { FOREST_BESTIARY, RIVER_BESTIARY, SNOW_BESTIARY, VILLAGE_BESTIARY, VOID_BESTIARY, type Bestiary } from "./bestiary.ts";
import { THE_VOID } from "./voidLevel.ts";
import { ABANDONED_VILLAGE } from "./abandonedLevel.ts";
import { BAMBOO_FOREST } from "./forestLevel.ts";
import { RIVER } from "./riverLevel.ts";
import { SNOWY_MOUNTAIN } from "./snowLevel.ts";
import type { MapDef } from "./maps.ts";
import type { PlacedCritter, PlacedNpc, PlacedObject } from "./decor.ts";
import type { Difficulty, EnemyKind } from "../logic/enemyStats.ts";
import type { RoomLayout } from "./rooms.ts";
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
  mapLevel(5, "The Void", THEMES.void, { healthMul: 1.6, speedMul: 1.2 }, THE_VOID, VOID_BESTIARY),
];

export const ROOMS_PER_LEVEL: readonly number[] = LEVELS.map((l) => l.rooms.length);
