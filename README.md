# Dungeon Survivor --- Claude Code Project Pack

A compact, original top-down dungeon shooter inspired by the broad
room-based action roguelike genre. Do not copy Enter the Gungeon
characters, room designs, assets, names, or distinctive content.

![AI-generated concept](assets/dungeon-survivor-concept.png)

**Goal:** build a playable five-level prototype with placeholder
graphics first. Add real sprites only after movement, shooting, enemies,
room flow, physics, lighting, and progression work.

Stack: TypeScript strict mode, Phaser 3, Vite, Vitest. No backend or
online leaderboard.

## Start

1.  Extract this folder and open it in VS Code with Claude Code.
2.  Read `CLAUDE.md`.
3.  Paste `docs/CLAUDE_FIRST_PROMPT.md` into Claude Code.
4.  Let Claude work milestone-by-milestone.
5.  Once setup is implemented, run `npm install`, `npm run dev`,
    `npm run typecheck`, `npm test`, and `npm run build`.

This is a specification and starter scaffold, not a finished game.

## Current state: Milestone 1 combat prototype

``` text
npm install
npm run dev        # open http://127.0.0.1:5173
npm run typecheck
npm test
npm run build      # production build in dist/ (npm run preview to serve it)
```

Click or press Enter on the menu. WASD moves, the mouse aims, and
holding the left mouse button shoots. Kill the red chaser (it respawns)
and avoid its contact damage. At 0 HP the Game Over screen offers
R / click to restart and M for the menu. Add `?debug` to the URL to see
physics bodies.
