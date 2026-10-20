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

## Change policy

Before changing an approved requirement, explain the problem, propose
the change, and note scope/test impact.
