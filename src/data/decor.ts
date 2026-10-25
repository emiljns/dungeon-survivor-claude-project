// The decoration catalogue (Milestone 9): every object a map can place, as
// plain data. Positions in maps are the object's top-left tile.
//
// - solid: blocks walking, paths and bullets on its `solid` tiles (tree
//   trunks, rocks, tents). Its top `canopy` rows are drawn above actors, so
//   the player walks behind tree tops.
// - walkover: drawn on the ground; no collision (grass, flowers, pebbles).
// - breakable: solid until shot `hp` times, then shatters (pots, crates)
//   and drops coins.
// - dummy: a training dummy; takes shots and shows the damage, never breaks.
// - hurdle: a low fence; blocks walking and enemies, but a dashing player
//   leaps it and bullets fly over it.
// Static solid and walkover objects are baked into the map textures once;
// breakables, animated and lit objects stay live sprites.

import type { SheetId } from "./artManifest.ts";

export type DecorKind = "solid" | "walkover" | "breakable" | "dummy" | "hurdle";

export interface DecorDef {
  readonly sheet: SheetId;
  /** Top-left tile of the object in its sheet. */
  readonly col: number;
  readonly row: number;
  /** Size in tiles. */
  readonly w: number;
  readonly h: number;
  readonly kind: DecorKind;
  /** Blocking tiles, relative to the object's top-left (solid and breakable). */
  readonly solid?: { readonly col: number; readonly row: number; readonly cols: number; readonly rows: number };
  /** Top rows drawn above actors (walk-behind). */
  readonly canopy?: number;
  /** A light source: coloured glow and a pool of light in dark levels. */
  readonly light?: {
    readonly color: number;
    readonly radius: number;
    readonly flame: boolean;
    /** Flame height in px below the object's top edge (default: just above its centre). */
    readonly flameY?: number;
  };
  /** Looping animation key: drawn as one live sprite centred on the object. */
  readonly anim?: string;
  /**
   * A column of looping animations, one per row from the top (a waterfall:
   * the lip and the fall pour over the cliff face, the splash lands on the
   * water). Every row but the last is drawn above the cliff tops.
   */
  readonly animColumn?: readonly string[];
  readonly breakable?: { readonly hp: number; readonly shards: "vase" | "wood" };
  /** Placeholder-art colour. */
  readonly color: number;
}

const tree2 = (col: number, row: number, color: number): DecorDef => ({
  sheet: "nature", col, row, w: 2, h: 2, kind: "solid", solid: { col: 0, row: 1, cols: 2, rows: 1 }, canopy: 1, color,
});
const tree3 = (col: number, row: number, color: number): DecorDef => ({
  sheet: "nature", col, row, w: 3, h: 3, kind: "solid", solid: { col: 1, row: 2, cols: 1, rows: 1 }, canopy: 2, color,
});
const grove = (col: number, row: number, color: number): DecorDef => ({
  sheet: "nature", col, row, w: 4, h: 3, kind: "solid", solid: { col: 0, row: 2, cols: 4, rows: 1 }, canopy: 2, color,
});
const plant = (col: number, row: number, color: number): DecorDef => ({ sheet: "nature", col, row, w: 1, h: 1, kind: "walkover", color });

export const DECOR = {
  // Trees: trunks block, tops are walk-behind.
  treeRound: tree2(0, 0, 0x6aa84f),
  pine: tree2(2, 0, 0x3f7a3a),
  deadTree: tree2(4, 0, 0x7a5a3a),
  oak: tree2(6, 0, 0x4f8a3a),
  snowPine: tree2(8, 0, 0xe8eef8),
  snowPineBare: tree2(10, 0, 0xdfe6f2),
  snowRound: tree2(12, 0, 0xf2f6ff),
  blossom: tree2(14, 0, 0xf2a8b8),
  treeLime: tree2(16, 0, 0x9cc64a),
  treeOlive: tree2(18, 0, 0x8aa83a),
  bigBlossom: tree3(0, 18, 0xf2a8b8),
  bigOak: tree3(3, 18, 0x5f9a3f),
  bigSnowTree: tree3(6, 18, 0xf2f6ff),
  bigAutumn: tree3(9, 18, 0xf0a050),
  pineGrove: grove(0, 2, 0x3f7a3a),
  bushGrove: grove(4, 2, 0x8ab840),
  snowGrove: grove(8, 2, 0xf2f6ff),
  blossomGrove: grove(12, 2, 0xf2a8b8),
  limeGrove: grove(16, 2, 0x9cc64a),
  oliveGrove: grove(20, 2, 0x8aa83a),
  deadGrove: grove(0, 5, 0x7a5a3a),
  snowPineGrove: grove(4, 5, 0xe8eef8),
  // Rocks.
  rockBrown: { sheet: "nature", col: 15, row: 10, w: 2, h: 2, kind: "solid", solid: { col: 0, row: 0, cols: 2, rows: 2 }, color: 0xb07850 },
  rockBrownBig: { sheet: "nature", col: 17, row: 10, w: 4, h: 3, kind: "solid", solid: { col: 0, row: 1, cols: 4, rows: 2 }, canopy: 1, color: 0xb07850 },
  rockBrownTall: { sheet: "nature", col: 21, row: 10, w: 2, h: 3, kind: "solid", solid: { col: 0, row: 1, cols: 2, rows: 2 }, canopy: 1, color: 0xb07850 },
  rockGrey: { sheet: "nature", col: 15, row: 14, w: 2, h: 2, kind: "solid", solid: { col: 0, row: 0, cols: 2, rows: 2 }, color: 0x7f8a78 },
  rockGreyBig: { sheet: "nature", col: 17, row: 14, w: 4, h: 3, kind: "solid", solid: { col: 0, row: 1, cols: 4, rows: 2 }, canopy: 1, color: 0x7f8a78 },
  rockGreyTall: { sheet: "nature", col: 21, row: 14, w: 2, h: 3, kind: "solid", solid: { col: 0, row: 1, cols: 2, rows: 2 }, canopy: 1, color: 0x7f8a78 },
  bamboo: { sheet: "nature", col: 11, row: 8, w: 1, h: 2, kind: "solid", solid: { col: 0, row: 1, cols: 1, rows: 1 }, canopy: 1, color: 0x8ac040 },
  shrub: { sheet: "nature", col: 10, row: 8, w: 1, h: 1, kind: "solid", solid: { col: 0, row: 0, cols: 1, rows: 1 }, color: 0x6aa84f },
  hay: { sheet: "nature", col: 9, row: 8, w: 1, h: 1, kind: "solid", solid: { col: 0, row: 0, cols: 1, rows: 1 }, color: 0xe0a050 },
  stump: { sheet: "nature", col: 0, row: 8, w: 2, h: 2, kind: "solid", solid: { col: 0, row: 1, cols: 2, rows: 1 }, color: 0x8a5a3a },
  // Ground detail (walk over).
  bush: plant(0, 10, 0x8ab840),
  bushRound: plant(1, 10, 0x8ab840),
  tuft: plant(3, 10, 0x8ab840),
  fern: plant(8, 10, 0x6aa84f),
  sunflower: plant(0, 11, 0xf0c040),
  sunflowerTall: plant(1, 11, 0xf0c040),
  clover: plant(2, 11, 0x6aa84f),
  poppy: plant(3, 11, 0xe05040),
  daisy: plant(6, 11, 0xf2f2e0),
  reeds: plant(7, 11, 0x8ab840),
  pebbles: plant(15, 18, 0xc8a878),
  stones: plant(17, 13, 0xb07850),
  greyStones: plant(17, 17, 0x7f8a78),
  // Camp and village props.
  tent: { sheet: "camp", col: 4, row: 0, w: 2, h: 3, kind: "solid", solid: { col: 0, row: 1, cols: 2, rows: 2 }, canopy: 1, color: 0xc89058 },
  campfire: {
    sheet: "camp", col: 10, row: 3, w: 2, h: 2, kind: "solid", solid: { col: 0, row: 0, cols: 2, rows: 2 },
    light: { color: 0xff9040, radius: 96, flame: true }, color: 0x8a8a8a,
  },
  spiritFire: {
    sheet: "camp", col: 10, row: 3, w: 2, h: 2, kind: "solid", solid: { col: 0, row: 0, cols: 2, rows: 2 },
    light: { color: 0x6ab8ff, radius: 96, flame: true }, color: 0x6a7a9a,
  },
  voidBrazier: {
    sheet: "camp", col: 10, row: 3, w: 2, h: 2, kind: "solid", solid: { col: 0, row: 0, cols: 2, rows: 2 },
    light: { color: 0xb68cff, radius: 104, flame: true }, color: 0x6a4a9a,
  },
  logs: { sheet: "camp", col: 0, row: 7, w: 2, h: 1, kind: "solid", solid: { col: 0, row: 0, cols: 2, rows: 1 }, color: 0xb07840 },
  flowerPlant: { sheet: "plant", col: 0, row: 0, w: 1, h: 1, kind: "walkover", anim: "na-plant", color: 0xf2f2e0 },
  flag: { sheet: "flag", col: 0, row: 0, w: 1, h: 1, kind: "walkover", anim: "na-flag", color: 0xe04040 },
  // River: a waterfall (placed with its top on the cliff lip, its bottom on
  // the water) and a mill wheel turning beside a house; the wheel's top row
  // stands on the bank and blocks, its bottom dips into the water.
  waterfall: { sheet: "waterfallMiddle", col: 0, row: 0, w: 1, h: 3, kind: "walkover", animColumn: ["na-waterfall-top", "na-waterfall-middle", "na-waterfall-bottom"], color: 0x9ad8ff },
  watermill: { sheet: "watermill", col: 0, row: 0, w: 2, h: 2, kind: "solid", solid: { col: 0, row: 0, cols: 2, rows: 1 }, anim: "na-watermill", color: 0x9a5a3a },
  // Village buildings: the roof is walk-behind, the front wall blocks.
  houseOrange: { sheet: "house", col: 0, row: 0, w: 4, h: 3, kind: "solid", solid: { col: 0, row: 2, cols: 4, rows: 1 }, canopy: 2, color: 0xe07a3a },
  houseBeige: { sheet: "house", col: 4, row: 0, w: 4, h: 3, kind: "solid", solid: { col: 0, row: 2, cols: 4, rows: 1 }, canopy: 2, color: 0xd8c090 },
  houseOrangeWide: { sheet: "house", col: 8, row: 0, w: 4, h: 3, kind: "solid", solid: { col: 0, row: 2, cols: 4, rows: 1 }, canopy: 2, color: 0xe07a3a },
  hutWood: { sheet: "house", col: 0, row: 8, w: 3, h: 2, kind: "solid", solid: { col: 0, row: 1, cols: 3, rows: 1 }, canopy: 1, color: 0xa86a3a },
  hutStraw: { sheet: "house", col: 3, row: 8, w: 3, h: 2, kind: "solid", solid: { col: 0, row: 1, cols: 3, rows: 1 }, canopy: 1, color: 0x9a6a3a },
  // Snow: igloos, statues and pillars.
  igloo: { sheet: "house", col: 0, row: 11, w: 3, h: 3, kind: "solid", solid: { col: 0, row: 2, cols: 3, rows: 1 }, canopy: 2, color: 0xf2f6ff },
  iglooSmall: { sheet: "house", col: 4, row: 11, w: 2, h: 3, kind: "solid", solid: { col: 0, row: 2, cols: 2, rows: 1 }, canopy: 2, color: 0xf2f6ff },
  iglooBrick: { sheet: "house", col: 6, row: 11, w: 3, h: 3, kind: "solid", solid: { col: 0, row: 2, cols: 3, rows: 1 }, canopy: 2, color: 0xe8f0ff },
  lionStatue: { sheet: "house", col: 1, row: 15, w: 2, h: 3, kind: "solid", solid: { col: 0, row: 1, cols: 2, rows: 2 }, canopy: 1, color: 0xd8b880 },
  lionStatueGrey: { sheet: "house", col: 1, row: 19, w: 2, h: 3, kind: "solid", solid: { col: 0, row: 1, cols: 2, rows: 2 }, canopy: 1, color: 0x7f8a78 },
  snowPillar: { sheet: "house", col: 8, row: 17, w: 1, h: 2, kind: "solid", solid: { col: 0, row: 1, cols: 1, rows: 1 }, canopy: 1, color: 0xc89878 },
  snowPillarGrey: { sheet: "house", col: 8, row: 21, w: 1, h: 2, kind: "solid", solid: { col: 0, row: 1, cols: 1, rows: 1 }, canopy: 1, color: 0x7f8a78 },
  snowMound: { sheet: "nature", col: 2, row: 12, w: 2, h: 2, kind: "solid", solid: { col: 0, row: 0, cols: 2, rows: 2 }, color: 0xf2f6ff },
  tealBush: { sheet: "nature", col: 0, row: 12, w: 2, h: 2, kind: "solid", solid: { col: 0, row: 0, cols: 2, rows: 2 }, color: 0x4a8a8a },
  snowLump: plant(5, 12, 0xf2f6ff),
  snowTuft: plant(9, 13, 0xdfe6f2),
  snowball: plant(10, 13, 0xf2f6ff),
  // Abandoned Village: overgrown ruins, graves, a broken cart, mossy trees
  // (TilesetVillageAbandoned), and stone lantern posts that still burn.
  ruinHouse: { sheet: "abandoned", col: 0, row: 0, w: 4, h: 3, kind: "solid", solid: { col: 0, row: 2, cols: 4, rows: 1 }, canopy: 2, color: 0xc8a878 },
  ruinHut: { sheet: "abandoned", col: 4, row: 0, w: 2, h: 3, kind: "solid", solid: { col: 0, row: 2, cols: 2, rows: 1 }, canopy: 2, color: 0xe07a3a },
  grave: { sheet: "abandoned", col: 6, row: 0, w: 2, h: 3, kind: "solid", solid: { col: 0, row: 2, cols: 2, rows: 1 }, canopy: 2, color: 0x8a7a6a },
  graves: { sheet: "abandoned", col: 8, row: 0, w: 3, h: 3, kind: "solid", solid: { col: 0, row: 2, cols: 3, rows: 1 }, canopy: 2, color: 0x8a7a6a },
  mossStatue: { sheet: "abandoned", col: 0, row: 3, w: 2, h: 3, kind: "solid", solid: { col: 0, row: 1, cols: 2, rows: 2 }, canopy: 1, color: 0x8aa860 },
  brokenPillar: { sheet: "abandoned", col: 2, row: 3, w: 1, h: 3, kind: "solid", solid: { col: 0, row: 2, cols: 1, rows: 1 }, canopy: 2, color: 0xc8a878 },
  mossBoulder: { sheet: "abandoned", col: 7, row: 5, w: 2, h: 2, kind: "solid", solid: { col: 0, row: 0, cols: 2, rows: 2 }, color: 0x9ab060 },
  frogStatue: { sheet: "abandoned", col: 9, row: 5, w: 2, h: 2, kind: "solid", solid: { col: 0, row: 1, cols: 2, rows: 1 }, canopy: 1, color: 0x9ab060 },
  brokenCart: { sheet: "abandoned", col: 9, row: 7, w: 2, h: 2, kind: "solid", solid: { col: 0, row: 1, cols: 2, rows: 1 }, canopy: 1, color: 0xa86a3a },
  mossStump: { sheet: "abandoned", col: 7, row: 7, w: 1, h: 1, kind: "solid", solid: { col: 0, row: 0, cols: 1, rows: 1 }, color: 0xa86a3a },
  bigMossTree: { sheet: "abandoned", col: 0, row: 6, w: 4, h: 3, kind: "solid", solid: { col: 1, row: 2, cols: 2, rows: 1 }, canopy: 2, color: 0x7aa040 },
  mossTree: { sheet: "abandoned", col: 4, row: 6, w: 2, h: 2, kind: "solid", solid: { col: 0, row: 1, cols: 2, rows: 1 }, canopy: 1, color: 0x7aa040 },
  barn: { sheet: "abandoned", col: 12, row: 6, w: 4, h: 5, kind: "solid", solid: { col: 0, row: 3, cols: 4, rows: 2 }, canopy: 3, color: 0x8a5a3a },
  thatchHouse: { sheet: "abandoned", col: 16, row: 5, w: 4, h: 5, kind: "solid", solid: { col: 0, row: 3, cols: 4, rows: 2 }, canopy: 3, color: 0x8aa040 },
  lanternPost: {
    sheet: "house", col: 7, row: 21, w: 1, h: 2, kind: "solid", solid: { col: 0, row: 1, cols: 1, rows: 1 }, canopy: 1,
    light: { color: 0xffb050, radius: 88, flame: true, flameY: 4 }, color: 0x7f8a78,
  },
  // Village tutorial.
  trainingDummy: { sheet: "elements", col: 6, row: 3, w: 1, h: 2, kind: "dummy", solid: { col: 0, row: 1, cols: 1, rows: 1 }, canopy: 1, color: 0xc0603a },
  fence: { sheet: "elements", col: 11, row: 2, w: 3, h: 2, kind: "hurdle", solid: { col: 0, row: 1, cols: 3, rows: 1 }, color: 0xb07040 },
  // Breakables.
  pot: { sheet: "camp", col: 6, row: 3, w: 1, h: 1, kind: "breakable", solid: { col: 0, row: 0, cols: 1, rows: 1 }, breakable: { hp: 1, shards: "vase" }, color: 0x7a8a6a },
  jar: { sheet: "camp", col: 5, row: 3, w: 1, h: 1, kind: "breakable", solid: { col: 0, row: 0, cols: 1, rows: 1 }, breakable: { hp: 1, shards: "vase" }, color: 0xa86a3a },
  crate: { sheet: "dungeon", col: 3, row: 1, w: 1, h: 1, kind: "breakable", solid: { col: 0, row: 0, cols: 1, rows: 1 }, breakable: { hp: 2, shards: "wood" }, color: 0xa87a4a },
  barrel: { sheet: "elements", col: 0, row: 0, w: 1, h: 1, kind: "breakable", solid: { col: 0, row: 0, cols: 1, rows: 1 }, breakable: { hp: 2, shards: "wood" }, color: 0xb06a3a },
} as const satisfies Record<string, DecorDef>;

export type DecorId = keyof typeof DECOR;

/**
 * Generic objects that each biome fills with its own variant (see
 * BiomeArt.slots), so one placement reads as a pine in the forest and a
 * snowy pine on the mountain. Every variant of a slot has the slot's shape.
 */
export const SLOT_SHAPES = {
  $tree: { w: 2, h: 2, kind: "solid", solid: { col: 0, row: 1, cols: 2, rows: 1 }, canopy: 1 },
  $bigTree: { w: 3, h: 3, kind: "solid", solid: { col: 1, row: 2, cols: 1, rows: 1 }, canopy: 2 },
  $grove: { w: 4, h: 3, kind: "solid", solid: { col: 0, row: 2, cols: 4, rows: 1 }, canopy: 2 },
  $rock: { w: 2, h: 2, kind: "solid", solid: { col: 0, row: 0, cols: 2, rows: 2 }, canopy: 0 },
  $bush: { w: 1, h: 1, kind: "walkover", canopy: 0 },
  $flower: { w: 1, h: 1, kind: "walkover", canopy: 0 },
  $pebble: { w: 1, h: 1, kind: "walkover", canopy: 0 },
} as const satisfies Record<string, Pick<DecorDef, "w" | "h" | "kind" | "solid" | "canopy">>;

export type SlotId = keyof typeof SLOT_SHAPES;

export function isSlot(id: DecorId | SlotId): id is SlotId {
  return id.startsWith("$");
}

/** An object placed on a map; (col, row) is its top-left tile. */
export interface PlacedObject {
  readonly id: DecorId | SlotId;
  readonly col: number;
  readonly row: number;
}

/** A placed object after its slot (if any) is resolved for the biome. */
export interface ResolvedObject {
  readonly id: DecorId;
  readonly col: number;
  readonly row: number;
}

export type CritterKind = "chicken" | "cat" | "frog" | "fish";

/**
 * Things to talk to: the village shop (saved coins), the travelling
 * merchant (pocket coins), and signs to read.
 */
export type NpcKind = "shopkeeper" | "merchant" | "sign";

export interface PlacedNpc {
  readonly kind: NpcKind;
  readonly col: number;
  readonly row: number;
  /** What a sign says (signs only). */
  readonly text?: string;
}

/** A critter's home tile; it wanders near it (fish stay in water). */
export interface PlacedCritter {
  readonly kind: CritterKind;
  readonly col: number;
  readonly row: number;
}
