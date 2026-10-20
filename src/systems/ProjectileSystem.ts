import * as Phaser from "phaser";
import { Depth, Tuning } from "../game/config.ts";
import type { Rect } from "../logic/collision.ts";
import { stepProjectile, type ProjectileState } from "../logic/projectile.ts";
import type { Vec2 } from "../logic/vector.ts";
import { Tex } from "../rendering/PlaceholderArt.ts";

interface LiveBullet {
  state: ProjectileState;
  prev: Vec2;
  readonly sprite: Phaser.GameObjects.Image;
}

/**
 * Player bullets. Movement and collision use the pure swept `stepProjectile`
 * (no Arcade bodies), so fast bullets cannot tunnel through thin walls at any
 * frame rate. Phaser objects here are only the visual representation.
 */
export class ProjectileSystem {
  private bullets: LiveBullet[] = [];
  private readonly trails: Phaser.GameObjects.Graphics;

  /** `solids` is read every step, so walls/props/doors can change (e.g. a door opening). */
  constructor(private readonly scene: Phaser.Scene, private readonly solids: () => readonly Rect[]) {
    this.trails = scene.add.graphics().setDepth(Depth.projectiles - 1);
  }

  get count(): number {
    return this.bullets.length;
  }

  /**
   * Spawns a bullet at `origin` (the shooter's centre) and moves it out to the
   * muzzle with a swept step, so a shooter pressed against a wall cannot spawn
   * a bullet on the far side of it.
   */
  fire(origin: Vec2, dir: Vec2, muzzleDistance: number): void {
    const { bulletSpeed, bulletLifeMs, bulletRadius } = Tuning.gun;
    const initial: ProjectileState = {
      x: origin.x,
      y: origin.y,
      vx: dir.x * bulletSpeed,
      vy: dir.y * bulletSpeed,
      radius: bulletRadius,
      lifeMs: bulletLifeMs,
    };
    const toMuzzle = stepProjectile(initial, (muzzleDistance / bulletSpeed) * 1000, this.solids(), []);
    if (toMuzzle.kind !== "flying") {
      this.impact(toMuzzle, 0xc9d4ff);
      return;
    }
    const state = { ...toMuzzle.state, lifeMs: bulletLifeMs };
    const sprite = this.scene.add.image(state.x, state.y, Tex.bullet).setDepth(Depth.projectiles);
    this.bullets.push({ state, prev: { x: state.x, y: state.y }, sprite });
  }

  /**
   * Advances all bullets. `onHit` is called with the index into `targets` for
   * each bullet that strikes one; that bullet is then removed.
   */
  update(dtMs: number, targets: readonly Rect[], onHit: (index: number, at: Vec2) => void): void {
    this.trails.clear();
    const solids = this.solids();
    const survivors: LiveBullet[] = [];
    for (const b of this.bullets) {
      const step = stepProjectile(b.state, dtMs, solids, targets);
      switch (step.kind) {
        case "flying":
          b.prev = { x: b.state.x, y: b.state.y };
          b.state = step.state;
          b.sprite.setPosition(step.state.x, step.state.y);
          this.trails.lineStyle(2, 0xffd166, 0.35).lineBetween(b.prev.x, b.prev.y, step.state.x, step.state.y);
          survivors.push(b);
          break;
        case "wall":
          this.impact(step, 0xc9d4ff);
          b.sprite.destroy();
          break;
        case "target":
          this.impact(step, 0xffffff);
          b.sprite.destroy();
          onHit(step.index, step);
          break;
        case "expired":
          b.sprite.destroy();
          break;
      }
    }
    this.bullets = survivors;
  }

  clear(): void {
    for (const b of this.bullets) b.sprite.destroy();
    this.bullets = [];
    this.trails.clear();
  }

  private impact(at: Vec2, tint: number): void {
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const spark = this.scene.add.image(at.x, at.y, Tex.spark).setTint(tint).setDepth(Depth.effects);
      this.scene.tweens.add({
        targets: spark,
        x: at.x + Math.cos(a) * 7,
        y: at.y + Math.sin(a) * 7,
        alpha: 0,
        duration: 140,
        onComplete: () => spark.destroy(),
      });
    }
  }
}
