// Room-clear rules. Run/level progression lives in progression.ts.

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
