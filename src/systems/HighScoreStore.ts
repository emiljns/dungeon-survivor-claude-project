// Local best score / best level. Storage is injected so the rules are
// testable without a browser, and every storage failure is non-fatal.

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface BestRecord {
  readonly bestScore: number;
  /** Highest level number reached (1–5); 0 when nothing is saved. */
  readonly bestLevel: number;
}

export const STORAGE_KEY = "dungeon-survivor:best:v1";
export const EMPTY_RECORD: BestRecord = { bestScore: 0, bestLevel: 0 };

/** Parses stored JSON, rejecting anything malformed or out of range. */
export function parseRecord(raw: string | null): BestRecord {
  if (raw === null) return EMPTY_RECORD;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY_RECORD;
  }
  if (typeof data !== "object" || data === null) return EMPTY_RECORD;
  const d = data as Partial<Record<keyof BestRecord, unknown>>;
  const score = typeof d.bestScore === "number" && Number.isFinite(d.bestScore) && d.bestScore >= 0 ? Math.floor(d.bestScore) : 0;
  const level =
    typeof d.bestLevel === "number" && Number.isInteger(d.bestLevel) && d.bestLevel >= 0 && d.bestLevel <= 5 ? d.bestLevel : 0;
  return { bestScore: score, bestLevel: level };
}

export function loadBest(storage: StorageLike | null): BestRecord {
  if (!storage) return EMPTY_RECORD;
  try {
    return parseRecord(storage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY_RECORD;
  }
}

/** Merges a finished run into the record; each field only ever improves. */
export function mergeBest(prev: BestRecord, score: number, levelReached: number): { record: BestRecord; newBestScore: boolean } {
  const s = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  const lvl = Number.isInteger(levelReached) ? Math.min(5, Math.max(0, levelReached)) : 0;
  return {
    record: { bestScore: Math.max(prev.bestScore, s), bestLevel: Math.max(prev.bestLevel, lvl) },
    newBestScore: s > prev.bestScore,
  };
}

/** Returns false (instead of throwing) when storage is missing, full or blocked. */
export function saveBest(storage: StorageLike | null, record: BestRecord): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/** The browser's localStorage, or null where even accessing it throws (privacy modes, sandboxed frames). */
export function browserStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}
