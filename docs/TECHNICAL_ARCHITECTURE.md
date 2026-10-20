# Technical Architecture

## Stack

-   TypeScript strict mode
-   Phaser 3 (2D rendering, scenes, input, Arcade Physics)
-   Vite
-   Vitest
-   `localStorage` for local best score
-   No backend

## Suggested structure

``` text
src/
  main.ts
  game/       config.ts, types.ts, GameScene.ts, MenuScene.ts, ResultsScene.ts
  entities/   Player.ts, Enemy.ts, Projectile.ts, Pickup.ts
  systems/    RoomManager.ts, LevelManager.ts, UpgradeSystem.ts,
              ScoreSystem.ts, HighScoreStore.ts, LightingSystem.ts
  rendering/  PlaceholderArt.ts, ShadowLayer.ts, LightOverlay.ts
  ui/         Hud.ts, UpgradePanel.ts, ResultsPanel.ts
  data/       levels.ts, enemies.ts, upgrades.ts
tests/         score.test.ts, upgrades.test.ts, level-progression.test.ts
docs/
```

This is guidance, not a requirement to create empty classes. Keep the
architecture proportional.

## Scenes and level model

Menu → gameplay → results/victory. A run contains five ordered level
definitions. Each level has room definitions, wall/obstacle layout,
spawn points, enemy sets, reward and exit. A room-clear unlocks the
exit; completing the final room advances to the next level. If full room
transitions delay a playable prototype, implement one arena per level
first.

## Physics

Use Phaser Arcade Physics and verify installed APIs. Dynamic bodies for
player/enemies/projectiles; static bodies/groups for walls. Handle
player/wall, enemy/wall, projectile/wall, projectile/enemy, and
enemy/player collisions. Prevent duplicate damage in one frame. Destroy
projectiles on impact/timeout. Normalize movement. Reset entities,
timers and listeners on restart/transition.

## Rendering order

1.  Floor/background
2.  Wall base and static props
3.  Blob shadows
4.  Actors, projectiles and pickups
5.  Optional wall/foreground occlusion
6.  Lighting overlay and glow
7.  HUD/menus

## Cheap lighting options

Prototype one robust approach: - Pre-render radial-gradient textures
once and reuse. - Use a dark overlay and a supported render
texture/mask/blend method to reveal light pools. - Fallback: translucent
radial sprites over a darkened floor. - Torch glow uses a few stacked
translucent circles or cached radial textures. - Blob shadows use cached
ellipse textures/simple ellipses. - Keep lights static where possible; a
player light may follow the player if inexpensive. - Do not create a
canvas/texture each frame. Verify blend modes visually.

## Quality gates

Scripts: `npm run dev`, `npm run typecheck`, `npm test`,
`npm run build`. Test pure rules without booting Phaser. Report actual
results.
