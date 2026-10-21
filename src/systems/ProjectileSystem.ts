import * as Phaser from "phaser";
import { Depth } from "../game/config.ts";
import type { Rect } from "../logic/collision.ts";
import { steerToward, stepProjectile, type ProjectileState } from "../logic/projectile.ts";
import type { Vec2 } from "../logic/vector.ts";
import { artMode, playFx } from "../rendering/Art.ts";
import { Tex } from "../rendering/PlaceholderArt.ts";

export interface BulletSpec {
  readonly speed: number;
  readonly lifeMs: number;
  readonly radius: number;
  readonly damage: number;
  readonly texture: string;
  readonly trailColor: number;
  readonly impactColor: number;
  /** Sprite-art mode: looping animation to play on the bullet sprite. */
  readonly anim?: string;
  /** Rotate the sprite to its flight direction, plus this offset (radians). */
  readonly faceDirection?: { readonly offset: number };
  /** Extra targets the bullet passes through (needs target ids in update). */
  readonly pierce?: number;
  /** Turn rate toward the nearest homing target, radians per second. */
  readonly homing?: number;
  /** Sprite scale (default 1). */
  readonly scale?: number;
}

/** Optional per-step extras: stable target ids (for piercing) and homing targets. */
export interface UpdateOptions {
  /** One id per target, stable across frames, so a piercing bullet never hits the same target twice. */
  readonly ids?: readonly unknown[];
  /** Points homing bullets steer toward (the nearest within range). */
  readonly homing?: readonly Vec2[];
}

/** Homing bullets only notice targets this close. */
const HOMING_RANGE = 170;

interface LiveBullet {
  state: ProjectileState;
  prev: Vec2;
  readonly spec: BulletSpec;
  readonly sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  pierceLeft: number;
  readonly hits: Set<unknown>;
  /**
   * Until its first update: the shooter's centre and the muzzle travel time.
   * The first step sweeps from there, so a target pressed against the
   * shooter (closer than the muzzle) is still hit point-blank.
   */
  fromOrigin: { readonly at: Vec2; readonly ms: number } | null;
}

/**
 * A set of bullets owned by one side (player or enemies). Movement and
 * collision use the pure swept `stepProjectile` (no Arcade bodies), so fast
 * bullets cannot tunnel through thin walls at any frame rate. Phaser objects
 * here are only the visual representation.
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
  fire(origin: Vec2, dir: Vec2, muzzleDistance: number, spec: BulletSpec): void {
    const initial: ProjectileState = {
      x: origin.x,
      y: origin.y,
      vx: dir.x * spec.speed,
      vy: dir.y * spec.speed,
      radius: spec.radius,
      lifeMs: spec.lifeMs,
    };
    const toMuzzle = stepProjectile(initial, (muzzleDistance / spec.speed) * 1000, this.solids(), []);
    if (toMuzzle.kind !== "flying") {
      this.impact(toMuzzle, spec.impactColor);
      return;
    }
    const state = { ...toMuzzle.state, lifeMs: spec.lifeMs };
    const sprite = spec.anim
      ? this.scene.add.sprite(state.x, state.y, spec.texture).play(spec.anim)
      : this.scene.add.image(state.x, state.y, spec.texture);
    sprite.setDepth(Depth.projectiles).setScale(spec.scale ?? 1);
    if (spec.faceDirection) sprite.setRotation(Math.atan2(dir.y, dir.x) + spec.faceDirection.offset);
    this.bullets.push({
      state,
      prev: { x: state.x, y: state.y },
      spec,
      sprite,
      pierceLeft: spec.pierce ?? 0,
      hits: new Set(),
      fromOrigin: { at: origin, ms: (muzzleDistance / spec.speed) * 1000 },
    });
  }

  /**
   * Advances all bullets. `onHit` is called with the index into `targets` and
   * the bullet's damage for each bullet that strikes one; that bullet is
   * removed unless it still has pierce left (then it flies on, ignoring that
   * target from now on).
   */
  update(
    dtMs: number,
    targets: readonly Rect[],
    onHit: (index: number, damage: number, at: Vec2) => void,
    opts: UpdateOptions = {},
  ): void {
    this.trails.clear();
    const solids = this.solids();
    const survivors: LiveBullet[] = [];
    for (const b of this.bullets) {
      if (b.spec.homing && opts.homing && opts.homing.length > 0) this.steer(b, opts.homing, dtMs);
      // A piercing bullet skips the targets it has already hit.
      let live = targets;
      let indexMap: number[] | null = null;
      if (b.hits.size > 0 && opts.ids) {
        indexMap = [];
        const ids = opts.ids;
        live = targets.filter((_, i) => {
          const keep = !b.hits.has(ids[i]);
          if (keep) indexMap?.push(i);
          return keep;
        });
      }
      // First step: from the shooter's centre (walls along origin→muzzle were checked in fire()).
      const first = b.fromOrigin;
      b.fromOrigin = null;
      const step = first
        ? stepProjectile({ ...b.state, x: first.at.x, y: first.at.y, lifeMs: b.state.lifeMs + first.ms }, dtMs + first.ms, solids, live)
        : stepProjectile(b.state, dtMs, solids, live);
      switch (step.kind) {
        case "flying":
          b.prev = { x: b.state.x, y: b.state.y };
          b.state = step.state;
          b.sprite.setPosition(step.state.x, step.state.y);
          this.trails.lineStyle(2, b.spec.trailColor, 0.35).lineBetween(b.prev.x, b.prev.y, step.state.x, step.state.y);
          survivors.push(b);
          break;
        case "wall":
          this.impact(step, b.spec.impactColor);
          b.sprite.destroy();
          break;
        case "target": {
          const index = indexMap ? (indexMap[step.index] ?? -1) : step.index;
          this.impact(step, 0xffffff);
          onHit(index, b.spec.damage, step);
          if (b.pierceLeft > 0 && opts.ids) {
            b.pierceLeft--;
            b.hits.add(opts.ids[index]);
            b.prev = { x: b.state.x, y: b.state.y };
            b.state = { ...b.state, x: step.x, y: step.y, lifeMs: b.state.lifeMs - dtMs };
            b.sprite.setPosition(step.x, step.y);
            if (b.state.lifeMs > 0) {
              survivors.push(b);
              break;
            }
          }
          b.sprite.destroy();
          break;
        }
        case "expired":
          b.sprite.destroy();
          break;
      }
    }
    this.bullets = survivors;
  }

  /** Curves a homing bullet toward the nearest target in range. */
  private steer(b: LiveBullet, points: readonly Vec2[], dtMs: number): void {
    let best: Vec2 | null = null;
    let bestD = HOMING_RANGE;
    for (const p of points) {
      const d = Math.hypot(p.x - b.state.x, p.y - b.state.y);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (!best) return;
    const v = steerToward(b.state.vx, b.state.vy, b.state, best, ((b.spec.homing ?? 0) * dtMs) / 1000);
    b.state = { ...b.state, vx: v.vx, vy: v.vy };
    if (b.spec.faceDirection) b.sprite.setRotation(Math.atan2(v.vy, v.vx) + b.spec.faceDirection.offset);
  }

  clear(): void {
    for (const b of this.bullets) b.sprite.destroy();
    this.bullets = [];
    this.trails.clear();
  }

  private impact(at: Vec2, tint: number): void {
    if (artMode(this.scene) === "ninja") {
      playFx(this.scene, "na-hit-spark", "hitSpark", at.x, at.y, Depth.effects, { tint });
      return;
    }
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
