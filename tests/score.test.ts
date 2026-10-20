import { describe, expect, it } from "vitest";
import { enemyScore, formatTime, levelMultiplier, roomClearScore, SCORE } from "../src/logic/score.ts";
import {
  EMPTY_RECORD,
  loadBest,
  mergeBest,
  parseRecord,
  saveBest,
  STORAGE_KEY,
  type StorageLike,
} from "../src/systems/HighScoreStore.ts";

describe("score", () => {
  it("scales enemy points by level (+25% per level)", () => {
    expect(levelMultiplier(1)).toBe(1);
    expect(levelMultiplier(5)).toBe(2);
    expect(enemyScore("chaser", false, 1)).toBe(100);
    expect(enemyScore("chaser", false, 5)).toBe(200);
    expect(enemyScore("tank", false, 3)).toBe(375);
  });

  it("elites are worth triple, the boss is worth the most", () => {
    expect(enemyScore("chaser", true, 1)).toBe(300);
    expect(enemyScore("boss", false, 5)).toBe(SCORE.enemy.boss * 2);
    expect(enemyScore("boss", false, 5)).toBeGreaterThan(enemyScore("tank", true, 5));
  });

  it("level clears are worth more than room clears", () => {
    expect(roomClearScore(1, false)).toBe(200);
    expect(roomClearScore(1, true)).toBe(1000);
    expect(roomClearScore(4, true)).toBe(1750);
  });

  it("clamps nonsense level numbers", () => {
    expect(levelMultiplier(0)).toBe(1);
    expect(levelMultiplier(99)).toBe(2);
    expect(levelMultiplier(Number.NaN)).toBe(1);
  });

  it("formats run time as mm:ss", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(61_999)).toBe("01:01");
    expect(formatTime(3_725_000)).toBe("62:05");
    expect(formatTime(-5)).toBe("00:00");
  });
});

/** In-memory storage with switchable failure modes. */
function memoryStorage(initial: Record<string, string> = {}, fail: { get?: boolean; set?: boolean } = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem(k) {
      if (fail.get) throw new Error("SecurityError");
      return k in data ? (data[k] ?? null) : null;
    },
    setItem(k, v) {
      if (fail.set) throw new Error("QuotaExceededError");
      data[k] = v;
    },
  };
}

describe("high score storage", () => {
  it("missing: no saved record loads as empty", () => {
    expect(loadBest(memoryStorage())).toEqual(EMPTY_RECORD);
  });

  it("valid: round-trips a saved record", () => {
    const store = memoryStorage();
    expect(saveBest(store, { bestScore: 12345, bestLevel: 4 })).toBe(true);
    expect(loadBest(store)).toEqual({ bestScore: 12345, bestLevel: 4 });
    expect(JSON.parse(store.data[STORAGE_KEY] ?? "")).toEqual({ bestScore: 12345, bestLevel: 4 });
  });

  it("malformed: bad JSON or bad fields load as empty / zeroed", () => {
    expect(parseRecord("{not json")).toEqual(EMPTY_RECORD);
    expect(parseRecord("null")).toEqual(EMPTY_RECORD);
    expect(parseRecord('"hello"')).toEqual(EMPTY_RECORD);
    expect(parseRecord('{"bestScore":-5,"bestLevel":9}')).toEqual(EMPTY_RECORD);
    expect(parseRecord('{"bestScore":"lots","bestLevel":2}')).toEqual({ bestScore: 0, bestLevel: 2 });
    expect(parseRecord('{"bestScore":1e999}')).toEqual(EMPTY_RECORD); // Infinity
  });

  it("unavailable: throwing or missing storage never throws to the game", () => {
    expect(loadBest(memoryStorage({}, { get: true }))).toEqual(EMPTY_RECORD);
    expect(saveBest(memoryStorage({}, { set: true }), { bestScore: 1, bestLevel: 1 })).toBe(false);
    expect(loadBest(null)).toEqual(EMPTY_RECORD);
    expect(saveBest(null, { bestScore: 1, bestLevel: 1 })).toBe(false);
  });

  it("merging only ever improves each field and flags a new best score", () => {
    const prev = { bestScore: 5000, bestLevel: 3 };
    expect(mergeBest(prev, 4000, 4)).toEqual({ record: { bestScore: 5000, bestLevel: 4 }, newBestScore: false });
    expect(mergeBest(prev, 6000, 2)).toEqual({ record: { bestScore: 6000, bestLevel: 3 }, newBestScore: true });
    expect(mergeBest(prev, 5000, 3).newBestScore).toBe(false); // ties are not a new best
    expect(mergeBest(EMPTY_RECORD, Number.NaN, 99).record).toEqual({ bestScore: 0, bestLevel: 5 });
  });
});
