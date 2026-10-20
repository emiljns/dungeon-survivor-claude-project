import * as Phaser from "phaser";
import { Depth, Tuning } from "../game/config.ts";
import { applyDamage, createHealth, isDead, type DamageResult, type HealthState } from "../logic/health.ts";
import { directionTo, movementVelocity, type DirectionalInput, type Vec2 } from "../logic/vector.ts";
import { Tex } from "../rendering/PlaceholderArt.ts";

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly gun: Phaser.GameObjects.Image;
  private healthState: HealthState = createHealth(Tuning.player.maxHealth);
  private knockbackUntil = 0;
  private aimDir: Vec2 = { x: 1, y: 0 };

  constructor(private readonly scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, Tex.player).setDepth(Depth.actors);
    // Slightly smaller than the art so the player does not snag on corners.
    this.body.setSize(10, 10);
    this.body.pushable = false;
    this.gun = scene.add.image(x, y, Tex.gun).setOrigin(0.1, 0.5).setDepth(Depth.actors + 1);
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  get health(): HealthState {
    return this.healthState;
  }

  get position(): Vec2 {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  get aim(): Vec2 {
    return this.aimDir;
  }

  update(input: DirectionalInput, aimWorld: Vec2, now: number): void {
    const dir = directionTo(this.position, aimWorld);
    if (dir.x !== 0 || dir.y !== 0) this.aimDir = dir;

    if (now >= this.knockbackUntil) {
      const v = movementVelocity(input, Tuning.player.speed);
      this.body.setVelocity(v.x, v.y);
    }

    const angle = Math.atan2(this.aimDir.y, this.aimDir.x);
    this.gun.setPosition(this.sprite.x, this.sprite.y + 1).setRotation(angle);
    this.gun.setFlipY(this.aimDir.x < 0);
    // Blink while invulnerable after a hit.
    const blinking = now < this.healthState.invulnerableUntil && Math.floor(now / 80) % 2 === 0;
    this.sprite.setAlpha(blinking ? 0.35 : 1);
  }

  takeHit(amount: number, from: Vec2, now: number): DamageResult {
    const result = applyDamage(this.healthState, amount, now, Tuning.player.invulnerableMs);
    if (!result.applied) return result;
    this.healthState = result.state;

    const away = directionTo(from, this.position);
    this.body.setVelocity(away.x * Tuning.player.knockback, away.y * Tuning.player.knockback);
    this.knockbackUntil = now + Tuning.player.knockbackMs;

    this.sprite.setTintFill(0xff4d5e);
    this.scene.time.delayedCall(90, () => {
      if (!this.dead) this.sprite.clearTint(); // keep the downed tint from die()
    });
    this.scene.cameras.main.shake(110, 0.006);
    return result;
  }

  get dead(): boolean {
    return isDead(this.healthState);
  }

  /** Freeze in place with a "downed" look. */
  die(): void {
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.sprite.setAlpha(1).setTint(0x555b6e).setAngle(90);
    this.gun.setVisible(false);
  }
}
