import * as Phaser from "phaser";
import { Depth, Tuning } from "../game/config.ts";
import type { Rect } from "../logic/collision.ts";
import { dashReadiness, dashVelocity, IDLE_DASH, isDashing, tryStartDash, type DashState } from "../logic/dash.ts";
import { applyDamage, createHealth, isDead, type DamageResult, type HealthState } from "../logic/health.ts";
import type { PlayerStats } from "../logic/upgrades.ts";
import { directionTo, movementVelocity, type DirectionalInput, type Vec2 } from "../logic/vector.ts";
import { LightTex } from "../rendering/LightTextures.ts";
import { Tex } from "../rendering/PlaceholderArt.ts";

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly gun: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private healthState: HealthState;
  private dash: DashState = IDLE_DASH;
  private knockbackUntil = 0;
  private nextGhostAt = 0;
  private aimDir: Vec2 = { x: 1, y: 0 };
  private moveSpeed: number;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number, startHealth: number, stats: PlayerStats) {
    const full = createHealth(stats.maxHealth);
    this.healthState = { ...full, current: Math.min(full.max, Math.max(1, startHealth)) };
    this.moveSpeed = stats.moveSpeed;
    this.sprite = scene.physics.add.sprite(x, y, Tex.player).setDepth(Depth.actors);
    // Slightly smaller than the art so the player does not snag on corners.
    this.body.setSize(10, 10);
    this.body.pushable = false;
    // An open door is a gap in the outer wall; never let the player leave the room.
    this.sprite.setCollideWorldBounds(true);
    this.gun = scene.add.image(x, y, Tex.gun).setOrigin(0.1, 0.5).setDepth(Depth.actors + 1);
    this.shadow = scene.add.image(x, y + 7, LightTex.shadow).setDepth(Depth.shadows).setScale(0.6);
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

  /** Hit box for enemy bullets (the physics body bounds). */
  get hitRect(): Rect {
    const b = this.body;
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  }

  /**
   * Applies new upgrade stats mid-run. A higher max health also heals by the
   * amount gained (the Iron Heart upgrade: "+1 max HP and heal 1").
   */
  applyStats(stats: PlayerStats): void {
    this.moveSpeed = stats.moveSpeed;
    const gained = Math.max(0, stats.maxHealth - this.healthState.max);
    this.healthState = {
      ...this.healthState,
      max: stats.maxHealth,
      current: Math.min(stats.maxHealth, this.healthState.current + gained),
    };
  }

  dashReadiness(now: number): number {
    return dashReadiness(this.dash, now, Tuning.dash);
  }

  isDashing(now: number): boolean {
    return isDashing(this.dash, now);
  }

  update(input: DirectionalInput, aimWorld: Vec2, now: number, dashPressed: boolean): void {
    const dir = directionTo(this.position, aimWorld);
    if (dir.x !== 0 || dir.y !== 0) this.aimDir = dir;

    const move = movementVelocity(input, this.moveSpeed);
    if (dashPressed) {
      const started = tryStartDash(this.dash, now, move, this.aimDir, Tuning.dash);
      if (started) {
        this.dash = started;
        this.knockbackUntil = 0; // a dash cancels knockback
      }
    }

    if (isDashing(this.dash, now)) {
      const v = dashVelocity(this.dash, Tuning.dash);
      this.body.setVelocity(v.x, v.y);
      if (now >= this.nextGhostAt) {
        this.nextGhostAt = now + 30;
        this.spawnGhost();
      }
    } else if (now >= this.knockbackUntil) {
      this.body.setVelocity(move.x, move.y);
    }

    this.shadow.setPosition(this.sprite.x, this.sprite.y + 7);
    const angle = Math.atan2(this.aimDir.y, this.aimDir.x);
    this.gun.setPosition(this.sprite.x, this.sprite.y + 1).setRotation(angle);
    this.gun.setFlipY(this.aimDir.x < 0);
    // Blink while invulnerable after a hit.
    const blinking = now < this.healthState.invulnerableUntil && Math.floor(now / 80) % 2 === 0;
    this.sprite.setAlpha(blinking ? 0.35 : 1);
  }

  /** Damage is ignored while dashing (dash i-frames) or during post-hit invulnerability. */
  takeHit(amount: number, from: Vec2, now: number): DamageResult {
    if (isDashing(this.dash, now)) return { state: this.healthState, applied: false, died: false };
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

  /** Stop moving (room transition). */
  halt(): void {
    this.body.setVelocity(0, 0);
    this.body.enable = false;
  }

  /** Freeze in place with a "downed" look. */
  die(): void {
    this.halt();
    this.sprite.setAlpha(1).setTint(0x555b6e).setAngle(90);
    this.gun.setVisible(false);
  }

  private spawnGhost(): void {
    const ghost = this.scene.add
      .image(this.sprite.x, this.sprite.y, Tex.player)
      .setDepth(Depth.actors - 1)
      .setTint(0x8fb8ff)
      .setAlpha(0.45);
    this.scene.tweens.add({ targets: ghost, alpha: 0, duration: 160, onComplete: () => ghost.destroy() });
  }
}
