import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/data/levels.ts";
import { ALL_LAYOUTS } from "../src/data/rooms.ts";
import { HudLayout, TILE } from "../src/game/config.ts";
import type { Rect } from "../src/logic/collision.ts";
import { parseLayout } from "../src/logic/layout.ts";

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe("HUD placement", () => {
  // Regression: the score used to sit at the top centre, on top of the door
  // in Entry Hall, Gallery and Arena.
  it.each(ALL_LAYOUTS.map((l) => [l.id, l] as const))("no HUD zone covers the door in %s", (_id, layout) => {
    const { doorRects } = parseLayout(layout.rows, TILE);
    for (const door of doorRects) {
      for (const zone of HudLayout.zones) expect(overlaps(door, zone), JSON.stringify({ door, zone })).toBe(false);
    }
  });

  // Regression: top-wall torches used to sit under the score and room label.
  it.each(ALL_LAYOUTS.map((l) => [l.id, l] as const))("no HUD zone covers a torch in %s", (_id, layout) => {
    for (const t of parseLayout(layout.rows, TILE).torches) {
      const tile: Rect = { x: t.col * TILE, y: t.row * TILE, width: TILE, height: TILE };
      for (const zone of HudLayout.zones) expect(overlaps(tile, zone), JSON.stringify({ torch: t, zone })).toBe(false);
      expect(overlaps(tile, HudLayout.bossZone), JSON.stringify({ torch: t })).toBe(false);
    }
  });

  it("the boss bar does not cover the door in any boss room", () => {
    const bossRooms = LEVELS.flatMap((l) => l.rooms).filter((r) => r.enemies.some((e) => e.kind === "boss"));
    expect(bossRooms.length).toBeGreaterThan(0);
    for (const room of bossRooms) {
      for (const door of parseLayout(room.layout.rows, TILE).doorRects) {
        expect(overlaps(door, HudLayout.bossZone)).toBe(false);
      }
    }
  });

  it("the overlap check itself catches the old top-centre position", () => {
    const oldScoreArea: Rect = { x: 320 - 66, y: 0, width: 132, height: 14 };
    const entryDoor = parseLayout(ALL_LAYOUTS[0]?.rows ?? [], TILE).doorRects[0];
    expect(entryDoor && overlaps(entryDoor, oldScoreArea)).toBe(true);
  });
});
