// The five levels, played in order. Each level is a start room, combat rooms
// and a final room with an elite (level 5: the boss). Layouts are reused across
// levels with different enemy sets, themes and difficulty.

import type { EncounterDef } from "../logic/encounter.ts";
import type { PlacedCritter, PlacedObject } from "./decor.ts";
import type { Difficulty, EnemyKind } from "../logic/enemyStats.ts";
import { ARENA, CROSSROADS, ENTRY_HALL, FURNACE, GALLERY, PILLAR_HALL, STOREROOM, type RoomLayout } from "./rooms.ts";
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
}

export interface LevelDefinition {
  readonly number: number;
  readonly name: string;
  readonly theme: Theme;
  readonly difficulty: Difficulty;
  readonly rooms: readonly LevelRoom[];
}

const c: EnemySpec = { kind: "chaser", elite: false };
const t: EnemySpec = { kind: "tank", elite: false };
const r: EnemySpec = { kind: "ranged", elite: false };
const elite = (kind: EnemyKind): EnemySpec => ({ kind, elite: true });
const boss: EnemySpec = { kind: "boss", elite: false };
const start: LevelRoom = { layout: ENTRY_HALL, enemies: [], reward: false };
/**
 * A combat room. `reward` marks the level's upgrade opportunities: the room
 * before the final room, plus the elite room on levels 1–4 (9 upgrades a run).
 */
const room = (layout: RoomLayout, enemies: readonly EnemySpec[], reward = false): LevelRoom => ({ layout, enemies, reward });

export const LEVELS: readonly LevelDefinition[] = [
  {
    number: 1,
    name: "Dungeon Ruins",
    theme: THEMES.ruins,
    difficulty: { healthMul: 1, speedMul: 1 },
    rooms: [
      start,
      room(PILLAR_HALL, [c, c, c]),
      room(STOREROOM, [c, c, c, c], true),
      room(ARENA, [elite("chaser"), c, c], true),
    ],
  },
  {
    number: 2,
    name: "Toxic Sewers",
    theme: THEMES.sewers,
    difficulty: { healthMul: 1.1, speedMul: 1.2 },
    rooms: [
      start,
      room(CROSSROADS, [c, c, c, t]),
      room(FURNACE, [c, c, c, c, c, c], true),
      room(ARENA, [elite("chaser"), c, c, c, c], true),
    ],
  },
  {
    number: 3,
    name: "Ancient Temple",
    theme: THEMES.temple,
    difficulty: { healthMul: 1.25, speedMul: 1.1 },
    rooms: [
      start,
      room(GALLERY, [c, c, r, r]),
      room(PILLAR_HALL, [t, r, c]),
      room(CROSSROADS, [t, r, r, c], true),
      room(ARENA, [elite("tank"), r, c, c], true),
    ],
  },
  {
    number: 4,
    name: "Forgotten Foundry",
    theme: THEMES.foundry,
    difficulty: { healthMul: 1.4, speedMul: 1.15 },
    rooms: [
      start,
      room(FURNACE, [r, r, r, c, c]),
      room(STOREROOM, [r, r, t, c]),
      room(GALLERY, [r, r, r, t, c], true),
      room(ARENA, [elite("ranged"), r, t, c], true),
    ],
  },
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
