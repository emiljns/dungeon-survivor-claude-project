// Outdoor terrain art per theme (Milestone 9). Themes listed here are drawn
// with pack ground, cliffs and water; other themes keep the brick dungeon
// look. Tile positions are (col, row) in 16px sheets.

import type { ParticleKind } from "../logic/particles.ts";
import type { SheetId } from "./artManifest.ts";
import type { DecorId } from "./decor.ts";

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
  readonly particles: ParticleKind | null;
  /**
   * 2x2 trees scattered over the inside of wall masses (deterministic), so
   * raised ground reads as forest or hills rather than more floor.
   */
  readonly wallTrees: readonly DecorId[];
  /** Share of eligible wall spots that get a tree. */
  readonly wallTreeDensity: number;
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

export const BIOMES: Readonly<Record<string, BiomeArt>> = {
  village: {
    ground: yellowGrass, detailChance: 0.18, plateauTint: 0xa8b890, cliff: BROWN_CLIFF, water: GRASS_SHORE, particles: null,
    wallTrees: ["treeRound", "oak", "blossom"], wallTreeDensity: 0.35,
  },
  forest: {
    ground: greenGrass, detailChance: 0.22, plateauTint: 0x88a078, cliff: GREY_CLIFF, water: GRASS_SHORE, particles: "leaves",
    wallTrees: ["pine", "oak", "treeRound", "pine"], wallTreeDensity: 0.7,
  },
  river: {
    ground: yellowGrass, detailChance: 0.2, plateauTint: 0xa8a880, cliff: BROWN_CLIFF, water: GRASS_SHORE, particles: "leaves",
    wallTrees: ["treeOlive", "treeLime", "oak"], wallTreeDensity: 0.5,
  },
  snow: {
    ground: snow, detailChance: 0.15, plateauTint: 0xb8c4dc, cliff: GREY_CLIFF, water: SNOW_SHORE, particles: "snow",
    wallTrees: ["snowPine", "snowPineBare", "snowRound"], wallTreeDensity: 0.45,
  },
};

export function biomeFor(themeId: string): BiomeArt | undefined {
  return BIOMES[themeId];
}
