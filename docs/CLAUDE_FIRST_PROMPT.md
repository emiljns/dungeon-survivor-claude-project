Read `CLAUDE.md` and the documents in `docs/`. Treat
`docs/GAME_DESIGN.md` as the approved v1 specification. The written spec
wins over concept art. Do not delegate to other agents, subagents, or
other models.

I want to test Claude Code's ability to build a game end-to-end. Work
autonomously within the defined scope, but keep changes incremental and
explain material decisions.

## Before implementation

1. Inspect the repository before changing anything. Check
   `node --version`, `npm --version`, and Git status.
2. If Git is not initialized, initialize it and commit the untouched
   starter files before running `npm install` or any other command that
   creates files.
3. Then run `npm install` and the baseline commands (typecheck, tests,
   build) and record the results accurately. A test command failing
   because no test files exist is a baseline finding, not proof the
   tooling is broken.
4. Do not commit `package-lock.json` or any other generated file until
   the Milestone 0 commit.

If Git identity is not configured, do not change global Git settings.
Report it, continue implementing, and skip all commits; at the end,
list the commits that would have been made. Never claim a commit exists
unless Git confirms it.

## Scope

Implement **Milestone 0 and Milestone 1 only** from `docs/TASKS.md`.
Do not begin later milestones.

Explicitly do not implement the minimap, ammo/ammo counters/reloading,
coins/currency pickups, procedural rooms, character selection, a
Settings menu, or an alternative folder layout inferred from the concept
image. The image is mood reference only; the written spec is authoritative.

## Must include

- TypeScript strict mode, Phaser 3, Vite, and working scripts.
- Compatible dependency versions and a committed lockfile.
- A playable placeholder-graphics arena.
- WASD movement with normalized diagonal speed.
- Mouse aim and hold-left-click shooting.
- Real projectile physics/collision against walls and one chaser enemy.
- Basic player/enemy health, visible damage feedback, game over, and
  restart. Game over and restart are mandatory, not optional.
- Simple pixel-like styling; no external sprites.
- Architecture ready for five-level progression and layered 2D
  lighting, without implementing all future systems yet.
- Meaningful tests for pure logic introduced. Prefer explicit imports
  from `vitest`; keep `tsconfig.json` type declarations consistent with
  actual test configuration and remove `vitest/globals` if globals are
  not intentionally configured.
- Test fast projectiles against walls for tunnelling. Use swept
  collision/segment checks or another reliable fix if needed.
- Run typecheck, tests, and production build; report exact commands and
  results.
- Update `docs/TASKS.md` and `docs/DECISIONS.md`.
- Tell me exactly how to run and play the prototype.
- Do not claim checks or manual playtests passed unless actually
  performed.

## Git checkpoints

Keep the milestones in separate commits:
1. Untouched starter baseline.
2. Milestone 0: tooling, scripts, tests, and lockfile.
3. Milestone 1: playable combat prototype.

Do not combine Milestone 0 and Milestone 1 into one commit. Include
the commit hashes in your report. If a commit cannot be made, explain
why and do not claim it exists.

At the end, report changed files, commit hashes, commands/results,
known issues, whether manual browser playtesting was actually done,
and the next task. Stop after Milestone 1.
