# Implementation Tasks

Complete in order and keep the game launchable at each milestone.

## Milestone 0 --- Setup

-   [x] Inspect repo and report baseline.
-   [x] Set up Phaser, Vite, TypeScript strict mode, and a compatible Vitest version.
-   [x] Add dev/typecheck/test/build scripts and a committed lockfile.
-   [x] Add at least one meaningful pure-logic test; use explicit Vitest imports unless globals are intentionally configured.
-   [x] Boot a simple menu/canvas. **Acceptance:** app launches; typecheck, tests, and build work.

## Milestone 1 --- Combat prototype

-   [x] Placeholder arena floor/walls.
-   [x] WASD movement with normalized diagonals.
-   [x] Mouse aim and hold-to-shoot.
-   [x] Projectile physics and wall collision.
-   [x] One chaser enemy.
-   [x] Player/enemy health and visible damage feedback.
-   [x] Game-over state and UI when player health reaches zero.
-   [x] Restart a clean run without stale entities or duplicate listeners.
    **Acceptance:** move, aim, shoot, hit walls/enemy, take damage,
    reach game over, and restart successfully. Game over and restart are
    mandatory.

## Milestone 2 --- Room and physics

-   [x] Static obstacle collision for player and enemies.
-   [x] Room-clear state and exit/door.
-   [x] Reusable room definitions/transitions.
-   [x] Dash and cooldown. **Acceptance:** clear a room and exit; no
    broken collisions after transition.

## Milestone 3 --- Five levels

-   [x] Chaser, Tank and Ranged enemies.
-   [x] Level data for all five themes.
-   [x] 3--5 room definitions per level, reusing layouts as appropriate.
-   [x] Level 5 final encounter.
-   [x] Level transitions and level banners. **Acceptance:** complete
    Levels 1--5 in order.

## Milestone 4 --- Upgrades and results

-   [x] Score, enemies defeated and run time.
-   [x] XP/currency or room reward loop.
-   [x] Three-choice upgrade panel.
-   [x] Damage, fire-rate, projectile-speed, movement-speed, max-health
    and extra-projectile upgrades.
-   [x] HUD, pause, game-over, victory, retry/menu.
-   [x] Persistent local best score and best level. **Acceptance:**
    upgrades affect gameplay; run produces correct results.

## Milestone 5 --- Lighting and polish

-   [x] Consistent pixel-like placeholder art.
-   [x] Cached ellipse/blob shadows.
-   [x] Dark overlay and cheap radial light pools.
-   [x] Torch/prop glow and optional vignette.
-   [ ] Optional foreground occlusion. (Not implemented: optional; see DECISIONS.md.)
-   [x] Check readability/performance with many entities.
    **Acceptance:** atmosphere improves without obscuring threats or
    harming performance.

## Milestone 6 --- Release

-   [x] Play through all five levels to victory and test game over.
-   [x] Verify restart/transition cleanup.
-   [x] Verify storage failures do not crash.
-   [x] Run typecheck, tests and production build.
-   [x] Document controls/run instructions and known issues.
    **Acceptance:** stable playable five-level prototype.

## Milestone 7 --- Real sprites (post-v1, approved by the user)

Art: Ninja Adventure asset pack by Pixel-boy and AAA (CC0). Gameplay,
collision boxes, room layouts and combat behaviour stay unchanged.

-   [x] Asset manifest (file, frames, source, licence) and `CREDITS.md`.
-   [x] Boot scene that loads the art, with placeholder art as fallback.
-   [x] Animated player, enemies and boss (4-direction walk), shuriken
    and enemy projectiles, hit/death/dash/torch effects.
-   [x] Walls, floors, props and doors per level theme (walls: pack brick +
    generated edges; see DECISIONS.md).
-   [x] One polished test room (`?artroom`), built. Awaiting the user's
    review before rollout.
-   [ ] Roll out to all rooms and levels; verify readability, lighting
    and performance; hitboxes unchanged (tested).
    **Acceptance:** the whole game uses the new art with identical
    gameplay; tests and build pass.

## Post-v1 only

Real sprite replacement, new weapons, extra enemy patterns, online
leaderboards, gamepad/mobile support, additional bosses/audio. Do not
implement without approval.
