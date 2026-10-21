// Outdoor terrain art per theme (Milestone 9). Themes listed here are drawn
// with pack ground, paths, cliffs and water; other themes keep the brick
// dungeon look. Tile positions are (col, row) in 16px sheets.

import type { ParticleKind } from "../logic/particles.ts";
import { tileHash } from "../logic/terrainArt.ts";
import type { SheetId } from "./artManifest.ts";
import { isSlot, type CritterKind, type DecorId, type PlacedCritter, type PlacedObject, type ResolvedObject, type SlotId } from "./decor.ts";

export interface TileRef {
  readonly sheet: SheetId;
  readonly col: number;
  readonly row: number;
}

export interface BiomeArt {
  /** The plain ground tile first, then detail variants (tufts, twigs). */
  readonly ground: readonly TileRef[];
  /** Share of ground tiles that use a detail variant. */
  readonly detailChance: number;
  /** Wall tops (raised ground) reuse the plain ground tile with this tint. */
  readonly plateauTint: number;
  /** Top-left of a 3x3 cliff block in the relief sheet: row 0 lip, row 2 base. */
  readonly cliff: { readonly col: number; readonly row: number };
  /** Top-left of the 4x4 shore block in the water sheet (see waterPiece). */
  readonly water: { readonly col: number; readonly row: number };
  /** Top-left of the 4x4 path block in the outdoor floor sheet (same layout as water). */
  readonly path: { readonly col: number; readonly row: number };
  readonly particles: ParticleKind | null;
  /**
   * Trees scattered over the inside of wall masses (deterministic), so
   * raised ground reads as forest or hills rather than more floor.
   */
  readonly wallTrees: readonly DecorId[];
  /** Share of eligible wall spots that get a tree. */
  readonly wallTreeDensity: number;
  /** Multiplied into wall trees (darker = more background). */
  readonly wallTreeTint: number;
  /** This biome's variant(s) of each generic object. */
  readonly slots: Readonly<Record<SlotId, readonly DecorId[]>>;
  /** Animals that live here (none on the snowy mountain: too cold). */
  readonly critters: readonly CritterKind[];
}

const at = (sheet: SheetId, col: number, row: number): TileRef => ({ sheet, col, row });

// Each ground block has a plain tile and three tuft variants in one row.
const yellowGrass = [at("outdoorFloor", 0, 12), at("outdoorFloor", 1, 12), at("outdoorFloor", 2, 12), at("outdoorFloor", 3, 12)];
const greenGrass = [at("outdoorFloor", 11, 12), at("outdoorFloor", 12, 12), at("outdoorFloor", 13, 12), at("outdoorFloor", 14, 12)];
const snow = [at("outdoorFloor", 0, 19), at("outdoorFloor", 1, 19), at("outdoorFloor", 2, 19), at("outdoorFloor", 3, 19)];

const GREY_CLIFF = { col: 4, row: 0 } as const;
const BROWN_CLIFF = { col: 4, row: 5 } as const;
const GRASS_SHORE = { col: 0, row: 6 } as const;
const SNOW_SHORE = { col: 13, row: 0 } as const;
// Dirt paths edged with the matching grass; trodden snow paths on snow.
const YELLOW_PATH = { col: 0, row: 7 } as const;
const GREEN_PATH = { col: 11, row: 7 } as const;
const SNOW_PATH = { col: 0, row: 14 } as const;

export const BIOMES: Readonly<Record<string, BiomeArt>> = {
  // Morning in the home village: warm grass, blossom, dirt lanes, animals.
  village: {
    ground: yellowGrass, detailChance: 0.18, plateauTint: 0xa8b890, cliff: BROWN_CLIFF, water: GRASS_SHORE, path: YELLOW_PATH,
    particles: null, wallTrees: ["treeRound", "blossom", "oak", "treeLime"], wallTreeDensity: 0.3, wallTreeTint: 0xd8dcc8,
    slots: {
      $tree: ["treeRound", "blossom", "oak", "treeLime"],
      $bigTree: ["bigBlossom", "bigOak"],
      $grove: ["blossomGrove", "limeGrove", "bushGrove"],
      $rock: ["rockBrown"],
      $bush: ["bush", "bushRound", "tuft"],
      $flower: ["daisy", "sunflower", "poppy", "sunflowerTall", "clover"],
      $pebble: ["pebbles", "stones"],
    },
    critters: ["chicken", "cat", "frog", "fish"],
  },
  // Afternoon under a dense, dark canopy: pines, big oaks, ferns, grey rock.
  forest: {
    ground: greenGrass, detailChance: 0.3, plateauTint: 0x6f8a62, cliff: GREY_CLIFF, water: GRASS_SHORE, path: GREEN_PATH,
    particles: "leaves", wallTrees: ["bigOak", "pine", "pine", "oak", "pineGrove", "deadTree"], wallTreeDensity: 0.85, wallTreeTint: 0x98a890,
    slots: {
      $tree: ["pine", "oak", "pine", "deadTree"],
      $bigTree: ["bigOak", "bigAutumn"],
      $grove: ["pineGrove", "oliveGrove", "deadGrove"],
      $rock: ["rockGrey"],
      $bush: ["fern", "tuft", "bush"],
      $flower: ["fern", "clover", "reeds"],
      $pebble: ["greyStones", "pebbles"],
    },
    critters: ["frog", "cat"],
  },
  // Golden hour by the water: olive trees, reeds, sun-warmed stone.
  river: {
    ground: yellowGrass, detailChance: 0.2, plateauTint: 0xa8a880, cliff: BROWN_CLIFF, water: GRASS_SHORE, path: YELLOW_PATH,
    particles: "leaves", wallTrees: ["treeOlive", "treeLime", "oak", "bigAutumn"], wallTreeDensity: 0.5, wallTreeTint: 0xd0c8b0,
    slots: {
      $tree: ["treeOlive", "treeLime", "oak"],
      $bigTree: ["bigAutumn", "bigOak"],
      $grove: ["oliveGrove", "limeGrove"],
      $rock: ["rockBrown", "rockGrey"],
      $bush: ["reeds", "tuft", "bushRound"],
      $flower: ["daisy", "reeds", "poppy"],
      $pebble: ["pebbles", "stones"],
    },
    critters: ["frog", "fish"],
  },
  // Dusk on the mountain: snow, snowy pines, igloos, no animals.
  snow: {
    ground: snow, detailChance: 0.15, plateauTint: 0xb8c4dc, cliff: GREY_CLIFF, water: SNOW_SHORE, path: SNOW_PATH,
    particles: "snow", wallTrees: ["snowPine", "snowPineBare", "snowRound", "bigSnowTree"], wallTreeDensity: 0.45, wallTreeTint: 0xc8d0e0,
    slots: {
      $tree: ["snowPine", "snowPineBare", "snowRound"],
      $bigTree: ["bigSnowTree"],
      $grove: ["snowGrove", "snowPineGrove"],
      $rock: ["rockGrey", "snowMound"],
      $bush: ["snowTuft", "snowLump"],
      $flower: ["snowTuft", "snowball"],
      $pebble: ["greyStones", "snowball"],
    },
    critters: [],
  },
};

export function biomeFor(themeId: string): BiomeArt | undefined {
  return BIOMES[themeId];
}

/** The biome used for slot objects on themes without outdoor art. */
const FALLBACK_BIOME = "forest";

/** Picks the biome's variant for a slot, stable per tile; concrete ids pass through. */
export function resolveObject(o: PlacedObject, themeId: string): ResolvedObject {
  if (!isSlot(o.id)) return { id: o.id, col: o.col, row: o.row };
  const biome = biomeFor(themeId) ?? BIOMES[FALLBACK_BIOME];
  const options = biome?.slots[o.id] ?? [];
  const id = options[Math.floor(tileHash(o.col, o.row, 21) * options.length)] ?? options[0];
  if (!id) throw new Error(`No variant for ${o.id} in ${themeId}`);
  return { id, col: o.col, row: o.row };
}

/** Critters that can live in this biome (themes without outdoor art keep all). */
export function crittersFor(themeId: string, placed: readonly PlacedCritter[]): PlacedCritter[] {
  const biome = biomeFor(themeId);
  return biome ? placed.filter((c) => biome.critters.includes(c.kind)) : [...placed];
}
