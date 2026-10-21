import * as Phaser from "phaser";
import { BOSS_NAME, ENEMY_STATS } from "../data/enemies.ts";
import { LEVELS, ROOMS_PER_LEVEL, type EnemySpec, type LevelDefinition, type LevelRoom } from "../data/levels.ts";
import { Enemy, type EnemyContext } from "../entities/Enemy.ts";
import { Player } from "../entities/Player.ts";
import { hasLineOfSight, spreadDirections } from "../logic/ai.ts";
import { expandRect, pointInRect, type Rect } from "../logic/collision.ts";
import { makeElite, scaleForDifficulty, type EnemyAttack } from "../logic/enemyStats.ts";
import { healthFraction } from "../logic/health.ts";
import {
  IDLE,
  inRect,
  pickSpawnPoints,
  shouldTrigger,
  startEncounter,
  stepEncounter,
  type EncounterDef,
  type EncounterState,
} from "../logic/encounter.ts";
import { computeFlowField, flowDirection, withClearance, type FlowField } from "../logic/flowField.ts";
import { parseLayout, type ParsedLayout, type Prop, type TilePos } from "../logic/layout.ts";
import { cameraLean, inView, underTopLayer } from "../logic/view.ts";
import {
  advanceRun,
  isFinalLevel,
  isFinalRoomOfLevel,
  newRun,
  sanitizeRunState,
  type RunState,
} from "../logic/progression.ts";
import { canExit, enemyDefeated, startRoom, type RoomState } from "../logic/room.ts";
import { enemyScore, roomClearScore, SCORE } from "../logic/score.ts";
import {
  applyUpgrade,
  computeStats,
  rollUpgradeChoices,
  type BaseStats,
  type UpgradeId,
  type UpgradeLevels,
} from "../logic/upgrades.ts";
import type { Vec2 } from "../logic/vector.ts";
import { parseTestMap, parseVillage, testMapLevel, villageLevel, type TestMapOptions } from "../data/maps.ts";
import { DialogPanel } from "../ui/DialogPanel.ts";
import type { Npc } from "../systems/Npcs.ts";
import { biomeFor, crittersFor, resolveObject } from "../data/biomes.ts";
import { DECOR, type DecorDef, type ResolvedObject } from "../data/decor.ts";
import { solidObjectGrid } from "../logic/objects.ts";
import { tileHash } from "../logic/terrainArt.ts";
import { AmbientParticles } from "../rendering/AmbientParticles.ts";
import { bakeWorld } from "../rendering/WorldBake.ts";
import { Critters } from "../systems/Critters.ts";
import { WorldObjects } from "../systems/WorldObjects.ts";
import { FireCooldown } from "../logic/weapon.ts";
import { torchLights, type TorchLight } from "../logic/lighting.ts";
import { LightingSystem } from "../rendering/LightingSystem.ts";
import { TILE_FRAMES } from "../data/artManifest.ts";
import { parseShowcase, showcaseLevel, type ShowcaseOptions } from "../data/showcase.ts";
import { artMode, playFx, sheetKey, type ArtMode } from "../rendering/Art.ts";
import { ensureLightTextures } from "../rendering/LightTextures.ts";
import { bakeTileLayer, ensurePlaceholderTextures, Tex } from "../rendering/PlaceholderArt.ts";
import { browserStorage } from "../systems/HighScoreStore.ts";
import { ProjectileSystem, type BulletSpec } from "../systems/ProjectileSystem.ts";
import { Hud } from "../ui/Hud.ts";
import { ShopPanel } from "../ui/ShopPanel.ts";
import { WEAPONS, weaponStats, type WeaponId, type WeaponStats } from "../data/weapons.ts";
import { breakableCoins, coinsKept, enemyCoins, HEAL_PRICE, merchantStock, villageStock, type ShopItemId } from "../logic/economy.ts";
import { buyUnlock, loadSave, recordRun, writeSave } from "../systems/SaveStore.ts";
import { Coins } from "../systems/Coins.ts";
import { Npcs } from "../systems/Npcs.ts";
import { UpgradePanel } from "../ui/UpgradePanel.ts";
import { Depth, FONT_FAMILY, PALETTE, TILE, Tuning } from "./config.ts";
import type { RunResult } from "./ResultsScene.ts";

/** "shop" covers every modal talk: shops and signs. */
type Phase = "playing" | "reward" | "shop" | "exiting" | "gameOver" | "victory";

/** One encounter area of a v2 map at runtime. */
interface EncounterRuntime {
  readonly def: EncounterDef;
  state: EncounterState;
  /** Enemies telegraphed but not spawned yet (they count as alive). */
  pending: number;
  readonly members: Enemy[];
  readonly gates: readonly Rect[];
}

/** The flow field is rebuilt at most this often (and only when needed). */
const FLOW_REFRESH_MS = 150;
/** Attack gate: enemies this far outside the screen still count as on-screen. */
const ON_SCREEN_MARGIN = 8;

interface Keys {
  readonly up: Phaser.Input.Keyboard.Key;
  readonly down: Phaser.Input.Keyboard.Key;
  readonly left: Phaser.Input.Keyboard.Key;
  readonly right: Phaser.Input.Keyboard.Key;
  readonly dash: Phaser.Input.Keyboard.Key;
  readonly interact: Phaser.Input.Keyboard.Key;
  readonly pause: Phaser.Input.Keyboard.Key;
  readonly pauseAlt: Phaser.Input.Keyboard.Key;
}

const BASE_STATS: BaseStats = {
  damage: Tuning.gun.damage,
  fireIntervalMs: Tuning.gun.intervalMs,
  bulletSpeed: Tuning.gun.bulletSpeed,
  moveSpeed: Tuning.player.speed,
  maxHealth: Tuning.player.maxHealth,
};

// Speed, lifetime, radius and damage are gameplay and identical in both art
// modes; only the look (texture, animation, trail colour) differs.
const PLAYER_SHOT_LOOK: Readonly<Record<WeaponId, { texture: string; anim?: string; faceDirection?: { offset: number }; trail: number }>> = {
  shuriken: { texture: sheetKey("shuriken"), anim: "na-shuriken-spin", trail: 0xc9d4ff },
  kunai: { texture: sheetKey("kunai"), faceDirection: { offset: 0 }, trail: 0xe8f0ff },
  bigShuriken: { texture: sheetKey("bigShuriken"), anim: "na-big-shuriken-spin", trail: 0xc9d4ff },
  magicShuriken: { texture: sheetKey("magicShuriken"), anim: "na-magic-shuriken-spin", trail: 0xb68cff },
};

// Gameplay values come from the weapon stats and are identical in both art
// modes; only the look (texture, animation, trail colour) differs. Player
// shots are blue/white/purple shuriken, never like the enemies' fireballs.
const playerBulletSpec = (stats: WeaponStats, weapon: WeaponId, art: ArtMode): BulletSpec => {
  const look = PLAYER_SHOT_LOOK[weapon];
  return {
    speed: stats.bulletSpeed,
    lifeMs: Tuning.gun.bulletLifeMs,
    radius: stats.bulletRadius,
    damage: stats.damage,
    pierce: stats.pierce,
    homing: stats.homing,
    trailColor: art === "ninja" ? look.trail : 0xffd166,
    impactColor: 0xc9d4ff,
    ...(art === "ninja"
      ? { texture: look.texture, ...(look.anim ? { anim: look.anim } : {}), ...(look.faceDirection ? { faceDirection: look.faceDirection } : {}) }
      : { texture: Tex.bullet, scale: stats.bulletRadius / Tuning.gun.bulletRadius }),
  };
};

const enemyBulletSpec = (attack: EnemyAttack, art: ArtMode): BulletSpec => {
  const boss = attack.pattern === "radial";
  return {
    speed: attack.bulletSpeed,
    lifeMs: 3500,
    radius: 3,
    damage: attack.damage,
    trailColor: art === "ninja" ? (boss ? 0x7fe8ff : 0xff8a3d) : 0xff4fd8,
    impactColor: art === "ninja" ? (boss ? 0xbff4ff : 0xffc08a) : 0xff9ae8,
    ...(art === "ninja"
      ? boss
        ? { texture: sheetKey("energyBall"), anim: "na-energy-ball-fly", faceDirection: { offset: -Math.PI / 2 } }
        : { texture: sheetKey("fireball"), anim: "na-fireball-fly", faceDirection: { offset: 0 } }
      : { texture: Tex.enemyBullet }),
  };
};

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
 *
 * Time: gameplay cooldowns use `simTime`, which only advances while playing.
 * Phaser's `time.now` jumps forward after a pause, which would instantly
 * expire every cooldown and telegraph on resume.
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
  // Run-wide values, carried in RunState between rooms.
  private upgrades!: UpgradeLevels;
  private stats!: WeaponStats;
  // Economy (Milestone 10): pocket coins, the carried weapon, pickups, shops.
  private coins = 0;
  private coinsEarned = 0;
  private weapon: WeaponId = "shuriken";
  private coinPickups!: Coins;
  private npcs: Npcs | null = null;
  private shop: ShopPanel | null = null;
  private score = 0;
  private enemiesDefeated = 0;
  private runTimeMs = 0;
  private simTime = 0;
  private panel: UpgradePanel | null = null;
  private lighting: LightingSystem | null = null;
  private art: ArtMode = "placeholder";
  private showcase: ShowcaseOptions | null = null;
  private doorSprites: Phaser.GameObjects.Image[] = [];
  private testmap: TestMapOptions | null = null;
  /** The Home Village prologue: no timer, no score; its gate starts a run. */
  private village = false;
  private dialog: DialogPanel | null = null;
  // v2 maps (rooms with encounters): tall walls, gates and pathfinding.
  private encounters: EncounterRuntime[] = [];
  private gateBodies!: Phaser.Physics.Arcade.StaticGroup;
  private gateGfx!: Phaser.GameObjects.Graphics;
  /** Walls, water and props: never walkable. Gates/doors are checked on top. */
  private staticBlocked: boolean[][] = [];
  private flow: FlowField | null = null;
  /** Same, keeping a tile of clearance from walls, for big bodies. */
  private flowBig: FlowField | null = null;
  private flowTarget: TilePos | null = null;
  private flowBuiltAt = -Infinity;
  private flowDirty = true;
  private tallWalls = false;
  private silhouettes: Phaser.GameObjects.Image[] = [];
  // v2 world kit: placed objects, critters, ambient particles.
  /** v1 rooms: solid crate/barrel props. Maps turn them into breakables instead. */
  private staticProps: readonly Prop[] = [];
  /** Blocking areas of static solid objects (trees, rocks, tents). */
  private objectRects: Rect[] = [];
  /** What blocks player shots: like solidRects but without breakables, which are shot targets. */
  private playerSolids: Rect[] = [];
  /** Tiles drawn on the foreground layer (wall tops and canopies): actors there get silhouettes. */
  private topLayer: boolean[][] = [];
  private world: WorldObjects | null = null;
  private critters: Critters | null = null;
  private particles: AmbientParticles | null = null;

  constructor() {
    super("game");
  }

  init(data: unknown): void {
    this.run = sanitizeRunState(data, ROOMS_PER_LEVEL, Tuning.player.maxHealth);
    this.showcase = parseShowcase(data);
    this.upgrades = this.run.upgrades;
    this.coins = this.run.coins;
    this.coinsEarned = this.run.coinsEarned;
    this.weapon = this.run.weapon;
    this.stats = weaponStats(computeStats(BASE_STATS, this.upgrades), this.weapon);
    this.npcs = null;
    this.shop = null;
    this.score = this.run.score;
    this.enemiesDefeated = this.run.enemiesDefeated;
    this.runTimeMs = this.run.runTimeMs;
    this.simTime = 0;
    this.enemies = [];
    this.boss = null;
    this.solidRects = [];
    this.panel = null;
    this.lighting = null;
    this.doorSprites = [];
    this.testmap = parseTestMap(data);
    this.village = parseVillage(data);
    this.dialog = null;
    this.encounters = [];
    this.staticBlocked = [];
    this.flow = null;
    this.flowBig = null;
    this.flowTarget = null;
    this.flowBuiltAt = -Infinity;
    this.flowDirty = true;
    this.tallWalls = false;
    this.silhouettes = [];
    this.staticProps = [];
    this.objectRects = [];
    this.playerSolids = [];
    this.topLayer = [];
    this.world = null;
    this.critters = null;
    this.particles = null;
    this.phase = "playing";
    this.leaving = false;
  }

  create(): void {
    ensurePlaceholderTextures(this);
    this.art = artMode(this);
    // The art test room (?artroom) is a one-room level; everything else is the normal run.
    // The test map (?testmap) is a one-room level too.
    const level = this.village
      ? villageLevel()
      : this.showcase
        ? showcaseLevel(this.showcase)
        : this.testmap
          ? testMapLevel(this.testmap)
          : LEVELS[this.run.levelIndex];
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

    ensureLightTextures(this);
    // v2 maps get tall walls (walk-behind tops), outdoor terrain and placed
    // objects; the v1 rooms keep their flat look and solid props.
    this.tallWalls = levelRoom.encounters !== undefined;
    const objects: ResolvedObject[] = this.tallWalls
      ? [
          // Generic objects (slots) take this biome's variant.
          ...(levelRoom.objects ?? []).map((o) => resolveObject(o, level.theme.id)),
          // On maps, layout crates and barrels are breakable.
          ...this.layout.props.map((p): ResolvedObject => ({
            id: p.kind === "crate" ? "crate" : "barrel",
            col: Math.floor(p.rect.x / TILE),
            row: Math.floor(p.rect.y / TILE),
          })),
        ]
      : [];
    this.staticProps = this.tallWalls ? [] : this.layout.props;
    if (this.tallWalls) {
      bakeWorld(this, this.layout, level.theme, biomeFor(level.theme.id), objects, this.art, {
        base: Depth.tiles,
        top: Depth.foreground,
      });
    } else {
      bakeTileLayer(this, this.layout.wall, Depth.tiles, level.theme, this.layout.props, this.art);
    }
    this.buildTopLayer(objects);

    // Walls, props and static objects never change during a room: one static group.
    const solids = this.physics.add.staticGroup();
    for (const r of this.layout.wallRects) solids.add(this.add.zone(r.x + r.width / 2, r.y + r.height / 2, r.width, r.height));
    this.objectRects = objects.flatMap((o) => {
      const def: DecorDef = DECOR[o.id];
      if (def.kind !== "solid" || !def.solid) return [];
      return [{ x: (o.col + def.solid.col) * TILE, y: (o.row + def.solid.row) * TILE, width: def.solid.cols * TILE, height: def.solid.rows * TILE }];
    });
    for (const r of this.objectRects) solids.add(this.add.zone(r.x + r.width / 2, r.y + r.height / 2, r.width, r.height));
    // Low fences: they block walking (enemies always), but a dashing player
    // leaps them; bullets fly over (they are not in solidRects).
    const hurdles = this.physics.add.staticGroup();
    for (const o of objects) {
      const def: DecorDef = DECOR[o.id];
      if (def.kind !== "hurdle" || !def.solid) continue;
      const s = def.solid;
      hurdles.add(this.add.zone((o.col + s.col + s.cols / 2) * TILE, (o.row + s.row + s.rows / 2) * TILE, s.cols * TILE, s.rows * TILE));
    }
    for (const p of this.staticProps) {
      const cx = p.rect.x + TILE / 2;
      const cy = p.rect.y + TILE / 2;
      const tile = TILE_FRAMES[p.kind === "crate" ? "crate" : "barrel"];
      const img =
        this.art === "ninja"
          ? this.add.image(cx, cy, sheetKey(tile.sheet), tile.frame)
          : this.add.image(cx, cy, p.kind === "crate" ? Tex.crate : Tex.barrel);
      // Static bodies take the image's size: both art sets are 16x16, matching the tile.
      solids.add(img.setDepth(Depth.props));
    }
    // Water and other low obstacles block walking only; bullets fly over them.
    const low = this.physics.add.staticGroup();
    for (const r of this.layout.lowRects) low.add(this.add.zone(r.x + r.width / 2, r.y + r.height / 2, r.width, r.height));
    // Encounter gates: bodies exist only while their encounter is active.
    this.gateBodies = this.physics.add.staticGroup();
    this.gateGfx = this.add.graphics().setDepth(Depth.effects);
    // Doors are separate so they can be removed when the room is cleared.
    this.doors = this.physics.add.staticGroup();
    for (const d of this.layout.doorRects) this.doors.add(this.add.zone(d.x + d.width / 2, d.y + d.height / 2, d.width, d.height));
    // Door state (locked bars / open outline) is gameplay information: above the darkness.
    this.doorGfx = this.add.graphics().setDepth(Depth.effects);
    this.doorPrompt = this.add
      .text(0, 0, "[E] EXIT", { fontFamily: FONT_FAMILY, fontSize: "10px", color: "#7dff9b", fontStyle: "bold" })
      .setOrigin(0.5)
      .setStroke("#05070d", 3)
      .setDepth(Depth.hud)
      .setVisible(false);

    this.player = new Player(this, this.layout.playerSpawn.x, this.layout.playerSpawn.y, this.run.playerHealth, this.stats);
    this.enemyGroup = this.physics.add.group();
    this.playerShots = new ProjectileSystem(this, () => this.playerSolids);
    this.enemyShots = new ProjectileSystem(this, () => this.solidRects);
    this.gun = new FireCooldown(this.stats.fireIntervalMs);

    this.physics.add.collider(this.player.sprite, solids);
    this.physics.add.collider(this.player.sprite, this.doors);
    this.physics.add.collider(this.enemyGroup, solids);
    this.physics.add.collider(this.enemyGroup, this.doors);
    this.physics.add.collider(this.player.sprite, low);
    this.physics.add.collider(this.enemyGroup, low);
    this.physics.add.collider(this.player.sprite, this.gateBodies);
    this.physics.add.collider(this.enemyGroup, this.gateBodies);
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);
    this.physics.add.collider(this.player.sprite, hurdles, undefined, () => !this.player.isDashing(this.simTime));
    this.physics.add.collider(this.enemyGroup, hurdles);
    this.coinPickups = new Coins(this, this.art, () => {
      this.coins++;
      this.coinsEarned++;
    });
    if (levelRoom.npcs?.length) {
      this.npcs = new Npcs(this, levelRoom.npcs, this.art);
      this.physics.add.collider(this.player.sprite, this.npcs.bodies);
      this.physics.add.collider(this.enemyGroup, this.npcs.bodies);
    }
    if (this.tallWalls) {
      this.world = new WorldObjects(this, objects, this.rippleTiles(), this.art);
      this.physics.add.collider(this.player.sprite, this.world.bodies);
      this.physics.add.collider(this.enemyGroup, this.world.bodies);
    }
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
      pause: kb.addKey(K.ESC),
      pauseAlt: kb.addKey(K.P),
    };

    const roomCount = level.rooms.length;
    const roomNumber = this.run.roomIndex + 1;
    this.hud = new Hud(this, this.village ? "HOME VILLAGE" : `L${level.number} ${level.name.toUpperCase()}  ROOM ${roomNumber}/${roomCount}`);
    if (this.village) this.doorPrompt.setText("[E] SET OUT");
    this.showEntryBanner();
    this.cameras.main.fadeIn(Tuning.room.transitionFadeMs, 5, 7, 13);

    this.lighting = new LightingSystem(
      this,
      level.theme,
      [...torchLights(this.layout, TILE), ...objectLights(objects)],
      !new URLSearchParams(window.location.search).has("nolight"),
    );
    // Off-display-list light stamps are not destroyed by Phaser; `once` fires and removes itself each shutdown.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.lighting?.destroy());

    // The camera follows the player (and leans toward the aim) on maps larger
    // than the screen; on screen-sized rooms the bounds keep it still.
    this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);
    this.cameras.main.setRoundPixels(true);

    this.buildStaticBlocked();
    this.encounters = (levelRoom.encounters ?? []).map((def) => ({
      def,
      state: IDLE,
      pending: 0,
      members: [],
      gates: this.layout.gates
        .filter((g) => inRect(g, def.area))
        .map((g) => ({ x: g.col * TILE, y: g.row * TILE, width: TILE, height: TILE })),
    }));
    // Only animals that live in this biome (none on the snowy mountain).
    const critters = crittersFor(level.theme.id, levelRoom.critters ?? []);
    if (critters.length > 0) {
      this.critters = new Critters(this, critters, this.art, 0, (kind, x, y) => {
        const c = Math.floor(x / TILE);
        const r = Math.floor(y / TILE);
        if (kind === "fish") return this.layout.low[r]?.[c] === true;
        return this.staticBlocked[r]?.[c] === false;
      });
    }
    const particleKind = this.tallWalls ? biomeFor(level.theme.id)?.particles : null;
    if (particleKind) this.particles = new AmbientParticles(this, particleKind, this.art);
    this.refreshDoors();
    // v1 rooms spawn everything at once; maps spawn per encounter area.
    if (!levelRoom.encounters) this.telegraphEnemySpawns();
    this.updateHud();
    this.updateLighting(); // first frame is already lit, no full-bright flash
  }

  private updateLighting(): void {
    this.lighting?.update(
      this.simTime,
      this.player.position,
      this.enemies.filter((e) => e.alive).map((e) => e.position),
      { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY },
    );
  }

  override update(_time: number, delta: number): void {
    if (this.phase !== "playing") return;
    const k = this.keys;
    if (Phaser.Input.Keyboard.JustDown(k.pause) || Phaser.Input.Keyboard.JustDown(k.pauseAlt)) {
      this.pauseGame();
      return;
    }

    const dt = Math.min(delta, 50);
    this.simTime += dt;
    // The village never counts: the run timer starts at its gate.
    if (!this.village) this.runTimeMs += Math.min(delta, 250);
    const now = this.simTime;

    // Convert the pointer to world space every frame: correct even when the
    // mouse is still but the camera scrolls.
    const pointer = this.input.activePointer;
    const aim = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.player.update(
      { up: k.up.isDown, down: k.down.isDown, left: k.left.isDown, right: k.right.isDown },
      aim,
      now,
      Phaser.Input.Keyboard.JustDown(k.dash),
    );

    const lean = cameraLean(this.player.position, aim);
    this.cameras.main.setFollowOffset(-lean.x, -lean.y);

    if (pointer.leftButtonDown() && this.gun.tryFire(now)) {
      const n = this.stats.projectiles;
      const spec = playerBulletSpec(this.stats, this.weapon, this.art);
      for (const dir of spreadDirections(this.player.aim, n, this.stats.spreadRad * (n - 1))) {
        this.playerShots.fire(this.player.position, dir, 9, spec);
      }
      this.muzzleFlash();
    }

    const ctx: EnemyContext = {
      now,
      player: this.player.position,
      hasLineOfSight: (from, to) => hasLineOfSight(from, to, this.solidRects),
      fire: (origin, dir, attack, muzzle) => this.enemyShots.fire(origin, dir, muzzle, enemyBulletSpec(attack, this.art)),
      flowDir: (from, big) => {
        // Big bodies use the clearance field; where it has no route (narrow gaps) they try the normal one.
        const wide = big && this.flowBig ? flowDirection(this.flowBig, from, TILE) : null;
        return wide ?? (this.flow ? flowDirection(this.flow, from, TILE) : null);
      },
      onScreen: (at) => inView(at, this.cameras.main.worldView, ON_SCREEN_MARGIN),
    };
    this.updateFlowField(now);
    this.updateEncounters();
    if (this.phase !== "playing") return;
    for (const e of this.enemies) e.update(ctx);

    // Player shots hit enemies, then breakables (which are not in playerSolids).
    const targets = this.enemies.filter((e) => e.alive);
    const breakables = this.world?.solidRects ?? [];
    this.playerShots.update(
      dt,
      [...targets.map((e) => e.hitRect), ...breakables],
      (index, damage) => {
        const hit = targets[index];
        if (hit) {
          this.onEnemyShot(hit, damage, now);
          return;
        }
        const broke = this.world?.hit(index - targets.length, damage);
        if (broke) {
          this.coinPickups.drop(broke.at, breakableCoins(broke.shards, Math.random));
          this.refreshSolids();
          this.flowDirty = true;
        }
      },
      // Stable ids let piercing shots skip what they already hit; homing curves toward enemies.
      { ids: [...targets, ...breakables], homing: targets.map((e) => e.position) },
    );
    if (this.phase !== "playing") return;

    // Dashing makes the player untouchable: enemy bullets pass through.
    const playerTargets = this.player.isDashing(now) ? [] : [this.player.hitRect];
    this.enemyShots.update(dt, playerTargets, (_i, damage, at) => this.damagePlayer(damage, at));
    if (this.phase !== "playing") return;

    // Read every frame: JustDown's flag persists until read, so an E pressed
    // elsewhere must not trigger an exit later when reaching the door.
    const interactPressed = Phaser.Input.Keyboard.JustDown(k.interact);
    const npc = this.npcs?.nearby(this.player.position) ?? null;
    if (npc && interactPressed) {
      this.talkTo(npc);
      return;
    }
    const door = npc ? null : this.nearbyOpenDoor();
    this.doorPrompt.setVisible(door !== null);
    if (door) {
      const c = { x: door.x + door.width / 2, y: door.y + door.height / 2 };
      this.doorPrompt.setPosition(
        Phaser.Math.Clamp(c.x, 30, this.layout.cols * TILE - 30),
        Phaser.Math.Clamp(c.y, 24, this.layout.rows * TILE - 24),
      );
      if (interactPressed) this.exitRoom();
    }

    this.coinPickups.update(this.player.position, dt);
    const view = this.cameras.main.worldView;
    this.world?.update(now, view);
    this.critters?.update(now, dt, this.player.position, view);
    this.particles?.update(now, dt, { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY });
    this.updateSilhouettes();
    this.updateHud();
    this.updateLighting();
  }

  /** Foreground tiles: wall tops (drawn a row up) and object canopies. */
  private buildTopLayer(objects: readonly ResolvedObject[]): void {
    const l = this.layout;
    this.topLayer = l.wall.map((row, r) => row.map((_, c) => this.tallWalls && l.wall[r + 1]?.[c] === true));
    for (const o of objects) {
      const def: DecorDef = DECOR[o.id];
      for (let dr = 0; dr < (def.canopy ?? 0); dr++) {
        for (let dc = 0; dc < def.w; dc++) {
          const row = this.topLayer[o.row + dr];
          if (row && o.col + dc < row.length) row[o.col + dc] = true;
        }
      }
    }
  }

  /** A few open-water tiles (away from shores) get animated ripples. */
  private rippleTiles(): TilePos[] {
    const l = this.layout;
    const water = (c: number, r: number): boolean => l.low[r]?.[c] === true && l.wall[r]?.[c] === false;
    const out: TilePos[] = [];
    for (let r = 0; r < l.rows; r++) {
      for (let c = 0; c < l.cols; c++) {
        if (water(c, r) && water(c - 1, r) && water(c + 1, r) && water(c, r - 1) && water(c, r + 1) && tileHash(c, r, 7) < 0.12) {
          out.push({ col: c, row: r });
        }
      }
    }
    return out;
  }

  // ---- v2 maps: pathfinding, encounters, gates, walk-behind ----

  private buildStaticBlocked(): void {
    const l = this.layout;
    const objects = (this.levelRoom.objects ?? []).map((o) => resolveObject(o, this.level.theme.id));
    const objectGrid = solidObjectGrid(l.cols, l.rows, objects.map((o) => ({ def: DECOR[o.id], at: o })));
    this.staticBlocked = l.wall.map((row, r) => row.map((w, c) => w || (l.low[r]?.[c] ?? false) || (objectGrid[r]?.[c] ?? false)));
    for (const p of this.staticProps) {
      const row = this.staticBlocked[Math.floor(p.rect.y / TILE)];
      if (row) row[Math.floor(p.rect.x / TILE)] = true;
    }
  }

  /** Closed gates and locked doors: they block movement, bullets and paths. */
  private gateAndDoorRects(): Rect[] {
    const gates = this.encounters.filter((e) => e.state.phase === "active").flatMap((e) => e.gates);
    return canExit(this.room) ? gates : [...gates, ...this.layout.doorRects];
  }

  /** Everything that can change during a room: gates, doors and intact breakables. */
  private dynamicSolids(): Rect[] {
    return [...this.gateAndDoorRects(), ...(this.world?.solidRects ?? [])];
  }

  /** Rebuilt when the player changes tile or gates change, at most every FLOW_REFRESH_MS. */
  private updateFlowField(now: number): void {
    if (this.enemies.length === 0) return;
    const p = this.player.position;
    const tile = { col: Math.floor(p.x / TILE), row: Math.floor(p.y / TILE) };
    const moved = !this.flowTarget || tile.col !== this.flowTarget.col || tile.row !== this.flowTarget.row;
    if (!(moved || this.flowDirty) || now - this.flowBuiltAt < FLOW_REFRESH_MS) return;
    const dyn = this.dynamicSolids();
    const walk = (c: number, r: number): boolean =>
      this.staticBlocked[r]?.[c] === false && !dyn.some((d) => pointInRect({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 }, d));
    this.flow = computeFlowField(walk, this.layout.cols, this.layout.rows, tile);
    this.flowBig = computeFlowField(withClearance(walk, tile), this.layout.cols, this.layout.rows, tile);
    this.flowTarget = tile;
    this.flowBuiltAt = now;
    this.flowDirty = false;
  }

  private updateEncounters(): void {
    if (this.encounters.length === 0) return;
    const p = this.player.position;
    const tile = { col: Math.floor(p.x / TILE), row: Math.floor(p.y / TILE) };
    for (const enc of this.encounters) {
      if (shouldTrigger(enc.def, enc.state, tile)) {
        const start = startEncounter();
        enc.state = start.state;
        this.setGates();
        this.hud.banner(enc.def.trigger ? "AMBUSH!" : "ENEMIES", "The way out is sealed", PALETTE.danger);
        this.spawnWave(enc, start.spawnWave);
        continue;
      }
      if (enc.state.phase !== "active") continue;
      const alive = enc.members.filter((m) => m.alive).length + enc.pending;
      const step = stepEncounter(enc.def, enc.state, alive);
      enc.state = step.state;
      if (step.spawnWave !== null) this.spawnWave(enc, step.spawnWave);
      if (step.cleared) {
        this.setGates();
        // The last area's clear is announced by the room clear instead.
        if (!canExit(this.room)) this.hud.banner("AREA CLEAR", "The gates open", "#7dff9b");
        this.coinPickups.attract();
        if (enc.def.reward) this.offerUpgrade();
        if (this.phase !== "playing") return;
      }
    }
  }

  private spawnWave(enc: EncounterRuntime, wave: number): void {
    const specs = enc.def.waves[wave] ?? [];
    const points = this.layout.enemySpawns.filter((s) => inRect({ col: Math.floor(s.x / TILE), row: Math.floor(s.y / TILE) }, enc.def.area));
    const at = pickSpawnPoints(points, specs.length, this.player.position);
    enc.pending += specs.length;
    this.telegraphSpawns(
      specs.map((spec, i) => ({ spec, at: at[i] ?? this.layout.playerSpawn })),
      (enemy) => {
        enc.pending--;
        enc.members.push(enemy);
      },
    );
  }

  /** Gate bodies, gate art and solidRects follow the encounters' phases. */
  private setGates(): void {
    this.gateBodies.clear(true, true);
    this.gateGfx.clear();
    for (const enc of this.encounters) {
      if (enc.state.phase !== "active") continue;
      for (const g of enc.gates) {
        this.gateBodies.add(this.add.zone(g.x + g.width / 2, g.y + g.height / 2, g.width, g.height));
        // Glowing bars, drawn above the darkness like all door state.
        this.gateGfx.fillStyle(0x2a1430, 0.85).fillRect(g.x, g.y, g.width, g.height);
        this.gateGfx.fillStyle(0xff5d73);
        for (let i = 2; i < TILE; i += 5) this.gateGfx.fillRect(g.x + i, g.y + 1, 2, g.height - 2);
      }
    }
    this.refreshSolids();
    this.flowDirty = true;
  }

  /** Faint outlines of the player and enemies while hidden behind a wall top. */
  private updateSilhouettes(): void {
    if (!this.tallWalls) return;
    const actors: Phaser.GameObjects.Sprite[] = [this.player.sprite, ...this.enemies.filter((e) => e.alive).map((e) => e.sprite)];
    let used = 0;
    for (const a of actors) {
      if (!underTopLayer(this.topLayer, { x: a.x, y: a.y }, 5, TILE)) continue;
      let img = this.silhouettes[used];
      if (!img) {
        img = this.add.image(0, 0, a.texture.key).setDepth(Depth.silhouettes).setTintFill(0xd8e6ff).setAlpha(0.45);
        this.silhouettes.push(img);
      }
      img
        .setTexture(a.texture.key, a.frame.name)
        .setPosition(a.x, a.y)
        .setOrigin(a.originX, a.originY)
        .setScale(a.scaleX, a.scaleY)
        .setFlipX(a.flipX)
        .setVisible(true);
      used++;
    }
    for (let i = used; i < this.silhouettes.length; i++) this.silhouettes[i]?.setVisible(false);
  }

  private get isFinalRoom(): boolean {
    return isFinalRoomOfLevel(this.run, ROOMS_PER_LEVEL);
  }

  /** The run as it stands right now, for transitions. */
  private currentRun(): RunState {
    return {
      ...this.run,
      score: this.score,
      enemiesDefeated: this.enemiesDefeated,
      runTimeMs: this.runTimeMs,
      upgrades: this.upgrades,
      coins: this.coins,
      coinsEarned: this.coinsEarned,
      weapon: this.weapon,
    };
  }

  /** Recomputes stats after an upgrade or weapon change (upgrades apply to every weapon). */
  private refreshStats(): void {
    this.stats = weaponStats(computeStats(BASE_STATS, this.upgrades), this.weapon);
    this.player.applyStats(this.stats);
    this.gun = new FireCooldown(this.stats.fireIntervalMs);
  }

  // ---- shops -------------------------------------------------------------

  private talkTo(npc: Npc): void {
    if (npc.kind === "sign") this.readSign(npc.text);
    else this.openShop(npc.kind);
  }

  /** Shows a sign's text; the room freezes meanwhile (like a shop). */
  private readSign(text: string): void {
    if (this.dialog || this.shop || this.phase !== "playing") return;
    this.phase = "shop";
    this.player.halt();
    this.npcs?.hidePrompt();
    this.physics.pause();
    this.dialog = new DialogPanel(this, "SIGN", text, () => {
      this.dialog = null;
      this.closeShop();
    });
  }

  /** Opens the village shop (saved coins) or the travelling merchant (pocket coins); the room freezes meanwhile. */
  private openShop(kind: "shopkeeper" | "merchant"): void {
    if (this.shop || this.phase !== "playing") return;
    this.phase = "shop";
    this.player.halt();
    this.npcs?.hidePrompt();
    this.physics.pause();
    const village = kind === "shopkeeper";
    this.shop = new ShopPanel(
      this,
      village
        ? {
            title: "VILLAGE SHOP",
            greeting: "Weapons, yours to keep. Paid with saved coins.",
            face: "shopkeeperFace",
            currency: "SAVED",
            state: () => {
              const save = loadSave(browserStorage());
              return { coins: save.coins, items: villageStock(save.unlocks) };
            },
            buy: (id) => this.buyUnlock(id),
            onClose: () => this.closeShop(),
          }
        : {
            title: "TRAVELLING MERCHANT",
            greeting: "Wares for this journey. Pocket coins only.",
            face: "merchantFace",
            currency: "POCKET",
            state: () => ({
              coins: this.coins,
              items: merchantStock(loadSave(browserStorage()).unlocks, this.weapon, this.upgrades, this.player.health, this.run.levelIndex),
            }),
            buy: (id) => this.buyFromMerchant(id),
            onClose: () => this.closeShop(),
          },
      this.art,
    );
  }

  private closeShop(): void {
    this.shop = null;
    // openShop halted the player, which disables its body: turn it back on.
    this.player.body.enable = true;
    this.physics.resume();
    // Drop key presses made while the shop was open (e.g. the E that closed it).
    this.input.keyboard?.resetKeys();
    this.phase = "playing";
    this.updateHud();
  }

  private buyUnlock(id: ShopItemId): string {
    if (!id.startsWith("weapon:")) return "";
    const weapon = id.slice("weapon:".length) as WeaponId;
    const storage = browserStorage();
    const save = loadSave(storage);
    const result = buyUnlock(save, weapon, WEAPONS[weapon].unlockPrice);
    if (!result.ok) return save.unlocks.includes(weapon) ? "You already own it." : "Not enough saved coins.";
    if (!writeSave(storage, result.save)) return "Could not save: purchase not kept.";
    return `${WEAPONS[weapon].name} unlocked! Buy it from the merchant on a run.`;
  }

  private buyFromMerchant(id: ShopItemId): string {
    const item = merchantStock(loadSave(browserStorage()).unlocks, this.weapon, this.upgrades, this.player.health, this.run.levelIndex).find(
      (i) => i.id === id,
    );
    if (!item || !item.available) return item?.note ? `${item.name}: ${item.note.toLowerCase()}.` : "";
    if (this.coins < item.price) return "Not enough coins.";
    this.coins -= item.price;
    if (id === "heal") {
      this.player.healFull();
      return `Healed! (-${HEAL_PRICE})`;
    }
    if (id.startsWith("upgrade:")) {
      this.upgrades = applyUpgrade(this.upgrades, id.slice("upgrade:".length) as UpgradeId);
      this.refreshStats();
      return `${item.name} bought.`;
    }
    this.weapon = id.slice("weapon:".length) as WeaponId;
    this.refreshStats();
    return `Now carrying the ${item.name}.`;
  }

  private pauseGame(): void {
    // Pausing the scene freezes update, physics, timers and tweens together.
    // The overlay sleeps between pauses (see PauseScene for why it is not stopped).
    const data = { upgrades: this.upgrades };
    if (this.scene.isSleeping("pause")) this.scene.wake("pause", data);
    else this.scene.launch("pause", data);
    this.scene.pause();
  }

  private showEntryBanner(): void {
    const level = this.level;
    if (this.village) {
      this.hud.banner("HOME VILLAGE", "A quiet morning. The gate is just east.", level.theme.title, true);
    } else if (this.showcase) {
      this.hud.banner("ART TEST ROOM", level.name.toUpperCase(), level.theme.title, true);
    } else if (this.testmap) {
      this.hud.banner("TEST MAP", "Gates seal each area until it is clear", level.theme.title, true);
    } else if (this.run.roomIndex === 0) {
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
      dashReadiness: this.player.dashReadiness(this.simTime),
      room: this.room,
      boss: this.boss ? healthFraction(this.boss.health) : null,
      score: this.score,
      runTimeMs: this.runTimeMs,
      rewardOnClear: this.levelRoom.reward && !canExit(this.room),
      coins: this.coins,
      weapon: WEAPONS[this.weapon].name,
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
    this.telegraphSpawns(placements);
  }

  /** Pulsing markers, then the enemies appear (also used by encounter waves). */
  private telegraphSpawns(placements: readonly { spec: EnemySpec; at: Vec2 }[], onSpawn?: (e: Enemy) => void): void {
    const markers = placements.map(({ at }) => this.add.image(at.x, at.y, Tex.spawnMarker).setDepth(Depth.effects).setAlpha(0.2));
    this.tweens.add({ targets: markers, alpha: 1, duration: 220, yoyo: true, repeat: -1 });
    this.time.delayedCall(Tuning.room.enemySpawnDelayMs, () => {
      markers.forEach((m) => m.destroy());
      // A wave that was telegraphed while the upgrade panel opened still arrives.
      if (this.phase !== "playing" && this.phase !== "reward") return;
      for (const { spec, at } of placements) {
        const scaled = scaleForDifficulty(ENEMY_STATS[spec.kind], this.level.difficulty);
        const enemy = new Enemy(this, this.enemyGroup, at.x, at.y, spec.elite ? makeElite(scaled) : scaled, this.simTime);
        this.enemies.push(enemy);
        onSpawn?.(enemy);
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
    this.enemiesDefeated++;
    this.coinPickups.drop(enemy.position, enemyCoins(enemy.stats.kind, enemy.stats.elite));
    const points = enemyScore(enemy.stats.kind, enemy.stats.elite, this.level.number);
    this.addScore(points, enemy.position);
    this.room = enemyDefeated(this.room);
    if (!canExit(this.room)) return;

    this.addScore(roomClearScore(this.level.number, this.isFinalRoom), null);
    this.coinPickups.attract(); // the room is safe: leftover coins fly in
    this.refreshDoors();
    // Refresh now: the upgrade panel / victory stop update() before its own HUD refresh.
    this.updateHud();
    if (this.isFinalRoom && isFinalLevel(this.run, ROOMS_PER_LEVEL)) {
      this.victory();
      return;
    }
    if (this.isFinalRoom) this.hud.banner("LEVEL CLEAR", "The way down is open", "#7dff9b", true);
    else this.hud.banner("ROOM CLEAR", "The door is open", "#7dff9b");
    if (this.levelRoom.reward) this.offerUpgrade();
  }

  /** A 3-frame bright square at the gun tip; emissive, so visible in the dark. */
  private muzzleFlash(): void {
    const { x, y } = this.player.position;
    const aim = this.player.aim;
    const flash = this.add
      .image(x + aim.x * 11, y + aim.y * 11 + 1, Tex.spark)
      .setScale(2.5)
      .setTint(0xfff2a8)
      .setDepth(Depth.projectiles);
    this.tweens.add({ targets: flash, alpha: 0, scale: 1, duration: 50, onComplete: () => flash.destroy() });
  }

  private addScore(points: number, at: Vec2 | null): void {
    this.score += points;
    if (!at) return;
    const popup = this.add
      .text(at.x, at.y - 8, `+${points}`, { fontFamily: FONT_FAMILY, fontSize: "9px", color: PALETTE.accent, fontStyle: "bold" })
      .setOrigin(0.5)
      .setStroke("#05070d", 3)
      .setDepth(Depth.effects);
    this.tweens.add({ targets: popup, y: at.y - 26, alpha: 0, duration: 700, onComplete: () => popup.destroy() });
  }

  /** Freezes the room and shows the three-choice panel (after the clear banner). */
  private offerUpgrade(): void {
    if (this.panel || this.phase === "reward") return; // never stack two panels
    const choices = rollUpgradeChoices(this.upgrades, Math.random);
    if (choices.length === 0) return; // everything is capped
    this.phase = "reward";
    this.player.halt();
    this.enemyShots.clear();
    this.time.delayedCall(450, () => {
      if (this.phase !== "reward") return;
      this.physics.pause();
      this.panel = new UpgradePanel(this, choices, this.upgrades, (id) => this.chooseUpgrade(id));
    });
  }

  private chooseUpgrade(id: UpgradeId): void {
    this.panel = null;
    playFx(this, "na-magic-spark", "magicSpark", this.player.position.x, this.player.position.y - 4, Depth.effects);
    this.upgrades = applyUpgrade(this.upgrades, id);
    this.refreshStats();
    this.player.body.enable = true;
    this.physics.resume();
    // Drop key presses made while the panel was open (e.g. a "1" or Space).
    this.input.keyboard?.resetKeys();
    this.phase = "playing";
    this.updateHud();
  }

  /** Locked doors block movement and bullets; cleared rooms remove them. */
  private refreshDoors(): void {
    const open = canExit(this.room);
    if (open) this.doors.clear(true, true);
    this.refreshSolids();
    this.flowDirty = true;

    this.doorGfx.clear();
    for (const s of this.doorSprites) s.destroy();
    this.doorSprites = [];
    for (const d of this.layout.doorRects) {
      if (open) {
        this.doorGfx.lineStyle(2, 0x7dff9b, 0.9).strokeRect(d.x + 1, d.y + 1, d.width - 2, d.height - 2);
      } else if (this.art === "ninja") {
        // One keyhole door block per tile, above the darkness like all door state.
        const door = TILE_FRAMES.lockedDoor;
        for (let y = d.y; y < d.y + d.height; y += TILE) {
          for (let x = d.x; x < d.x + d.width; x += TILE) {
            this.doorSprites.push(this.add.image(x + TILE / 2, y + TILE / 2, sheetKey(door.sheet), door.frame).setDepth(Depth.effects));
          }
        }
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

  /** What blocks bullets and sight: walls, props, locked doors, closed gates. */
  private refreshSolids(): void {
    const fixed = [...this.layout.wallRects, ...this.staticProps.map((p) => p.rect), ...this.objectRects];
    this.solidRects = [...fixed, ...this.dynamicSolids()];
    this.playerSolids = [...fixed, ...this.gateAndDoorRects()];
  }

  private nearbyOpenDoor(): Rect | null {
    if (!canExit(this.room)) return null;
    const p = this.player.position;
    return this.layout.doorRects.find((d) => pointInRect(p, expandRect(d, Tuning.room.doorInteractRange))) ?? null;
  }

  private exitRoom(): void {
    if (this.phase !== "playing" || this.leaving) return;
    if (this.showcase) {
      // The test room loops: leaving reloads it with the same theme.
      this.leaving = true;
      this.scene.restart({ ...newRun(Tuning.player.maxHealth), showcase: this.showcase });
      return;
    }
    if (this.testmap) {
      this.leaving = true;
      this.scene.restart({ ...newRun(Tuning.player.maxHealth), testmap: this.testmap });
      return;
    }
    if (this.village) {
      // Through the gate: a fresh run starts at level 1 (score and timer from zero).
      this.phase = "exiting";
      this.leaving = true;
      this.player.halt();
      this.doorPrompt.setVisible(false);
      this.cameras.main.fadeOut(Tuning.room.transitionFadeMs, 5, 7, 13);
      this.time.delayedCall(Tuning.room.transitionFadeMs + 20, () => this.scene.restart(newRun(Tuning.player.maxHealth)));
      return;
    }
    const next = advanceRun(this.currentRun(), ROOMS_PER_LEVEL, this.player.health.current, this.stats.maxHealth);
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
    const result = this.player.takeHit(amount, from, this.simTime);
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
    this.finishRun("defeat", this.run.roomsCleared, 700);
  }

  private victory(): void {
    this.phase = "victory";
    this.player.halt();
    this.endRun();
    this.addScore(SCORE.victory, null);
    this.updateHud();
    this.finishRun("victory", this.run.roomsCleared + 1, 1100);
  }

  /** Records the best score (never throws on storage errors) and shows results. */
  private finishRun(outcome: RunResult["outcome"], roomsCleared: number, delayMs: number): void {
    const storage = browserStorage();
    const kept = coinsKept(this.coins, outcome);
    const merged = recordRun(loadSave(storage), this.score, this.level.number, kept);
    const saved = writeSave(storage, merged.save);
    const result: RunResult = {
      coinsEarned: this.coinsEarned,
      coinsKept: kept,
      bank: merged.save.coins,
      outcome,
      score: this.score,
      levelReached: this.level.number,
      levelName: this.level.name,
      runTimeMs: this.runTimeMs,
      enemiesDefeated: this.enemiesDefeated,
      roomsCleared,
      best: { bestScore: merged.save.bestScore, bestLevel: merged.save.bestLevel },
      newBestScore: merged.newBestScore,
      saved,
    };
    this.time.delayedCall(delayMs, () => this.scene.launch("results", result));
  }

  /**
   * Quitting from pause counts as a death for coins: half of the pocket coins
   * are banked. The score is not recorded (as before). Never throws.
   */
  abandonRun(): void {
    if (this.phase === "gameOver" || this.phase === "victory") return;
    const storage = browserStorage();
    writeSave(storage, recordRun(loadSave(storage), 0, 0, coinsKept(this.coins, "quit")).save);
    this.coins = 0;
  }

  /** Dev-only diagnostics used to verify that restarts/transitions leave nothing behind. */
  debugSnapshot(): Record<string, number | string> {
    const world = this.physics.world;
    const listeners = (e: Phaser.Events.EventEmitter): number =>
      e.eventNames().reduce((n, name) => n + e.listenerCount(name), 0);
    return {
      phase: this.phase,
      upgradePanelOpen: this.panel ? 1 : 0,
      level: this.level.number,
      roomIndex: this.run.roomIndex,
      layout: this.levelRoom.layout.id,
      roomsCleared: this.run.roomsCleared,
      roomPhase: this.room.phase,
      enemiesRemaining: this.room.enemiesRemaining,
      playerHp: `${this.player.health.current}/${this.player.health.max}`,
      score: this.score,
      enemiesDefeated: this.enemiesDefeated,
      runTimeMs: Math.round(this.runTimeMs),
      simTime: Math.round(this.simTime),
      upgrades: Object.entries(this.upgrades)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}:${v}`)
        .join(","),
      enemies: this.enemies.map((e) => `${e.stats.elite ? "elite-" : ""}${e.stats.kind}:${e.health.current}`).join(","),
      enemiesActive: this.enemyGroup.countActive(true),
      playerBullets: this.playerShots.count,
      enemyBullets: this.enemyShots.count,
      coins: this.coins,
      coinsEarned: this.coinsEarned,
      coinPickups: this.coinPickups.count,
      weapon: this.weapon,
      npcs: this.npcs?.count ?? 0,
      shopOpen: this.shop ? 1 : 0,
      dialogOpen: this.dialog ? 1 : 0,
      village: this.village ? 1 : 0,
      dummyHits: this.world?.dummyHits ?? 0,
      solidRects: this.solidRects.length,
      breakables: this.world?.count ?? 0,
      animatedActive: this.world?.activeAnimated ?? 0,
      critters: this.critters?.count ?? 0,
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

/** Light sources among placed objects (campfires, spirit fires). */
function objectLights(objects: readonly ResolvedObject[]): TorchLight[] {
  return objects.flatMap((o) => {
    const def: DecorDef = DECOR[o.id];
    if (!def.light) return [];
    const x = (o.col + def.w / 2) * TILE;
    const y = (o.row + def.h / 2) * TILE;
    return [{ flame: { x, y: y - 3 }, pool: { x, y }, seed: (o.col * 92821 + o.row * 68917) % 1000, color: def.light.color, radius: def.light.radius, showFlame: def.light.flame }];
  });
}
