import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/data/levels.ts";
import { parseShowcase, showcaseLevel } from "../src/data/showcase.ts";
import { parseLayout } from "../src/logic/layout.ts";

describe("art test room", () => {
  it("is only enabled by explicit showcase data", () => {
    expect(parseShowcase(undefined)).toBeNull();
    expect(parseShowcase({ levelIndex: 2 })).toBeNull();
    expect(parseShowcase({ showcase: "yes" })).toBeNull();
    expect(parseShowcase({ showcase: { theme: "void", boss: true } })).toEqual({ theme: "void", boss: true });
    expect(parseShowcase({ showcase: { theme: 7, boss: "yes" } })).toEqual({ theme: "ruins", boss: false });
  });

  it("shows every regular enemy type plus an elite, in a room with props and torches", () => {
    const level = showcaseLevel({ theme: "ruins", boss: false });
    expect(level.rooms).toHaveLength(1);
    const room = level.rooms[0];
    expect(room?.enemies.map((e) => `${e.elite ? "elite-" : ""}${e.kind}`)).toEqual(["chaser", "tank", "ranged", "elite-chaser"]);
    const layout = parseLayout(room?.layout.rows ?? [], 16);
    expect(layout.props.length).toBeGreaterThan(0);
    expect(layout.torches.length).toBeGreaterThan(0);
    expect(layout.enemySpawns.length).toBeGreaterThanOrEqual(4);
  });

  it("uses the requested theme and that level's difficulty, falling back to level 1", () => {
    expect(showcaseLevel({ theme: "void", boss: false }).theme.id).toBe("void");
    expect(showcaseLevel({ theme: "void", boss: false }).difficulty).toEqual(LEVELS[4]?.difficulty);
    expect(showcaseLevel({ theme: "nonsense", boss: false }).theme.id).toBe("ruins");
  });

  it("adds the boss only when asked", () => {
    expect(showcaseLevel({ theme: "ruins", boss: true }).rooms[0]?.enemies[0]?.kind).toBe("boss");
    expect(showcaseLevel({ theme: "ruins", boss: false }).rooms[0]?.enemies.some((e) => e.kind === "boss")).toBe(false);
  });
});
