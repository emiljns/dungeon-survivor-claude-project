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

### Milestone 5 (2026-10-20)

-   **Lighting technique: erase-based darkness overlay.** A world-sized
    `RenderTexture` at `Depth.lighting` is filled each frame with the
    theme's tinted darkness. Light pools are then erased out of it with
    one cached 256 px radial-gradient texture, drawn through a pool of
    reusable off-display-list stamp images (position, scale and alpha
    per light) in a single batched `erase`. This was chosen over masks
    and per-pixel shaders: it works in both WebGL and Canvas, it is one
    fill plus one batch per frame, and nothing is created per frame.
    -   **Lights per frame:** the player (theme radius 120–140 px, subtle
        flicker), every torch pool (92 px, flicker), and a small
        "presence" light on each living enemy (30 px at 55%) so threats
        stay visible in dark corners.
    -   **Cached textures** (`LightTextures.ts`): light gradient, blob
        shadow, vignette and pixel flame. Each is generated once per
        game; the texture count holds steady across rooms once each
        theme is seen.
-   **Readability rule:** bullets (both sides), enemy telegraph lines,
    enemy health bars, spawn markers, score popups, muzzle flashes and
    the door state render *above* the darkness. They are emissive, so
    lighting can never hide a threat. Actors stay under it with presence
    lights. Theme darkness is 0.50–0.66, and a test caps it at 0.7. The
    tinted darkness reads better than black. Checked visually in the
    Ruins, Foundry and Void, with enemies placed in the darkest corners.
-   **Torches are hand-authored:** a new layout symbol `T` (a solid wall
    tile with a torch). There are 4–6 per room; each faces its open
    floor neighbour (pure `torchLights`), with a flickering additive
    glow and a tinted pixel flame. Flicker is a deterministic two-sine
    function, so there is no per-frame randomness.
-   **Bug found during visual check:** top-wall torches at columns 7/32
    sat under the score and room label. They moved to columns 17/22,
    flanking the top-centre door. The HUD test now also checks every
    torch (and the boss bar zone) against the HUD zones.
-   **Shadows:** cached soft-ellipse blobs under the player and every
    enemy, sized to the body and following it each frame (an enemy's
    is destroyed on death). Prop shadows and a thin wall-base
    ambient-occlusion strip are baked once into the room's tile
    texture.
-   **Polish:** a muzzle flash (3 frames, emissive) and a vignette.
-   **Performance, measured** in the browser with a stress room (55–71
    live enemies, 85 light stamps, enemy bullets in flight):
    -   Lighting on: average CPU per frame 0.91–1.19 ms, worst 1.8–4.2 ms.
    -   Lighting off: 0.95 ms average, worst 2.4 ms.
    -   The lighting cost is within run-to-run noise, and the 60 fps
        budget is 16.7 ms.
    -   Caveat: this measures CPU time per frame (update plus render
        submission). WebGL GPU work is asynchronous and not fully
        captured, though the overlay is a single 640×352 texture.
-   **`?nolight` URL flag** disables the overlay, glow and vignette for
    debugging and performance comparison. It is a debug flag like
    `?debug`, not a Settings menu.
-   **Foreground occlusion was not implemented.** It is optional in the
    spec. Walls are drawn top-down with front faces and actors never
    walk behind them, so occlusion would add complexity for little
    visual gain.
-   **Transitions:** re-entering rooms keeps object, collider, listener
    and stamp counts identical. The off-display-list stamps are
    destroyed on scene shutdown via a self-removing `once` hook.

### Milestone 6 — release (2026-10-20)

-   **Difficulty unchanged.** The user played the whole game with
    upgrades and beat it, and judged the difficulty good. The planned
    post-upgrade tuning pass therefore changed nothing. The tuning
    knobs are listed in the README.
-   **Hygiene:**
    -   `noUnusedLocals` and `noUnusedParameters` are now enabled in
        `tsconfig.json`. The one finding was an unused
        `GameScene.panel` field, which now guards against stacking two
        upgrade panels and appears in the dev diagnostics.
    -   `npm audit` reports 0 vulnerabilities.
    -   The menu footer reads "v1.0 prototype · placeholder art".
-   **Full run, verified in the browser (dev build):**
    -   Menu → Enter → all 23 rooms in order through real doors and E
        presses, with all 9 upgrade panels picked by key, to the victory
        results. Enemies were frozen for determinism and killed with
        real bullets.
    -   78 enemies defeated, matching the level data exactly. The new
        best score was saved, and listener counts were constant from
        the first room to the last.
-   **Game over:**
    -   A real death by chaser contact, then retry (R): a fresh run in
        room 1 with full HP, score 0 and no upgrades, with counts
        identical to before.
    -   Game over → M → the menu shows the persisted best → Enter
        starts a clean run.
    -   Pause/resume passed 3 of 3 cycles (frozen while paused, time
        advancing after resume).
    -   After retries, the game scene's keyboard blur handler is
        verified present: holding D and then blurring stops the player.
-   **Phaser blur-handler note (extends the milestone 4 workaround):**
    stopping the Results scene (retry/menu) also removes every scene's
    keyboard blur handler. The game scene is always restarted after it
    (queued after the stop), so it re-registers its own. Only the
    sleeping pause overlay's handler is lost, and that one is never
    needed. Verified as above.
-   **Production build, verified:**
    -   `npm run preview` served `dist/`. The menu loaded with no dev
        hook. Real input started a run and walked through the first
        door with W and E.
    -   With `localStorage.setItem` throwing, a real death showed
        "0 (not saved)" with no errors, and the stored record was
        untouched. With `getItem` throwing, the menu still rendered.
    -   No console errors.
-   **Testing artefacts (not game bugs), explained so the logs are not
    misread:**
    -   A hidden in-app pane pauses rAF. The harness then switched the
        page's loop to Phaser's `forceSetTimeOut`, at runtime only.
    -   Phaser counts a new collider only after the next physics step,
        so a snapshot taken right after a transition can show 0
        colliders.
    -   A fixed-wait pause check failed while the loop was throttled.
        Re-tested with state polling, it passed 3 of 3.

### Milestone 7 — real sprites, part 1: pipeline and test room (2026-10-20)

-   **Scope change approved by the user:** real sprites (post-v1). The
    art direction chosen was **Ninja Adventure** by Pixel-boy and AAA,
    for cohesion (one artist) and colour. 0x72 DungeonTileset II and
    Kenney Tiny Dungeon were also considered. All three are CC0,
    verified on their pages; the Ninja pack's bundled `LICENSE.txt` is
    the full CC0 1.0 text. Credit is given in `CREDITS.md` although it
    is not required.
-   **Download handling:** the 89 MB zip was fetched with the user's
    explicit permission from the artist's itch.io page and extracted
    outside the repo. It contains only PNG, GIF, WAV, OGG, TTF, TXT and
    MD files. **Only the 18 sheets used (93 KB) are copied** into
    `public/assets/ninja/`, unmodified, under short names.
    `src/data/artManifest.ts` records each one's original path.
-   **Sprite mapping (approved by the user):**
    -   Player: NinjaBlue.
    -   Chaser: flaming Skull. Tank: Grey Trex (replacing an initial
        red Beast pick, too close in colour to the chaser). Ranged:
        floating Eye.
    -   Boss: GiantSpirit ("The Hollow Warden").
    -   Shots: shuriken (player), fireball (ranged), energy ball (boss).
    -   Effects: hit spark, smoke, explosion, dash dust, animated torch
        fire, upgrade sparkle.
    -   Props: barrel and framed crate. Door: keyhole block.
-   **Seamless floor tiles were picked by measurement, not by eye.** The
    floor blocks are 47-tile "blob" autotile sets in which every tile is
    unique. A first wrap-seam metric picked corridor tiles that produce
    stripes, which was caught in tiled previews. The final choice
    requires no darker border on any side plus wrap continuity, and was
    confirmed visually.
-   **Walls use pack brick, tinted per level, under the generated
    edges, faces and shadows.** The pack's interior wall sets have
    inward-facing pieces only, with no outward corners, so they would
    break on every free-standing pillar. The generated edge pass already
    handles every shape. A full wall autotile can be revisited later.
-   **Gameplay is unchanged by construction.** Hitbox sizes moved to
    `src/data/hitboxes.ts`, locked by tests, and sprites of any size are
    centred on those bodies. Verified live in the test room: player 10,
    chaser 12, tank 16, ranged 12, elite 16.2. Bullet speed, damage,
    radius and lifetime are identical in both art modes; only
    texture/animation fields differ.
-   **Loading:** a new `BootScene` loads the sheets only when sprite art
    is requested, then builds global animations.
    -   **Bug found while testing the fallback:** with a sheet hidden,
        the Vite dev server answered with its HTML page and 200 OK. The
        image failed to decode with no load-error event, so the game
        thought loading succeeded, then crashed building animations and
        hung on Boot.
    -   **Fix:** after loading, `missingArt` verifies each texture
        exists with exactly the expected frame count. Animations are
        built only if all pass; otherwise the game warns, names the
        file, and uses the placeholder art. Re-tested: warning, then the
        menu, with placeholder art.
-   **Opt-in until the user approves:** `?art=ninja` or the test room
    `?artroom` (optionally `&theme=sewers|temple|foundry|void` and
    `&boss`). The default game is verified unchanged: placeholder art,
    and the sheets are not even loaded.
-   **The test room** is the Storeroom layout with props and torches,
    one chaser, tank and ranged enemy, an elite, and optionally the
    boss, under any level theme. It is a normal room with the same
    rules; leaving through the door reloads it.
-   **Lighting:** sprite-art mode uses 75% of each theme's darkness
    (`ART_DARKNESS_SCALE`). The pack is colourful and its floors are
    already dark, so full darkness muted it. Torch flames use the pack's
    animated fire, untinted, while the glow keeps the theme colour.
-   **Verified in the browser (dev):**
    -   Ruins and Void test rooms.
    -   Shuriken flight and hits (tank HP 20 → 12).
    -   An animated fireball rotated to its flight angle.
    -   The boss idle loop with cyan energy-ball bursts and the boss bar.
    -   Readability of every enemy type.

### Milestone 7 — real sprites, part 2: rollout (2026-10-20)

-   **The user approved the test room**, so sprite art is now the
    default (`src/logic/artMode.ts`, tested). `?art=placeholder` opts
    back into the generated shapes. The automatic fallback on missing
    sheets is unchanged.
-   **All five themes reviewed in the test room:** Ruins (dark cobble,
    mauve brick), Sewers (sage ornamental tiles, green glow), Temple
    (golden cobble), Foundry (warm cobble, orange brick, red glow) and
    Void (purple cobble, boss). Every enemy type stays readable in each.
-   **Performance with animated sprites:** the stress room (52–71 live
    enemies, all animating, triple-shot fire, enemy bullets) averaged
    0.88–1.00 ms CPU per frame, worst 2.8–4.0 ms. That is the same range
    as the placeholder shapes in milestone 5.
-   **Gameplay identical, verified by a full run with the new art:**
    menu → Levels 1–5 → victory, 23 rooms, 9 upgrade panels, 78 enemies
    defeated, final score 50,332. These are exactly the milestone 6
    figures. Listener counts were constant (`0/0/53/19`) in every room.
-   **Production build verified:** all 18 sheets fetched with no
    failures; it played from the menu through the first door with real
    input; no console errors and no dev hook.
-   **Driver note:** the boot scene now loads art before the menu
    appears, so the test driver waits for the menu before pressing
    Enter. An early press is ignored, as in real play; it is not a bug.
-   **Menu footer:** "v1.1 · art: Ninja Adventure by Pixel-boy & AAA
    (CC0)". The README now covers art, credits, the URL flags and the
    remaining known issues (audio, wall autotile).

### v2 approved — Ninja Survivor (2026-10-20)

-   **Why:** after the Ninja Adventure art landed, the user observed
    that a colourful, cute pack fights against a dark dungeon setting.
    The rooms also read as "big rectangles with a few objects", reused
    across levels.
-   **What changed:** the design was discussed and agreed with the user
    over several exchanges, and written up as v2 in
    `docs/GAME_DESIGN.md`. The user approved it explicitly. v1 is
    archived in `docs/archive/GAME_DESIGN_V1.md`.
-   **Approved scope changes** (each was previously excluded or
    different in v1):
    -   name: **Ninja Survivor**;
    -   world: a village prologue, then Bamboo Forest, River, Snowy
        Mountain, Abandoned Village and The Void;
    -   one continuous, unique, hand-authored map per level, with
        encounter areas;
    -   a mini-boss with a wave, and a final boss, per level;
    -   one terrain twist per level;
    -   waves and ambushes; pathfinding;
    -   **coins and shops** (previously excluded);
    -   **saved coins and permanent weapon unlocks** (meta-progression,
        previously excluded);
    -   **shuriken weapon variants** (v1: one gun, no inventory);
    -   death keeps half the pocket coins; victory keeps all.
-   **Still excluded:** minimap and off-screen arrows, ammo and
    reloading, health drops, procedural generation, character selection,
    a Settings menu, and online features. `CLAUDE.md` is updated to
    match.
-   **Impact:** delivered as milestones 8–12 in `docs/TASKS.md`, each
    with a test-area review gate. The game stays launchable throughout,
    and the v1 dungeon levels remain playable until replaced.

## Milestone 8 — engine and test map (2026-10-20)

-   **Map format.** Maps reuse the ASCII layout. New symbols: `~` water
    (a low obstacle: blocks walking and paths, not bullets or sight) and
    `G` gate tiles (floor while open). Encounter areas are tile
    rectangles in `src/data/maps.ts`, each with waves and an optional
    small ambush trigger. A gate belongs to the area that contains it;
    tests check that every gate has exactly one owner and that closed
    gates seal each area.
-   **Encounters.** An area triggers once the player is two tiles
    inside it (so a gate never closes on the player). The next wave
    comes when one enemy is left; spawn points are chosen farthest
    first, at least 96 px from the player, and are telegraphed as in v1.
    The room's exit opens when every encounter is cleared. The v1 rooms
    keep their old behaviour (everything spawns at room start), so the
    current game is unchanged.
-   **Pathfinding.** One flow field (BFS from the player's tile) per
    rebuild, recomputed when the player changes tile or a gate/door
    changes, at most every 150 ms. Enemies with a clear line to the
    player steer directly; otherwise they follow the field. This also
    applies to the v1 rooms (enemies there route around pillars instead
    of pressing into them; their attacks are unchanged).
-   **Big bodies.** Found in testing: the tank's 16 px body is exactly
    one tile and snagged on wall corners while following the tile
    field (elites at ×1.35 are larger than a tile). Big bodies use a
    second field that only allows tiles whose 3×3 neighbourhood is
    walkable, and fall back to the normal field where that has no route.
    Hitboxes are unchanged.
-   **Attacks near the screen only.** An enemy starts an attack only
    when it is within 8 px of the camera view and has line of sight.
-   **Camera and lighting.** The camera follows the player with a lean
    of up to 36 px toward the cursor; on screen-sized v1 rooms the
    bounds keep it still. The darkness overlay is now screen-sized
    (plus a 32 px margin that covers one frame of camera movement), and
    lights outside it are skipped.
-   **Tall walls (maps only).** Collision is unchanged: one tile per
    wall cell. Each wall cell draws a darker face in its own cell and its
    top one tile higher in a foreground layer above actors, so actors
    pass behind walls south of them. Hidden actors get a faint
    silhouette. The v1 rooms keep the flat wall look.
-   **Rename.** The game is now titled Ninja Survivor (menu, page title,
    package name, README). The save key stays `dungeon-survivor:best:v1`
    until the v2 save format (Milestone 10) migrates it, so existing
    best scores are kept.
-   **Placeholder water** is drawn as simple blue tiles; Milestone 9
    replaces it with pack art.

## Milestone 9 — world kit (2026-10-20)

-   **New pack sheets** (copied into `public/assets/ninja/`, each in the
    manifest): outdoor floors, nature, water, relief (cliffs), camp,
    water ripples, a plant, a flag, four critters, leaf and snow
    particles, and vase/wood shards. TilesetFloor.png is 417 px tall;
    its stray last row is cropped to 416 px so it divides into tiles
    (noted in `CREDITS.md`).
-   **Outdoor themes**: village, forest, river and snow, each with
    pack ground (a plain tile plus tuft variants picked by a stable tile
    hash), a cliff set and a water-shore set (`src/data/biomes.ts`).
    The dungeon themes keep the brick look. Light follows the day:
    darkness 0 (village), 0.10 (forest), 0.16 (river, warm tint), 0.34
    (snow, dusk), with a lighter vignette. The darkness pass is skipped
    entirely in full daylight. The lighting test now allows daylight for
    outdoor themes only; the dungeon themes must still be dark.
-   **Cliffs and raised ground.** Collision is unchanged (one tile per
    wall cell). A wall above open ground shows a two-tile cliff: the base
    on the ground layer and the lip on the foreground layer. The inside
    of a wall mass is raised ground in a darker tint.
-   **Trees on raised ground.** Found in review: tinted raised ground
    looked like more floor. Trees from the biome's list are now scattered
    deterministically (tile hash, with a few pixels of jitter) over the
    inside of wall masses, never within a tile of open ground. This is
    cosmetic set dressing on walls, not procedural layout: maps stay
    hand-authored.
-   **Water** uses the pack's shore pieces (corners, edges, narrow
    channels), picked from the four neighbours. Inside corners use the
    plain centre, a small simplification. **Bridges** are a new `=`
    layout symbol: plain walkable floor drawn as planks, with the banks
    running underneath. The grass-shore set only matches the yellow
    grass (village and river); the forest's darker grass would show a
    seam, which does not matter because the forest level has no water.
-   **Decoration catalogue** (`src/data/decor.ts`): about 50 objects.
    Each has pack tiles, a size, a kind (solid, walk-over or breakable),
    blocking tiles, walk-behind canopy rows, and optionally a coloured
    light or a looping animation. Maps place them by top-left tile.
    Static objects are baked into the two map textures (decoration
    slightly darker than actors); breakables and animated objects stay
    live sprites. Solid objects block walking, paths, sight and bullets
    on their blocking tiles only (tree trunks, not canopies).
-   **Breakables.** On v2 maps, pots, jars, crates and barrels (and the
    layout's `c`/`b` props) take 1–2 hits, then shatter into pack
    shards. They block enemy bullets, sight and paths while intact.
    Player shots treat them as targets rather than walls, so the hit can
    be counted. Coin drops come in Milestone 10. The v1 rooms keep their
    solid props, so the current game is unchanged.
-   **Coloured lights**: torches and objects can carry their own colour
    and radius (an orange campfire, a blue spirit fire).
-   **Critters** (chicken, cat, frog, fish) wander near home and flee
    the player. They have no body, no health bar and no collisions with
    bullets; fish stay in water. **Particles** (leaves, snow, and
    fireflies and motes for later levels) are a fixed screen-space pool
    with a little parallax. Animated scenery and critters only update
    near the camera.
-   **Silhouettes** now cover tree canopies as well as wall tops.
-   **Test map**: `?testmap=world&theme=forest|village|river|snow`.
    Map tests now include placed objects. Blocking tiles must sit on
    plain floor (never on a gate, door, spawn or the start), objects must
    not overlap, critters must start where they can live, and every
    trigger, spawn and the exit must stay reachable with every object in
    place, breakables included. A mutation check (a rock across the
    corridor) made the reachability test fail as intended.

## Milestone 9 follow-up — distinct biomes (2026-10-21)

-   **User feedback:** "all maps look the same". There were two causes.
    The four themes shared one test layout, and the hand-placed objects
    and critters were identical in every theme: green bushes and
    chickens even appeared in the snow.
-   **Generic objects (slots).** Maps can place `$tree`, `$bigTree`,
    `$grove`, `$rock`, `$bush`, `$flower` or `$pebble`. Each biome
    lists its own variants, picked per tile by a stable hash, so a
    `$tree` is a blossom tree in the village, a pine in the forest and
    a snowy pine on the mountain. Every variant of a slot has exactly the
    slot's footprint, so a map is valid in any biome; a test enforces
    this.
-   **Critters per biome.** Each biome lists the animals that live
    there. **The snowy mountain has none** (user request: "a cat or
    chicken get frozen"); the river has frogs and fish, and the forest
    has frogs and a cat. A map test fails if a map places an animal its
    biome does not allow; the game also filters, as a safety net.
-   **Biome identity:**
    -   **village:** pack houses with walk-behind roofs, huts, dirt lanes;
    -   **forest:** dense, dark wall forest with big oaks and pines,
        darker tints, and green dirt paths;
    -   **river:** olive trees, reeds, a plank bridge;
    -   **snow:** igloos, snowy pillars, a lion statue, a frozen pond,
        snow mounds, trodden-snow paths, and a blue spirit fire.

    Paths are a new `:` layout symbol (walkable, purely visual), drawn
    from the pack's path blocks with the same edge logic as water. Wall
    trees can now be any size, and each biome sets its own density and
    tint.
-   **One test map per biome** (`src/data/worldMaps.ts`, generated by
    the authoring script): a peaceful village with no combat; a forest
    with a winding path into a round hollow; the river map; and a snowy
    pass up to a frozen-lake plateau. All five maps go through the map
    validity tests. Each world map was played through by a script in the
    browser.
-   **New sheet:** TilesetHouse.png as `tiles-house.png` (unmodified).
-   **Not done yet:** walkable ice patches (the snow level's
    slippery-ice twist belongs to Milestone 11), fences, waterfalls and
    lily pads. Gates still use the red bars.

## Milestone 10 — economy (2026-10-21)

-   **Coins.**
    -   Enemies drop coins on death: chaser 2, ranged 3, tank 5, boss
        30, and elites double.
    -   Breakables drop coins too: pots 1–2, crates and barrels 2–3.
    -   Each coin is a pickup that bursts out, settles, and flies to the
        player within 44 px.
    -   When an area or room is cleared, every coin left on the ground
        flies in, so none are lost to a door or gate.
    -   Pocket coins are part of the run state and show in the HUD next
        to the carried weapon.
-   **Banking.** Victory banks all pocket coins. Death banks half,
    rounded down. Quitting from pause also banks half and, as before, does
    not record the score. The results screen shows the coins earned and
    kept, and the bank.
-   **Save v2** (`ninja-survivor:save:v2`) holds the best score, the
    best level, saved coins and unlocks.
    -   Every field is validated: unknown weapons are dropped, and the
        starter weapon is always owned.
    -   A missing or invalid v2 save migrates the v1 best-score key (the
        v1 key is only read, never deleted).
    -   Blocked storage loads a fresh save and never throws.
    -   A purchase that cannot be saved says so and is not kept.
-   **Weapons** (`src/data/weapons.ts`) scale the upgraded stats, so
    every upgrade helps every weapon:
    -   **Shuriken:** the v1 gun exactly.
    -   **Kunai:** fast and narrow, pierces 1 enemy.
    -   **Big Shuriken:** slow and heavy, radius 5, pierces 3.
    -   **Magic Shuriken:** turns up to 2.6 rad/s toward the nearest
        enemy within 170 px.

    Piercing needs stable target IDs, so the projectile system now takes
    an optional ID list and skips targets a bullet has already hit. All
    player shots are shuriken-family sprites (blue, white, purple), never
    like the enemies' fireballs.
-   **Shops** use one panel: a portrait, the balance and up to six items
    (keys 1–6 or a click; Esc or E leaves). The room freezes while the
    panel is open.
    -   **Village shop** (old man): permanent unlocks for saved coins
        (Kunai 60, Magic 100, Big 150).
    -   **Travelling merchant** (pocket coins):
        -   a full heal for 20;
        -   three run upgrades, which differ by level and cost 15 +
            10 × the current level;
        -   every unlocked weapon at run prices (25, 35 or 50). Buying
            one replaces the carried weapon for the rest of the run.

        Every run starts with the shuriken again.
-   **Where the shops are.** The shopkeeper is on the village test map.
    Merchants are in the forest, river and snow arrival areas, and in
    every v1 level's entry hall, so the economy works in the current
    five-level run.
-   **Menu shop.** Until the Home Village prologue (Milestone 11) exists,
    the village shop also opens from the title menu (`S`). It is the
    same panel and the same rules. This is temporary and goes away once
    the village is the way to start a run.
-   **NPCs** block walking but not bullets. The prompt shows within
    24 px, and E talks before it opens doors.
-   **Point-blank shots (bug fix found in the regression run).** A ranged
    enemy pressed against the player could not be hit. Bullets spawn at
    the muzzle, 9 px out, which was already past the enemy, and the
    muzzle step only checked walls. A new bullet's first step now sweeps
    from the shooter's centre (walls along that segment were already
    checked), so point-blank shots hit. This was in v1 too, but rare.
    The v1 regression still ends with the same score.
-   **Bug fix (reported by the user):** after leaving a shop the player
    could not move. Opening a shop halts the player, which disables its
    physics body, and closing the shop never re-enabled it (the upgrade
    panel did). My earlier browser check only looked at the game phase,
    not at movement. Closing now re-enables the body; leaving with Esc,
    with E, and after a purchase were each checked by holding D.
-   **Economy pacing:** a full scripted winning run of the current five
    levels earns 181 coins, roughly the Kunai plus the Magic Shuriken.
    Prices get tuned in Milestone 12.

## Milestone 11 — Home Village prologue (2026-10-21)

-   **Every run begins in the Home Village** (`src/data/village.ts`,
    generated by an authoring script). The menu's Enter and the results
    screen's Retry both lead there. The menu shortcut to the shop
    (Milestone 10) is removed, as planned, together with its scene.
-   **Peaceful and quick.** There are no encounters, enemies, spawn points
    or breakables, so no coins either: "the village never counts". The
    run timer does not advance and the score stays 0. You wake 7 tiles
    from the east gate; pressing E there ("SET OUT") starts a fresh run
    at level 1 with the timer and score from zero. The tutorial is
    optional.
-   **In-world tutorial.**
    -   **Signs** are a new talkable kind: E opens a text box, and E, Esc,
        Enter or a click closes it.
    -   **Training dummies** are a new object kind. They take shots,
        flash and show the damage, and never break.
    -   **A dash lane** has two low fences: a new **hurdle** object
        kind. Hurdles block walking for everyone and block enemy paths,
        but a dashing player crosses them (a collision check that is off
        while dashing), and bullets fly over. The Void's dash-jumps can
        reuse this later. A test checks that the lane's end is
        unreachable without dashing and that a dash is long enough to
        clear a fence.
-   **The village shop** (the old man, with a sign explaining unlocks)
    stands by the main lane, a few steps from the start.
-   **Until the new levels exist**, the gate leads into the current v1
    level 1 (Dungeon Ruins). The Bamboo Forest replaces it next.

## Milestone 11 — Bamboo Forest, level 1 (2026-10-21)

-   **Level 1 is now one continuous map** (`src/data/forestLevel.ts`,
    120×64 tiles, about 8.7 screens), replacing the four Dungeon Ruins
    rooms. A `mapLevel()` helper turns any v2 map into a one-room level
    whose exit opens once every encounter is cleared.
-   **The layout:**
    1.  a safe arrival clearing with the merchant;
    2.  a cramped winding path;
    3.  the round Mushroom Ring (two waves);
    4.  the Bamboo Thicket (an ambush in the middle, with an upgrade);
    5.  the mini-boss glade (an upgrade);
    6.  a long path to the Giant Bamboo's round arena (two rock
        pillars, reinforcement waves); the exit is at its south edge.

    That is two upgrades, as v1 level 1 had, so a run still has 9.
-   **Bestiary** (`src/data/bestiary.ts`): each level can dress the
    behaviour families in its biome's monsters and name its own bosses.
    -   The forest has red spiders (chaser), pandas (tank) and red
        mushrooms (ranged). Red and white were picked because they read
        on green; the green Bamboo monster would blend in.
    -   Levels without a bestiary keep the v1 looks; the Hollow Warden
        stays the level 5 boss.
-   **Mini-boss** is a new enemy kind: the boss pattern scaled down (32
    HP, 6-bullet radial bursts, enrage below half, hitbox 22, locked by
    the hitbox test).
    -   The orange **Young Giant Bamboo** fights with a wave of adds.
    -   The green **Giant Bamboo** is a gentler first boss than the Hollow
        Warden (60 HP, 8-bullet bursts) and comes with two reinforcement
        waves.
    -   The boss bar renames itself when the final boss follows the
        mini-boss.
-   **Forest look:** bamboo (a new 1×2 solid object) dominates the
    raised ground. Closed gates outdoors are brambles (a snow drift in
    the snow) with a thin red edge, instead of the dungeon's red bars.
-   **Small fixes found in review:** a new banner now replaces one still
    showing (two overlapped when the start banner was still up), and
    map levels drop the "ROOM 1/1" counter.
-   **Tests:**
    -   v1 room levels and v2 map levels are checked separately.
    -   Map levels must have a merchant, a mini-boss with adds midway and
        the boss in the last encounter.
    -   Their bestiary sheets must exist.
    -   The boss must outclass its mini-boss.
    -   A run must still have 9 upgrades.
    -   The forest map passes every map validity check (enclosed,
        reachable, sealed areas).
-   **New full-run baseline** (scripted, invulnerable player, with a
    pathfinding driver and no manual help): victory after 20 rooms (the
    forest map plus 19 v1 rooms), score 58,432, 94 kills, 277 coins, and
    stable listener counts.
-   **Balance is for Milestone 12.** A scripted run with an
    invulnerable player cleared the forest in about 3.5 minutes and
    killed both bosses quickly. Real play, with damage taken, will be
    slower.

## Milestone 11 — River, level 2 (2026-10-25)

-   **Level 2 is now one continuous map** (`src/data/riverLevel.ts`,
    120×64 tiles), replacing the four Toxic Sewers rooms. It keeps the
    old level 2 difficulty (health ×1.1, speed ×1.2) for now.
-   **The twist is water.** Channels block walking and enemy paths, but
    bullets fly over them, so fights happen across the water. Plank
    bridges are the only crossings. A test checks this: with the
    bridges removed, the exit cannot be reached on foot.
-   **The layout:**
    1.  a safe camp split by a waterfall stream, with a bridge, and the
        merchant;
    2.  the Ford, a meadow cut by a second stream with two crossings
        (two waves);
    3.  the Watermill hamlet on the main river: an ambush by the
        bridge, with an upgrade, and an exit on the far bank;
    4.  the Frog Pond, where the mini-boss fights around a pond (an
        upgrade);
    5.  the Squid's lagoon, a shore around a lake fed by a waterfall,
        with a pool and reinforcement waves; the exit is south.

    That is two upgrades, as before, so a run still has 9.
-   **Bestiary:** orange axolotls (chaser), red kappa (tank) and
    light-blue octopuses (ranged), so each reads apart from the others
    and from the grass. The mini-boss is the red **Giant Frog** (36 HP,
    7-bullet bursts). The boss is the red **Squid** (70 HP, 10-bullet
    bursts), one step up from the Giant Bamboo. The design table's
    choices are kept (Giant Frog, Squid); the red variants were picked
    for contrast on green.
-   **New scenery:**
    -   A **waterfall** object is a column of three animated tiles. The
        lip and the fall are drawn over the cliff face, above the cliff
        tops, and the splash lands on the water. Tests check that every
        waterfall pours over a cliff face into water.
    -   A turning **mill wheel** stands beside the hamlet's house and
        dips into the river. Its top row blocks.
    -   Animated objects can now be larger than one tile (one sprite
        centred on the object). The decor test checks their frames
        against the footprint instead of the tile grid.
-   **Shore shapes:** the shore autotile needs steps at least two tiles
    long. One-tile bumps on an ellipse-shaped lake and pool drew broken
    edges in review, so both are built from rectangles.
-   **Art:** nine more pack sheets, all from the already-extracted pack
    zip (no new download), each recorded in the manifest; `CREDITS.md`
    already credits the whole pack.
-   **New full-run baseline** (scripted, invulnerable player, with the
    pathfinding driver and no manual help): victory after 17 rooms (two
    maps plus 15 v1 rooms), score 68,313, 108 kills, 360 coins, 5.5
    minutes of run time. The River took about 70 s of that.

## Milestone 11 — Snowy Mountain, level 3 (2026-10-25)

-   **Level 3 is now one continuous map** (`src/data/snowLevel.ts`,
    120×64 tiles), replacing the five Ancient Temple rooms. It keeps the
    old level 3 difficulty (health ×1.25, speed ×1.1).
-   **The twist is ice.** A new layout symbol, `i`, marks walkable ice.
    On ice the player's velocity eases toward the input instead of
    snapping to it (`src/logic/ice.ts`, time constant 420 ms). So you
    slide on after letting go, turn wide, and a dash carries further.
    Off ice, movement is instant as before. Enemies are unaffected, as
    the design asks for a first version.
    -   Measured in the browser: letting go at full speed stops within
        2 px on snow, and slides about 40 px (2½ tiles) on ice.
    -   Tests cover the ease, its framerate independence, sliding after
        a dash, coming to rest, and the layout symbol.
-   **Ice art** is the glossy frozen block of the water sheet, drawn
    with the same 4×4 edge layout as water and paths. The snow test map
    used that art for an impassable "frozen lake". That lake is now
    walkable ice too, so ice looks and behaves the same everywhere.
    The placeholder art draws ice as plain floor (fallback only).
-   **The layout:**
    1.  a safe base camp with an igloo, a spirit fire, the merchant
        and a small practice patch of ice;
    2.  a narrow pass;
    3.  the Frozen Lake, a big ice field with rocks for cover (two
        waves);
    4.  the wind-swept Shrine, with stripes of polished ice between
        lion statues; an ambush springs between the lions (an upgrade);
    5.  the Blue Tengu's rink, an ice ring around a snow island (an
        upgrade);
    6.  the Giant Blue Samurai's high plateau, with ice patches, a
        pillar ring and two guardian statues; the exit is south.

    That is two upgrades, as before, so a run still has 9. No animals
    live here.
-   **Map rules (tests):**
    -   every fight has ice in it, and the camp has a patch you do not
        start on;
    -   ice never touches a cliff or a gate (so its edge tiles stay
        clean and no gate closes on a slide);
    -   no water on the mountain.
-   **Bestiary:**
    -   Orange owls (chaser), red bears (tank) and dark owls (ranged).
        Warm and dark colours read on snow; the blue and white monsters
        are saved for later levels.
    -   **Blue Tengu** mini-boss: 38 HP base, 8-bullet bursts.
    -   **Giant Blue Samurai** boss: 72 HP base (90 on this level),
        11-bullet bursts. It sits between the Squid and the Hollow
        Warden (120 HP on level 5).
    -   Both picks are from the design table.
-   **New full-run baseline** (scripted, invulnerable player, with the
    pathfinding driver and no manual help; the driver steers by
    keypresses, so it slides on ice like a player): victory after 13
    rooms (three maps plus 10 v1 rooms), score 78,888, 123 kills, 448
    coins, 6.8 minutes of run time. The Snowy Mountain took about 83 s.

## Milestone 11 — Abandoned Village, level 4 (2026-10-25)

-   **Level 4 is now one continuous map** (`src/data/abandonedLevel.ts`,
    120×64 tiles), replacing the five Forgotten Foundry rooms. It keeps
    the old level 4 difficulty (health ×1.4, speed ×1.15).
-   **Night:** a new `abandoned` theme and biome.
    -   Darkness is 0.66, the darkest outdoor level and still under the
        0.7 readability cap. The first try, 0.55, read as dusk in
        review, because the pack art scales darkness by 0.75.
    -   The darkness is tinted deep blue.
    -   Fireflies drift (an existing particle type).
    -   A stray cat lives here.
    -   Closed gates are thorns tinted ghostly violet.
-   **Lanterns:** the pack has no lantern prop (its lanterns are
    monsters, used here as enemies). So a lantern post is the house
    sheet's grey stone column with a warm light and a flame at its top.
    Decor lights gained an optional `flameY` to put the flame there.
    Tests check that lanterns light the start and every fight.
-   **The twist is ambush streets.** Two of the four fights spring from
    a trigger:
    -   halfway down Main Street, enemies pour out of the alleys between
        the houses;
    -   in the back alleys, they come from every lane at the crossing.

    Tests check that each ambush has spawns on opposite sides of its
    trigger.
-   **The layout:**
    1.  the outskirts, with a broken cart, a cold campfire, a lantern,
        the merchant and the cat;
    2.  Main Street (an ambush);
    3.  the graveyard, with the Giant Racoon (an upgrade);
    4.  the back alleys (an ambush, an upgrade);
    5.  the square, with the Giant Red Samurai, round a frog statue
        with lanterns at its corners; the exit is south.

    That is two upgrades, so a run still has 9.
-   **New art:** the pack's TilesetVillageAbandoned. Its ruined houses,
    barn, thatched house, graves, mossy statue, broken pillar, frog
    statue, broken cart and mossy trees were each checked as clean crops
    before being added to the decor catalogue.
-   **Bestiary:**
    -   White spirits (chaser), red raccoons (tank) and green
        ghost-lanterns (ranged). Pale and bright colours read at night.
    -   **Giant Racoon** mini-boss: 40 HP base (56 here), 9-bullet
        bursts.
    -   **Giant Red Samurai** boss: 74 HP base (104 here), 12-bullet
        bursts.
    -   Both are from the design table.
-   **Bug found in review:** a spawn tile placed on a lane drew as a
    patch of grass, because one layout character cannot be both `E` and
    `:`. The spawns moved into the yards, and a new check on every map
    rejects a spawn or start tile with path on two opposite sides.
-   **Tests retired:** a v1 check that levels reuse room layouts. v2
    requires every map to be unique, so it now checks that instead.
-   **New full-run baseline** (scripted, invulnerable player, with the
    pathfinding driver and no manual help): victory after 9 rooms (four
    maps plus The Void's 5 v1 rooms), score 91,051, 137 kills, 495 coins,
    6.7 minutes of run time. The Abandoned Village took about 76 s.

## Fix — ambushes could be walked round (2026-10-25)

-   **User report:** in the Snowy Mountain, "a room sometimes doesn't
    spawn the enemies, so I have to go back".
-   **Cause:** an ambush only starts when the player steps on its
    trigger rectangle. The Shrine's trigger was a 4×4 patch between the
    lion statues, and the shrine is wide. Walking along its top or
    bottom edge went from the west gate to the east gate without
    touching it, with the gates still open. The level's exit then stayed
    locked, because that fight was never cleared.
-   **Not only the snow:** a new map test (below) found four more
    skippable fights:
    -   the Bamboo Forest's Thicket (round the side, or along the row by
        its north gate);
    -   the River hamlet (beside the bridge);
    -   Abandoned Village Main Street (through the yards behind the
        houses);
    -   the Abandoned Village back alleys (through the yards).
-   **Fix:** each trigger is now a band across its whole area (the
    hamlet's covers the bridge, its only crossing), so every route from
    one gate to another crosses it. The ambush still springs midway.
-   **New test (every map, every encounter):** with the trigger tiles
    blocked, no gate of an area can be reached from another of its
    gates. Before the fix it failed on exactly the areas above.
-   **Verified in the game:** walking along the Shrine's top edge now
    springs the ambush at the middle column (3 enemies, both gates
    closed). Before, that route skipped it.

## Milestone 11 — The Void, level 5 (2026-10-25)

-   **Level 5 is now one continuous map** (`src/data/voidLevel.ts`,
    120×64 tiles), replacing the last v1 rooms. **Every level is now a
    hand-made v2 map.** The v1 room layouts stay only for the debug
    showcase, and the unused room-building helpers left `levels.ts`.
    Level 5 keeps health ×1.6 and speed ×1.2.
-   **The abyss** (`src/logic/abyss.ts`, layout symbol `_`):
    -   Enemies and their paths treat it like water; bullets fly over it.
    -   **Falling:** standing (not dashing) with your centre over it
        costs 1 HP. You come back on the nearest tile away from the
        edge, briefly invulnerable, with movement paused for 450 ms.
    -   **Knockback and shoves never push you in.** The edge holds the
        player except while dashing or while walking by choice (a
        movement key held, not reeling from a hit).
    -   **Dash-jumps:** a dash covers 54 px. Intended gaps are 1–2
        tiles, impassable ones at least 4. There are no 3-tile gaps,
        since a precise dash could just clear one; a map test checks
        every map for them.
    -   **Found in browser testing:** at first, a held key after a fall
        walked the player straight back off the edge they had respawned
        on, and every fall cost 1 HP even while blinking (3 HP lost in
        half a second). Now you come back away from the edge, falls
        respect the post-hit invulnerability, and input pauses briefly.
        Measured again: holding "up" into a pit for 1.5 s costs 2 HP,
        and a separate later fall costs 1.
    -   Measured: stepping off on purpose falls; a hit at an edge does
        not push the player in; dashes cross the 1-tile and 2-tile gaps
        with no damage.
-   **Look:** broken platforms of purple-tinted dark cobble over the
    pack's TilesetHole pits, edged with the water layout.
    -   Walls are drawn as more abyss (no cliffs or wall tops), so the
        world looks endless.
    -   Every platform edge is real abyss (a 3-tile margin), so there
        are no invisible walls; a test checks this.
    -   Spirit motes drift (an existing particle type) and purple
        braziers give light.
    -   Closed gates are glowing cyan bars. A tinted bush read as a
        plant, not a barrier.
-   **The layout:**
    1.  the arrival platform, with the merchant;
    2.  a causeway that teaches the jump (a 1-tile gap, then a 2-tile
        one);
    3.  the Shattered Hall, full of holes (two waves);
    4.  a broken bridge;
    5.  the Demon Cyclops's platform (an upgrade);
    6.  stepping stones;
    7.  the Spirit Garden ambush (a band trigger);
    8.  a drop to The Hollow Warden's sanctum, inside a broken ring of
        pits; the exit is south.

    The last level has one upgrade, so a run keeps 9.
-   **Bestiary:**
    -   Blue wisps (chaser), red demon beasts (tank) and the floating
        eye (ranged, the v1 sheet).
    -   **Demon Cyclops** mini-boss (the green variant, for contrast):
        42 HP base, 10-bullet bursts.
    -   **The Hollow Warden** is now the strongest boss: 128 HP and
        14-bullet bursts on level 5 (v1: 120 HP, 10 bullets).
-   **Map tests now understand dash-jumps.** Reachability, sealed areas
    and "no fight can be skipped" allow jumps over 1–2 abyss tiles, so a
    dash can never hop past a gate. Void-only tests:
    -   you cannot finish on foot;
    -   the first gaps are 1 then 2 tiles;
    -   no platform touches a wall;
    -   every enemy spawn can walk to its fight (no stranded melee
        enemies);
    -   braziers light the start and every fight.
-   **Bug found by a new test:** the sanctum's area began two rows above
    its gate, so the gate lay inside the fight's trigger zone and would
    have closed on the player. The area now starts at the gate. A new
    check on every map keeps gates out of their own trigger zones.
-   **New full-run baseline** (scripted, invulnerable to hits but not to
    falls; the driver now plans dash-jumps): victory through all five
    maps, score 96,051, 152 kills, 503 coins, 7.2 minutes of run time.
    In the Void the driver made 10 jumps and fell twice (its own
    line-ups overshooting an edge; it recovered each time).

## Milestone 12 — balance and release (2026-10-25)

-   **How balance was measured.** Earlier scripted runs were invincible,
    which says nothing about difficulty. This milestone's runs count
    hits instead: each hit is counted with the real 900 ms
    invulnerability window, but never applied.
    -   The bot never dodges, never buys and always takes the first
        upgrade. Its damage taken is an upper bound on how much each
        level throws at the player.
    -   Its boss kill times, against perfect point-blank aim, are a
        lower bound on fight length.
    -   Runs use a development-mode build served without hot reload
        (editing source reloads the dev server and kills a running
        script).
-   **Before tuning** (levels 1–4; the level 5 data came from a run
    started without upgrades, so it was not comparable):

    | Level | Damage (hits) | Mini-boss | Boss |
    |---|---|---|---|
    | 1 | 20 (15) | 6.7 s | 5.2 s |
    | 2 | 18 (15) | 5.0 s | 7.8 s |
    | 3 | 13 (10) | 5.9 s | 6.6 s |
    | 4 | 23 (18) | 17.8 s | 14.3 s |

-   **Findings:**
    -   Boss fights were far too short: 5–8 s against perfect aim, so
        roughly 10–15 s for a real player.
    -   Enemy speed rose and fell: ×1.2 on level 2 was a leftover from
        the v1 sewers.
    -   Weapon unlocks cost 310 coins in all, set for v1 runs (about 277
        coins). A v2 victory earns about 500, so one win unlocked
        everything.
-   **Tuning:**
    -   **Boss health:** final bosses have about twice their HP, and
        mini-bosses about 1.5×. Base HP, mini-boss then boss:
        -   Forest: 48 and 120.
        -   River: 54 and 140.
        -   Snow: 57 and 144.
        -   Village: 60 and 148.
        -   Void: 90 and 220. The Void got an extra step after the first
            tuned run: by then the bot carried 8 upgrades and killed the
            Cyclops in 3.6 s and the Warden in 9.6 s.
        -   On level 5 the Warden has 352 HP. A new test checks that
            every boss and mini-boss is tougher than the previous
            level's.
    -   **Enemy speed:** ×1.0 / 1.05 / 1.1 / 1.15 / 1.2. The test now
        requires speed never to drop.
    -   **Snowy Mountain:** one more enemy in the Frozen Lake's second
        wave and in the rink's second wave, to fill its dip.
    -   **Unlock prices:** Kunai 100, Magic Shuriken 160, Big Shuriken
        240 (500 in all): about one victory, or several defeats (which
        keep half). Merchant prices are unchanged; the bot never buys,
        so there is no data to justify changing them.
-   **Boss kill times after tuning** (bot, before the Void step):

    | Level | Mini-boss | Boss |
    |---|---|---|
    | 1 | 8.4 s | 8.4 s |
    | 2 | 10.7 s | 12.5 s |
    | 3 | 7.0 s | 12.6 s |
    | 4 | 17.1 s | 14.1 s |
    | 5 | 3.6 s | 9.6 s |

    Damage taken per level proved noisy between runs (level 1: 20, then
    33; level 4: 23, then 11, depending on upgrade luck and positions).
    So it was not used for fine tuning; boss kill time was the
    consistent signal.
-   **Final regression run** (all tuning in, from the forest to victory,
    same bot):
    -   victory, score 96,426, 154 kills, 586 coins, 8.5 minutes of run
        time;
    -   in the Void, 10 dash-jumps and 3 falls (the bot's own line-ups);
    -   boss kill times:

        | Level | Mini-boss | Boss |
        |---|---|---|
        | 1 | 5.8 s | 19.6 s |
        | 2 | 6.8 s | 12.6 s |
        | 3 | 8.3 s | 17.5 s |
        | 4 | 17.3 s | 15.7 s |
        | 5 | 10.9 s | 15.2 s |

    Every boss fight now lasts 12–20 s even against perfect aim.
-   **HUD:** the boss bar now fades to 30% while the player, the boss or
    any enemy is under it. Before, the boss could spawn hidden beneath
    it (test plan: "nothing important sits under the HUD"). The band
    check is a pure, tested helper.
-   **Results screen:** "ROOMS CLEARED" became "LEVELS CLEARED". Every
    level is one map now, so the number counts levels.
-   **Cleanup verified:** scene and game event listeners stay at 53/19
    from the village through all five levels across restarts. (A
    results screen on top adds one, as expected.) A real start from the
    menu shuts the menu scene down.
-   **Performance** (CPU time per game step, update plus render, during
    each level's boss fight, 6 s each, in the browser pane on the
    development machine): an average of 0.40–0.51 ms, 95th percentile at
    most 0.8 ms, worst frame 3.7 ms, against a 16.7 ms frame. The pane
    was hidden during the measurement and GPU cost was not measured.
-   **Docs:** the README describes the game as it now is: the five maps
    and their twists, fights and exits, data-driven tuning, the project
    layout, the map symbols and current known issues (the "no
    pathfinding" and "no foreground occlusion" items were obsolete).

## Scope change and Milestone 13 — audio (2026-10-25)

-   **Approval:** after Milestone 12 the user asked to "add sound effects
    and music". Audio was listed under "post-v1 only, do not implement
    without approval", so this request is the approval. It became
    Milestone 13. A volume slider stays out (a Settings menu is still
    excluded); a mute key is not a settings menu.
-   **Source:** the Ninja Adventure pack's own audio, already on disk in
    the pack zip (no new download). The pack's README states that the
    CC0 licence covers all of its assets, audio included. Only the 40
    files used are copied, each recorded with its pack path in
    `src/data/audioManifest.ts`.
-   **Choosing without ears:** no one listened to the files during the
    build. Music was picked by title:
    -   menu: Adventure Begin; village: Village;
    -   Bamboo Forest: Clearing; River: Aquatic; Snowy Mountain:
        Ascension; Abandoned Village: Lost Village; The Void: Final Area;
    -   mini-bosses: Tension; bosses: Fight; the Hollow Warden: Dark
        Castle;
    -   victory: End Theme; defeat: Sad Theme.

    Effects were picked by name, then by measured length (all are
    0.1–1.3 s) and loudness (RMS). Volumes were balanced from that
    loudness, and frequent sounds (throws, coins, hits, enemy shots) are
    quieter and rate-limited (40–90 ms). Each choice is one line to swap.
-   **Playback:**
    -   **Effects:** 28 short WAVs (2.3 MB) are preloaded at boot in
        every art mode and played by Phaser's Web Audio manager.
        Repeated effects get a slight random pitch.
    -   **Music:** 12 Ogg tracks (12 MB in all) stream through a single
        HTML audio element, never preloaded, with a 450 ms crossfade.
        One music player lives in the game registry, so scene restarts
        share it.
    -   A track the browser refuses before the first click or key press
        starts on that gesture.
    -   Music pauses while the tab is hidden, since the game freezes
        then too.
    -   Missing files, a blocked audio context or blocked storage only
        mean silence; nothing can stop the game.
-   **Where sounds play:**
    -   **Combat:** throws (one per weapon), enemy shots, hits, deaths,
        getting hurt, the dash, falling into the abyss.
    -   **Pickups and objects:** coins, breakables.
    -   **Fights:** an ambush or fight starting (alert plus gate), an
        area cleared, the exit opening.
    -   **Bosses:** a boss appearing switches to fight music; its death
        returns to the level's track.
    -   **Menus:** upgrades offered and chosen, talking to an NPC,
        buying (a heal chime for the tea, a "no" sound when a purchase
        fails), pausing, menu and results choices.
    -   **End of a run:** the victory or defeat jingle over silence,
        then the results music.
-   **Mute key: N, not M.** M already means "quit to menu" on the pause
    screen and "menu" on the results screen; muting there with M would
    end the run. N works in the menu, in game and on the pause screen,
    is shown in the menu's control list, and is saved under
    `ninja-survivor:audio:v1` (a per-browser convenience, separate from
    the save).
-   **Tests:**
    -   every manifest file exists with a valid WAV or Ogg header;
    -   effects are at most 2 s, and their total under 3 MB; each track
        is under 3 MB;
    -   no unlisted file ships, and each pack source is used once;
    -   every level has its own track and every weapon its throw;
    -   busy effects are rate-limited and quieter;
    -   the music choice, repeat limits, mute persistence and pitch
        jitter are covered.
-   **Checked in the browser** (sound itself cannot be heard here, so
    the checks are measurements):
    -   all 28 effects load; the Web Audio context runs;
    -   the menu track streams at volume 0.45, advances in real time and
        loops (82 s); starting a run switches to the village track,
        level 1 to the forest's;
    -   firing for 1 s plays 7 throw sounds, matching the fire rate; the
        dash plays its sound;
    -   an ambush plays the alert and gate sounds; then enemy shots,
        hits, deaths and coins;
    -   the boss's entrance switches to fight music, and its death goes
        back to the forest track;
    -   a defeat plays its jingle over silence, then the defeat track on
        the results screen;
    -   N silences the music and all effects and saves "muted"; N again
        restores the music.
-   **Menu footer:** now "v2.0 · art and audio: Ninja Adventure by
    Pixel-boy & AAA (CC0)".

## Publishing (2026-10-25)

-   **Asked by the user:** push everything and make the game available
    on a website.
-   **Host: GitHub Pages**, from the existing GitHub repository.
    -   A workflow (`.github/workflows/deploy.yml`) runs the typecheck,
        tests and build on every push to `main`, and deploys `dist` only
        if they pass.
    -   Vite's `base` is `"./"`, so the build works from the project
        site's subfolder. This was checked locally before pushing: every
        script, sheet and sound loaded from `/<repo>/`.
-   **Live at** https://website.cookiewarrior.io/dungeon-survivor-claude-project/
    -   The account's Pages site uses that custom domain. It is proxied
        by Cloudflare, which needs no change: responses carry GitHub's
        request ID, and Cloudflare reports them as uncached.
    -   `emiljns.github.io/dungeon-survivor-claude-project/` redirects
        there.
-   **What it took:**
    -   The repository was private. Pages needs a public repo on the
        free plan, so the user made it public and set the Pages source
        to "GitHub Actions" (an owner-only setting).
    -   The first run failed only at "configure Pages", because Pages
        was still off; install, typecheck, tests and build all passed
        on GitHub's servers.
    -   A new push then deployed. All 105 requests from the live site
        succeeded (72 sheets, 28 effects, the menu music), and the game
        booted to its menu.

## Overview image and name (2026-10-25)

-   **Asked by the user:** change the name to Ninja Survivor, and modify
    the concept image so it looks like the game.
-   **The image** (`assets/ninja-survivor-overview.png`, 1920×1280)
    keeps the concept's layout but uses only real material.
    -   **Screenshots:** grabbed from the game's renderer at its native
        640×352 and posted to a local scratch server. They show the
        Hollow Warden fight at 2× (its 14-bullet ring and two eyes'
        aim lines), the village and the five levels, and the main menu,
        upgrade choice, merchant shop and victory screen.
    -   **Sprites:** the game's own (the ninja, one enemy per level,
        shurikens, the coin, five bosses), plus crops showing the light
        by day, at night and in the Void.
    -   **Text:** describes what is built.
    -   **Nothing excluded is pictured:** the concept's minimap, ammo
        counter, Settings and Quit buttons, character select and dungeon
        floors are gone.
-   **The concept image** moved to
    `docs/archive/dungeon-survivor-concept.png` (history, mood reference
    only).
-   **The name:** the README title and CLAUDE.md heading drop
    "(formerly Dungeon Survivor)". These stay on purpose:
    -   the v1 best-score key `dungeon-survivor:best:v1`, so old best
        scores still migrate;
    -   the design doc's history notes;
    -   the GitHub repository name, which is also the website path.
        Renaming it is the user's call.
-   **Repository renamed** (asked by the user) from
    `dungeon-survivor-claude-project` to `ninja-survivor`. The game is
    now at https://website.cookiewarrior.io/ninja-survivor/. GitHub
    redirects old git and web links to the new name, but the old Pages
    path does not redirect. The local `origin` remote now points to the
    new name. The local folder keeps its old name, since nothing depends
    on it.

## Change policy

Before changing an approved requirement, explain the problem, propose
the change, and note scope/test impact.
