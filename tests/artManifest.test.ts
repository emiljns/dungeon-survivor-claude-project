import { existsSync, openSync, readFileSync, readSync, closeSync } from "node:fs";
import { BIOMES, biomeFor } from "../src/data/biomes.ts";
import { DECOR, type DecorDef } from "../src/data/decor.ts";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ANIMS,
  ART_PACK,
  DIRECTIONS,
  ENEMY_SHEET,
  idleFrame,
  SHEET_SIZES,
  SHEETS,
  THEME_ART,
  TILE_FRAMES,
  walkFrames,
  type SheetId,
} from "../src/data/artManifest.ts";
import { THEMES } from "../src/data/themes.ts";
import { facingFromVector } from "../src/logic/facing.ts";

const ASSET_DIR = join(process.cwd(), "public", "assets", "ninja");
const sheetIds = Object.keys(SHEETS) as SheetId[];

/** Width and height from a PNG file's IHDR chunk. */
function pngSize(file: string): [number, number] {
  const fd = openSync(file, "r");
  const buf = Buffer.alloc(24);
  readSync(fd, buf, 0, 24, 0);
  closeSync(fd);
  expect(buf.readUInt32BE(0), `${file} is not a PNG`).toBe(0x89504e47);
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

const frameCount = (id: SheetId): number => {
  const s = SHEETS[id];
  const [w, h] = SHEET_SIZES[id];
  return Math.floor(w / s.frameWidth) * Math.floor(h / s.frameHeight);
};

describe("art manifest: files on disk", () => {
  it.each(sheetIds.map((id) => [id] as const))("%s exists, is a PNG of the recorded size, and divides into whole frames", (id) => {
    const s = SHEETS[id];
    const file = join(ASSET_DIR, s.file);
    expect(existsSync(file), file).toBe(true);
    const [w, h] = pngSize(file);
    expect([w, h]).toEqual(SHEET_SIZES[id]);
    expect(w % s.frameWidth, `${id} width`).toBe(0);
    expect(h % s.frameHeight, `${id} height`).toBe(0);
  });

  it("uses unique texture keys and file names", () => {
    expect(new Set(sheetIds.map((id) => SHEETS[id].key)).size).toBe(sheetIds.length);
    expect(new Set(sheetIds.map((id) => SHEETS[id].file)).size).toBe(sheetIds.length);
  });

  it("records the pack source of every sheet, and the pack is credited with its licence", () => {
    for (const id of sheetIds) expect(SHEETS[id].source.length, id).toBeGreaterThan(5);
    expect(ART_PACK.license).toBe("CC0-1.0");
    const credits = readFileSync(join(process.cwd(), "CREDITS.md"), "utf8");
    expect(credits).toContain(ART_PACK.name);
    expect(credits).toContain("Pixel-boy");
    expect(credits).toContain("AAA");
    expect(credits).toContain("CC0");
  });
});

describe("art manifest: animations and tiles reference real frames", () => {
  it("every animation frame exists in its sheet, and keys are unique", () => {
    for (const a of ANIMS) {
      for (const f of a.frames) {
        expect(f, a.key).toBeGreaterThanOrEqual(0);
        expect(f, a.key).toBeLessThan(frameCount(a.sheet));
      }
    }
    expect(new Set(ANIMS.map((a) => a.key)).size).toBe(ANIMS.length);
  });

  it("player and every regular enemy have a walk animation for all four directions", () => {
    for (const sheet of ["player", ...Object.values(ENEMY_SHEET)] as SheetId[]) {
      for (const dir of DIRECTIONS) expect(ANIMS.some((a) => a.sheet === sheet && a.key.endsWith(`-walk-${dir}`)), `${sheet} ${dir}`).toBe(true);
    }
  });

  it("directional sheets: columns are directions, rows are walk frames", () => {
    expect(walkFrames("down")).toEqual([0, 4, 8, 12]);
    expect(walkFrames("right")).toEqual([3, 7, 11, 15]);
    expect(DIRECTIONS.map(idleFrame)).toEqual([0, 1, 2, 3]);
  });

  it("every tile frame is inside its sheet, and every level theme has tile art", () => {
    for (const [name, t] of Object.entries(TILE_FRAMES)) expect(t.frame, name).toBeLessThan(frameCount(t.sheet));
    for (const theme of Object.values(THEMES)) {
      if (biomeFor(theme.id)) continue; // outdoor themes: checked below
      const art = THEME_ART[theme.id];
      expect(art, theme.id).toBeDefined();
      if (!art) continue;
      expect(TILE_FRAMES[art.floor]).toBeDefined();
      expect(TILE_FRAMES[art.wall]).toBeDefined();
    }
  });
});

describe("world kit art references real tiles", () => {
  const inSheet = (sheet: SheetId, col: number, row: number): boolean => {
    const s = SHEETS[sheet];
    const [w, h] = SHEET_SIZES[sheet];
    return col >= 0 && row >= 0 && col < Math.floor(w / s.frameWidth) && row < Math.floor(h / s.frameHeight);
  };

  it("every biome's ground, cliff (3x3) and shore (4x4) blocks lie inside their sheets", () => {
    for (const [id, b] of Object.entries(BIOMES)) {
      expect(b.ground.length, id).toBeGreaterThan(0);
      for (const g of b.ground) expect(inSheet(g.sheet, g.col, g.row), `${id} ground`).toBe(true);
      expect(inSheet("relief", b.cliff.col + 2, b.cliff.row + 2), `${id} cliff`).toBe(true);
      expect(inSheet("water", b.water.col + 3, b.water.row + 3), `${id} water`).toBe(true);
    }
  });

  it("every decoration's tiles lie inside its sheet; solid and canopy areas fit the object", () => {
    for (const [id, d] of Object.entries(DECOR) as [string, DecorDef][]) {
      expect(inSheet(d.sheet, d.col, d.row) && inSheet(d.sheet, d.col + d.w - 1, d.row + d.h - 1), id).toBe(true);
      if (d.solid) {
        expect(d.solid.col + d.solid.cols <= d.w && d.solid.row + d.solid.rows <= d.h, `${id} solid`).toBe(true);
        expect(d.solid.row, `${id}: blocking starts below the canopy`).toBeGreaterThanOrEqual(d.canopy ?? 0);
      }
      if (d.kind !== "walkover") expect(d.solid, `${id} needs a solid area`).toBeDefined();
      if (d.anim) expect(ANIMS.some((a) => a.key === d.anim), `${id} anim`).toBe(true);
      if (d.anim) expect(d.w === 1 && d.h === 1, `${id}: animated objects are 1x1`).toBe(true);
      if (d.kind === "breakable") expect(d.breakable?.hp, id).toBeGreaterThan(0);
    }
  });
});

describe("facingFromVector", () => {
  it("picks the dominant axis", () => {
    expect(facingFromVector({ x: 1, y: 0.2 }, "down")).toBe("right");
    expect(facingFromVector({ x: -0.3, y: -1 }, "down")).toBe("up");
    expect(facingFromVector({ x: 0.1, y: 0.9 }, "up")).toBe("down");
    expect(facingFromVector({ x: -1, y: 0 }, "down")).toBe("left");
  });

  it("exact diagonals face sideways; zero keeps the previous facing", () => {
    expect(facingFromVector({ x: 1, y: 1 }, "up")).toBe("right");
    expect(facingFromVector({ x: -1, y: -1 }, "down")).toBe("left");
    expect(facingFromVector({ x: 0, y: 0 }, "up")).toBe("up");
  });
});
