import * as Phaser from "phaser";
import type { Theme } from "../data/themes.ts";
import { TILE } from "../game/config.ts";
import type { EnemyKind } from "../logic/enemyStats.ts";
import type { Prop } from "../logic/layout.ts";
import { LightTex } from "./LightTextures.ts";

// All placeholder art is generated once per game from primitives. Swapping in
// real sprites later only requires loading textures under the same keys.

export const Tex = {
  player: "ph-player",
  gun: "ph-gun",
  chaser: "ph-chaser",
  tank: "ph-tank",
  ranged: "ph-ranged",
  boss: "ph-boss",
  bullet: "ph-bullet",
  enemyBullet: "ph-enemy-bullet",
  spark: "ph-spark",
  crate: "ph-crate",
  barrel: "ph-barrel",
  spawnMarker: "ph-spawn-marker",
} as const;

export const ENEMY_TEXTURE: Readonly<Record<EnemyKind, string>> = {
  chaser: Tex.chaser,
  tank: Tex.tank,
  ranged: Tex.ranged,
  boss: Tex.boss,
};

const OUTLINE = 0x0a0d16;

type Bake = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => void;

function withBaker(scene: Phaser.Scene, run: (bake: Bake) => void): void {
  const g = scene.make.graphics({}, false);
  run((key, w, h, draw) => {
    if (scene.textures.exists(key)) return;
    g.clear();
    draw(g);
    g.generateTexture(key, w, h);
  });
  g.destroy();
}

export function ensurePlaceholderTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(Tex.spawnMarker)) return;
  withBaker(scene, (bake) => {
    bake(Tex.player, 14, 14, (g) => {
      g.fillStyle(OUTLINE).fillRect(0, 0, 14, 14);
      g.fillStyle(0x3d7bff).fillRect(1, 1, 12, 12);
      g.fillStyle(0x8fb8ff).fillRect(2, 2, 8, 2).fillRect(2, 2, 2, 6);
      g.fillStyle(0x234a9e).fillRect(2, 11, 10, 1);
    });

    bake(Tex.gun, 10, 4, (g) => {
      g.fillStyle(OUTLINE).fillRect(0, 0, 10, 4);
      g.fillStyle(0xd8e2f0).fillRect(1, 1, 8, 2);
    });

    // Chaser: red circle.
    bake(Tex.chaser, 14, 14, (g) => {
      g.fillStyle(OUTLINE).fillCircle(7, 7, 7);
      g.fillStyle(0xe23b4a).fillCircle(7, 7, 6);
      g.fillStyle(0xff8a95).fillRect(4, 3, 3, 2);
      g.fillStyle(0xffffff).fillRect(4, 6, 2, 2).fillRect(8, 6, 2, 2);
    });

    // Tank: chunky amber block with armour plates.
    bake(Tex.tank, 20, 20, (g) => {
      g.fillStyle(OUTLINE).fillRect(0, 0, 20, 20);
      g.fillStyle(0xd98e1f).fillRect(1, 1, 18, 18);
      g.fillStyle(0xffc25a).fillRect(2, 2, 16, 3);
      g.fillStyle(0x8a5510).fillRect(2, 15, 16, 3).fillRect(2, 8, 3, 6).fillRect(15, 8, 3, 6);
      g.fillStyle(0x1a1006).fillRect(6, 8, 3, 3).fillRect(11, 8, 3, 3);
    });

    // Ranged: purple diamond with a glowing core.
    bake(Tex.ranged, 16, 16, (g) => {
      g.fillStyle(OUTLINE).fillTriangle(8, 0, 16, 8, 8, 16).fillTriangle(8, 0, 0, 8, 8, 16);
      g.fillStyle(0x9b5de5).fillTriangle(8, 2, 14, 8, 8, 14).fillTriangle(8, 2, 2, 8, 8, 14);
      g.fillStyle(0xe0c3ff).fillRect(7, 6, 2, 4);
    });

    // Boss: large void-purple core with a pale mask.
    bake(Tex.boss, 34, 34, (g) => {
      g.fillStyle(OUTLINE).fillCircle(17, 17, 17);
      g.fillStyle(0x3b1f73).fillCircle(17, 17, 15);
      g.fillStyle(0x6c3fc4).fillCircle(17, 17, 11);
      g.fillStyle(0xe8ddff).fillRect(10, 12, 14, 9);
      g.fillStyle(0x12082a).fillRect(12, 14, 3, 3).fillRect(19, 14, 3, 3).fillRect(14, 19, 6, 1);
    });

    bake(Tex.bullet, 4, 4, (g) => {
      g.fillStyle(0xffd166).fillRect(0, 0, 4, 4);
      g.fillStyle(0xffffff).fillRect(1, 1, 2, 2);
    });

    // Enemy bullets: larger, slower magenta orbs, clearly distinct from the player's.
    bake(Tex.enemyBullet, 8, 8, (g) => {
      g.fillStyle(OUTLINE).fillCircle(4, 4, 4);
      g.fillStyle(0xff4fd8).fillCircle(4, 4, 3);
      g.fillStyle(0xffd6f5).fillRect(3, 3, 2, 2);
    });

    bake(Tex.spark, 2, 2, (g) => {
      g.fillStyle(0xffffff).fillRect(0, 0, 2, 2);
    });

    bake(Tex.crate, TILE, TILE, (g) => {
      g.fillStyle(OUTLINE).fillRect(0, 0, TILE, TILE);
      g.fillStyle(0x8a5a2b).fillRect(1, 1, 14, 14);
      g.fillStyle(0xb07a3e).fillRect(1, 1, 14, 2).fillRect(1, 1, 2, 14);
      g.fillStyle(0x5e3b1a).fillRect(3, 7, 10, 2).fillRect(7, 3, 2, 10);
    });

    bake(Tex.barrel, TILE, TILE, (g) => {
      g.fillStyle(OUTLINE).fillCircle(8, 8, 8);
      g.fillStyle(0xa0522d).fillCircle(8, 8, 7);
      g.fillStyle(0x3b3f4a).fillRect(1, 5, 14, 2).fillRect(1, 10, 14, 2);
      g.fillStyle(0xd08850).fillRect(4, 3, 2, 2);
    });

    bake(Tex.spawnMarker, 14, 14, (g) => {
      g.lineStyle(2, 0xff5d73).strokeCircle(7, 7, 6);
      g.fillStyle(0xff5d73).fillRect(6, 6, 2, 2);
    });
  });
}

function themeKeys(theme: Theme): { floor: string; wall: string } {
  return { floor: `ph-floor-${theme.id}`, wall: `ph-wall-${theme.id}` };
}

/** Floor/wall tiles for one level theme, generated once and cached by key. */
function ensureThemeTextures(scene: Phaser.Scene, theme: Theme): { floor: string; wall: string } {
  const keys = themeKeys(theme);
  withBaker(scene, (bake) => {
    bake(keys.floor, TILE, TILE, (g) => {
      g.fillStyle(theme.floor.base).fillRect(0, 0, TILE, TILE);
      g.fillStyle(theme.floor.line).fillRect(0, TILE - 1, TILE, 1).fillRect(TILE - 1, 0, 1, TILE);
      g.fillStyle(theme.floor.speck).fillRect(3, 4, 1, 1).fillRect(10, 11, 1, 1).fillRect(12, 3, 1, 1);
    });
    bake(keys.wall, TILE, TILE, (g) => {
      g.fillStyle(theme.wall.base).fillRect(0, 0, TILE, TILE);
      g.fillStyle(theme.wall.block).fillRect(1, 1, 6, 6).fillRect(9, 9, 6, 6);
    });
  });
  return keys;
}

/**
 * Bakes floor and wall tiles (with bright edges facing the floor) into a
 * single render texture once per room, instead of keeping ~900 tile objects.
 */
export function bakeTileLayer(
  scene: Phaser.Scene,
  wall: readonly (readonly boolean[])[],
  depth: number,
  theme: Theme,
  props: readonly Prop[] = [],
): Phaser.GameObjects.RenderTexture {
  const keys = ensureThemeTextures(scene, theme);
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
        rt.draw(keys.floor, x, y);
        // Ambient occlusion: a soft dark strip where the floor meets a wall above.
        if (isWall(c, r - 1)) {
          edges.fillStyle(0x000000, 0.28).fillRect(x, y, TILE, 2);
          edges.fillStyle(0x000000, 0.14).fillRect(x, y + 2, TILE, 2);
        }
        continue;
      }
      rt.draw(keys.wall, x, y);
      // Front face (wall above floor) for a little top-down depth.
      if (!isWall(c, r + 1)) {
        edges.fillStyle(theme.wall.face).fillRect(x, y + TILE - 5, TILE, 4);
        edges.fillStyle(theme.wall.faceEdge).fillRect(x, y + TILE - 1, TILE, 1);
      }
      edges.fillStyle(theme.wall.edge);
      if (!isWall(c, r - 1)) edges.fillRect(x, y, TILE, 1);
      if (!isWall(c - 1, r)) edges.fillRect(x, y, 1, TILE);
      if (!isWall(c + 1, r)) edges.fillRect(x + TILE - 1, y, 1, TILE);
    }
  }
  rt.draw(edges);
  edges.destroy();

  // Blob shadows under static props, baked once (the cached shadow texture).
  if (props.length > 0 && scene.textures.exists(LightTex.shadow)) {
    const stamp = scene.make.image({ key: LightTex.shadow }, false).setScale(0.62);
    for (const p of props) rt.draw(stamp, p.rect.x + TILE / 2, p.rect.y + TILE - 1);
    stamp.destroy();
  }
  return rt;
}
