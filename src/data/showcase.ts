// The art test room (?artroom): one room that shows every enemy type, the
// props, torches and effects under a chosen level theme. It is a normal game
// room — same rules, hitboxes and combat — used to review art before rollout.

import { LEVELS, type LevelDefinition } from "./levels.ts";
import { STOREROOM } from "./rooms.ts";

export interface ShowcaseOptions {
  readonly theme: string;
  readonly boss: boolean;
}

/** Validates untrusted scene data; anything unexpected means "not the test room". */
export function parseShowcase(data: unknown): ShowcaseOptions | null {
  if (typeof data !== "object" || data === null) return null;
  const sc = (data as { showcase?: unknown }).showcase;
  if (typeof sc !== "object" || sc === null) return null;
  const { theme, boss } = sc as { theme?: unknown; boss?: unknown };
  return { theme: typeof theme === "string" ? theme : "ruins", boss: boss === true };
}

/** A one-room level using the theme and difficulty of the level with that theme (default: level 1). */
export function showcaseLevel(opts: ShowcaseOptions): LevelDefinition {
  const base = LEVELS.find((l) => l.theme.id === opts.theme) ?? LEVELS[0];
  if (!base) throw new Error("No levels defined");
  const chaser = { kind: "chaser", elite: false } as const;
  return {
    ...base,
    rooms: [
      {
        layout: STOREROOM,
        enemies: [
          ...(opts.boss ? [{ kind: "boss", elite: false } as const] : []),
          chaser,
          { kind: "tank", elite: false },
          { kind: "ranged", elite: false },
          { kind: "chaser", elite: true },
        ],
        reward: false,
      },
    ],
  };
}
