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

### Milestone 2 (2026-10-20)

-   **Rooms are hand-authored ASCII layouts** in `src/data/rooms.ts`:
    Entry Hall (safe start room, no enemies), Pillar Hall (3 chasers),
    and Storeroom (4 chasers). New symbols: `D` exit door, `c` crate,
    `b` barrel. Each `E` spawns one enemy. The milestone 1 test arena was
    removed. Unit tests check every room: 40×22, enclosed, exactly one
    door on the outer edge, wall merge coverage, and a flood fill from
    the player spawn that must reach the door and every enemy spawn.
-   **Props (crates/barrels) are static obstacles** in the same static
    group as walls. They block the player, enemies and bullets, and they
    are not destructible in v1.
-   **Room clear → door → E to exit.** A room's door is solid for
    movement and bullets until every enemy is dead (pure `room.ts`
    state). Then its body is removed and E within 14 px of the door
    starts the transition. Enemies appear after a 0.9 s spawn telegraph
    (pulsing markers). The milestone 1 respawning chaser is gone: rooms
    must be clearable.
-   **Transitions = `scene.restart(runState)`.** Every room starts from a
    fresh physics world, reusing the restart path proven in milestone 1.
    Player health and the room index carry over in `RunState`.
    `sanitizeRunState` validates the data and falls back to a fresh run.
-   **Phaser data trap:** `Systems.start` keeps the previous scene data
    when started without data (`if (data) settings.data = data`), so a
    bare `scene.restart()` after a transition would reload the old room
    and health. Game-over restart and Menu → Play therefore always pass
    `newRun(...)`. Verified in the browser: dying in room 2 with reduced
    HP, then R or M → Enter, starts room 1 at full HP.
-   **The room sequence loops** (room 3 → room 1, `roomsCleared` keeps
    counting). This is a temporary stand-in until milestone 3 adds
    ordered levels with an end state.
-   **Dash:** Space, 360 px/s for 150 ms, 750 ms cooldown measured from
    the dash start. It goes in the movement direction, or the aim
    direction when standing still. It is invulnerable while active
    (`takeHit` ignores damage), cancels knockback, and leaves cheap
    afterimage sprites. Dash speed is ~6 px per 60 Hz physics step, so
    Arcade's wall collision cannot be tunnelled. Checked in the browser:
    a dash into the left wall stops at the wall face. The player also
    collides with world bounds, so an open door gap never lets them
    leave the map.
-   **Bug found during self-review:** `Keyboard.JustDown` keeps its flag
    until read. Reading E only near the door would have exited instantly
    if E had been pressed earlier anywhere in the room. E is now read
    every frame. Verified: pressing E away from the door and then walking
    to it does not exit.
-   **HUD:** a dash meter, room number and name, enemies remaining or
    DOOR OPEN, an `[E] EXIT` prompt, and room/clear banners.

### Milestone 3 (2026-10-20)

-   **One data-driven `Enemy` class** (`src/entities/Enemy.ts`) replaces
    `Chaser`. Base stats live in `src/data/enemies.ts`, and pure
    scaling/AI lives in `src/logic/enemyStats.ts` and `src/logic/ai.ts`.
    -   **Chaser:** red circle, walks straight at the player.
    -   **Tank:** amber block, 20 HP, slow, 2 contact damage, not
        pushable.
    -   **Ranged:** purple diamond. It keeps 100–170 px away, strafing
        inside that band, and fires slow magenta orbs. Each shot is
        telegraphed: the enemy stops, blinks and shows an aim line for
        500 ms, and the aim locks when the telegraph starts so the shot
        can be dodged. A windup only starts with line of sight (a swept
        segment against solids), and a started telegraph always fires.
    -   **Elite** (final room of levels 1–4): ×3 HP, +1 contact damage,
        ×1.35 size, +2 bullets per shot and faster attacks.
    -   **Boss** (level 5 final room), named "The Hollow Warden": slow
        chase, telegraphed 10-bullet radial bursts. Below 50% HP it
        enrages to 16 bullets with a 30% shorter cooldown. It has a
        large HUD bar instead of an overhead one.
-   **Enemy bullets reuse `ProjectileSystem`** (generalised with a
    `BulletSpec`), so they get the same swept, non-tunnelling collision
    against walls, props and locked doors. Dashing removes the player
    from enemy-bullet targets, so bullets pass through during a dash.
-   **Levels** (`src/data/levels.ts`): Dungeon Ruins → Toxic Sewers →
    Ancient Temple → Forgotten Foundry → The Void, with 4, 4, 5, 5 and
    5 rooms. Each level is a safe start room, combat rooms, then a final
    Arena with the elite or boss. There are 7 hand-authored layouts,
    reused across levels with different enemy lists, themes and
    difficulty. The milestone 2 layouts are kept.
-   **Difficulty:** enemy health multipliers rise every level
    (1.0 → 1.6). Speed is a theme trait in 1.0–1.25 (the sewers are the
    "fast" level, as the spec asks), and the boss never speeds up. All
    scaled stats are clamped, and tests require every enemy to stay
    slower than the player. Boss base HP was lowered from 110 to 75
    after measuring: the 1.6× multiplier made it 176 HP, about 25 s of
    sustained fire. It is now 120 HP.
-   **Health is restored at the start of each new level** (it still
    carries over between rooms within a level). There are no
    upgrades/healing until milestone 4, and 23 rooms on 5 HP was
    otherwise very punishing. Upgrades may make this unnecessary;
    revisit when tuning.
-   **Progression** (`src/logic/progression.ts`) is strictly ordered:
    `advanceRun` returns next room / next level / victory, and
    `sanitizeRunState` rejects levels or rooms that do not exist.
    Clearing the final room of level 5 is victory; there is no level 6.
-   **Victory screen is minimal** (title, rooms cleared, new run or
    menu). Score, time, best score and the results panel belong to
    milestone 4.
-   **Themes** (`src/data/themes.ts`): per-level floor and wall palettes
    plus the camera background, baked into the room's tile texture.
    Lighting, glow and torches are milestone 5.
-   **Verified in the browser:** a full run through all 23 rooms of
    levels 1–5 in order, ending on the Victory screen. Enemies were
    frozen for this pass and killed with real player bullets; the run
    used real doors and E presses. Every room showed 6 colliders,
    identical listener counts and 0 leftover bullets.
-   **Enemy behaviour verified separately:**
    -   Ranged: telegraph 500 ms → fire → 1900 ms cooldown, and the hit
        cost 1 HP. With a wall between, no windup and no bullets.
        Through a gap at the same distance, it fires.
    -   Dash: dashing through an enemy bullet cost 0 HP; the control
        without a dash cost 1 HP.
    -   Boss: 120 HP, 10-bullet bursts becoming 16 after enrage, boss bar
        shown.
    -   Tank: contact cost 2 HP. Elite chaser: 18 HP, contact 2, scale
        1.35 with a scaled body.

### Milestone 4 (2026-10-20)

-   **Room reward loop, not XP or currency.** Coin/currency pickups are
    excluded from v1, so rewards come from clearing specific rooms.
    `LevelRoom.reward` marks 9 reward rooms per run: the room before
    each level's final room, plus the elite rooms of levels 1–4.
    Clearing the boss room is victory, so it gives no reward. The 9
    rewards are fewer than the 15 total upgrade levels, so a run never
    runs out of choices.
-   **Upgrades** (`src/logic/upgrades.ts`). Each is capped, and each
    changes only its own stat (tested):
    -   Heavy Rounds: +50% damage, cap 3.
    -   Quick Trigger: −15% fire interval, cap 3, floor 70 ms.
    -   Rifled Barrel: +20% bullet speed, cap 2.
    -   Light Boots: +10% move speed, cap 2, so 144 px/s maximum, still
        above every enemy.
    -   Iron Heart: +1 max HP and heal 1, cap 3, max 8 HP.
    -   Split Shot: +1 bullet in an 8° fan, cap 2, 3 bullets maximum.
-   **Three-choice panel:** distinct, not-yet-capped options via a
    Fisher–Yates shuffle with injected randomness. A frequency test
    confirms each upgrade appears in about 50% of rolls. Picking is by
    click or keys 1–3. The room freezes while the panel is open
    (physics paused, the run timer stops), and key presses made during
    it are dropped on close.
-   **Score** (`src/logic/score.ts`):
    -   Enemy base points: chaser 100, ranged 150, tank 250, boss 5000.
        Elites are worth ×3.
    -   Enemy points get ×(1 + 0.25 × (level − 1)).
    -   Room clear +200, and level clear +1000, both level-scaled.
    -   Victory +10,000.
    -   Floating "+N" popups appear on kills.
-   **Simulation clock instead of `time.now`.** Phaser's scene clock is
    the absolute loop time: it stops while the scene is paused, then
    jumps forward on resume, which would instantly expire every
    cooldown and enemy telegraph. Gameplay now uses `simTime`, which
    only advances while playing. The run timer accumulates the same way,
    so it excludes pauses and upgrade panels. Verified: after a 1.5 s
    pause, an enemy cooldown was still pending on resume.
-   **Pause is a `PauseScene` overlay over a paused `GameScene`**
    (Esc/P). It freezes update, physics, timers and tweens together.
    Verified: no change in time, enemy positions or attack timers over
    1.5 s paused. It shows owned upgrades, and M quits to the menu
    (abandoning the run, which is not recorded as a best score).
-   **Phaser 3.90 bug workaround:** `KeyboardPlugin.shutdown` calls
    `game.events.off(BLUR, resetKeys)` *without a context*, removing the
    blur handler of every scene's keyboard, including the running game
    scene's. This was measured: blur listeners went 3 → 4 → 2 after one
    pause. Afterwards, alt-tabbing with a movement key held left it
    stuck down. The pause overlay therefore sleeps and wakes instead of
    stopping. Verified: blur listeners stay constant across pauses, and
    a blur while holding D stops the player.
-   **Results** (`ResultsScene`, over the frozen game): score, highest
    level, time, enemies defeated, rooms cleared, best score, a "NEW
    BEST SCORE!" badge, and retry (R/click) or menu (M). Retry uses
    `scene.start("game", newRun())`, which shuts the old run down
    first. The milestone 3 end overlay was removed.
-   **Best score storage** (`src/systems/HighScoreStore.ts`): key
    `dungeon-survivor:best:v1`, holding `{bestScore, bestLevel}`.
    Storage is injected so the rules are unit tested for missing, valid,
    malformed (bad JSON, wrong types, Infinity, out-of-range level) and
    throwing storage. Each field only improves. In the browser:
    -   With `setItem` throwing, results show "(not saved)" and the game
        keeps running.
    -   With `getItem` throwing, the menu shows "NO BEST SCORE YET".
    -   The best score persists across a page reload.
-   **HUD:** score and run time (top centre), and an "UPGRADE ON CLEAR"
    hint in reward rooms. The menu shows the best score and level.
-   **Testing note:** the in-app browser pane was hidden for parts of
    this session, which pauses `requestAnimationFrame`. For those
    browser checks, the test harness switched the page's Phaser loop to
    its built-in `setTimeout` mode at runtime (`forceSetTimeOut`). No
    game code changed for this, and the game ships with the default
    rAF loop.

## Change policy

Before changing an approved requirement, explain the problem, propose
the change, and note scope/test impact.
