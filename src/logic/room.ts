// Room-clear rules and the run state carried across room transitions.

export type RoomPhase = "combat" | "cleared";

export interface RoomState {
  readonly phase: RoomPhase;
  readonly enemiesTotal: number;
  readonly enemiesRemaining: number;
}

/** A room with no enemies (e.g. a start room) is cleared immediately. */
export function startRoom(enemyCount: number): RoomState {
  const total = Math.max(0, Math.floor(enemyCount));
  return { phase: total > 0 ? "combat" : "cleared", enemiesTotal: total, enemiesRemaining: total };
}

export function enemyDefeated(room: RoomState): RoomState {
  if (room.phase === "cleared") return room;
  const enemiesRemaining = Math.max(0, room.enemiesRemaining - 1);
  return { ...room, enemiesRemaining, phase: enemiesRemaining === 0 ? "cleared" : "combat" };
}

export function canExit(room: RoomState): boolean {
  return room.phase === "cleared";
}

/** Data passed to the game scene on every (re)start. */
export interface RunState {
  readonly roomIndex: number;
  readonly playerHealth: number;
  /** Total rooms cleared this run (keeps counting when the sequence loops). */
  readonly roomsCleared: number;
}

export function newRun(maxHealth: number): RunState {
  return { roomIndex: 0, playerHealth: maxHealth, roomsCleared: 0 };
}

/**
 * Validates untrusted scene data. Anything missing or out of range falls back
 * to a fresh run's value, so a bad restart can never load a broken room.
 */
export function sanitizeRunState(data: unknown, roomCount: number, maxHealth: number): RunState {
  const fresh = newRun(maxHealth);
  if (typeof data !== "object" || data === null) return fresh;
  const d = data as Partial<Record<keyof RunState, unknown>>;
  const int = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) ? v : null);

  const roomIndex = int(d.roomIndex);
  const hp = int(d.playerHealth);
  const cleared = int(d.roomsCleared);
  return {
    roomIndex: roomIndex !== null && roomIndex >= 0 && roomIndex < roomCount ? roomIndex : fresh.roomIndex,
    playerHealth: hp !== null && hp >= 1 && hp <= maxHealth ? hp : fresh.playerHealth,
    roomsCleared: cleared !== null && cleared >= 0 ? cleared : fresh.roomsCleared,
  };
}

/**
 * Next room after exiting. Milestone 2 loops the room sequence; Milestone 3's
 * level progression will replace this with ordered levels and an end state.
 */
export function advanceRun(run: RunState, roomCount: number, playerHealth: number): RunState {
  return {
    roomIndex: (run.roomIndex + 1) % Math.max(1, roomCount),
    playerHealth,
    roomsCleared: run.roomsCleared + 1,
  };
}
