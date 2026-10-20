import * as Phaser from "phaser";
import { frameAt } from "../data/artManifest.ts";
import type { BiomeArt, TileRef } from "../data/biomes.ts";
import { DECOR, type DecorDef, type PlacedObject } from "../data/decor.ts";
import type { Theme } from "../data/themes.ts";
import { TILE } from "../game/config.ts";
import { cliffColumn, groundVariant, tileHash, waterPiece } from "../logic/terrainArt.ts";
import type { ArtMode } from "./Art.ts";
import { sheetKey } from "./Art.ts";
import { LightTex } from "./LightTextures.ts";
import { bakeTallWalls } from "./PlaceholderArt.ts";

type Grid = readonly (readonly boolean[])[];
type Layers = { base: Phaser.GameObjects.RenderTexture; top: Phaser.GameObjects.RenderTexture };

/** Decoration is drawn a touch darker than actors so threats stay readable. */
const DECOR_TINT = 0xe6e6e6;
/** Trees on raised ground are background: darker still. */
const WALL_TREE_TINT = 0xc8d0c0;

/** Static objects are baked; breakables and animated objects stay live sprites. */
export function isBaked(def: DecorDef): boolean {
  return def.kind !== "breakable" && def.anim === undefined;
}

/**
 * Bakes an outdoor map into two render textures (see bakeTallWalls for the
 * layer idea): ground with detail variants, water with shores, cliffs two
 * tiles tall (lip on the foreground layer, base on the ground layer), and
 * every static object, its top `canopy` rows on the foreground layer.
 * Placeholder art: the generated tall walls plus flat object shapes.
 */
export function bakeWorld(
  scene: Phaser.Scene,
  wall: Grid,
  low: Grid,
  bridge: Grid,
  theme: Theme,
  biome: BiomeArt | undefined,
  objects: readonly PlacedObject[],
  art: ArtMode,
  depths: { base: number; top: number },
): Layers {
  const layers =
    biome && art === "ninja"
      ? bakeTerrain(scene, wall, low, bridge, biome, depths)
      : bakeTallWalls(scene, wall, low, theme, [], art, depths);
  bakeObjects(scene, layers, objects, art);
  return layers;
}

function drawTile(rt: Phaser.GameObjects.RenderTexture, t: TileRef, dc: number, dr: number, x: number, y: number, tint = 0xffffff): void {
  rt.drawFrame(sheetKey(t.sheet), frameAt(t.sheet, t.col + dc, t.row + dr), x, y, 1, tint);
}

/** Plain vertical wooden planks in the water sheet. */
const PLANK: TileRef = { sheet: "water", col: 5, row: 13 };

function bakeTerrain(scene: Phaser.Scene, wall: Grid, low: Grid, bridge: Grid, biome: BiomeArt, depths: { base: number; top: number }): Layers {
  const rows = wall.length;
  const cols = wall[0]?.length ?? 0;
  const base = scene.add.renderTexture(0, 0, cols * TILE, rows * TILE).setOrigin(0).setDepth(depths.base);
  const top = scene.add.renderTexture(0, 0, cols * TILE, rows * TILE).setOrigin(0).setDepth(depths.top);
  const isWall = (c: number, r: number): boolean => wall[r]?.[c] ?? true;
  // Bridges count as water for the shore pieces, so the banks run under the planks.
  const isBridge = (c: number, r: number): boolean => bridge[r]?.[c] ?? false;
  const isWater = (c: number, r: number): boolean => ((low[r]?.[c] ?? false) || isBridge(c, r)) && !isWall(c, r);
  // A face shows where a wall stands directly above open ground.
  const isFace = (c: number, r: number): boolean => isWall(c, r) && !isWall(c, r + 1);
  const plain = biome.ground[0];
  if (!plain) throw new Error("Biome has no ground tile");
  const waterRef: TileRef = { sheet: "water", col: biome.water.col, row: biome.water.row };
  const cliffRef: TileRef = { sheet: "relief", col: biome.cliff.col, row: biome.cliff.row };
  const fx = scene.make.graphics({}, false);
  const topFx = scene.make.graphics({}, false);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * TILE;
      const y = r * TILE;
      if (!isWall(c, r)) {
        if (isWater(c, r)) {
          const piece = waterPiece(isWater, c, r);
          drawTile(base, waterRef, piece.col, piece.row, x, y);
          if (isBridge(c, r)) {
            drawTile(base, PLANK, 0, 0, x, y);
            // Dark rails along the open sides, and a shadow on the water below.
            fx.fillStyle(0x5a3418);
            if (!isBridge(c - 1, r)) fx.fillRect(x, y, 2, TILE);
            if (!isBridge(c + 1, r)) fx.fillRect(x + TILE - 2, y, 2, TILE);
            if (!isBridge(c, r + 1) && isWater(c, r + 1)) fx.fillStyle(0x000000, 0.25).fillRect(x, y + TILE, TILE, 3);
          }
        } else {
          const ground = biome.ground[groundVariant(c, r, biome.ground.length, biome.detailChance)] ?? plain;
          drawTile(base, ground, 0, 0, x, y);
        }
        continue;
      }
      if (isFace(c, r)) {
        const column = cliffColumn(isFace, c, r);
        drawTile(base, cliffRef, column, 2, x, y);
        drawTile(top, cliffRef, column, 0, x, y - TILE);
        // Contact shadow on the ground at the cliff's foot.
        fx.fillStyle(0x000000, 0.18).fillRect(x, y + TILE, TILE, 3);
      } else {
        drawTile(base, plain, 0, 0, x, y, biome.plateauTint);
        drawTile(top, plain, 0, 0, x, y - TILE, biome.plateauTint);
        // A dark rim where the raised ground meets open ground on its sides or top.
        topFx.fillStyle(0x1a2410, 0.55);
        if (!isWall(c, r - 1)) topFx.fillRect(x, y - TILE, TILE, 2);
        if (!isWall(c - 1, r)) topFx.fillRect(x, y - TILE, 2, TILE);
        if (!isWall(c + 1, r)) topFx.fillRect(x + TILE - 2, y - TILE, 2, TILE);
      }
    }
  }
  base.draw(fx);
  top.draw(topFx);
  fx.destroy();
  topFx.destroy();
  bakeWallTrees(top, wall, biome);
  return { base, top };
}

/**
 * Trees on raised ground. A 2x2 tree goes on a spot whose 2x2 block and a
 * one-tile ring around it are all wall, so trees never hang over paths. It is
 * drawn on the foreground layer, one tile up like the wall tops it sits on.
 */
function bakeWallTrees(top: Phaser.GameObjects.RenderTexture, wall: Grid, biome: BiomeArt): void {
  if (biome.wallTrees.length === 0) return;
  const rows = wall.length;
  const cols = wall[0]?.length ?? 0;
  const isWall = (c: number, r: number): boolean => wall[r]?.[c] ?? true;
  const used = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      if (tileHash(c, r, 11) >= biome.wallTreeDensity) continue;
      let ok = true;
      for (let dr = -1; dr <= 2 && ok; dr++) for (let dc = -1; dc <= 2 && ok; dc++) if (!isWall(c + dc, r + dr)) ok = false;
      for (let dr = 0; dr <= 1 && ok; dr++) for (let dc = 0; dc <= 1 && ok; dc++) if (used[r + dr]?.[c + dc]) ok = false;
      if (!ok) continue;
      for (let dr = 0; dr <= 1; dr++) for (let dc = 0; dc <= 1; dc++) {
        const row = used[r + dr];
        if (row) row[c + dc] = true;
      }
      const id = biome.wallTrees[Math.floor(tileHash(c, r, 12) * biome.wallTrees.length)] ?? biome.wallTrees[0];
      if (!id) continue;
      const def: DecorDef = DECOR[id];
      // A few pixels of jitter so the trees do not line up on the tile grid.
      const jx = Math.round((tileHash(c, r, 13) - 0.5) * 8);
      const jy = Math.round((tileHash(c, r, 14) - 0.5) * 6);
      for (let dr = 0; dr < def.h; dr++) {
        for (let dc = 0; dc < def.w; dc++) {
          top.drawFrame(sheetKey(def.sheet), frameAt(def.sheet, def.col + dc, def.row + dr), (c + dc) * TILE + jx, (r + dr - 1) * TILE + jy, 1, WALL_TREE_TINT);
        }
      }
    }
  }
}

function bakeObjects(scene: Phaser.Scene, layers: Layers, objects: readonly PlacedObject[], art: ArtMode): void {
  // Lower objects drawn last, so they overlap the ones behind them.
  const sorted = [...objects].filter((o) => isBaked(DECOR[o.id])).sort((a, b) => a.row + DECOR[a.id].h - (b.row + DECOR[b.id].h));
  const shadow = scene.textures.exists(LightTex.shadow) ? scene.make.image({ key: LightTex.shadow }, false) : null;
  const flat = scene.make.graphics({}, false);
  const flatTop = scene.make.graphics({}, false);
  for (const o of sorted) {
    const def: DecorDef = DECOR[o.id];
    const canopy = def.canopy ?? 0;
    if (def.kind === "solid" && def.solid && shadow) {
      const s = def.solid;
      shadow.setScale((s.cols * TILE * 1.1) / 32, 0.7);
      layers.base.draw(shadow, (o.col + s.col + s.cols / 2) * TILE, (o.row + s.row + s.rows) * TILE - 2);
    }
    for (let dr = 0; dr < def.h; dr++) {
      for (let dc = 0; dc < def.w; dc++) {
        const x = (o.col + dc) * TILE;
        const y = (o.row + dr) * TILE;
        const onTop = dr < canopy;
        if (art === "ninja") {
          const rt = onTop ? layers.top : layers.base;
          rt.drawFrame(sheetKey(def.sheet), frameAt(def.sheet, def.col + dc, def.row + dr), x, y, 1, DECOR_TINT);
        } else {
          const g = onTop ? flatTop : flat;
          const inset = def.kind === "walkover" ? 5 : 1;
          g.fillStyle(def.color, onTop ? 0.85 : 1).fillRect(x + inset, y + inset, TILE - inset * 2, TILE - inset * 2);
        }
      }
    }
  }
  layers.base.draw(flat);
  layers.top.draw(flatTop);
  flat.destroy();
  flatTop.destroy();
  shadow?.destroy();
}
