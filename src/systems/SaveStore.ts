// Save data v2 (Milestone 10): best score and level, saved coins and
// permanent weapon unlocks, under a new versioned key. Loading validates
// everything and falls back to a fresh save; a missing v2 save migrates the
// v1 best score. Storage errors never throw: saving reports false instead.

import { STARTER_WEAPON, WEAPON_IDS, isWeaponId, type WeaponId } from "../data/weapons.ts";
import { MAX_COINS } from "../logic/economy.ts";
import { loadBest, mergeBest, type StorageLike } from "./HighScoreStore.ts";

export const SAVE_KEY = "ninja-survivor:save:v2";

export interface SaveData {
  readonly version: 2;
  readonly bestScore: number;
  readonly bestLevel: number;
  /** Coins in the bank (spent in the village shop). */
  readonly coins: number;
  /** Permanently unlocked weapons; always includes the starter. */
  readonly unlocks: readonly WeaponId[];
}

export const FRESH_SAVE: SaveData = { version: 2, bestScore: 0, bestLevel: 0, coins: 0, unlocks: [STARTER_WEAPON] };

const nonNegInt = (v: unknown, max: number): number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(max, Math.floor(v)) : 0;

/** Validates a parsed v2 object; null when it is not a v2 save at all. */
export function parseSave(raw: string | null): SaveData | null {
  if (raw === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null || (data as { version?: unknown }).version !== 2) return null;
  const d = data as Partial<Record<keyof SaveData, unknown>>;
  const unlocks = Array.isArray(d.unlocks) ? d.unlocks.filter(isWeaponId) : [];
  return {
    version: 2,
    bestScore: nonNegInt(d.bestScore, Number.MAX_SAFE_INTEGER),
    bestLevel: Math.min(5, nonNegInt(d.bestLevel, 5)),
    coins: nonNegInt(d.coins, MAX_COINS),
    // Known ids only, no duplicates, in catalogue order, starter always owned.
    unlocks: WEAPON_IDS.filter((id) => id === STARTER_WEAPON || unlocks.includes(id)),
  };
}

/** The v2 save; migrates the v1 best score when there is no valid v2 save. */
export function loadSave(storage: StorageLike | null): SaveData {
  if (!storage) return FRESH_SAVE;
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return FRESH_SAVE;
  }
  const save = parseSave(raw);
  if (save) return save;
  const v1 = loadBest(storage);
  return { ...FRESH_SAVE, bestScore: v1.bestScore, bestLevel: v1.bestLevel };
}

/** Returns false (instead of throwing) when storage is missing, full or blocked. */
export function writeSave(storage: StorageLike | null, save: SaveData): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

/** Banks a finished run: best score/level only improve; kept coins are added. */
export function recordRun(prev: SaveData, score: number, levelReached: number, coinsKept: number): { save: SaveData; newBestScore: boolean } {
  const merged = mergeBest({ bestScore: prev.bestScore, bestLevel: prev.bestLevel }, score, levelReached);
  return {
    save: { ...prev, ...merged.record, coins: Math.min(MAX_COINS, prev.coins + Math.max(0, Math.floor(coinsKept))) },
    newBestScore: merged.newBestScore,
  };
}

/** Buys a permanent unlock; unchanged (ok: false) when owned or unaffordable. */
export function buyUnlock(prev: SaveData, id: WeaponId, price: number): { save: SaveData; ok: boolean } {
  if (prev.unlocks.includes(id) || prev.coins < price || price < 0) return { save: prev, ok: false };
  return { save: { ...prev, coins: prev.coins - price, unlocks: WEAPON_IDS.filter((w) => w === id || prev.unlocks.includes(w)) }, ok: true };
}
