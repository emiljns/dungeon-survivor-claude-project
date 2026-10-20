// Parses hand-authored ASCII room layouts, the format used for every room.
//
//   #  wall          .  floor
//   P  player spawn  E  enemy spawn      (both are floor)
//   D  exit door     (solid until the room is cleared)
//   c  crate         b  barrel           (static props: block movement and bullets)

import type { Rect } from "./collision.ts";
import type { Vec2 } from "./vector.ts";

export type PropKind = "crate" | "barrel";

export interface Prop {
  readonly kind: PropKind;
  readonly rect: Rect;
}

export interface ParsedLayout {
  readonly cols: number;
  readonly rows: number;
  /** wall[row][col] — true only for '#' (doors and props are separate). */
  readonly wall: readonly (readonly boolean[])[];
  /** Merged wall rectangles in pixels (few large bodies instead of one per tile). */
  readonly wallRects: readonly Rect[];
  /** Merged door rectangles; each contiguous run of 'D' is one door. */
  readonly doorRects: readonly Rect[];
  readonly props: readonly Prop[];
  /** Tile-centre pixel positions. */
  readonly playerSpawn: Vec2;
  readonly enemySpawns: readonly Vec2[];
}

const PROPS: Readonly<Record<string, PropKind>> = { c: "crate", b: "barrel" };
const KNOWN = new Set(["#", ".", "P", "E", "D", ...Object.keys(PROPS)]);

export function parseLayout(rows: readonly string[], tile: number): ParsedLayout {
  const cols = rows[0]?.length ?? 0;
  if (rows.length === 0 || cols === 0) throw new Error("Layout is empty");

  const wall: boolean[][] = [];
  const door: boolean[][] = [];
  const props: Prop[] = [];
  let playerSpawn: Vec2 | null = null;
  const enemySpawns: Vec2[] = [];
  const centre = (c: number, r: number): Vec2 => ({ x: (c + 0.5) * tile, y: (r + 0.5) * tile });

  rows.forEach((line, r) => {
    if (line.length !== cols) throw new Error(`Layout row ${r} has length ${line.length}, expected ${cols}`);
    const wallRow: boolean[] = [];
    const doorRow: boolean[] = [];
    [...line].forEach((ch, c) => {
      if (!KNOWN.has(ch)) throw new Error(`Unknown layout symbol "${ch}" at ${c},${r}`);
      wallRow.push(ch === "#");
      doorRow.push(ch === "D");
      const prop = PROPS[ch];
      if (prop) props.push({ kind: prop, rect: { x: c * tile, y: r * tile, width: tile, height: tile } });
      if (ch === "P") {
        if (playerSpawn) throw new Error("Layout has more than one player spawn");
        playerSpawn = centre(c, r);
      }
      if (ch === "E") enemySpawns.push(centre(c, r));
    });
    wall.push(wallRow);
    door.push(doorRow);
  });

  if (!playerSpawn) throw new Error("Layout has no player spawn (P)");
  return {
    cols,
    rows: rows.length,
    wall,
    wallRects: mergeTiles(wall, tile),
    doorRects: mergeTiles(door, tile),
    props,
    playerSpawn,
    enemySpawns,
  };
}

/**
 * Greedy merge: horizontal runs per row, then runs with identical column
 * spans in consecutive rows are stacked into one rectangle.
 */
function mergeTiles(grid: readonly (readonly boolean[])[], tile: number): Rect[] {
  interface Open { c0: number; c1: number; r0: number; r1: number }
  const done: Open[] = [];
  let open: Open[] = [];

  grid.forEach((row, r) => {
    const runs: { c0: number; c1: number }[] = [];
    let start = -1;
    for (let c = 0; c <= row.length; c++) {
      const solid = c < row.length && row[c] === true;
      if (solid && start < 0) start = c;
      if (!solid && start >= 0) {
        runs.push({ c0: start, c1: c - 1 });
        start = -1;
      }
    }
    const next: Open[] = [];
    for (const run of runs) {
      const match = open.find((o) => o.c0 === run.c0 && o.c1 === run.c1);
      if (match) {
        match.r1 = r;
        next.push(match);
        open = open.filter((o) => o !== match);
      } else {
        next.push({ ...run, r0: r, r1: r });
      }
    }
    done.push(...open);
    open = next;
  });
  done.push(...open);

  return done.map((o) => ({
    x: o.c0 * tile,
    y: o.r0 * tile,
    width: (o.c1 - o.c0 + 1) * tile,
    height: (o.r1 - o.r0 + 1) * tile,
  }));
}
