// Encounter areas: a region of a map that closes its gates when the player
// steps in, spawns enemies in waves (or as an ambush), and reopens when every
// wave is defeated. Pure rules; the scene owns the Phaser objects.

import type { EnemySpec } from "../data/levels.ts";
import type { TilePos } from "./layout.ts";
import type { Vec2 } from "./vector.ts";

export interface TileRect {
  readonly col: number;
  readonly row: number;
  readonly cols: number;
  readonly rows: number;
}

export interface EncounterDef {
  readonly id: string;
  /** The area: its gates and spawn points are the ones inside this rectangle. */
  readonly area: TileRect;
  /**
   * Where stepping triggers it. Defaults to the area shrunk by
   * TRIGGER_INSET tiles, so gates never close on top of the player.
   * A smaller custom trigger makes an ambush.
   */
  readonly trigger?: TileRect;
  readonly waves: readonly (readonly EnemySpec[])[];
  /** Clearing it offers the upgrade panel. */
  readonly reward: boolean;
}

export const TRIGGER_INSET = 2;
/** The next wave arrives when this many (or fewer) enemies are left. */
export const NEXT_WAVE_AT = 1;
/** Enemies never appear closer than this to the player (pixels). */
export const MIN_SPAWN_DISTANCE = 96;

export type EncounterPhase = "idle" | "active" | "cleared";

export interface EncounterState {
  readonly phase: EncounterPhase;
  /** Index of the latest wave that has been spawned. */
  readonly wave: number;
}

export const IDLE: EncounterState = { phase: "idle", wave: -1 };

export function inRect(p: TilePos, r: TileRect): boolean {
  return p.col >= r.col && p.row >= r.row && p.col < r.col + r.cols && p.row < r.row + r.rows;
}

export function triggerRect(def: EncounterDef): TileRect {
  if (def.trigger) return def.trigger;
  const i = TRIGGER_INSET;
  return { col: def.area.col + i, row: def.area.row + i, cols: Math.max(1, def.area.cols - 2 * i), rows: Math.max(1, def.area.rows - 2 * i) };
}

/** An idle encounter starts when the player stands inside its trigger. */
export function shouldTrigger(def: EncounterDef, state: EncounterState, playerTile: TilePos): boolean {
  return state.phase === "idle" && def.waves.length > 0 && inRect(playerTile, triggerRect(def));
}

/**
 * Advances an active encounter given how many of its enemies are alive
 * (including any still spawning). Returns the wave to spawn now (if any) and
 * whether the encounter is cleared.
 */
export function stepEncounter(
  def: EncounterDef,
  state: EncounterState,
  alive: number,
): { readonly state: EncounterState; readonly spawnWave: number | null; readonly cleared: boolean } {
  if (state.phase !== "active") return { state, spawnWave: null, cleared: false };
  const hasNext = state.wave + 1 < def.waves.length;
  if (hasNext && alive <= NEXT_WAVE_AT) {
    return { state: { phase: "active", wave: state.wave + 1 }, spawnWave: state.wave + 1, cleared: false };
  }
  if (!hasNext && alive === 0) return { state: { phase: "cleared", wave: state.wave }, spawnWave: null, cleared: true };
  return { state, spawnWave: null, cleared: false };
}

/** Starting an encounter spawns its first wave. */
export function startEncounter(): { readonly state: EncounterState; readonly spawnWave: number } {
  return { state: { phase: "active", wave: 0 }, spawnWave: 0 };
}

export function totalEnemies(def: EncounterDef): number {
  return def.waves.reduce((n, w) => n + w.length, 0);
}

/**
 * Chooses spawn positions for `count` enemies: points at least
 * MIN_SPAWN_DISTANCE from the player, farthest first, cycling when there are
 * more enemies than points. If no point is far enough, the farthest ones are
 * used, so a wave always spawns, as far from the player as the area allows.
 */
export function pickSpawnPoints(points: readonly Vec2[], count: number, player: Vec2): Vec2[] {
  if (points.length === 0 || count <= 0) return [];
  const dist = (p: Vec2): number => Math.hypot(p.x - player.x, p.y - player.y);
  const sorted = [...points].sort((a, b) => dist(b) - dist(a));
  const far = sorted.filter((p) => dist(p) >= MIN_SPAWN_DISTANCE);
  const pool = far.length > 0 ? far : sorted.slice(0, 1);
  return Array.from({ length: count }, (_, i) => {
    const p = pool[i % pool.length] ?? sorted[0] ?? player;
    const lap = Math.floor(i / pool.length);
    return { x: p.x + lap * 18, y: p.y };
  });
}
