import * as Phaser from "phaser";
import { idleFrame, walkAnimKey, type Direction } from "../data/artManifest.ts";
import type { EnemyLook } from "../data/bestiary.ts";
import { ENEMY_BODY } from "../data/hitboxes.ts";
import { Depth, TILE } from "../game/config.ts";
import {
  initialAttackCycle,
  radialDirections,
  rangedSteer,
  spreadDirections,
  stepAttack,
  type AttackCycleState,
} from "../logic/ai.ts";
import type { Rect } from "../logic/collision.ts";
import { bossAttackFor, type EnemyAttack, type EnemyStats } from "../logic/enemyStats.ts";
import { applyDamage, createHealth, healthFraction, isDead, type DamageResult, type HealthState } from "../logic/health.ts";
import { facingFromVector } from "../logic/facing.ts";
import { directionTo, type Vec2 } from "../logic/vector.ts";
import { artMode, playFx, sheetKey } from "../rendering/Art.ts";
import { LightTex } from "../rendering/LightTextures.ts";
import { ENEMY_TEXTURE } from "../rendering/PlaceholderArt.ts";

/** What an enemy needs from the room each frame. */
export interface EnemyContext {
  readonly now: number;
  readonly player: Vec2;
  hasLineOfSight(from: Vec2, to: Vec2): boolean;
  /** `muzzle`: distance from the centre where the bullet appears (swept, so walls still block it). */
  fire(origin: Vec2, dir: Vec2, attack: EnemyAttack, muzzle: number): void;
  /**
   * Next step toward the player along the flow field (null: none known).
   * `big`: the body is about a tile wide, so prefer routes with clearance.
   */
  flowDir(from: Vec2, big: boolean): Vec2 | null;
  /** Enemies only attack when near the screen, never from somewhere unseen. */
  onScreen(at: Vec2): boolean;
}

/** Hitbox sizes live in data/hitboxes.ts so art changes can never alter them. */
const BODY_SIZE = ENEMY_BODY;

/**
 * Data-driven enemy: chasers and tanks walk at the player for contact damage,
 * ranged enemies keep their distance and fire telegraphed shots, and the boss
 * chases while firing radial bursts. Elites are the same with scaled stats.
 */
export class Enemy {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly telegraph: Phaser.GameObjects.Graphics;
  private healthState: HealthState;
  private attackCycle: AttackCycleState | null;
  private lockedAim: Vec2 = { x: 1, y: 0 };
  private readonly strafeSign: 1 | -1;
  private readonly barWidth: number;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly shadowOffsetY: number;
  /** Sprite-art mode: directional walk animations (boss: floating idle loop). */
  private readonly animated: boolean;
  private facing: Direction = "down";
  /** Bosses and mini-bosses: float on an idle loop, enrage, never pushed. */
  private readonly isBoss: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    group: Phaser.Physics.Arcade.Group,
    x: number,
    y: number,
    readonly stats: EnemyStats,
    /** Room simulation time at spawn (pause-safe; not Phaser's wall-clock `time.now`). */
    now: number,
    /** The level's art for this kind (sheet, and the idle loop for bosses). */
    private readonly look: EnemyLook,
  ) {
    this.healthState = createHealth(stats.maxHealth);
    this.animated = artMode(scene) === "ninja";
    this.isBoss = stats.kind === "boss" || stats.kind === "miniboss";
    this.sprite = scene.physics.add.sprite(x, y, this.textureFor(stats.kind), this.animated && !this.isBoss ? idleFrame("down") : undefined);
    this.sprite.setDepth(Depth.actors);
    if (this.animated && this.isBoss && look.idleAnim) this.sprite.play(look.idleAnim);
    group.add(this.sprite);
    // Body slightly smaller than the art; it scales with the sprite (elites).
    const size = BODY_SIZE[stats.kind];
    const offset = (this.sprite.width - size) / 2;
    if (stats.kind === "chaser") this.body.setCircle(size / 2, offset, offset);
    else this.body.setSize(size, size);
    // Tanks and the boss shrug off being shoved by other enemies.
    if (stats.kind === "tank" || this.isBoss) this.body.pushable = false;

    // Cached blob shadow sized to the body (32px-wide texture).
    const shadowW = size * stats.scale * 1.3;
    this.shadowOffsetY = (size * stats.scale) / 2 + 1;
    this.shadow = scene.add
      .image(x, y + this.shadowOffsetY, LightTex.shadow)
      .setDepth(Depth.shadows)
      .setScale(shadowW / 32, shadowW / 32);

    this.barWidth = stats.elite ? 22 : 16;
    this.bar = scene.add.graphics().setDepth(Depth.effects);
    this.telegraph = scene.add.graphics().setDepth(Depth.effects);
    this.strafeSign = Math.random() < 0.5 ? 1 : -1;
    this.attackCycle = stats.attack ? initialAttackCycle(now, 600 + Math.random() * 900) : null;
    this.drawBar();
    this.positionBar();

    this.sprite.setScale(0.2 * stats.scale);
    scene.tweens.add({ targets: this.sprite, scale: stats.scale, duration: 180, ease: "Back.Out" });
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  get alive(): boolean {
    return !isDead(this.healthState);
  }

  get health(): HealthState {
    return this.healthState;
  }

  get position(): Vec2 {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  /** Projectile hit box in world pixels (the physics body bounds). */
  get hitRect(): Rect {
    const b = this.body;
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  }

  update(ctx: EnemyContext): void {
    if (!this.alive) return;
    this.move(ctx);
    this.attack(ctx);
    this.positionBar();
    this.shadow.setPosition(this.sprite.x, this.sprite.y + this.shadowOffsetY);
  }

  takeHit(amount: number, now: number): DamageResult {
    const result = applyDamage(this.healthState, amount, now);
    if (!result.applied) return result;
    this.healthState = result.state;
    this.drawBar();
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (this.sprite.active && this.alive) this.sprite.clearTint();
    });
    if (result.died) this.die();
    return result;
  }

  stop(): void {
    if (this.sprite.body) this.body.setVelocity(0, 0);
    this.telegraph.clear();
  }

  private move(ctx: EnemyContext): void {
    const s = this.stats;
    // With a clear line to the player, steer directly; otherwise follow the
    // flow field around walls and water (falls back to straight-line).
    const big = BODY_SIZE[s.kind] * s.scale > TILE - 4;
    const path = ctx.hasLineOfSight(this.position, ctx.player) ? null : ctx.flowDir(this.position, big);
    const dir =
      path ??
      (s.preferredRange
        ? rangedSteer(this.position, ctx.player, s.preferredRange, this.strafeSign)
        : directionTo(this.position, ctx.player));
    // Ranged enemies stand still while telegraphing so the shot is readable.
    const winding = this.attackCycle?.phase === "windup" && s.kind === "ranged";
    const speed = winding ? 0 : s.speed;
    this.body.setVelocity(dir.x * speed, dir.y * speed);
    if (this.animated) this.animate(dir, speed > 0);
    else if (dir.x !== 0) this.sprite.setFlipX(dir.x < 0);
  }

  private attack(ctx: EnemyContext): void {
    const base = this.stats.attack;
    if (!base || !this.attackCycle) return;
    const attack = this.isBoss ? bossAttackFor(base, healthFraction(this.healthState)) : base;
    const canSee = ctx.onScreen(this.position) && ctx.hasLineOfSight(this.position, ctx.player);
    const step = stepAttack(this.attackCycle, ctx.now, attack, canSee);
    this.attackCycle = step.state;

    if (step.startedWindup) {
      // Aim is locked when the telegraph starts, so the player can dodge it.
      this.lockedAim = directionTo(this.position, ctx.player);
    }
    this.drawTelegraph(attack, ctx.now);

    if (step.fire) {
      const dirs =
        attack.pattern === "radial"
          ? radialDirections(attack.count, Math.random() * Math.PI)
          : spreadDirections(this.lockedAim, attack.count, (attack.spreadDeg * Math.PI) / 180);
      const muzzle = (BODY_SIZE[this.stats.kind] * this.stats.scale) / 2 + 3;
      for (const d of dirs) ctx.fire(this.position, d, attack, muzzle);
    }
  }

  private drawTelegraph(attack: EnemyAttack, now: number): void {
    this.telegraph.clear();
    if (this.attackCycle?.phase !== "windup") {
      if (this.alive) this.sprite.setAlpha(1);
      return;
    }
    const remaining = Math.max(0, this.attackCycle.until - now);
    const progress = 1 - remaining / attack.windupMs;
    const { x, y } = this.position;
    this.sprite.setAlpha(Math.floor(now / 60) % 2 === 0 ? 0.6 : 1);
    if (attack.pattern === "radial") {
      this.telegraph.lineStyle(2, 0xff4fd8, 0.3 + progress * 0.6).strokeCircle(x, y, 40 - progress * 18);
    } else {
      const len = 70 + progress * 60;
      this.telegraph
        .lineStyle(1, 0xff4fd8, 0.25 + progress * 0.6)
        .lineBetween(x, y, x + this.lockedAim.x * len, y + this.lockedAim.y * len);
    }
  }

  private textureFor(kind: EnemyStats["kind"]): string {
    if (!this.animated) return ENEMY_TEXTURE[kind];
    return sheetKey(this.look.sheet);
  }

  /** Walks facing its movement direction; holds the facing frame when standing still. */
  private animate(dir: Vec2, moving: boolean): void {
    if (this.isBoss) return; // bosses float on their idle loop
    this.facing = facingFromVector(dir, this.facing);
    const sheet = this.look.sheet;
    if (moving) this.sprite.play(walkAnimKey(sheet, this.facing), true);
    else {
      this.sprite.anims.stop();
      this.sprite.setFrame(idleFrame(this.facing));
    }
  }

  private die(): void {
    // Smoke puff for regular enemies, an explosion for elites and the boss.
    const big = this.stats.elite || this.isBoss;
    playFx(this.scene, big ? "na-explosion" : "na-smoke", big ? "explosion" : "smoke", this.sprite.x, this.sprite.y, Depth.effects, {
      scale: this.isBoss ? 1.6 : big ? 1.1 : 0.75,
    });
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.bar.destroy();
    this.telegraph.destroy();
    this.shadow.destroy();
    this.scene.tweens.add({
      targets: this.sprite,
      scale: this.stats.scale * 1.8,
      alpha: 0,
      duration: this.isBoss ? 600 : 220,
      onComplete: () => this.sprite.destroy(),
    });
  }

  private positionBar(): void {
    const top = (BODY_SIZE[this.stats.kind] * this.stats.scale) / 2 + 6;
    this.bar.setPosition(this.sprite.x - this.barWidth / 2, this.sprite.y - top);
  }

  private drawBar(): void {
    // Bosses use the large HUD bar instead.
    if (this.isBoss) return;
    const w = this.barWidth;
    this.bar.clear();
    this.bar.fillStyle(this.stats.elite ? 0xffd166 : 0x0a0d16).fillRect(0, 0, w, 3);
    this.bar.fillStyle(0x0a0d16).fillRect(1, 1, w - 2, 1);
    this.bar.fillStyle(0xff5d73).fillRect(1, 1, Math.round((w - 2) * healthFraction(this.healthState)), 1);
  }
}
