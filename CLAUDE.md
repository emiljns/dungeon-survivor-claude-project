# Claude Code instructions --- Ninja Survivor

You are the sole implementation agent. The user wants to test Claude
Code's capabilities, so work autonomously within this scope, explain
decisions, and report real test outcomes. **Do not delegate to other
agents, subagents, or other models.** Do not spawn parallel coding
agents.

## Read first

Read `docs/GAME_DESIGN.md`, `docs/TECHNICAL_ARCHITECTURE.md`,
`docs/TASKS.md`, and `docs/TEST_PLAN.md`.

## Source of truth and scope

The written **v2** specification in `docs/GAME_DESIGN.md` is
authoritative. It was approved by the user on 2026-10-20 and replaces v1
(archived in `docs/archive/GAME_DESIGN_V1.md`). The concept images are
mood inspiration only; they do not add mechanics, UI, assets, or folder
structure to the requirements.

v2 approved these scope changes, which used to be excluded: coins and
currency pickups, a village shop and a travelling merchant, saved coins
and permanent weapon unlocks (meta-progression), and shuriken weapon
variants. See `docs/DECISIONS.md`.

Still explicitly out of scope:
- Minimap, and off-screen enemy or door arrows.
- Ammunition, ammo counters, reloading, or ammo pickups.
- Health drops (until separately approved).
- Procedurally generated rooms, maps or layouts.
- Character selection.
- A Settings menu.
- Any alternative folder layout inferred from the concept images.
- Online features, accounts, multiplayer, online leaderboard, and monetization.

Do not implement excluded features unless the user explicitly approves a
scope change. If a document or image conflicts with the written spec,
follow the written spec and record any material clarification in
`docs/DECISIONS.md`.

## Requirements

- Build an original top-down action roguelite inspired by the broad
  genre, not a clone. Do not reproduce Enter the Gungeon assets,
  characters, room designs, names, or distinctive content.
- A peaceful village prologue, then five levels in order (Bamboo Forest,
  River, Snowy Mountain, Abandoned Village, The Void). Each level is one
  unique, hand-authored continuous map with encounter areas, a mini-boss
  and a final boss, and increasing difficulty. The Void ends with The
  Hollow Warden and the victory screen.
- WASD movement; mouse aim; hold left mouse button to shoot; Space
  dash; E interact; Escape/P pause.
- Implement real 2D physics/collision: walls block movement,
  projectiles collide with walls/enemies, enemies move and damage the
  player, and the player takes damage.
- Art comes from the CC0 Ninja Adventure pack (credited in
  `CREDITS.md`). Copy into `public/assets/ninja/` only the sheets in use,
  each recorded in `src/data/artManifest.ts`. The generated placeholder
  art remains the automatic fallback.
- 16-bit-inspired pixel look, nearest-neighbor/pixelated rendering
  where appropriate, crisp outlines and readable silhouettes.
- Lighting must use inexpensive 2D tricks: floor/wall layers, dark
  overlay/vignette, cached radial gradients, glow, torch pools and
  soft ellipse/blob shadows. No Lumen, Nanite, 3D renderer, ray
  tracing or expensive per-pixel simulation.
- TypeScript strict mode. Avoid `any`; no unnecessary dependencies.
- Save best score locally; storage errors must not crash the game.
- Do not claim checks passed unless actually run. Do not silently
  expand scope. Record material decisions in `docs/DECISIONS.md`.

## Workflow (first run: Milestones 0–1)

1. Inspect the repo before changing files. Check Node.js and npm
   versions. If Git is not initialized, commit the untouched starter
   first, then install dependencies, run the baseline commands, and
   record failures accurately (including missing test files). Do not
   commit `package-lock.json` or other generated files until the
   Milestone 0 commit.
2. Implement Milestone 0 only: resolve tooling, configure scripts,
   add meaningful tests for pure logic, and create a lockfile.
3. Run typecheck, tests, and production build. Fix issues caused by
   your changes and report any remaining failures honestly.
4. Commit the working Milestone 0 state before starting Milestone 1.
5. Implement Milestone 1 only. Keep the app launchable and do not start
   later milestones early.
6. Run typecheck, tests, and production build again; inspect the diff.
7. Update task checkboxes and `docs/DECISIONS.md` to reflect reality.
8. Commit Milestone 1 separately from Milestone 0.
9. Report changed files, commit hashes, commands/results, known issues,
   and the next task. Give exact run/play instructions.

If Git is not initialized, create an initial commit of the untouched
starter before implementation.

If Git identity is not configured, do not change global Git settings.
Report it, continue implementing, and skip all commits; at the end,
list the commits that would have been made. Never claim a commit exists
unless Git confirms it.

For later runs, follow the same pattern for whichever milestone the
user requests: baseline → implement one milestone → verify → update
docs → commit separately → report. Do not start a milestone the user
has not asked for.

## Milestone 1 acceptance criteria

Game over and restart are **required**, not optional. Milestone 1 is
complete only when all of the following work:
- A playable placeholder arena with floor and solid walls.
- WASD movement; diagonal movement is normalized.
- Mouse aiming uses world coordinates so it remains correct if a
  camera is added later.
- Holding the left mouse button fires projectiles.
- Projectiles collide with walls and the chaser enemy.
- The player and enemy have health; damage is visible and the player
  can lose the run.
- Game-over UI appears when player health reaches zero.
- Restart starts a clean run without duplicate input handlers, old
  enemies, stale projectiles, or repeated event listeners.
- Pure game logic has meaningful tests.
- Typecheck, tests, and production build results are reported honestly.

Pay special attention to projectile tunnelling through thin walls.
Test fast projectiles against walls; if Arcade Physics overlap checks
miss collisions, use a swept segment/raycast check or another reliable
approach rather than merely assuming the collision is correct.

## Done means

The five-level run is playable from menu to victory/game-over. Movement,
aim, shooting, dash, enemies, walls, projectiles, upgrades, room/level
transitions and local high score work. Lighting is readable and
inexpensive. Build/tests pass, or failures are reported honestly.
