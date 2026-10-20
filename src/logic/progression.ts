// Run progression through five ordered levels of hand-authored rooms.

/** Data passed to the game scene on every (re)start and room transition. */
export interface RunState {
  readonly levelIndex: number;
  /** Room index within the current level. */
  readonly roomIndex: number;
  readonly playerHealth: number;
  readonly roomsCleared: number;
}

export type RunAdvance =
  | { readonly kind: "nextRoom"; readonly run: RunState }
  | { readonly kind: "nextLevel"; readonly run: RunState }
  | { readonly kind: "victory"; readonly roomsCleared: number };

export function newRun(maxHealth: number): RunState {
  return { levelIndex: 0, roomIndex: 0, playerHealth: maxHealth, roomsCleared: 0 };
}

/**
 * Validates untrusted scene data against the level structure. Invalid fields
 * fall back to a fresh run's values; an invalid level resets the room too, so
 * a bad restart can never load a non-existent room.
 */
export function sanitizeRunState(data: unknown, roomsPerLevel: readonly number[], maxHealth: number): RunState {
  const fresh = newRun(maxHealth);
  if (typeof data !== "object" || data === null) return fresh;
  const d = data as Partial<Record<keyof RunState, unknown>>;
  const int = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) ? v : null);

  const level = int(d.levelIndex);
  const levelOk = level !== null && level >= 0 && level < roomsPerLevel.length;
  const levelIndex = levelOk ? level : fresh.levelIndex;
  const room = int(d.roomIndex);
  const roomCount = roomsPerLevel[levelIndex] ?? 0;
  const roomIndex = levelOk && room !== null && room >= 0 && room < roomCount ? room : fresh.roomIndex;
  const hp = int(d.playerHealth);
  const cleared = int(d.roomsCleared);
  return {
    levelIndex,
    roomIndex,
    playerHealth: hp !== null && hp >= 1 && hp <= maxHealth ? hp : fresh.playerHealth,
    roomsCleared: cleared !== null && cleared >= 0 ? cleared : fresh.roomsCleared,
  };
}

export function isFinalRoomOfLevel(run: RunState, roomsPerLevel: readonly number[]): boolean {
  return run.roomIndex === (roomsPerLevel[run.levelIndex] ?? 0) - 1;
}

export function isFinalLevel(run: RunState, roomsPerLevel: readonly number[]): boolean {
  return run.levelIndex === roomsPerLevel.length - 1;
}

/**
 * What happens after the current room is completed. Levels are strictly
 * ordered: rooms advance one at a time, a new level starts at its first room
 * (with health restored), and finishing the last room of the last level is
 * victory — there is no way to skip a level or run past the end.
 */
export function advanceRun(
  run: RunState,
  roomsPerLevel: readonly number[],
  playerHealth: number,
  maxHealth: number,
): RunAdvance {
  const roomsCleared = run.roomsCleared + 1;
  if (!isFinalRoomOfLevel(run, roomsPerLevel)) {
    return { kind: "nextRoom", run: { ...run, roomIndex: run.roomIndex + 1, playerHealth, roomsCleared } };
  }
  if (!isFinalLevel(run, roomsPerLevel)) {
    return {
      kind: "nextLevel",
      run: { levelIndex: run.levelIndex + 1, roomIndex: 0, playerHealth: maxHealth, roomsCleared },
    };
  }
  return { kind: "victory", roomsCleared };
}
