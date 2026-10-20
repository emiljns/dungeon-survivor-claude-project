// The five levels, played in order. Each level is a start room, combat rooms
// and a final room with an elite (level 5: the boss). Layouts are reused across
// levels with different enemy sets, themes and difficulty.

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
const start: LevelRoom = { layout: ENTRY_HALL, enemies: [] };

export const LEVELS: readonly LevelDefinition[] = [
  {
    number: 1,
    name: "Dungeon Ruins",
    theme: THEMES.ruins,
    difficulty: { healthMul: 1, speedMul: 1 },
    rooms: [
      start,
      { layout: PILLAR_HALL, enemies: [c, c, c] },
      { layout: STOREROOM, enemies: [c, c, c, c] },
      { layout: ARENA, enemies: [elite("chaser"), c, c] },
    ],
  },
  {
    number: 2,
    name: "Toxic Sewers",
    theme: THEMES.sewers,
    difficulty: { healthMul: 1.1, speedMul: 1.2 },
    rooms: [
      start,
      { layout: CROSSROADS, enemies: [c, c, c, t] },
      { layout: FURNACE, enemies: [c, c, c, c, c, c] },
      { layout: ARENA, enemies: [elite("chaser"), c, c, c, c] },
    ],
  },
  {
    number: 3,
    name: "Ancient Temple",
    theme: THEMES.temple,
    difficulty: { healthMul: 1.25, speedMul: 1.1 },
    rooms: [
      start,
      { layout: GALLERY, enemies: [c, c, r, r] },
      { layout: PILLAR_HALL, enemies: [t, r, c] },
      { layout: CROSSROADS, enemies: [t, r, r, c] },
      { layout: ARENA, enemies: [elite("tank"), r, c, c] },
    ],
  },
  {
    number: 4,
    name: "Forgotten Foundry",
    theme: THEMES.foundry,
    difficulty: { healthMul: 1.4, speedMul: 1.15 },
    rooms: [
      start,
      { layout: FURNACE, enemies: [r, r, r, c, c] },
      { layout: STOREROOM, enemies: [r, r, t, c] },
      { layout: GALLERY, enemies: [r, r, r, t, c] },
      { layout: ARENA, enemies: [elite("ranged"), r, t, c] },
    ],
  },
  {
    number: 5,
    name: "The Void",
    theme: THEMES.void,
    difficulty: { healthMul: 1.6, speedMul: 1.2 },
    rooms: [
      start,
      { layout: CROSSROADS, enemies: [t, t, r, r, c] },
      { layout: FURNACE, enemies: [r, r, r, t, c, c] },
      { layout: GALLERY, enemies: [t, r, r, r, c, c] },
      { layout: ARENA, enemies: [boss, c, c] },
    ],
  },
];

export const ROOMS_PER_LEVEL: readonly number[] = LEVELS.map((l) => l.rooms.length);
