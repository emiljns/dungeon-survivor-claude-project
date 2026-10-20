import * as Phaser from "phaser";
import { Depth, Tuning } from "../game/config.ts";
import type { Rect } from "../logic/collision.ts";
import { applyDamage, createHealth, healthFraction, isDead, type DamageResult, type HealthState } from "../logic/health.ts";
import { directionTo, type Vec2 } from "../logic/vector.ts";
import { Tex } from "../rendering/PlaceholderArt.ts";

/** Basic melee enemy: walks straight at the player and deals contact damage. */
export class Chaser {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly bar: Phaser.GameObjects.Graphics;
  private healthState: HealthState = createHealth(Tuning.chaser.maxHealth);

  constructor(private readonly scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, Tex.chaser).setDepth(Depth.actors);
    group.add(this.sprite);
    this.body.setCircle(6, 1, 1);
    this.bar = scene.add.graphics().setDepth(Depth.effects);
    this.drawBar();
    this.sprite.setScale(0.2);
    scene.tweens.add({ targets: this.sprite, scale: 1, duration: 180, ease: "Back.Out" });
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  get alive(): boolean {
    return !isDead(this.healthState);
  }

  get position(): Vec2 {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  /** Projectile hit box in world pixels (the physics body bounds). */
  get hitRect(): Rect {
    const b = this.body;
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  }

  update(target: Vec2 | null): void {
    if (!this.alive) return;
    const dir = target ? directionTo(this.position, target) : { x: 0, y: 0 };
    this.body.setVelocity(dir.x * Tuning.chaser.speed, dir.y * Tuning.chaser.speed);
    this.sprite.setFlipX(dir.x < 0);
    this.bar.setPosition(this.sprite.x - 8, this.sprite.y - 12);
  }

  takeHit(amount: number, now: number): DamageResult {
    const result = applyDamage(this.healthState, amount, now);
    if (!result.applied) return result;
    this.healthState = result.state;
    this.drawBar();
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });
    if (result.died) this.die();
    return result;
  }

  stop(): void {
    if (this.sprite.body) this.body.setVelocity(0, 0);
  }

  private die(): void {
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.bar.destroy();
    this.scene.tweens.add({
      targets: this.sprite,
      scale: 1.8,
      alpha: 0,
      duration: 220,
      onComplete: () => this.sprite.destroy(),
    });
  }

  private drawBar(): void {
    this.bar.clear();
    this.bar.fillStyle(0x0a0d16).fillRect(0, 0, 16, 3);
    this.bar.fillStyle(0xff5d73).fillRect(1, 1, Math.round(14 * healthFraction(this.healthState)), 1);
    this.bar.setPosition(this.sprite.x - 8, this.sprite.y - 12);
  }
}
