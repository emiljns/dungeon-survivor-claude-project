# Test Plan

## Automated

-   Movement normalization helper (diagonal equals cardinal speed).
-   Score and damage calculations.
-   Upgrade application changes only intended stat and respects caps.
-   Level progression is ordered 1--5 and cannot skip/overflow.
-   Room-clear/exit transitions.
-   High-score storage handles missing, valid, malformed and unavailable
    localStorage.
-   Difficulty and health values remain in safe bounds.
-   Fast projectiles do not tunnel through walls (swept/segment check).

## Manual smoke test

1.  Launch from menu.
2.  Move WASD and check diagonal speed.
3.  Aim/shoot toward all screen corners.
4.  Check projectile collisions with walls/enemies and cleanup.
5.  Check enemy movement and wall collisions.
6.  Take damage and verify health/feedback.
7.  Dash near walls and in open space.
8.  Clear room and use exit.
9.  Complete all five level transitions.
10. Choose an upgrade and verify effect.
11. Pause/resume and ensure simulation freezes.
12. Reach game over and Level 5 victory.
13. Restart; ensure no duplicate entities/timers/listeners.
14. Reload and verify best score persists.
15. Check lighting with many entities; keep threats readable.
16. Run typecheck, tests and production build.

For each milestone report changes, commands and outcomes, manual checks,
known bugs, and next task.
