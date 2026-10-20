import * as Phaser from "phaser";
import { TEST_ARENA } from "../data/arenas.ts";
import { Chaser } from "../entities/Chaser.ts";
import { Player } from "../entities/Player.ts";
import { parseLayout, type ParsedLayout } from "../logic/layout.ts";
import { FireCooldown } from "../logic/weapon.ts";
import { bakeTileLayer, ensurePlaceholderTextures } from "../rendering/PlaceholderArt.ts";
import { ProjectileSystem } from "../systems/ProjectileSystem.ts";
import { Hud } from "../ui/Hud.ts";
import { Depth, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, PALETTE, TILE, Tuning } from "./config.ts";

type Phase = "playing" | "gameOver";

interface MoveKeys {
  readonly up: Phaser.Input.Keyboard.Key;
  readonly down: Phaser.Input.Keyboard.Key;
  readonly left: Phaser.Input.Keyboard.Key;
  readonly right: Phaser.Input.Keyboard.Key;
}

/**
 * Milestone 1 combat arena.
 *
 * Restart safety: Phaser reuses this Scene instance on `scene.restart()`, so
 * all per-run state is (re)created in `init`/`create`, never in field
 * initialisers. Every listener is attached to scene-owned plugins (scene
 * input, keyboard, clock, tweens, physics world), which Phaser clears on
 * shutdown. Nothing is attached to `window`, `game.events` or `this.events`.
 */
export class GameScene extends Phaser.Scene {
  private layout!: ParsedLayout;
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private chaser: Chaser | null = null;
  private projectiles!: ProjectileSystem;
  private hud!: Hud;
  private gun!: FireCooldown;
  private keys!: MoveKeys;
  private phase: Phase = "playing";
  private respawnTimer: Phaser.Time.TimerEvent | null = null;
  private leaving = false;

  constructor() {
    super("game");
  }

  init(): void {
    this.chaser = null;
    this.phase = "playing";
    this.respawnTimer = null;
    this.leaving = false;
  }

  create(): void {
    ensurePlaceholderTextures(this);
    this.layout = parseLayout(TEST_ARENA, TILE);
    const worldW = this.layout.cols * TILE;
    const worldH = this.layout.rows * TILE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    bakeTileLayer(this, this.layout.wall, Depth.tiles);
    const walls = this.physics.add.staticGroup();
    for (const r of this.layout.wallRects) {
      walls.add(this.add.zone(r.x + r.width / 2, r.y + r.height / 2, r.width, r.height));
    }

    this.player = new Player(this, this.layout.playerSpawn.x, this.layout.playerSpawn.y);
    this.enemies = this.physics.add.group();
    this.projectiles = new ProjectileSystem(this, this.layout.wallRects);
    this.hud = new Hud(this);
    this.gun = new FireCooldown(Tuning.gun.intervalMs);

    this.physics.add.collider(this.player.sprite, walls);
    this.physics.add.collider(this.enemies, walls);
    this.physics.add.collider(this.player.sprite, this.enemies, () => this.onEnemyContact());

    const kb = this.input.keyboard;
    if (!kb) throw new Error("Keyboard input is unavailable");
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = { up: kb.addKey(K.W), down: kb.addKey(K.S), left: kb.addKey(K.A), right: kb.addKey(K.D) };

    this.spawnChaser();
    this.hud.update(this.player.health);
  }

  override update(_time: number, delta: number): void {
    if (this.phase !== "playing") return;
    const now = this.time.now;
    const dt = Math.min(delta, 50);

    // Convert the pointer to world space every frame: correct even when the
    // mouse is still but a (future) camera scrolls.
    const pointer = this.input.activePointer;
    const aim = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.player.update(
      { up: this.keys.up.isDown, down: this.keys.down.isDown, left: this.keys.left.isDown, right: this.keys.right.isDown },
      aim,
      now,
    );

    if (pointer.leftButtonDown() && this.gun.tryFire(now)) {
      this.projectiles.fire(this.player.position, this.player.aim, 9);
    }

    const chaser = this.chaser;
    chaser?.update(this.player.position);
    const targets = chaser?.alive ? [chaser.hitRect] : [];
    this.projectiles.update(dt, targets, () => {
      if (chaser) this.onChaserShot(chaser, now);
    });

    this.hud.update(this.player.health);
  }

  private spawnChaser(): void {
    this.respawnTimer = null;
    if (this.phase !== "playing") return;
    // Spawn at the enemy spawn point farthest from the player.
    const p = this.player.position;
    const spawns = [...this.layout.enemySpawns].sort(
      (a, b) => Math.hypot(b.x - p.x, b.y - p.y) - Math.hypot(a.x - p.x, a.y - p.y),
    );
    const at = spawns[0];
    if (!at) return;
    this.chaser = new Chaser(this, this.enemies, at.x, at.y);
  }

  private onChaserShot(chaser: Chaser, now: number): void {
    const result = chaser.takeHit(Tuning.gun.damage, now);
    if (result.died) {
      this.chaser = null;
      this.respawnTimer = this.time.delayedCall(Tuning.chaser.respawnMs, () => this.spawnChaser());
    }
  }

  private onEnemyContact(): void {
    const chaser = this.chaser;
    if (this.phase !== "playing" || !chaser?.alive) return;
    const result = this.player.takeHit(Tuning.chaser.contactDamage, chaser.position, this.time.now);
    this.hud.update(this.player.health);
    if (result.died) this.gameOver();
  }

  private gameOver(): void {
    this.phase = "gameOver";
    this.player.die();
    this.chaser?.stop();
    this.projectiles.clear();
    this.respawnTimer?.remove();
    this.respawnTimer = null;
    this.physics.pause();
    this.showGameOverUi();
  }

  private showGameOverUi(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const ui = [
      this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05070d, 0.72).setOrigin(0),
      this.add.rectangle(cx, cy, 300, 110, 0x111626).setStrokeStyle(2, 0xff5d73),
      this.add
        .text(cx, cy - 26, "GAME OVER", { fontFamily: FONT_FAMILY, fontSize: "28px", color: PALETTE.danger, fontStyle: "bold" })
        .setOrigin(0.5),
      this.add
        .text(cx, cy + 8, "The dungeon claims another.", { fontFamily: FONT_FAMILY, fontSize: "11px", color: PALETTE.textDim })
        .setOrigin(0.5),
      this.add
        .text(cx, cy + 32, "[R] / Click  Restart     [M]  Menu", { fontFamily: FONT_FAMILY, fontSize: "11px", color: PALETTE.accent })
        .setOrigin(0.5),
    ];
    for (const o of ui) o.setScrollFactor(0).setDepth(Depth.overlay);

    // Short delay so a held fire button or key does not skip the screen.
    this.time.delayedCall(600, () => {
      const kb = this.input.keyboard;
      kb?.once("keydown-R", () => this.leave("game"));
      kb?.once("keydown-ENTER", () => this.leave("game"));
      kb?.once("keydown-M", () => this.leave("menu"));
      this.input.once("pointerdown", () => this.leave("game"));
    });
  }

  private leave(target: "game" | "menu"): void {
    if (this.leaving) return;
    this.leaving = true;
    if (target === "game") this.scene.restart();
    else this.scene.start("menu");
  }

  /** Dev-only diagnostics used to verify that restarts leave nothing behind. */
  debugSnapshot(): Record<string, number | string> {
    const world = this.physics.world;
    return {
      phase: this.phase,
      playerHp: this.player.health.current,
      enemiesActive: this.enemies.countActive(true),
      bullets: this.projectiles.count,
      colliders: world.colliders.length,
      dynamicBodies: world.bodies.size,
      staticBodies: world.staticBodies.size,
      displayObjects: this.children.length,
      tweens: this.tweens.getTweens().length,
      inputListeners: this.input.eventNames().reduce((n, e) => n + this.input.listenerCount(e), 0),
      keyboardListeners: this.input.keyboard
        ? this.input.keyboard.eventNames().reduce((n, e) => n + (this.input.keyboard?.listenerCount(e) ?? 0), 0)
        : 0,
      sceneEventListeners: this.events.eventNames().reduce((n, e) => n + this.events.listenerCount(e), 0),
      gameEventListeners: this.game.events.eventNames().reduce((n, e) => n + this.game.events.listenerCount(e), 0),
    };
  }
}
