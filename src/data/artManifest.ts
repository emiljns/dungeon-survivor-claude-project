// Sprite art from the Ninja Adventure asset pack, as plain data: which files
// are loaded, their frame sizes, where each came from in the pack, the
// animations built from them, and per-level tile choices. Tests check this
// manifest against the files on disk, so a missing or mis-sized sheet fails CI
// rather than the game.

import type { EnemyKind } from "../logic/enemyStats.ts";

export const ART_PACK = {
  name: "Ninja Adventure - Asset Pack",
  authors: "Pixel-boy and AAA",
  url: "https://pixel-boy.itch.io/ninja-adventure-asset-pack",
  license: "CC0-1.0",
} as const;

/** Public URL folder (Vite serves `public/` at the site root). */
export const ART_BASE_PATH = "assets/ninja/";

export interface SheetAsset {
  readonly key: string;
  /** File name inside `public/assets/ninja/`. */
  readonly file: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  /** Original path inside the pack, for attribution and re-export. */
  readonly source: string;
}

export const SHEETS = {
  player: { key: "na-player", file: "player-ninja-blue.png", frameWidth: 16, frameHeight: 16, source: "Actor/Character/NinjaBlue/SpriteSheet.png" },
  chaser: { key: "na-chaser", file: "enemy-skull.png", frameWidth: 16, frameHeight: 16, source: "Actor/Monster/Skull/SpriteSheet.png" },
  tank: { key: "na-tank", file: "enemy-grey-trex.png", frameWidth: 16, frameHeight: 16, source: "Actor/Monster/Grey Trex/SpriteSheet.png" },
  ranged: { key: "na-ranged", file: "enemy-eye.png", frameWidth: 16, frameHeight: 16, source: "Actor/Monster/Eye/Eye.png" },
  bossIdle: { key: "na-boss-idle", file: "boss-giant-spirit-idle.png", frameWidth: 50, frameHeight: 50, source: "Actor/Boss/GiantSpirit/Idle.png" },
  bossHit: { key: "na-boss-hit", file: "boss-giant-spirit-hit.png", frameWidth: 50, frameHeight: 50, source: "Actor/Boss/GiantSpirit/Hit.png" },
  shuriken: { key: "na-shuriken", file: "proj-shuriken.png", frameWidth: 16, frameHeight: 16, source: "FX/Projectile/Shuriken.png" },
  fireball: { key: "na-fireball", file: "proj-fireball.png", frameWidth: 16, frameHeight: 16, source: "FX/Projectile/Fireball.png" },
  energyBall: { key: "na-energy-ball", file: "proj-energy-ball.png", frameWidth: 16, frameHeight: 16, source: "FX/Projectile/EnergyBall.png" },
  hitSpark: { key: "na-hit-spark", file: "fx-hit-spark.png", frameWidth: 10, frameHeight: 8, source: "FX/Particle/Spark.png" },
  smoke: { key: "na-smoke", file: "fx-smoke.png", frameWidth: 32, frameHeight: 32, source: "FX/Smoke/Smoke/SpriteSheet.png" },
  explosion: { key: "na-explosion", file: "fx-explosion.png", frameWidth: 40, frameHeight: 40, source: "FX/Elemental/Explosion/SpriteSheet.png" },
  dashDust: { key: "na-dash-dust", file: "fx-dash-dust.png", frameWidth: 30, frameHeight: 14, source: "FX/Smoke/SmokeCircular/SpriteSheet.png" },
  torchFire: { key: "na-torch-fire", file: "fx-torch-fire.png", frameWidth: 8, frameHeight: 12, source: "FX/Particle/Fire.png" },
  magicSpark: { key: "na-magic-spark", file: "fx-magic-spark.png", frameWidth: 27, frameHeight: 35, source: "FX/Magic/Spark/SpriteSheet.png" },
  floors: { key: "na-floors", file: "tiles-interior-floor.png", frameWidth: 16, frameHeight: 16, source: "Backgrounds/Tilesets/Interior/TilesetInteriorFloor.png" },
  elements: { key: "na-elements", file: "tiles-element.png", frameWidth: 16, frameHeight: 16, source: "Backgrounds/Tilesets/TilesetElement.png" },
  dungeon: { key: "na-dungeon", file: "tiles-dungeon.png", frameWidth: 16, frameHeight: 16, source: "Backgrounds/Tilesets/TilesetDungeon.png" },
  // v2 world kit (Milestone 9). TilesetFloor is cropped from 417 to 416 px (its last row is a stray pixel row).
  outdoorFloor: { key: "na-outdoor-floor", file: "tiles-floor-outdoor.png", frameWidth: 16, frameHeight: 16, source: "Backgrounds/Tilesets/TilesetFloor.png" },
  nature: { key: "na-nature", file: "tiles-nature.png", frameWidth: 16, frameHeight: 16, source: "Backgrounds/Tilesets/TilesetNature.png" },
  water: { key: "na-water", file: "tiles-water.png", frameWidth: 16, frameHeight: 16, source: "Backgrounds/Tilesets/TilesetWater.png" },
  relief: { key: "na-relief", file: "tiles-relief.png", frameWidth: 16, frameHeight: 16, source: "Backgrounds/Tilesets/TilesetRelief.png" },
  house: { key: "na-house", file: "tiles-house.png", frameWidth: 16, frameHeight: 16, source: "Backgrounds/Tilesets/TilesetHouse.png" },
  camp: { key: "na-camp", file: "tiles-camp.png", frameWidth: 16, frameHeight: 16, source: "Backgrounds/Tilesets/tileset_camp.png" },
  ripples: { key: "na-ripples", file: "anim-water-ripples.png", frameWidth: 16, frameHeight: 16, source: "Backgrounds/Animated/Water Ripples/SpriteSheet16x16.png" },
  plant: { key: "na-plant", file: "anim-plant.png", frameWidth: 16, frameHeight: 16, source: "Backgrounds/Animated/Plant/SpriteSheet16x16.png" },
  flag: { key: "na-flag", file: "anim-flag-red.png", frameWidth: 16, frameHeight: 16, source: "Backgrounds/Animated/Flag/FlagRed16x16.png" },
  chicken: { key: "na-chicken", file: "critter-chicken.png", frameWidth: 16, frameHeight: 16, source: "Actor/Animal/Chicken/SpriteSheetWhite.png" },
  cat: { key: "na-cat", file: "critter-cat.png", frameWidth: 16, frameHeight: 16, source: "Actor/Animal/Cat/SpriteSheet.png" },
  frog: { key: "na-frog", file: "critter-frog.png", frameWidth: 16, frameHeight: 16, source: "Actor/Animal/Frog/SpriteSheet.png" },
  fish: { key: "na-fish", file: "critter-fish.png", frameWidth: 16, frameHeight: 16, source: "Actor/Animal/Fish/SpriteSheetYellow.png" },
  leaf: { key: "na-leaf", file: "fx-leaf.png", frameWidth: 12, frameHeight: 7, source: "FX/Particle/Leaf.png" },
  snowFlake: { key: "na-snow-flake", file: "fx-snow.png", frameWidth: 8, frameHeight: 8, source: "FX/Particle/Snow.png" },
  vaseShards: { key: "na-vase-shards", file: "fx-vase-shards.png", frameWidth: 14, frameHeight: 14, source: "FX/Particle/Vase.png" },
  // Economy and weapons (Milestone 10).
  coin: { key: "na-coin", file: "item-coin.png", frameWidth: 10, frameHeight: 10, source: "Items/Treasure/Coin2.png" },
  kunai: { key: "na-kunai", file: "proj-kunai.png", frameWidth: 14, frameHeight: 5, source: "FX/Projectile/Kunai.png" },
  bigShuriken: { key: "na-big-shuriken", file: "proj-big-shuriken.png", frameWidth: 23, frameHeight: 23, source: "FX/Projectile/BigShuriken.png" },
  magicShuriken: { key: "na-magic-shuriken", file: "proj-shuriken-magic.png", frameWidth: 16, frameHeight: 16, source: "FX/Projectile/ShurikenMagic.png" },
  shopkeeper: { key: "na-shopkeeper", file: "npc-old-man.png", frameWidth: 16, frameHeight: 16, source: "Actor/Character/OldMan/SpriteSheet.png" },
  merchant: { key: "na-merchant", file: "npc-master.png", frameWidth: 16, frameHeight: 16, source: "Actor/Character/Master/SpriteSheet.png" },
  shopkeeperFace: { key: "na-shopkeeper-face", file: "face-old-man.png", frameWidth: 38, frameHeight: 38, source: "Actor/Character/OldMan/Faceset.png" },
  merchantFace: { key: "na-merchant-face", file: "face-master.png", frameWidth: 38, frameHeight: 38, source: "Actor/Character/Master/Faceset.png" },
  woodShards: { key: "na-wood-shards", file: "fx-wood-shards.png", frameWidth: 16, frameHeight: 16, source: "FX/Particle/Wood.png" },
} as const satisfies Record<string, SheetAsset>;

export type SheetId = keyof typeof SHEETS;

/** Expected sheet sizes in pixels (checked against the PNG headers by tests). */
export const SHEET_SIZES: Readonly<Record<SheetId, readonly [number, number]>> = {
  player: [64, 112],
  chaser: [64, 64],
  tank: [64, 64],
  ranged: [64, 64],
  bossIdle: [250, 50],
  bossHit: [150, 50],
  shuriken: [32, 16],
  fireball: [64, 16],
  energyBall: [64, 16],
  hitSpark: [70, 8],
  smoke: [192, 32],
  explosion: [360, 40],
  dashDust: [240, 14],
  torchFire: [96, 12],
  magicSpark: [270, 35],
  floors: [352, 272],
  elements: [256, 240],
  dungeon: [192, 64],
  outdoorFloor: [352, 416],
  nature: [384, 336],
  water: [448, 272],
  relief: [320, 192],
  house: [528, 368],
  camp: [368, 144],
  ripples: [64, 16],
  plant: [64, 16],
  flag: [64, 16],
  chicken: [32, 16],
  cat: [32, 16],
  frog: [32, 16],
  fish: [32, 16],
  leaf: [72, 7],
  snowFlake: [56, 8],
  vaseShards: [84, 14],
  woodShards: [96, 16],
  coin: [40, 10],
  kunai: [14, 5],
  bigShuriken: [46, 23],
  magicShuriken: [32, 16],
  shopkeeper: [64, 112],
  merchant: [64, 112],
  shopkeeperFace: [38, 38],
  merchantFace: [38, 38],
};

/** Frame index of the 16px tile at (col, row) in a sheet. */
export function frameAt(sheet: SheetId, col: number, row: number): number {
  return row * Math.floor(SHEET_SIZES[sheet][0] / SHEETS[sheet].frameWidth) + col;
}

export interface AnimDef {
  readonly key: string;
  readonly sheet: SheetId;
  readonly frames: readonly number[];
  readonly frameRate: number;
  /** -1 loops forever. */
  readonly repeat: number;
}

/** Character and monster sheets: columns are directions, rows are walk frames. */
export const DIRECTIONS = ["down", "up", "left", "right"] as const;
export type Direction = (typeof DIRECTIONS)[number];

/** Walk frames for a 4-column directional sheet (rows 0–3). */
export function walkFrames(dir: Direction): number[] {
  const col = DIRECTIONS.indexOf(dir);
  return [0, 1, 2, 3].map((row) => row * 4 + col);
}

/** The standing frame for a direction (first walk row). */
export function idleFrame(dir: Direction): number {
  return DIRECTIONS.indexOf(dir);
}

export const walkAnimKey = (sheet: SheetId, dir: Direction): string => `${SHEETS[sheet].key}-walk-${dir}`;

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

export const ANIMS: readonly AnimDef[] = [
  ...(["player", "chaser", "tank", "ranged"] as const).flatMap((sheet) =>
    DIRECTIONS.map((dir) => ({ key: walkAnimKey(sheet, dir), sheet, frames: walkFrames(dir), frameRate: sheet === "tank" ? 6 : 9, repeat: -1 })),
  ),
  { key: "na-boss-idle", sheet: "bossIdle", frames: range(5), frameRate: 7, repeat: -1 },
  { key: "na-boss-hit", sheet: "bossHit", frames: range(3), frameRate: 14, repeat: 0 },
  { key: "na-shuriken-spin", sheet: "shuriken", frames: range(2), frameRate: 18, repeat: -1 },
  { key: "na-fireball-fly", sheet: "fireball", frames: range(4), frameRate: 12, repeat: -1 },
  { key: "na-energy-ball-fly", sheet: "energyBall", frames: range(4), frameRate: 12, repeat: -1 },
  { key: "na-hit-spark", sheet: "hitSpark", frames: range(7), frameRate: 28, repeat: 0 },
  { key: "na-smoke", sheet: "smoke", frames: range(6), frameRate: 16, repeat: 0 },
  { key: "na-explosion", sheet: "explosion", frames: range(9), frameRate: 18, repeat: 0 },
  { key: "na-dash-dust", sheet: "dashDust", frames: range(8), frameRate: 24, repeat: 0 },
  { key: "na-torch-fire", sheet: "torchFire", frames: range(12), frameRate: 12, repeat: -1 },
  { key: "na-magic-spark", sheet: "magicSpark", frames: range(10), frameRate: 20, repeat: 0 },
  { key: "na-ripples", sheet: "ripples", frames: range(4), frameRate: 5, repeat: -1 },
  { key: "na-plant", sheet: "plant", frames: range(4), frameRate: 4, repeat: -1 },
  { key: "na-flag", sheet: "flag", frames: range(4), frameRate: 8, repeat: -1 },
  { key: "na-coin-spin", sheet: "coin", frames: range(4), frameRate: 10, repeat: -1 },
  { key: "na-big-shuriken-spin", sheet: "bigShuriken", frames: range(2), frameRate: 14, repeat: -1 },
  { key: "na-magic-shuriken-spin", sheet: "magicShuriken", frames: range(2), frameRate: 18, repeat: -1 },
  // Critters: frame 0 stands, frame 1 steps (side view facing left; flipped for right).
  ...(["chicken", "cat", "frog", "fish"] as const).map((sheet) => ({ key: `na-${sheet}-move`, sheet, frames: [0, 1], frameRate: 6, repeat: -1 })),
];

export const ENEMY_SHEET: Readonly<Record<Exclude<EnemyKind, "boss">, SheetId>> = {
  chaser: "chaser",
  tank: "tank",
  ranged: "ranged",
};

/** Single-frame tiles (frame index = row * columns + column in 16px sheets). */
export const TILE_FRAMES = {
  /** Seamless fill tiles from TilesetInteriorFloor (22 columns). */
  darkCobble: { sheet: "floors", frame: 13 * 22 + 12 },
  goldenCobble: { sheet: "floors", frame: 13 * 22 + 1 },
  sageOrnament: { sheet: "floors", frame: 9 * 22 + 14 },
  peachBrick: { sheet: "floors", frame: 1 * 22 + 1 },
  orangeBrick: { sheet: "floors", frame: 7 * 22 + 1 },
  /** TilesetElement (16 columns) and TilesetDungeon (12 columns). */
  barrel: { sheet: "elements", frame: 0 },
  crate: { sheet: "dungeon", frame: 1 * 12 + 3 },
  lockedDoor: { sheet: "dungeon", frame: 0 },
} as const satisfies Record<string, { readonly sheet: SheetId; readonly frame: number }>;

export type TileFrameId = keyof typeof TILE_FRAMES;

export interface ThemeArt {
  readonly floor: TileFrameId;
  /** Multiplied into the floor tile (0xffffff = untinted). */
  readonly floorTint: number;
  /** Brick texture used for the top of wall tiles. */
  readonly wall: TileFrameId;
  readonly wallTint: number;
}

/**
 * The pack's art is colourful and its floors are already dark, so sprite-art
 * mode uses less darkness than the flat placeholder shapes needed.
 */
export const ART_DARKNESS_SCALE = 0.75;

/** Per-level tile choices, keyed by theme id. */
export const THEME_ART: Readonly<Record<string, ThemeArt>> = {
  ruins: { floor: "darkCobble", floorTint: 0xffffff, wall: "peachBrick", wallTint: 0x9a7e8e },
  sewers: { floor: "sageOrnament", floorTint: 0xd8e8d0, wall: "peachBrick", wallTint: 0x7f9a74 },
  temple: { floor: "goldenCobble", floorTint: 0xffffff, wall: "peachBrick", wallTint: 0xf2d2b0 },
  foundry: { floor: "darkCobble", floorTint: 0xffb898, wall: "orangeBrick", wallTint: 0xc07050 },
  void: { floor: "darkCobble", floorTint: 0xb0a0ff, wall: "peachBrick", wallTint: 0x7a6aa8 },
};
