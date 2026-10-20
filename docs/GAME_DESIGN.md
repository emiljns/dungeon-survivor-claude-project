# Ninja Survivor — Game Design v2

> Status: **approved by the user (2026-10-20); this is the authoritative
> specification.** The v1 spec ("Dungeon Survivor") is kept for history
> in `docs/archive/GAME_DESIGN_V1.md`. The scope changes are recorded in
> `docs/DECISIONS.md`.

## 1. Vision

A colourful top-down action roguelite set in the world of the Ninja
Adventure art pack. You leave a peaceful home village, fight across a
living world that darkens from morning to night, and finally cross into
**the Void**, a spiritual realm, to face The Hollow Warden.

The core loop is unchanged from v1: move, aim, shoot and dash, clear
encounters, pick upgrades, beat bosses, and chase a best score. What
changes is the world. It is now continuous, alive and varied, instead of
a chain of dark rectangular rooms.

## 2. Scope changes from v1 (approved in discussion)

| v1 rule | v2 |
|---|---|
| Name "Dungeon Survivor" | **Ninja Survivor** |
| Five dungeon themes (Ruins, Sewers, Temple, Foundry, Void) | Village prologue + **Bamboo Forest, River, Snowy Mountain, Abandoned Village, The Void** |
| Rooms reached through doors, one screen each | **One continuous, hand-made map per level**, with encounter areas |
| A small set of reused room layouts | **Every map unique**, no repeated layouts or patterns |
| No coins or currency pickups | **Coins** from enemies and breakable objects |
| No meta-progression | **Saved coins and permanent weapon unlocks** |
| One starter gun, no weapon inventory | **Shuriken weapons**: a base shuriken plus unlockable variants |
| Elite in each final room; one boss | **A mini-boss (with a wave) and a final boss in every level** |

**Still excluded:** minimap, ammo counters and reloading, character
selection, a Settings menu, procedural generation, online features,
health drops (see §9), and off-screen enemy arrows ("look around").

## 3. Structure of a run

1. **Home Village (prologue):** morning, peaceful, no combat.
   -   An in-world tutorial: a training dummy to shoot, a fence to dash
       past, and signs to read with E.
   -   **The village shop** sells permanent weapon unlocks for saved
       coins.
   -   The run starts at the village gate. The run timer and score start
       there; the village never counts.
2. **Levels 1–5.** Each is one continuous map:
   -   A safe arrival area with the **travelling merchant**.
   -   Several **encounter areas** joined by paths, with free
       exploration between them.
   -   A **mini-boss encounter** midway (mini-boss plus a wave of
       adds).
   -   A **final boss arena** at the end. Beating it leads to the next
       level.
3. **Victory** after The Hollow Warden; **game over** at 0 HP. The
   results screen shows the v1 stats plus coins earned and kept.

Repeat runs must stay quick. The village is compact, the gate is close
to the spawn, and the tutorial is never mandatory.

## 4. The levels

| # | Level | Light | Terrain twist | Feel |
|---|---|---|---|---|
| 0 | Home Village | Morning | None (tutorial) | Villagers, animals, houses, fields |
| 1 | Bamboo Forest | Afternoon | None: the combat baseline | Cramped paths opening into clearings |
| 2 | River | Golden hour | **Water channels:** block walking, not bullets; bridges | Riverbanks, watermill, waterfalls |
| 3 | Snowy Mountain | Dusk | **Ice patches:** slippery movement | Narrow passes, wind-swept plateaus |
| 4 | Abandoned Village | Night, lanterns | **Ambush streets** (houses and alleys) | Empty homes, fireflies, haunting |
| 5 | The Void | Darkness | **The abyss:** falling, dash-jumping gaps | Broken platforms, spirit motes |

**Lighting arc:** the existing lighting system becomes a storytelling
tool. Daylight levels use little or no darkness, and darkness only
arrives at night and in the Void.

**Terrain rules (shared by several levels):**
-   **Low obstacle** (water, abyss): blocks walking and pathfinding;
    bullets fly over it.
-   **Ice:** the player keeps momentum (lower friction). Enemies are
    unaffected in a first version.
-   **Falling** (Void only): walking or dashing into the abyss costs
    1 HP, then you respawn at the last safe tile with brief
    invulnerability. **Knockback can never push you over an edge.** A
    dash can cross gaps of 1–2 tiles.

## 5. Encounters

-   **Entering an encounter area closes its exits** with fences,
    brambles, ice walls or spirit barriers, depending on the level.
    Clearing it reopens them.
-   **Waves:** reinforcements arrive when the current group is nearly
    defeated. Used in larger areas, mini-boss fights and boss arenas.
-   **Ambushes:** enemies appear when you cross a trigger, for example
    entering a side clearing. Used sparingly.
-   **Fairness rules:**
    -   Spawn markers always pulse about 1 s before enemies appear.
    -   Enemies never spawn within a minimum distance of the player.
    -   Enemies only shoot when on screen or near it.
    -   Anything that shoots shows a telegraph line or ring first.
-   **No arrows.** The player explores. Pathfinding brings melee enemies
    to the player, and cleared exits glow.

## 6. Enemies and bosses

-   **Behaviour families** stay as in v1:
    -   chaser (melee rush)
    -   tank (slow, heavy)
    -   ranged (keeps distance, telegraphed shots)
    -   boss (radial bursts, enrage)
-   **Pathfinding:** enemies take the shortest walkable route to the
    player, using a flow field over the tile grid recomputed a few times
    per second within the active area. They avoid water and the abyss.
-   **Variants per biome:** same behaviour, new sprite and tuned stats.
    Candidates from the pack:
    -   **Forest:** mushrooms, spiders, bamboo.
    -   **River:** frogs, axolotls, kappa, octopus.
    -   **Snow:** snow creatures, yetis (subject to what the pack has).
    -   **Abandoned Village:** skulls, spirits, lanterns.
    -   **Void:** eyes, spirits, demons.
-   **Bosses** (proposed; final picks in the per-level review):

| Level | Mini-boss | Final boss |
|---|---|---|
| Bamboo Forest | Giant Bamboo (variant) | Giant Bamboo |
| River | Giant Frog (variant) | Squid |
| Snowy Mountain | Blue Tengu | Giant Blue Samurai |
| Abandoned Village | Giant Racoon | Giant Red Samurai |
| The Void | Demon Cyclops | **The Hollow Warden** (Giant Spirit) |

Mini-bosses are scaled-down versions of the boss pattern, with fewer
bullets and less health. A bespoke attack pattern per boss is optional
later work.

## 7. A living world

-   **Dense set dressing,** clustered naturally around the edges of
    combat spaces, with open ground kept where fights happen.
-   **Animated scenery** from the pack: water ripples, waterfalls, flags,
    the watermill, plants and flowers.
-   **Ambient creatures:** chickens, cats, dogs, butterflies, fish and
    villagers. **They have no health bars, are never red, and flee from
    the player.**
-   **Ambient particles:** leaves (forest), snow (mountain), fireflies
    (night village), motes (Void).
-   **Environmental storytelling:** small scenes such as a cold
    campfire, a broken cart, or doors left open.
-   **Tall terrain:** cliffs, trees, buildings and walls are drawn tall
    with a walk-behind layer, so the player can walk under canopies and
    behind roofs. **Collision boxes stay tile-based.**
-   **Breakable pots and crates:** they shatter when shot (pack vase and
    wood particles) and drop coins.

**Readability guardrails:**
-   Only hostiles have health bars.
-   Threats keep strong outlines and colours.
-   Bullets and telegraphs always render above scenery and darkness.
-   Decoration is drawn slightly darker than actors.

**Performance guardrails:**
-   Static scenery is baked into the map texture.
-   Animated scenery and critters update only near the camera.
-   Particles are pooled; nothing is created per frame.
-   Lighting moves to a screen-sized overlay.

## 8. Weapons, coins and the shop

**Weapons:** all are shuriken-family, and player shots never look like
enemy shots. Upgrades from the 3-choice panel apply to whichever weapon
you carry.

| Weapon | Feel (to tune) | How you get it |
|---|---|---|
| Shuriken | Balanced (v1 behaviour) | Always, at the start of every run |
| Kunai | Fast, narrow, pierces one enemy | Unlock in the village shop |
| Big Shuriken | Slow, large, high damage, pierces | Unlock in the village shop (expensive) |
| Magic Shuriken | Slight homing | Unlock in the village shop |

**Coins:**
-   **Sources:** enemies (more for tougher ones and bosses), plus
    breakable pots and crates.
-   **Pickup:** coins fly to the player within a short radius.
-   **During a run** you carry "pocket" coins (HUD counter).
-   **On victory** all pocket coins are saved. **On death** half of the
    pocket coins are saved; coins saved from earlier runs are never lost.
    Quitting from pause counts as death.

**Shops:**
-   **Village shop** (between runs, saved coins): permanent weapon
    unlocks. Each is bought once, forever.
-   **Travelling merchant** (in each level's arrival area, pocket coins):
    -   run upgrades, such as extra damage or a small heal-to-full;
    -   **weapons you have unlocked**, at a fair run price.

    Every run still starts with the basic shuriken, so the early game
    stays meaningful. Unlocks add variety and options, not an instant
    win.

**Save data:**
-   Saved coins and unlocks join the best score in local storage, under
    a new versioned key.
-   Data is validated on load; missing, malformed or blocked storage
    falls back to a fresh save, never a crash.
-   If saving fails, the game says so and keeps working.

## 9. HUD and screens

-   **HUD:** hearts, dash meter, pocket coins, current weapon icon,
    score and time, and level/area name. **No minimap, no ammo.**
-   **Screens:**
    -   title menu with the new name;
    -   village shop and merchant;
    -   the upgrade panel, pause, results and victory (as v1, plus
        coins).
-   **Health drops are not included.** Healing comes from new levels and
    the merchant. Adding drops would be a separate decision.

## 10. Technical plan (summary)

-   **Map format:** large ASCII terrain grids per level, plus:
    -   a terrain-type layer (wall, low obstacle, ice, abyss);
    -   placed objects (decoration, solid props, breakables, critters,
        lights);
    -   encounter areas (rectangles with gates, spawn lists, waves and
        ambush triggers).

    All of it is plain, testable data.
-   **Camera:** follows the player with smoothing and a slight lean
    toward the aim, clamped to the map. Aim stays in world coordinates.
-   **Lighting:** a screen-sized overlay with per-light colour (blue and
    purple braziers, lanterns, campfires) and per-level ambient light.
-   **Keeps from v1:**
    -   swept projectile collision;
    -   pause-safe simulation clock;
    -   restart and transition cleanup rules;
    -   the hitbox constants;
    -   art fallback to placeholders;
    -   explicit scene data on every start.
-   **Folder layout:** the existing `src/` structure extends with new
    data files (maps, objects, weapons, shop) and systems (camera,
    encounters, pathfinding, economy). No rewrite.

## 11. Milestones (each: implement → test area review → commit)

| Milestone | Content |
|---|---|
| **8 — Engine** | Map format; camera; encounter areas with gates, waves and ambushes; flow-field pathfinding; low obstacles; tall terrain and walk-behind; screen-space lighting with coloured lights; rename to Ninja Survivor. **Test map.** |
| **9 — World kit** | Decoration catalogue; animated scenery; critters; ambient particles; breakables; outdoor tiles. **Test map.** |
| **10 — Economy** | Coins and pickups; save v2 (bank, unlocks); village shop and merchant; weapons. **Test map.** |
| **11 — Levels** | Village prologue, then Forest → River (water) → Snow (ice) → Abandoned Village (night, ambushes) → Void (abyss). Each level with its mini-boss and boss, **reviewed and committed one at a time.** |
| **12 — Balance and release** | Difficulty check (bigger maps, pathfinding, weapons and coins all shift balance); full runs; performance; docs; known issues. |

The game stays launchable after every milestone. The v1 dungeon levels
remain playable until their replacements land.

## 12. Test plan additions

-   **Maps:**
    -   every map is enclosed;
    -   every encounter area, the merchant and the boss arena are
        reachable on foot;
    -   gates close when an encounter starts and reopen when it is
        cleared;
    -   no object blocks a path or a spawn;
    -   nothing important sits under the HUD.
-   **Pathfinding:** routes around walls, water and the abyss; never
    targets an unreachable tile; recomputes within budget.
-   **Encounters:** wave triggers, ambush triggers, the minimum spawn
    distance, telegraph timing, and that every encounter can be cleared.
-   **Terrain:**
    -   low obstacles block movement but not bullets;
    -   ice momentum is bounded;
    -   falling costs exactly 1 HP and respawns safely;
    -   knockback never causes a fall;
    -   dash-jumps over 1–2 tile gaps succeed and wider ones fail.
-   **Economy:**
    -   coin totals;
    -   the death split (half of pocket coins saved);
    -   unlocks persist;
    -   unlocked weapons appear in the merchant's stock;
    -   prices and caps;
    -   save v2 with missing, malformed and blocked storage, plus
        migration from the v1 best-score key.
-   **Weapons:** each changes only what it should; upgrades apply to
    every weapon; player shots stay visually distinct from enemy shots.
-   **Regression:** a full prologue → Void run in the browser; cleanup
    across transitions; performance with dense scenery; the production
    build.

## 13. Risks

-   **Scope:** this is a large expansion. Mitigation: milestone-by-
    milestone delivery, each with a review gate, and levels one at a
    time.
-   **Balance:** many new power and difficulty sources. Mitigation:
    tunable data and a dedicated balance milestone.
-   **Readability in daylight:** no darkness to make threats pop.
    Mitigation: the guardrails in §7, checked in every review.
-   **Authoring time for large unique maps.** Mitigation: map validity
    tests catch errors early, so authoring can move fast.
