// Collision box sizes in pixels, independent of the art. Sprites of any size
// are centred on these bodies, so swapping art can never change hitboxes.
// tests/hitboxes.test.ts locks these values.

import type { EnemyKind } from "../logic/enemyStats.ts";

/** Player body (square, centred on the sprite). */
export const PLAYER_BODY = 10;

/** Enemy body size before elite scaling (chasers use a circle of this diameter). */
export const ENEMY_BODY: Readonly<Record<EnemyKind, number>> = { chaser: 12, tank: 16, ranged: 12, boss: 28 };
