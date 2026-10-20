import * as Phaser from "phaser";
import { ROOM_SEQUENCE, type RoomDefinition } from "../data/rooms.ts";
import { Chaser } from "../entities/Chaser.ts";
import { Player } from "../entities/Player.ts";
import { expandRect, pointInRect, type Rect } from "../logic/collision.ts";
import { parseLayout, type ParsedLayout } from "../logic/layout.ts";
import {
  advanceRun,
  canExit,
  enemyDefeated,
  newRun,
  sanitizeRunState,
  startRoom,
  type RoomState,
  type RunState,
} from "../logic/room.ts";
import { FireCooldown } from "../logic/weapon.ts";
import { bakeTileLayer, ensurePlaceholderTextures, Tex } from "../rendering/PlaceholderArt.ts";
import { ProjectileSystem } from "../systems/ProjectileSystem.ts";
import { Hud } from "../ui/Hud.ts";
import { Depth, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, PALETTE, TILE, Tuning } from "./config.ts";

type Phase = "playing" | "exiting" | "gameOver";

interface Keys {
  readonly up: Phaser.Input.Keyboard.Key;
  readonly down: Phaser.Input.Keyboard.Key;
  readonly left: Phaser.Input.Keyboard.Key;
  readonly right: Phaser.Input.Keyboard.Key;
  readonly dash: Phaser.Input.Keyboard.Key;
  readonly interact: Phaser.Input.Keyboard.Key;
}

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
  private roomDef!: RoomDefinition;
  private room!: RoomState;
  private layout!: ParsedLayout;
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private doors!: Phaser.Physics.Arcade.StaticGroup;
  private doorGfx!: Phaser.GameObjects.Graphics;
  private doorPrompt!: Phaser.GameObjects.Text;
  private chasers: Chaser[] = [];
  private solidRects: Rect[] = [];
  private projectiles!: ProjectileSystem;
  private hud!: Hud;
  private gun!: FireCooldown;
  private keys!: Keys;
  private phase: Phase = "playing";
  private leaving = false;

  constructor() {
    super("game");
  }

  init(data: unknown): void {
    this.run = sanitizeRunState(data, ROOM_SEQUENCE.length, Tuning.player.maxHealth);
    this.chasers = [];
    this.solidRects = [];
    this.phase = "playing";
    this.leaving = false;
  }

  create(): void {
    ensurePlaceholderTextures(this);
    const def = ROOM_SEQUENCE[this.run.roomIndex];
    if (!def) throw new Error(`No room at index ${this.run.roomIndex}`);
    this.roomDef = def;
    this.layout = parseLayout(def.layout, TILE);
    this.room = startRoom(this.layout.enemySpawns.length);

    const worldW = this.layout.cols * TILE;
    const worldH = this.layout.rows * TILE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    bakeTileLayer(this, this.layout.wall, Depth.tiles);

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
    this.enemies = this.physics.add.group();
    this.projectiles = new ProjectileSystem(this, () => this.solidRects);
    this.gun = new FireCooldown(Tuning.gun.intervalMs);

    this.physics.add.collider(this.player.sprite, solids);
    this.physics.add.collider(this.player.sprite, this.doors);
    this.physics.add.collider(this.enemies, solids);
    this.physics.add.collider(this.enemies, this.doors);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.player.sprite, this.enemies, (_p, e) => this.onEnemyContact(e));

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

    const roomNumber = this.run.roomIndex + 1;
    this.hud = new Hud(this, `ROOM ${roomNumber}/${ROOM_SEQUENCE.length}  ${def.name.toUpperCase()}`);
    this.hud.banner(`ROOM ${roomNumber}`, def.name);
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
      this.projectiles.fire(this.player.position, this.player.aim, 9);
    }

    for (const c of this.chasers) c.update(this.player.position);
    const targets = this.chasers.filter((c) => c.alive);
    this.projectiles.update(
      dt,
      targets.map((c) => c.hitRect),
      (index) => {
        const hit = targets[index];
        if (hit) this.onChaserShot(hit, now);
      },
    );

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

  private updateHud(): void {
    this.hud.update({
      health: this.player.health,
      dashReadiness: this.player.dashReadiness(this.time.now),
      room: this.room,
    });
  }

  /** Pulsing markers show where enemies will appear, then they spawn. */
  private telegraphEnemySpawns(): void {
    const markers = this.layout.enemySpawns.map((s) =>
      this.add.image(s.x, s.y, Tex.spawnMarker).setDepth(Depth.effects).setAlpha(0.2),
    );
    if (markers.length === 0) return;
    this.tweens.add({ targets: markers, alpha: 1, duration: 220, yoyo: true, repeat: -1 });
    this.time.delayedCall(Tuning.room.enemySpawnDelayMs, () => {
      markers.forEach((m) => m.destroy());
      if (this.phase !== "playing") return;
      for (const s of this.layout.enemySpawns) this.chasers.push(new Chaser(this, this.enemies, s.x, s.y));
    });
  }

  private onChaserShot(chaser: Chaser, now: number): void {
    const result = chaser.takeHit(Tuning.gun.damage, now);
    if (!result.died) return;
    this.chasers = this.chasers.filter((c) => c !== chaser);
    this.room = enemyDefeated(this.room);
    if (canExit(this.room)) {
      this.refreshDoors();
      this.hud.banner("ROOM CLEAR", "The door is open", "#7dff9b");
    }
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
    this.phase = "exiting";
    this.leaving = true;
    this.player.halt();
    this.projectiles.clear();
    this.doorPrompt.setVisible(false);
    const next = advanceRun(this.run, ROOM_SEQUENCE.length, this.player.health.current);
    this.cameras.main.fadeOut(Tuning.room.transitionFadeMs, 5, 7, 13);
    this.time.delayedCall(Tuning.room.transitionFadeMs + 20, () => this.scene.restart(next));
  }

  private onEnemyContact(obj: unknown): void {
    const chaser = this.chasers.find((c) => c.sprite === obj);
    if (this.phase !== "playing" || !chaser?.alive) return;
    const result = this.player.takeHit(Tuning.chaser.contactDamage, chaser.position, this.time.now);
    if (result.applied) this.updateHud();
    if (result.died) this.gameOver();
  }

  private gameOver(): void {
    this.phase = "gameOver";
    this.player.die();
    for (const c of this.chasers) c.stop();
    this.projectiles.clear();
    this.doorPrompt.setVisible(false);
    this.physics.pause();
    this.showGameOverUi();
  }

  private showGameOverUi(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const ui = [
      this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05070d, 0.72).setOrigin(0),
      this.add.rectangle(cx, cy, 300, 120, 0x111626).setStrokeStyle(2, 0xff5d73),
      this.add
        .text(cx, cy - 32, "GAME OVER", { fontFamily: FONT_FAMILY, fontSize: "28px", color: PALETTE.danger, fontStyle: "bold" })
        .setOrigin(0.5),
      this.add
        .text(cx, cy + 2, `Fell in ${this.roomDef.name} · rooms cleared: ${this.run.roomsCleared}`, {
          fontFamily: FONT_FAMILY,
          fontSize: "11px",
          color: PALETTE.textDim,
        })
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
    // Always pass explicit data: a fresh run starts at room 1 with full health.
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
      room: this.roomDef.id,
      roomIndex: this.run.roomIndex,
      roomsCleared: this.run.roomsCleared,
      roomPhase: this.room.phase,
      enemiesRemaining: this.room.enemiesRemaining,
      playerHp: this.player.health.current,
      chasers: this.chasers.length,
      enemiesActive: this.enemies.countActive(true),
      bullets: this.projectiles.count,
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
