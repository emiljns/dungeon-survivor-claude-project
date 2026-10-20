# Dungeon Survivor

A compact, original top-down dungeon shooter with a 16-bit-inspired
pixel look. Fight through five themed levels of hand-authored rooms,
pick upgrades, and defeat the final boss. It is inspired by the broad
room-based action genre; no characters, rooms, assets or names are taken
from other games.

**Status: v1.0 prototype.** It is playable from the menu to victory or
game over, with placeholder art (shapes and generated textures only) and
no audio. TypeScript (strict), Phaser 3, Vite, Vitest. It is
offline-only: there is no backend, accounts or online leaderboard.

![AI-generated concept (mood reference only)](assets/dungeon-survivor-concept.png)

## Run it

Requires Node.js (developed on Node 24 / npm 11).

```text
npm install
npm run dev          # play at http://127.0.0.1:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run typecheck` | `tsc --noEmit` (strict, no unused locals or parameters) |
| `npm test` | Vitest unit tests (pure game logic, no browser needed) |
| `npm run build` | Typecheck, then production build into `dist/` |
| `npm run preview` | Serve the production build locally |

URL flags for debugging: `?debug` draws physics bodies, and `?nolight`
turns the lighting off.

## Controls

| Input | Action |
|---|---|
| WASD | Move (diagonals are normalised) |
| Mouse | Aim |
| Hold left mouse | Shoot |
| Space | Dash (brief invulnerability; meter under HP) |
| E | Use an open door |
| Esc / P | Pause / resume (M on the pause screen quits to the menu) |
| 1 / 2 / 3 or click | Pick an upgrade |
| R / click, M | Retry or menu on the results screen |

## How a run works

-   **Five levels in order:** Dungeon Ruins → Toxic Sewers → Ancient
    Temple → Forgotten Foundry → The Void. Each has its own palette,
    torch colour and difficulty.
-   **Rooms:** each level has 4–5 rooms. A safe start room, then combat
    rooms, then a final arena with an elite (Level 5: the boss, *The
    Hollow Warden*).
-   **Doors:** a room's door stays locked until every enemy is dead.
    Stand at it and press E.
-   **Enemies:**
    -   Chasers (red) rush you.
    -   Tanks (amber) are slow and hit for 2.
    -   Ranged shooters (purple) keep their distance. They stop, flash
        and draw an aim line before each shot, so watch for the line
        and dash.
-   **Health** carries over between rooms and refills at each new level.
-   **Upgrades:** rooms marked "UPGRADE ON CLEAR" offer three upgrades,
    9 per run, each capped. The options are damage, fire rate, bullet
    speed, move speed, max HP, and an extra bullet.
-   **Score:** enemies (worth more on deeper levels), plus room and level
    clears and a victory bonus.
-   **Results:** shows score, highest level, time, enemies defeated,
    rooms cleared and best score. The best score and level are saved in
    the browser's local storage. If storage is blocked, the game still
    works and says "(not saved)".

## Tuning

Balance lives in data, not code:

-   `src/data/levels.ts`: per-level difficulty multipliers, enemy lists
    per room, and reward rooms.
-   `src/data/enemies.ts`: base enemy stats and attacks.
-   `src/game/config.ts` (`Tuning`): player, dash, gun and room timings.
-   `src/logic/upgrades.ts`: upgrade amounts and caps.
-   `src/data/themes.ts`: palettes and lighting (darkness, torch colour,
    light radius).

Tests keep the values in safe bounds. For example, every enemy must stay
slower than the player, and the darkness is capped so threats stay
readable.

## Project layout

```text
src/
  main.ts          Phaser game config and scenes
  game/            Scenes (Menu, Game, Pause, Results) and config
  entities/        Player, Enemy
  systems/         ProjectileSystem (swept bullets), HighScoreStore
  rendering/       Placeholder art, light textures, LightingSystem
  ui/              HUD, upgrade panel
  data/            Room layouts (ASCII), levels, enemies, themes
  logic/           Pure, Phaser-free rules (unit tested)
tests/             Vitest suites for everything in logic/, data/ and storage
docs/              Spec, architecture, tasks, test plan, decisions log
```

Room layouts are ASCII grids, documented in `src/logic/layout.ts`:
`#` wall, `T` torch wall, `D` door, `c` crate, `b` barrel, `P` player
spawn, `E` enemy spawn.

## Known issues and limitations

-   **Enemy movement:** enemies move straight at you (or keep range)
    without pathfinding, so they can snag on pillars and crates.
-   **Balance:** set by measurement plus one full hand-played run to
    victory, not by broad playtesting. It may need tuning.
-   **Art and audio:** placeholder art only; no sound or music
    (post-v1).
-   **Foreground occlusion** (optional in the spec) is not implemented.
-   **Lighting performance:** measured as CPU time per frame
    (negligible even with ~70 enemies). GPU cost was not measured
    directly.
-   **Small windows:** text is small; the game scales to fit the window
    but has no UI scaling.
-   **Hidden tabs:** the browser pauses `requestAnimationFrame`, so the
    game freezes while the tab is hidden. This is by design and harmless.
-   **Best scores are per address:** the dev server (`:5173`) and
    `npm run preview` (`:4173`) are different origins, so they keep
    separate best scores.
-   **Bundle size:** Phaser is ~1.48 MB minified (~340 kB gzip), built
    as its own cached chunk.
-   **Phaser 3.90 bug worked around:** stopping any scene removes every
    scene's keyboard blur handler. The pause overlay sleeps instead of
    stopping, and the game scene re-registers its handler on every
    start. Details are in `docs/DECISIONS.md`.

## Documentation

-   `docs/GAME_DESIGN.md`: the v1 specification (authoritative).
-   `docs/TECHNICAL_ARCHITECTURE.md`, `docs/TEST_PLAN.md`.
-   `docs/TASKS.md`: milestone checklist.
-   `docs/DECISIONS.md`: every material decision, deviation and verified
    result, milestone by milestone.

The project began as a Claude Code starter pack (`CLAUDE.md`,
`docs/CLAUDE_FIRST_PROMPT.md`) and was built milestone by milestone.
