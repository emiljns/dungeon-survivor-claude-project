import * as Phaser from "phaser";
import { TILE } from "../game/config.ts";

// All placeholder art is generated once per game from primitives. Swapping in
// real sprites later only requires loading textures under the same keys.

export const Tex = {
  floor: "ph-floor",
  wall: "ph-wall",
  player: "ph-player",
  gun: "ph-gun",
  chaser: "ph-chaser",
  bullet: "ph-bullet",
  spark: "ph-spark",
} as const;

const OUTLINE = 0x0a0d16;

export function ensurePlaceholderTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(Tex.floor)) return;
  const g = scene.make.graphics({}, false);

  const bake = (key: string, w: number, h: number, draw: () => void): void => {
    g.clear();
    draw();
    g.generateTexture(key, w, h);
  };

  bake(Tex.floor, TILE, TILE, () => {
    g.fillStyle(0x2b3042).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x252a3a).fillRect(0, TILE - 1, TILE, 1).fillRect(TILE - 1, 0, 1, TILE);
    g.fillStyle(0x32384c).fillRect(3, 4, 1, 1).fillRect(10, 11, 1, 1).fillRect(12, 3, 1, 1);
  });

  bake(Tex.wall, TILE, TILE, () => {
    g.fillStyle(0x161b29).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x1d2334).fillRect(1, 1, 6, 6).fillRect(9, 9, 6, 6);
  });

  bake(Tex.player, 14, 14, () => {
    g.fillStyle(OUTLINE).fillRect(0, 0, 14, 14);
    g.fillStyle(0x3d7bff).fillRect(1, 1, 12, 12);
    g.fillStyle(0x8fb8ff).fillRect(2, 2, 8, 2).fillRect(2, 2, 2, 6);
    g.fillStyle(0x234a9e).fillRect(2, 11, 10, 1);
  });

  bake(Tex.gun, 10, 4, () => {
    g.fillStyle(OUTLINE).fillRect(0, 0, 10, 4);
    g.fillStyle(0xd8e2f0).fillRect(1, 1, 8, 2);
  });

  bake(Tex.chaser, 14, 14, () => {
    g.fillStyle(OUTLINE).fillCircle(7, 7, 7);
    g.fillStyle(0xe23b4a).fillCircle(7, 7, 6);
    g.fillStyle(0xff8a95).fillRect(4, 3, 3, 2);
    g.fillStyle(0xffffff).fillRect(4, 6, 2, 2).fillRect(8, 6, 2, 2);
  });

  bake(Tex.bullet, 4, 4, () => {
    g.fillStyle(0xffd166).fillRect(0, 0, 4, 4);
    g.fillStyle(0xffffff).fillRect(1, 1, 2, 2);
  });

  bake(Tex.spark, 2, 2, () => {
    g.fillStyle(0xffffff).fillRect(0, 0, 2, 2);
  });

  g.destroy();
}

/**
 * Bakes floor and wall tiles (with bright edges facing the floor) into a
 * single render texture once, instead of keeping ~900 tile objects alive.
 */
export function bakeTileLayer(
  scene: Phaser.Scene,
  wall: readonly (readonly boolean[])[],
  depth: number,
): Phaser.GameObjects.RenderTexture {
  const rows = wall.length;
  const cols = wall[0]?.length ?? 0;
  const rt = scene.add.renderTexture(0, 0, cols * TILE, rows * TILE).setOrigin(0).setDepth(depth);
  const isWall = (c: number, r: number): boolean => wall[r]?.[c] ?? true;
  const edges = scene.make.graphics({}, false);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * TILE;
      const y = r * TILE;
      if (!isWall(c, r)) {
        rt.draw(Tex.floor, x, y);
        continue;
      }
      rt.draw(Tex.wall, x, y);
      // Front face (wall above floor) for a little top-down depth.
      if (!isWall(c, r + 1)) {
        edges.fillStyle(0x2e3652).fillRect(x, y + TILE - 5, TILE, 4);
        edges.fillStyle(0x7d8fc4).fillRect(x, y + TILE - 1, TILE, 1);
      }
      edges.fillStyle(0x56648f);
      if (!isWall(c, r - 1)) edges.fillRect(x, y, TILE, 1);
      if (!isWall(c - 1, r)) edges.fillRect(x, y, 1, TILE);
      if (!isWall(c + 1, r)) edges.fillRect(x + TILE - 1, y, 1, TILE);
    }
  }
  rt.draw(edges);
  edges.destroy();
  return rt;
}
