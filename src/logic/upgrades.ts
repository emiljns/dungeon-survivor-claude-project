// Upgrade rules: six upgrade types with per-type caps, the player stats they
// produce, and the three-choice offer. Pure and RNG-injected for testing.

export type UpgradeId = "damage" | "fireRate" | "projectileSpeed" | "moveSpeed" | "maxHealth" | "extraProjectile";

export type UpgradeLevels = Readonly<Record<UpgradeId, number>>;

export interface UpgradeDef {
  readonly id: UpgradeId;
  readonly name: string;
  readonly description: string;
  readonly maxLevel: number;
}

export const UPGRADES: readonly UpgradeDef[] = [
  { id: "damage", name: "Heavy Rounds", description: "+50% bullet damage", maxLevel: 3 },
  { id: "fireRate", name: "Quick Trigger", description: "Fire 15% faster", maxLevel: 3 },
  { id: "projectileSpeed", name: "Rifled Barrel", description: "+20% bullet speed", maxLevel: 2 },
  { id: "moveSpeed", name: "Light Boots", description: "+10% move speed", maxLevel: 2 },
  { id: "maxHealth", name: "Iron Heart", description: "+1 max HP and heal 1", maxLevel: 3 },
  { id: "extraProjectile", name: "Split Shot", description: "+1 bullet in a narrow fan", maxLevel: 2 },
];

export const UPGRADE_IDS: readonly UpgradeId[] = UPGRADES.map((u) => u.id);

export const NO_UPGRADES: UpgradeLevels = {
  damage: 0,
  fireRate: 0,
  projectileSpeed: 0,
  moveSpeed: 0,
  maxHealth: 0,
  extraProjectile: 0,
};

export function upgradeDef(id: UpgradeId): UpgradeDef {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) throw new Error(`Unknown upgrade ${id}`);
  return def;
}

export interface BaseStats {
  readonly damage: number;
  readonly fireIntervalMs: number;
  readonly bulletSpeed: number;
  readonly moveSpeed: number;
  readonly maxHealth: number;
}

export interface PlayerStats extends BaseStats {
  readonly projectiles: number;
  /** Angle between neighbouring bullets in a fan, radians. */
  readonly spreadRad: number;
}

export const STAT_LIMITS = {
  minFireIntervalMs: 70,
  maxBulletSpeed: 700,
  maxMoveSpeed: 150,
  maxHealth: 8,
  maxProjectiles: 3,
} as const;

/** Clamps every level into [0, maxLevel]; unknown/garbage values become 0. */
export function sanitizeUpgrades(data: unknown): UpgradeLevels {
  const src = typeof data === "object" && data !== null ? (data as Partial<Record<UpgradeId, unknown>>) : {};
  const out: Record<UpgradeId, number> = { ...NO_UPGRADES };
  for (const def of UPGRADES) {
    const v = src[def.id];
    out[def.id] = typeof v === "number" && Number.isInteger(v) ? Math.min(def.maxLevel, Math.max(0, v)) : 0;
  }
  return out;
}

/** Final player stats for a set of upgrade levels, clamped to safe bounds. */
export function computeStats(base: BaseStats, levels: UpgradeLevels): PlayerStats {
  const l = sanitizeUpgrades(levels);
  return {
    damage: base.damage * (1 + 0.5 * l.damage),
    fireIntervalMs: Math.max(STAT_LIMITS.minFireIntervalMs, Math.round(base.fireIntervalMs * 0.85 ** l.fireRate)),
    bulletSpeed: Math.min(STAT_LIMITS.maxBulletSpeed, base.bulletSpeed * (1 + 0.2 * l.projectileSpeed)),
    moveSpeed: Math.min(STAT_LIMITS.maxMoveSpeed, base.moveSpeed * (1 + 0.1 * l.moveSpeed)),
    maxHealth: Math.min(STAT_LIMITS.maxHealth, base.maxHealth + l.maxHealth),
    projectiles: Math.min(STAT_LIMITS.maxProjectiles, 1 + l.extraProjectile),
    spreadRad: (8 * Math.PI) / 180,
  };
}

export function canUpgrade(levels: UpgradeLevels, id: UpgradeId): boolean {
  return levels[id] < upgradeDef(id).maxLevel;
}

/** Raises exactly one upgrade by one level; a capped upgrade is unchanged. */
export function applyUpgrade(levels: UpgradeLevels, id: UpgradeId): UpgradeLevels {
  if (!canUpgrade(levels, id)) return levels;
  return { ...levels, [id]: levels[id] + 1 };
}

/**
 * Up to `count` distinct, not-yet-capped upgrades in random order.
 * `random` returns [0, 1) like Math.random (injected for tests).
 */
export function rollUpgradeChoices(levels: UpgradeLevels, random: () => number, count = 3): UpgradeId[] {
  const pool = UPGRADE_IDS.filter((id) => canUpgrade(levels, id));
  // Fisher–Yates shuffle, then take the first `count`.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    const a = pool[i];
    const b = pool[j];
    if (a !== undefined && b !== undefined) {
      pool[i] = b;
      pool[j] = a;
    }
  }
  return pool.slice(0, Math.max(0, count));
}
