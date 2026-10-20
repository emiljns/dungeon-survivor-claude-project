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

## Change policy

Before changing an approved requirement, explain the problem, propose
the change, and note scope/test impact.
