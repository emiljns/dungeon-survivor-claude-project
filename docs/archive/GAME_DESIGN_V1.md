# Dungeon Survivor --- Game Design Document

![Concept reference](../assets/dungeon-survivor-concept.png)

## High concept

A compact top-down, 16-bit-inspired dungeon shooter. Explore rooms,
manually aim and shoot, collect upgrades, and clear five increasingly
difficult levels. Use placeholder geometry until the core game works;
real sprites come later.

## Platform and scope

-   Desktop browser, keyboard and mouse.
-   TypeScript, Phaser 3, Vite.
-   One short run across five levels; offline/local only.
-   Use a small set of reusable room layouts. No procedural generation
    required in v1.
-   No backend, multiplayer, accounts, meta-progression, crafting, or
    online leaderboards.

## Controls

  Input             Action
  ----------------- --------------------------
  WASD              Move
  Mouse             Aim
  Hold left mouse   Shoot
  Space             Dash
  E                 Interact with chest/exit
  Escape / P        Pause/resume

Normalize diagonal movement. Aim must use correct world coordinates.
Prevent browser scrolling during gameplay.

## Core loop

1.  Start at title menu.
2.  Enter Level 1 and clear combat rooms.
3.  Defeat enemies for score and currency/XP.
4.  Choose an upgrade from a simple reward/level-up panel.
5.  Clear the final room and defeat its boss/elite.
6.  Continue through five levels.
7.  Beat Level 5's final encounter; show results and best score.
8.  Restart or return to menu.

## Five level themes

1.  **Dungeon Ruins** --- stone, warm torches, baseline enemies.
2.  **Toxic Sewers** --- teal/green palette, more fast enemies.
3.  **Ancient Temple** --- ochre/gold palette, pillars and tighter
    rooms.
4.  **Forgotten Foundry** --- dark iron, red-orange lights, projectile
    pressure.
5.  **The Void** --- deep blue/purple palette, strongest combinations
    and final boss.

Each level should have a start room, several combat rooms, an
upgrade/reward opportunity, and a final room with exit/elite. Start with
3--5 rooms per level. If needed to ship the first playable build, begin
with one arena per level and expand later.

## Player and physics

-   Normalized top-down movement, health, brief damage feedback, dash
    cooldown.
-   Use Phaser Arcade Physics or an equivalent Phaser-supported 2D
    collision system.
-   Static walls/obstacles block player and enemy movement.
-   Projectiles travel toward aim, collide with enemies/walls, then are
    removed.
-   Enemy contact damage has a cooldown to avoid damage every frame.
-   Dash moves quickly in movement direction, or aim direction if
    stationary; default to brief invulnerability during dash.
-   Collision bodies may be slightly smaller than art to avoid snagging
    on corners.

## Placeholder visuals

Do not use external sprite sheets yet. - Player: blue square/rounded
rectangle with direction indicator/barrel. - Enemies: distinct
shapes/colors (red chaser, amber tank, purple ranged). - Projectiles:
tiny bright squares/circles with short trails. - Walls: dark tiles with
bright edge lines. - Props: crates, barrels, pillars, doors, chests made
from primitives. - Make reusable placeholder drawing/texture helpers so
sprite replacement later does not require rewriting game logic. - Keep
collision/gameplay code separate from visual representation where
practical.

## Cheap lighting and shadows

-   Separate layers: floor/background, walls/props, blob shadows,
    actors/projectiles/pickups, optional foreground occlusion,
    lighting/glow, HUD.
-   Draw soft oval/blob shadows beneath player, enemies and props using
    cached low-opacity ellipse textures.
-   Add a dark translucent overlay, then reveal light pools with cached
    radial gradients and a supported render-texture/mask/blend
    technique. Prototype and verify the technique before building around
    it.
-   Add a few warm radial pools around torches; use additive glow
    sparingly.
-   Optional subtle vignette.
-   Use wall/prop silhouettes as a foreground occlusion layer where
    useful.
-   Keep enemies/projectiles readable. Use a small number of lights,
    cache textures, avoid rebuilding gradients every frame.
-   No Lumen, Nanite, ray tracing, full 3D dynamic shadows or expensive
    per-pixel lighting.

## Enemies

-   **Chaser:** follows player, low health, common.
-   **Tank:** slow, high health, strong contact threat.
-   **Ranged:** keeps distance and fires slow, telegraphed projectiles.
-   **Elite/final boss:** initially reuse an enemy base with higher
    health and a simple attack pattern. Unique boss per level is not
    required.

## Upgrades

One starter gun, no weapon inventory in v1. Upgrade options: - Damage -
Fire rate - Projectile speed - Movement speed - Maximum health - Extra
projectile (limited cap/spread)

Show three distinct options when possible. Each has a clear description.
Clamp stats to sensible bounds.

## Score and UI

Score for enemy defeats and room/level completion. Track score, level,
enemies defeated and run time. Save best score/best level locally in
`localStorage`, validating loaded data and catching storage errors.

Screens: - Title menu with Play and controls. - HUD with health, score,
level, dash cooldown and current reward/upgrade hint. - Level banner. -
Three-choice upgrade panel. - Pause overlay. - Game-over/results with
score, highest level, time, enemies defeated, best score, retry/menu. -
Victory screen after Level 5.

## Visual direction

16-bit-inspired palette, crisp tile edges, limited colors, high
contrast, pixel-like UI borders. Use simple shapes or generated
textures. The concept image is mood reference only, not required to be
recreated exactly.

## Success criteria

Player completes all five levels; movement, shooting, collision, dash,
enemies, upgrades, level progression and results work; cheap
shadows/lighting add depth without hiding threats; high score persists;
build and tests pass.


## Explicit exclusions

The concept image is mood reference only and does not define game scope.
For v1, do not implement a minimap; ammunition, ammo counters, reloading,
or ammo pickups; coins or currency pickups; procedural room generation;
character selection; a Settings menu; or an alternative folder layout
inferred from the image. Rooms are reusable, hand-authored layouts. The
written requirements in this document take precedence over visual details
in the concept image.
