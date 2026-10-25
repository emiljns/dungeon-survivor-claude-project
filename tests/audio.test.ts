import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEVEL_MUSIC, MUSIC, SFX, THROW_SFX, type SoundAsset } from "../src/data/audioManifest.ts";
import { LEVELS } from "../src/data/levels.ts";
import { WEAPONS } from "../src/data/weapons.ts";
import { mayRepeat, musicFor, parseMuted, pitchJitter, serializeMuted } from "../src/logic/audio.ts";

const DIR = join(__dirname, "..", "public", "assets", "ninja", "audio");
const sfx = Object.entries(SFX) as [string, SoundAsset][];
const music = Object.entries(MUSIC) as [string, SoundAsset][];

/** Duration in seconds of a PCM WAV, from its fmt and data chunk sizes. */
function wavSeconds(buf: Buffer): number {
  let pos = 12;
  let byteRate = 0;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const len = buf.readUInt32LE(pos + 4);
    if (id === "fmt ") byteRate = buf.readUInt32LE(pos + 16);
    if (id === "data") return byteRate > 0 ? len / byteRate : Infinity;
    pos += 8 + len + (len % 2);
  }
  return Infinity;
}

describe("audio manifest", () => {
  it("every effect is a real, short WAV file, and the set stays small", () => {
    let total = 0;
    for (const [id, s] of sfx) {
      const buf = readFileSync(join(DIR, s.file));
      expect(buf.toString("ascii", 0, 4) + buf.toString("ascii", 8, 12), id).toBe("RIFFWAVE");
      expect(wavSeconds(buf), `${id} length`).toBeLessThanOrEqual(2);
      total += buf.length;
    }
    expect(total).toBeLessThan(3 * 1024 * 1024); // preloaded at boot
  });

  it("every music track is a real Ogg file of a reasonable size (they stream, one at a time)", () => {
    for (const [id, s] of music) {
      const buf = readFileSync(join(DIR, s.file));
      expect(buf.toString("ascii", 0, 4), id).toBe("OggS");
      expect(statSync(join(DIR, s.file)).size, id).toBeLessThan(3 * 1024 * 1024);
    }
  });

  it("volumes are in range; busy effects are rate-limited and quieter", () => {
    for (const [id, s] of [...sfx, ...music]) {
      expect(s.volume, id).toBeGreaterThan(0);
      expect(s.volume, id).toBeLessThanOrEqual(1);
    }
    for (const id of ["throwShuriken", "throwKunai", "throwBig", "throwMagic", "enemyShot", "hit", "coin"] as const) {
      const def: SoundAsset = SFX[id];
      expect(def.minGapMs, id).toBeGreaterThan(0);
      expect(def.volume, id).toBeLessThanOrEqual(0.55);
    }
  });

  it("only files in the manifest ship, each from a distinct pack source", () => {
    const listed = new Set([...sfx, ...music].map(([, s]) => s.file));
    expect(readdirSync(DIR).filter((f) => !listed.has(f))).toEqual([]);
    const sources = [...sfx, ...music].map(([, s]) => s.source);
    expect(new Set(sources).size).toBe(sources.length);
  });

  it("every level has its own track, and every weapon its throw", () => {
    const tracks = LEVELS.map((l) => LEVEL_MUSIC[l.number]);
    expect(tracks.every((t) => t !== undefined)).toBe(true);
    expect(new Set(tracks).size).toBe(LEVELS.length);
    for (const id of Object.keys(WEAPONS) as (keyof typeof WEAPONS)[]) expect(SFX[THROW_SFX[id]], id).toBeDefined();
  });
});

describe("music choice", () => {
  const final = LEVELS.length;
  it("menu, village and results have their own tracks", () => {
    expect(musicFor({ kind: "menu" })).toBe("menu");
    expect(musicFor({ kind: "village" })).toBe("village");
    expect(musicFor({ kind: "results", outcome: "victory" })).toBe("victory");
    expect(musicFor({ kind: "results", outcome: "defeat" })).toBe("defeat");
    expect(musicFor({ kind: "results", outcome: "quit" })).toBe("defeat");
  });

  it("a level plays its track; a boss fight switches to fight music; the last boss has its own", () => {
    expect(musicFor({ kind: "level", level: 2, boss: "none", finalLevel: final })).toBe("river");
    expect(musicFor({ kind: "level", level: 2, boss: "miniboss", finalLevel: final })).toBe("miniboss");
    expect(musicFor({ kind: "level", level: 2, boss: "boss", finalLevel: final })).toBe("boss");
    expect(musicFor({ kind: "level", level: final, boss: "boss", finalLevel: final })).toBe("finalBoss");
  });
});

describe("audio rules", () => {
  it("busy effects skip repeats inside their gap", () => {
    expect(mayRepeat(undefined, 1000, 70)).toBe(true);
    expect(mayRepeat(1000, 1050, 70)).toBe(false);
    expect(mayRepeat(1000, 1070, 70)).toBe(true);
    expect(mayRepeat(1000, 1001, undefined)).toBe(true);
  });

  it("the mute setting survives a round trip; missing or garbage values mean sound on", () => {
    expect(parseMuted(serializeMuted(true))).toBe(true);
    expect(parseMuted(serializeMuted(false))).toBe(false);
    for (const raw of [null, undefined, "", "true", "{}"]) expect(parseMuted(raw)).toBe(false);
  });

  it("pitch jitter stays within ±spread cents", () => {
    expect(pitchJitter(0)).toBe(-120);
    expect(pitchJitter(1)).toBe(120);
    expect(pitchJitter(0.5)).toBe(0);
    expect(Math.abs(pitchJitter(0.9, 50))).toBeLessThanOrEqual(50);
  });
});
