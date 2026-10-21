// Coin rules (Milestone 10): what drops coins, how coins fly to the player,
// what a run keeps, and what the shops sell. Pure and testable.

import { WEAPONS, WEAPON_IDS, type WeaponId } from "../data/weapons.ts";
import type { EnemyKind } from "./enemyStats.ts";
import { canUpgrade, UPGRADES, type UpgradeId, type UpgradeLevels } from "./upgrades.ts";
import type { Vec2 } from "./vector.ts";

/** Coins an enemy drops; tougher enemies drop more, elites double. */
export const ENEMY_COINS: Readonly<Record<EnemyKind, number>> = { chaser: 2, ranged: 3, tank: 5, boss: 30, miniboss: 12 };

export function enemyCoins(kind: EnemyKind, elite: boolean): number {
  return ENEMY_COINS[kind] * (elite ? 2 : 1);
}

/** Coins from a broken pot (1–2) or crate/barrel (2–3). `random` in [0, 1). */
export function breakableCoins(shards: "vase" | "wood", random: () => number): number {
  const base = shards === "vase" ? 1 : 2;
  return base + (random() < 0.5 ? 1 : 0);
}

/** A run's pocket coins that reach the bank: all on victory, half (rounded down) otherwise. */
export function coinsKept(pocket: number, outcome: "victory" | "defeat" | "quit"): number {
  const p = Math.max(0, Math.floor(pocket));
  return outcome === "victory" ? p : Math.floor(p / 2);
}

export const MAX_COINS = 999_999;

// ---- Coin pickups --------------------------------------------------------

export interface CoinState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  /** True once it has started flying to the player (it never stops). */
  readonly magnet: boolean;
}

export const COIN = {
  /** Coins within this distance fly to the player. */
  magnetRadius: 44,
  /** Collected within this distance. */
  pickupRadius: 9,
  /** Scatter speed when dropped, and friction while settling. */
  scatterSpeed: 70,
  friction: 6,
  /** Flight acceleration toward the player and top speed. */
  pull: 900,
  maxSpeed: 260,
} as const;

/** A fresh coin thrown out from `at` in direction `angle`. */
export function dropCoin(at: Vec2, angle: number, speedScale: number): CoinState {
  const s = COIN.scatterSpeed * speedScale;
  return { x: at.x, y: at.y, vx: Math.cos(angle) * s, vy: Math.sin(angle) * s, magnet: false };
}

/**
 * One step. A coin settles with friction until the player comes within the
 * magnet radius (or `attract` is set, e.g. after an area is cleared); then it
 * accelerates toward the player. Returns null when collected.
 */
export function stepCoin(c: CoinState, player: Vec2, dtMs: number, attract: boolean): CoinState | null {
  const t = dtMs / 1000;
  const dx = player.x - c.x;
  const dy = player.y - c.y;
  const d = Math.hypot(dx, dy);
  if (d <= COIN.pickupRadius) return null;
  const magnet = c.magnet || attract || d <= COIN.magnetRadius;
  let { vx, vy } = c;
  if (magnet) {
    vx += (dx / d) * COIN.pull * t;
    vy += (dy / d) * COIN.pull * t;
    const speed = Math.hypot(vx, vy);
    if (speed > COIN.maxSpeed) {
      vx = (vx / speed) * COIN.maxSpeed;
      vy = (vy / speed) * COIN.maxSpeed;
    }
  } else {
    const k = Math.max(0, 1 - COIN.friction * t);
    vx *= k;
    vy *= k;
  }
  const nx = c.x + vx * t;
  const ny = c.y + vy * t;
  // Do not overshoot past the player in one big step.
  if (magnet && Math.hypot(player.x - nx, player.y - ny) <= COIN.pickupRadius) return null;
  return { x: nx, y: ny, vx, vy, magnet };
}

// ---- Shops ----------------------------------------------------------------

export type ShopItemId = `weapon:${WeaponId}` | `upgrade:${UpgradeId}` | "heal";

export interface ShopItem {
  readonly id: ShopItemId;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  /** False when it cannot be bought right now (owned, carried, capped, full health). */
  readonly available: boolean;
  /** Short reason shown instead of the price when unavailable. */
  readonly note?: string;
}

/** Village shop: permanent unlocks for saved coins. */
export function villageStock(unlocks: readonly WeaponId[]): ShopItem[] {
  return WEAPON_IDS.filter((id) => WEAPONS[id].unlockPrice > 0).map((id) => {
    const owned = unlocks.includes(id);
    const w = WEAPONS[id];
    return { id: `weapon:${id}`, name: w.name, description: w.description, price: w.unlockPrice, available: !owned, ...(owned ? { note: "OWNED" } : {}) };
  });
}

/** Price of the next level of a run upgrade from the merchant. */
export function upgradePrice(level: number): number {
  return 15 + 10 * level;
}

export const HEAL_PRICE = 20;

/**
 * Travelling merchant: a heal to full, up to three run upgrades and every
 * unlocked weapon except the one carried. Upgrade offers depend on the
 * level index so different merchants sell different things.
 */
export function merchantStock(
  unlocks: readonly WeaponId[],
  carried: WeaponId,
  upgrades: UpgradeLevels,
  health: { readonly current: number; readonly max: number },
  levelIndex: number,
): ShopItem[] {
  const items: ShopItem[] = [];
  const full = health.current >= health.max;
  items.push({ id: "heal", name: "Healing Tea", description: "Restore all HP", price: HEAL_PRICE, available: !full, ...(full ? { note: "FULL HP" } : {}) });
  const offered = [0, 1, 2].map((i) => UPGRADES[(levelIndex * 2 + i) % UPGRADES.length]);
  for (const u of offered) {
    if (!u) continue;
    const capped = !canUpgrade(upgrades, u.id);
    items.push({
      id: `upgrade:${u.id}`,
      name: u.name,
      description: u.description,
      price: upgradePrice(upgrades[u.id]),
      available: !capped,
      ...(capped ? { note: "MAXED" } : {}),
    });
  }
  for (const id of WEAPON_IDS) {
    if (id === "shuriken" && carried === "shuriken") continue;
    if (WEAPONS[id].unlockPrice > 0 && !unlocks.includes(id)) continue;
    const w = WEAPONS[id];
    const isCarried = id === carried;
    items.push({
      id: `weapon:${id}`,
      name: w.name,
      description: w.description,
      price: w.runPrice,
      available: !isCarried,
      ...(isCarried ? { note: "CARRIED" } : {}),
    });
  }
  return items;
}

/** Whether an item can be bought with `coins` right now. */
export function canBuy(item: ShopItem, coins: number): boolean {
  return item.available && coins >= item.price;
}
