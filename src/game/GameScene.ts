import * as Phaser from "phaser";
import { BOSS_NAME, ENEMY_STATS } from "../data/enemies.ts";
import { LEVELS, ROOMS_PER_LEVEL, type LevelDefinition, type LevelRoom } from "../data/levels.ts";
import { Enemy, type EnemyContext } from "../entities/Enemy.ts";
import { Player } from "../entities/Player.ts";
import { hasLineOfSight } from "../logic/ai.ts";
import { expandRect, pointInRect, type Rect } from "../logic/collision.ts";
import { makeElite, scaleForDifficulty, type EnemyAttack } from "../logic/enemyStats.ts";
import { healthFraction } from "../logic/health.ts";
import { parseLayout, type ParsedLayout } from "../logic/layout.ts";
import {
  advanceRun,
  isFinalLevel,
  isFinalRoomOfLevel,
  newRun,
  sanitizeRunState,
  type RunState,
} from "../logic/progression.ts";
import { canExit, enemyDefeated, startRoom, type RoomState } from "../logic/room.ts";
import type { Vec2 } from "../logic/vector.ts";
import { FireCooldown } from "../logic/weapon.ts";
import { bakeTileLayer, ensurePlaceholderTextures, Tex } from "../rendering/PlaceholderArt.ts";
import { ProjectileSystem, type BulletSpec } from "../systems/ProjectileSystem.ts";
import { Hud } from "../ui/Hud.ts";
import { Depth, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, PALETTE, TILE, Tuning } from "./config.ts";

type Phase = "playing" | "exiting" | "gameOver" | "victory";

interface Keys {
  readonly up: Phaser.Input.Keyboard.Key;
  readonly down: Phaser.Input.Keyboard.Key;
  readonly left: Phaser.Input.Keyboard.Key;
  readonly right: Phaser.Input.Keyboard.Key;
  readonly dash: Phaser.Input.Keyboard.Key;
  readonly interact: Phaser.Input.Keyboard.Key;
}

const PLAYER_BULLET: BulletSpec = {
  speed: Tuning.gun.bulletSpeed,
  lifeMs: Tuning.gun.bulletLifeMs,
  radius: Tuning.gun.bulletRadius,
  damage: Tuning.gun.damage,
  texture: Tex.bullet,
  trailColor: 0xffd166,
  impactColor: 0xc9d4ff,
};

const enemyBulletSpec = (attack: EnemyAttack): BulletSpec => ({
  speed: attack.bulletSpeed,
  lifeMs: 3500,
  radius: 3,
  damage: attack.damage,
  texture: Tex.enemyBullet,
  trailColor: 0xff4fd8,
  impactColor: 0xff9ae8,
});

/**
 * One room of the run. Every room transition and every restart is a
 * `scene.restart(runState)`, which rebuilds the physics world from scratch.
 *
 * Restart safety: Phaser reuses this Scene instance, so per-room state is
 * reset in `init`/`create`, never in field initialisers. All listeners are on
 * scene-owned plugins (input, keyboard, clock, tweens, physics world) that
 * Phaser clears on shutdown; nothing is attached to `window`, `game.events`
 * or `this.events`. Restarts always pass explicit data: Phaser keeps the
 * previous data when restarted without any.
 */
export class GameScene extends Phaser.Scene {
  private run!: RunState;
  private level!: LevelDefinition;
  private levelRoom!: LevelRoom;
  private room!: RoomState;
  private layout!: ParsedLayout;
  private player!: Player;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private doors!: Phaser.Physics.Arcade.StaticGroup;
  private doorGfx!: Phaser.GameObjects.Graphics;
  private doorPrompt!: Phaser.GameObjects.Text;
  private enemies: Enemy[] = [];
  private boss: Enemy | null = null;
  private solidRects: Rect[] = [];
  private playerShots!: ProjectileSystem;
  private enemyShots!: ProjectileSystem;
  private hud!: Hud;
  private gun!: FireCooldown;
  private keys!: Keys;
  private phase: Phase = "playing";
  private leaving = false;

  constructor() {
    super("game");
  }

  init(data: unknown): void {
    this.run = sanitizeRunState(data, ROOMS_PER_LEVEL, Tuning.player.maxHealth);
    this.enemies = [];
    this.boss = null;
    this.solidRects = [];
    this.phase = "playing";
    this.leaving = false;
  }

  create(): void {
    ensurePlaceholderTextures(this);
    const level = LEVELS[this.run.levelIndex];
    const levelRoom = level?.rooms[this.run.roomIndex];
    if (!level || !levelRoom) throw new Error(`No room at level ${this.run.levelIndex}, room ${this.run.roomIndex}`);
    this.level = level;
    this.levelRoom = levelRoom;
    this.layout = parseLayout(levelRoom.layout.rows, TILE);
    this.room = startRoom(levelRoom.enemies.length);

    const worldW = this.layout.cols * TILE;
    const worldH = this.layout.rows * TILE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH).setBackgroundColor(level.theme.background);

    bakeTileLayer(this, this.layout.wall, Depth.tiles, level.theme);

    // Walls and props never change during a room: one static group.
    const solids = this.physics.add.staticGroup();
    for (const r of this.layout.wallRects) solids.add(this.add.zone(r.x + r.width / 2, r.y + r.height / 2, r.width, r.height));
    for (const p of this.layout.props) {
      const tex = p.kind === "crate" ? Tex.crate : Tex.barrel;
      solids.add(this.add.image(p.rect.x + TILE / 2, p.rect.y + TILE / 2, tex).setDepth(Depth.props));
    }
    // Doors are separate so they can be removed when the room is cleared.
    this.doors = this.physics.add.staticGroup();
    for (const d of this.layout.doorRects) this.doors.add(this.add.zone(d.x + d.width / 2, d.y + d.height / 2, d.width, d.height));
    this.doorGfx = this.add.graphics().setDepth(Depth.props);
    this.doorPrompt = this.add
      .text(0, 0, "[E] EXIT", { fontFamily: FONT_FAMILY, fontSize: "10px", color: "#7dff9b", fontStyle: "bold" })
      .setOrigin(0.5)
      .setStroke("#05070d", 3)
      .setDepth(Depth.hud)
      .setVisible(false);

    this.player = new Player(this, this.layout.playerSpawn.x, this.layout.playerSpawn.y, this.run.playerHealth);
    this.enemyGroup = this.physics.add.group();
    this.playerShots = new ProjectileSystem(this, () => this.solidRects);
    this.enemyShots = new ProjectileSystem(this, () => this.solidRects);
    this.gun = new FireCooldown(Tuning.gun.intervalMs);

    this.physics.add.collider(this.player.sprite, solids);
    this.physics.add.collider(this.player.sprite, this.doors);
    this.physics.add.collider(this.enemyGroup, solids);
    this.physics.add.collider(this.enemyGroup, this.doors);
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);
    this.physics.add.collider(this.player.sprite, this.enemyGroup, (_p, e) => this.onEnemyContact(e));

    const kb = this.input.keyboard;
    if (!kb) throw new Error("Keyboard input is unavailable");
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: kb.addKey(K.W),
      down: kb.addKey(K.S),
      left: kb.addKey(K.A),
      right: kb.addKey(K.D),
      dash: kb.addKey(K.SPACE), // addKey captures Space, so the page never scrolls
      interact: kb.addKey(K.E),
    };

    const roomCount = level.rooms.length;
    const roomNumber = this.run.roomIndex + 1;
    this.hud = new Hud(this, `L${level.number} ${level.name.toUpperCase()}  ROOM ${roomNumber}/${roomCount}`);
    this.showEntryBanner();
    this.cameras.main.fadeIn(Tuning.room.transitionFadeMs, 5, 7, 13);

    this.refreshDoors();
    this.telegraphEnemySpawns();
    this.updateHud();
  }

  override update(_time: number, delta: number): void {
    if (this.phase !== "playing") return;
    const now = this.time.now;
    const dt = Math.min(delta, 50);

    // Convert the pointer to world space every frame: correct even when the
    // mouse is still but the camera scrolls.
    const pointer = this.input.activePointer;
    const aim = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const k = this.keys;
    this.player.update(
      { up: k.up.isDown, down: k.down.isDown, left: k.left.isDown, right: k.right.isDown },
      aim,
      now,
      Phaser.Input.Keyboard.JustDown(k.dash),
    );

    if (pointer.leftButtonDown() && this.gun.tryFire(now)) {
      this.playerShots.fire(this.player.position, this.player.aim, 9, PLAYER_BULLET);
    }

    const ctx: EnemyContext = {
      now,
      player: this.player.position,
      hasLineOfSight: (from, to) => hasLineOfSight(from, to, this.solidRects),
      fire: (origin, dir, attack, muzzle) => this.enemyShots.fire(origin, dir, muzzle, enemyBulletSpec(attack)),
    };
    for (const e of this.enemies) e.update(ctx);

    const targets = this.enemies.filter((e) => e.alive);
    this.playerShots.update(
      dt,
      targets.map((e) => e.hitRect),
      (index, damage) => {
        const hit = targets[index];
        if (hit) this.onEnemyShot(hit, damage, now);
      },
    );
    if (this.phase !== "playing") return;

    // Dashing makes the player untouchable: enemy bullets pass through.
    const playerTargets = this.player.isDashing(now) ? [] : [this.player.hitRect];
    this.enemyShots.update(dt, playerTargets, (_i, damage, at) => this.damagePlayer(damage, at));
    if (this.phase !== "playing") return;

    // Read every frame: JustDown's flag persists until read, so an E pressed
    // elsewhere must not trigger an exit later when reaching the door.
    const interactPressed = Phaser.Input.Keyboard.JustDown(k.interact);
    const door = this.nearbyOpenDoor();
    this.doorPrompt.setVisible(door !== null);
    if (door) {
      const c = { x: door.x + door.width / 2, y: door.y + door.height / 2 };
      this.doorPrompt.setPosition(
        Phaser.Math.Clamp(c.x, 30, this.layout.cols * TILE - 30),
        Phaser.Math.Clamp(c.y, 24, this.layout.rows * TILE - 24),
      );
      if (interactPressed) this.exitRoom();
    }

    this.updateHud();
  }

  private get isFinalRoom(): boolean {
    return isFinalRoomOfLevel(this.run, ROOMS_PER_LEVEL);
  }

  private showEntryBanner(): void {
    const level = this.level;
    if (this.run.roomIndex === 0) {
      this.hud.banner(`LEVEL ${level.number}`, level.name.toUpperCase(), level.theme.title, true);
    } else if (this.isFinalRoom) {
      const boss = this.levelRoom.enemies.some((e) => e.kind === "boss");
      this.hud.banner("FINAL ROOM", boss ? `Defeat ${BOSS_NAME.toLowerCase()}` : "Defeat the elite", level.theme.title);
    } else {
      this.hud.banner(`ROOM ${this.run.roomIndex + 1}`, this.levelRoom.layout.name);
    }
  }

  private updateHud(): void {
    this.hud.update({
      health: this.player.health,
      dashReadiness: this.player.dashReadiness(this.time.now),
      room: this.room,
      boss: this.boss ? healthFraction(this.boss.health) : null,
    });
  }

  /** Pulsing markers show where enemies will appear, then they spawn. */
  private telegraphEnemySpawns(): void {
    const spawns = this.layout.enemySpawns;
    const specs = this.levelRoom.enemies;
    if (specs.length === 0 || spawns.length === 0) return;
    // Enemy i spawns at point i (cycling), nudged sideways if a point is reused.
    const placements = specs.map((spec, i) => {
      const p = spawns[i % spawns.length] ?? this.layout.playerSpawn;
      const lap = Math.floor(i / spawns.length);
      return { spec, at: { x: p.x + lap * 18, y: p.y } };
    });
    const markers = placements.map(({ at }) => this.add.image(at.x, at.y, Tex.spawnMarker).setDepth(Depth.effects).setAlpha(0.2));
    this.tweens.add({ targets: markers, alpha: 1, duration: 220, yoyo: true, repeat: -1 });
    this.time.delayedCall(Tuning.room.enemySpawnDelayMs, () => {
      markers.forEach((m) => m.destroy());
      if (this.phase !== "playing") return;
      for (const { spec, at } of placements) {
        const scaled = scaleForDifficulty(ENEMY_STATS[spec.kind], this.level.difficulty);
        const enemy = new Enemy(this, this.enemyGroup, at.x, at.y, spec.elite ? makeElite(scaled) : scaled);
        this.enemies.push(enemy);
        if (spec.kind === "boss") {
          this.boss = enemy;
          this.hud.showBoss(BOSS_NAME);
          this.cameras.main.shake(250, 0.004);
        }
      }
    });
  }

  private onEnemyShot(enemy: Enemy, damage: number, now: number): void {
    const result = enemy.takeHit(damage, now);
    if (!result.died) return;
    this.enemies = this.enemies.filter((e) => e !== enemy);
    this.room = enemyDefeated(this.room);
    if (!canExit(this.room)) return;

    this.refreshDoors();
    if (this.isFinalRoom && isFinalLevel(this.run, ROOMS_PER_LEVEL)) {
      this.victory();
      return;
    }
    if (this.isFinalRoom) this.hud.banner("LEVEL CLEAR", "The way down is open", "#7dff9b", true);
    else this.hud.banner("ROOM CLEAR", "The door is open", "#7dff9b");
  }

  /** Locked doors block movement and bullets; cleared rooms remove them. */
  private refreshDoors(): void {
    const open = canExit(this.room);
    if (open) this.doors.clear(true, true);
    this.solidRects = [
      ...this.layout.wallRects,
      ...this.layout.props.map((p) => p.rect),
      ...(open ? [] : this.layout.doorRects),
    ];

    this.doorGfx.clear();
    for (const d of this.layout.doorRects) {
      if (open) {
        this.doorGfx.lineStyle(2, 0x7dff9b, 0.9).strokeRect(d.x + 1, d.y + 1, d.width - 2, d.height - 2);
      } else {
        this.doorGfx.fillStyle(0x3a1d26).fillRect(d.x, d.y, d.width, d.height);
        this.doorGfx.fillStyle(0xff5d73);
        const vertical = d.height > d.width;
        for (let i = 2; i < (vertical ? d.height : d.width); i += 5) {
          if (vertical) this.doorGfx.fillRect(d.x + 2, d.y + i, d.width - 4, 2);
          else this.doorGfx.fillRect(d.x + i, d.y + 2, 2, d.height - 4);
        }
      }
    }
  }

  private nearbyOpenDoor(): Rect | null {
    if (!canExit(this.room)) return null;
    const p = this.player.position;
    return this.layout.doorRects.find((d) => pointInRect(p, expandRect(d, Tuning.room.doorInteractRange))) ?? null;
  }

  private exitRoom(): void {
    if (this.phase !== "playing" || this.leaving) return;
    const next = advanceRun(this.run, ROOMS_PER_LEVEL, this.player.health.current, Tuning.player.maxHealth);
    if (next.kind === "victory") {
      this.victory();
      return;
    }
    this.phase = "exiting";
    this.leaving = true;
    this.player.halt();
    this.playerShots.clear();
    this.enemyShots.clear();
    this.doorPrompt.setVisible(false);
    this.cameras.main.fadeOut(Tuning.room.transitionFadeMs, 5, 7, 13);
    this.time.delayedCall(Tuning.room.transitionFadeMs + 20, () => this.scene.restart(next.run));
  }

  private onEnemyContact(obj: unknown): void {
    const enemy = this.enemies.find((e) => e.sprite === obj);
    if (!enemy?.alive) return;
    this.damagePlayer(enemy.stats.contactDamage, enemy.position);
  }

  private damagePlayer(amount: number, from: Vec2): void {
    if (this.phase !== "playing") return;
    const result = this.player.takeHit(amount, from, this.time.now);
    if (result.applied) this.updateHud();
    if (result.died) this.gameOver();
  }

  private endRun(): void {
    for (const e of this.enemies) e.stop();
    this.playerShots.clear();
    this.enemyShots.clear();
    this.doorPrompt.setVisible(false);
    this.physics.pause();
  }

  private gameOver(): void {
    this.phase = "gameOver";
    this.player.die();
    this.endRun();
    this.showEndOverlay(
      "GAME OVER",
      PALETTE.danger,
      0xff5d73,
      `Fell in Level ${this.level.number} · ${this.level.name} · rooms cleared: ${this.run.roomsCleared}`,
      0,
    );
  }

  /** Minimal end state for Milestone 3; full results/score arrive in Milestone 4. */
  private victory(): void {
    this.phase = "victory";
    this.player.halt();
    this.endRun();
    this.updateHud();
    this.showEndOverlay(
      "VICTORY",
      "#7dff9b",
      0x7dff9b,
      `The Void falls silent · all 5 levels cleared · rooms cleared: ${this.run.roomsCleared + 1}`,
      900,
    );
  }

  private showEndOverlay(title: string, color: string, stroke: number, detail: string, delayMs: number): void {
    this.time.delayedCall(delayMs, () => {
      const cx = GAME_WIDTH / 2;
      const cy = GAME_HEIGHT / 2;
      const ui = [
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05070d, 0.72).setOrigin(0),
        this.add.rectangle(cx, cy, 420, 120, 0x111626).setStrokeStyle(2, stroke),
        this.add.text(cx, cy - 32, title, { fontFamily: FONT_FAMILY, fontSize: "28px", color, fontStyle: "bold" }).setOrigin(0.5),
        this.add.text(cx, cy + 2, detail, { fontFamily: FONT_FAMILY, fontSize: "10px", color: PALETTE.textDim }).setOrigin(0.5),
        this.add
          .text(cx, cy + 32, "[R] / Click  New run     [M]  Menu", { fontFamily: FONT_FAMILY, fontSize: "11px", color: PALETTE.accent })
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
    });
  }

  private leave(target: "game" | "menu"): void {
    if (this.leaving) return;
    this.leaving = true;
    // Always pass explicit data: a fresh run starts at level 1, room 1, full health.
    if (target === "game") this.scene.restart(newRun(Tuning.player.maxHealth));
    else this.scene.start("menu");
  }

  /** Dev-only diagnostics used to verify that restarts/transitions leave nothing behind. */
  debugSnapshot(): Record<string, number | string> {
    const world = this.physics.world;
    const listeners = (e: Phaser.Events.EventEmitter): number =>
      e.eventNames().reduce((n, name) => n + e.listenerCount(name), 0);
    return {
      phase: this.phase,
      level: this.level.number,
      roomIndex: this.run.roomIndex,
      layout: this.levelRoom.layout.id,
      roomsCleared: this.run.roomsCleared,
      roomPhase: this.room.phase,
      enemiesRemaining: this.room.enemiesRemaining,
      playerHp: this.player.health.current,
      enemies: this.enemies.map((e) => `${e.stats.elite ? "elite-" : ""}${e.stats.kind}:${e.health.current}`).join(","),
      enemiesActive: this.enemyGroup.countActive(true),
      playerBullets: this.playerShots.count,
      enemyBullets: this.enemyShots.count,
      solidRects: this.solidRects.length,
      doorBodies: this.doors.getLength(),
      colliders: world.colliders.length,
      dynamicBodies: world.bodies.size,
      staticBodies: world.staticBodies.size,
      displayObjects: this.children.length,
      tweens: this.tweens.getTweens().length,
      inputListeners: listeners(this.input),
      keyboardListeners: this.input.keyboard ? listeners(this.input.keyboard) : 0,
      sceneEventListeners: listeners(this.events),
      gameEventListeners: listeners(this.game.events),
    };
  }
}
