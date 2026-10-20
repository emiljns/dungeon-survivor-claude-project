# Decisions Log

## Approved

-   Original top-down dungeon shooter inspired by the broad genre, not a
    clone.
-   Five levels played in order.
-   Desktop controls: WASD, mouse aim, hold left-click to shoot, Space
    dash, E interact, Escape/P pause.
-   Placeholder shapes first; sprites later.
-   TypeScript strict, Phaser 3, Vite, Vitest.
-   Real physics/collision required.
-   16-bit-inspired pixel look.
-   Lighting uses cheap layered 2D tricks, cached gradients, overlays,
    glow and blob shadows.
-   Local best score; no backend.

## Open implementation choices

-   Select the Phaser mask/blend approach after a small visual
    prototype.
-   Tune combat values through playtesting.
-   Start with few rooms if needed; prioritize core loop before variety.

## Implementation decisions

### Milestone 0 (2026-10-20)

-   **Baseline (starter as shipped, Node 24.18.0 / npm 11.8.0):**
    `npm run typecheck` passed, `npm test` failed with "No test files
    found" (expected: no tests existed), `npm run build` passed.
    `npm audit` reported 6 vulnerabilities (3 moderate, 1 high,
    2 critical), all inside Vitest 2's dependency tree.
-   **Vitest 2.1.9 → 4.1.11.** Vitest 2 depends on Vite 5, so the
    starter installed two Vite copies (5.4 for tests, 6.4 for the app)
    with different esbuild versions. Vitest 4.1.11 accepts Vite 6, so
    tests and app now share one Vite 6.4.4, and `npm audit` reports 0
    vulnerabilities. 4.1.11 was chosen over the newest 4.1.12 because it
    was older and well established, not days old.
-   **Phaser stays on 3.x (3.90.0)** as the spec requires, even though
    Phaser 4 is published.
-   **Phaser import style:** `import * as Phaser from "phaser"`.
    Phaser's ESM build (`dist/phaser.esm.js`) has only named exports and
    no default export.
-   **No Vitest globals.** Removed `vitest/globals` from `tsconfig.json`
    `types`; tests import `describe`/`it`/`expect` from `vitest`
    explicitly, and the config sets `globals: false`. `types` is now
    `["vite/client"]`.
-   **Vitest config lives in `vite.config.ts`** (via `vitest/config`),
    limited to `tests/**/*.test.ts` in a Node environment. Tests cover
    pure logic in `src/logic/` only and never import Phaser.
-   **Folder layout:** `src/logic/` holds pure, Phaser-free rules
    (unit tested), and `src/game/` holds Phaser scenes and config. This is
    a proportional subset of the suggested architecture. More folders
    are added only when a milestone needs them.
-   **Rendering:** 640×352 logical resolution (40×22 tiles of 16 px),
    `pixelArt: true`, `Scale.FIT`, CSS `image-rendering: pixelated`.
-   Phaser goes into its own build chunk (~1.48 MB, ~340 kB gzip), and
    the chunk warning limit is raised to match.

### Milestone 1 (2026-10-20)

-   **Projectiles do not use Arcade bodies.** Bullets move with a pure
    swept segment test (`src/logic/projectile.ts`, Liang–Barsky against
    wall/target rects inflated by the bullet radius). An Arcade overlap
    only samples end positions, so a fast bullet or a long frame can
    skip a thin wall. The swept test is exact at any speed or frame time
    and is unit tested: 2 px walls at 1,000–200,000 px/s, 250 ms frame
    spikes, 48 approach angles, and bullets spawned inside walls. In the
    browser, 11 bullets fired at a 1-tile interior wall never passed
    x = 302, the wall face minus the bullet radius. The earliest hit
    along the path wins, so a wall shields an enemy standing behind it.
    The spawn offset to the muzzle is swept too.
-   **Player, enemy and walls use Arcade Physics.** The player and
    enemies are dynamic bodies, and walls are a static group of merged
    rectangles (11 bodies instead of ~150 tiles). The colliders are
    player/wall, enemy/wall, and player/enemy (with a damage callback).
    The player body is not pushable, so the chaser separates around the
    player instead of shoving them. Collision bodies are slightly
    smaller than the art.
-   **Contact damage cooldown = player invulnerability window** (900 ms,
    shown by blinking). The rule lives in pure `applyDamage`, which also
    guarantees the death result fires exactly once.
-   **Exactly one chaser at a time.** It respawns 1.5 s after being
    killed, at the enemy spawn farthest from the player, so the arena
    stays a threat and the run can always be lost. It chases in a
    straight line with no pathfinding. It can snag on pillars, which is
    acceptable for M1.
-   **Rooms are ASCII layouts** (`src/data/arenas.ts`, parsed by
    `src/logic/layout.ts`). This is the hand-authored, reusable format
    later milestones will use for per-level room sets. It is not
    procedural.
-   **Restart is clean by construction.** Per-run state is reset in
    `init`/`create` because Phaser reuses the Scene instance. All
    listeners sit on scene-owned plugins that Phaser clears on shutdown,
    with nothing on `window`, `game.events` or `this.events`. This was
    checked in the browser with a dev-only `GameScene.debugSnapshot()`.
    Over 6 restarts and 3 menu round-trips, the counts of colliders,
    bodies, display objects, and input, keyboard, scene and game
    listeners stayed identical, with 0 stale bullets.
-   **Dev-only `window.__game`** (under `import.meta.env.DEV`) exposes the
    game for diagnostics. It does not appear in the production bundle
    (verified by grep). `?debug` in the URL draws physics bodies.
-   **Render depths** are reserved in `config.ts` (`Depth`) for the
    shadow, foreground-occlusion and lighting layers planned in
    Milestone 5. Floor and walls are baked once into a single
    RenderTexture. No lighting is implemented yet.
-   **Deferred to later milestones, as planned:** dash, pause, score,
    upgrades, level progression, high-score storage and lighting.

## Change policy

Before changing an approved requirement, explain the problem, propose
the change, and note scope/test impact.
