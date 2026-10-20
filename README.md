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

## Current state: Milestone 4 upgrades and results

``` text
npm install
npm run dev        # open http://127.0.0.1:5173
npm run typecheck
npm test
npm run build      # production build in dist/ (npm run preview to serve it)
```

Click or press Enter on the menu. WASD moves, the mouse aims, holding
the left mouse button shoots, and Space dashes (brief invulnerability,
cooldown shown under HP). Each room's door stays locked until every
enemy is dead. Then stand at the door and press E to go to the next
room. The run covers five themed levels (Dungeon Ruins → Toxic Sewers →
Ancient Temple → Forgotten Foundry → The Void), with 4–5 rooms each.
Each level ends with an elite, and Level 5 with the boss. Enemies are
chasers (red), tanks (amber, hit hard), and ranged shooters (purple).
Ranged shooters flash and show an aim line before firing. Dash through
bullets to avoid them. Health carries over between rooms and is restored
at each new level.

Rooms marked "UPGRADE ON CLEAR" offer a choice of three upgrades (click
a card or press 1–3): damage, fire rate, bullet speed, move speed, max
HP, or an extra bullet. You get 9 upgrades per run. Esc or P pauses
(and shows your upgrades); M on the pause screen quits to the menu.
Score and time are shown at the top. Beating the boss, or reaching
0 HP, opens the results screen (score, highest level, time, enemies
defeated, best score). On it, R / click retries and M returns to the
menu. Your best score and level are saved in the browser and shown on
the menu. Add `?debug` to the URL to see physics bodies.
