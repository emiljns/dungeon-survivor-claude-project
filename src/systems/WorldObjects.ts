import * as Phaser from "phaser";
import { frameAt } from "../data/artManifest.ts";
import { DECOR, type DecorDef, type PlacedObject } from "../data/decor.ts";
import { Depth, TILE } from "../game/config.ts";
import type { Rect } from "../logic/collision.ts";
import { blockingTiles } from "../logic/objects.ts";
import type { TilePos } from "../logic/layout.ts";
import { inView } from "../logic/view.ts";
import { sheetKey, type ArtMode } from "../rendering/Art.ts";
import { Tex } from "../rendering/PlaceholderArt.ts";

interface Breakable {
  readonly def: DecorDef;
  readonly rect: Rect;
  readonly tiles: readonly TilePos[];
  readonly sprite: Phaser.GameObjects.Image;
  readonly body: Phaser.GameObjects.Zone;
  hp: number;
}

/** Live sprites are culled outside the camera view plus this margin. */
const CULL_MARGIN = 48;
const CULL_EVERY_MS = 200;

/**
 * The live part of a map's objects: breakables (solid until shot to pieces)
 * and animated scenery, including water ripples. Animated sprites only run
 * near the camera. Static objects are baked by WorldBake instead.
 */
export class WorldObjects {
  private breakables: Breakable[] = [];
  private readonly animated: Phaser.GameObjects.Sprite[] = [];
  private lastCull = -Infinity;
  /** Static group for breakable bodies; the scene adds colliders to it. */
  readonly bodies: Phaser.Physics.Arcade.StaticGroup;

  constructor(
    private readonly scene: Phaser.Scene,
    objects: readonly PlacedObject[],
    rippleTiles: readonly TilePos[],
    private readonly art: ArtMode,
  ) {
    this.bodies = scene.physics.add.staticGroup();
    for (const o of objects) {
      const def: DecorDef = DECOR[o.id];
      const x = o.col * TILE + (def.w * TILE) / 2;
      const y = o.row * TILE + (def.h * TILE) / 2;
      if (def.kind === "breakable") {
        const tiles = blockingTiles(def, o);
        const first = tiles[0] ?? { col: o.col, row: o.row };
        const rect = { x: first.col * TILE, y: first.row * TILE, width: TILE, height: TILE };
        const sprite =
          art === "ninja"
            ? scene.add.image(x, y, sheetKey(def.sheet), frameAt(def.sheet, def.col, def.row))
            : scene.add.image(x, y, def.breakable?.shards === "wood" ? Tex.crate : Tex.barrel);
        sprite.setDepth(Depth.props);
        const body = scene.add.zone(rect.x + TILE / 2, rect.y + TILE / 2, TILE, TILE);
        this.bodies.add(body);
        this.breakables.push({ def, rect, tiles, sprite, body, hp: def.breakable?.hp ?? 1 });
      } else if (def.anim && art === "ninja") {
        this.animated.push(scene.add.sprite(x, y, sheetKey(def.sheet)).setDepth(Depth.props).play({ key: def.anim, startFrame: (o.col + o.row) % 4 }));
      }
    }
    if (art === "ninja") {
      for (const t of rippleTiles) {
        this.animated.push(
          scene.add
            .sprite((t.col + 0.5) * TILE, (t.row + 0.5) * TILE, sheetKey("ripples"))
            .setDepth(Depth.props)
            .setAlpha(0.8)
            .play({ key: "na-ripples", startFrame: (t.col * 3 + t.row) % 4 }),
        );
      }
    }
  }

  /** Intact breakables: they block walking, paths, sight and enemy bullets. */
  get solidRects(): Rect[] {
    return this.breakables.map((b) => b.rect);
  }

  get blockedTiles(): TilePos[] {
    return this.breakables.flatMap((b) => b.tiles);
  }

  get count(): number {
    return this.breakables.length;
  }

  /** Applies a hit to breakable `index` (into solidRects). Returns true if it broke. */
  hit(index: number, damage: number): boolean {
    const b = this.breakables[index];
    if (!b) return false;
    b.hp -= damage;
    if (b.hp > 0) {
      b.sprite.setTintFill(0xffffff);
      this.scene.time.delayedCall(50, () => b.sprite.active && b.sprite.clearTint());
      return false;
    }
    this.breakables = this.breakables.filter((x) => x !== b);
    this.shatter(b);
    this.bodies.remove(b.body, true, true);
    b.sprite.destroy();
    return true;
  }

  /** A few shards fly out and fade (one-off, only when something breaks). */
  private shatter(b: Breakable): void {
    const cx = b.rect.x + TILE / 2;
    const cy = b.rect.y + TILE / 2;
    const shards = b.def.breakable?.shards ?? "wood";
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.8;
      const piece =
        this.art === "ninja"
          ? this.scene.add.image(cx, cy, sheetKey(shards === "vase" ? "vaseShards" : "woodShards"), i % 6)
          : this.scene.add.image(cx, cy, Tex.spark).setTint(b.def.color).setScale(2);
      piece.setDepth(Depth.effects).setRotation(Math.random() * Math.PI);
      const dist = 10 + Math.random() * 12;
      this.scene.tweens.add({
        targets: piece,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist + 4,
        angle: piece.angle + (Math.random() - 0.5) * 360,
        alpha: 0,
        duration: 420 + Math.random() * 200,
        ease: "Cubic.Out",
        onComplete: () => piece.destroy(),
      });
    }
  }

  /** Runs animated sprites only near the camera (checked a few times a second). */
  update(now: number, view: Rect): void {
    if (now - this.lastCull < CULL_EVERY_MS) return;
    this.lastCull = now;
    for (const s of this.animated) {
      const on = inView({ x: s.x, y: s.y }, view, CULL_MARGIN);
      if (on !== s.active) s.setActive(on).setVisible(on);
    }
  }

  /** How many animated sprites are currently running (diagnostics). */
  get activeAnimated(): number {
    return this.animated.filter((s) => s.active).length;
  }
}
