import * as Phaser from "phaser";
import { ANIMS, ART_BASE_PATH, SHEET_SIZES, SHEETS, type SheetId } from "../data/artManifest.ts";

// Which art the game draws with. "ninja" uses the loaded sprite sheets;
// "placeholder" is the original generated art, and is also the fallback if
// any sheet fails to load, so missing files can never break the game.

export type ArtMode = "placeholder" | "ninja";

const REGISTRY_KEY = "artMode";

/** The art mode requested by the URL: `?art=ninja` or the test room `?artroom`. */
export function requestedArtMode(search: string): ArtMode {
  const q = new URLSearchParams(search);
  return q.get("art") === "ninja" || q.has("artroom") ? "ninja" : "placeholder";
}

export function artMode(scene: Phaser.Scene): ArtMode {
  return scene.registry.get(REGISTRY_KEY) === "ninja" ? "ninja" : "placeholder";
}

export function setArtMode(scene: Phaser.Scene, mode: ArtMode): void {
  scene.registry.set(REGISTRY_KEY, mode);
}

/** Queues every sheet in the manifest on the scene's loader (call from preload). */
export function queueArt(scene: Phaser.Scene): void {
  for (const s of Object.values(SHEETS)) {
    scene.load.spritesheet(s.key, ART_BASE_PATH + s.file, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
  }
}

/**
 * Sheets that did not load correctly. Checks the textures themselves (present,
 * with exactly the expected frame count) rather than trusting loader events:
 * a dev server can answer a missing file with an HTML page and 200 OK, which
 * fails to decode without any load-error event.
 */
export function missingArt(scene: Phaser.Scene): string[] {
  return (Object.keys(SHEETS) as SheetId[])
    .filter((id) => {
      const s = SHEETS[id];
      if (!scene.textures.exists(s.key)) return true;
      const [w, h] = SHEET_SIZES[id];
      const expected = Math.floor(w / s.frameWidth) * Math.floor(h / s.frameHeight);
      // frameTotal includes Phaser's "__BASE" whole-image frame.
      return scene.textures.get(s.key).frameTotal - 1 !== expected;
    })
    .map((id) => SHEETS[id].file);
}

/** Global animations (created once; the animation manager outlives scenes). */
export function createArtAnims(scene: Phaser.Scene): void {
  for (const a of ANIMS) {
    if (scene.anims.exists(a.key)) continue;
    scene.anims.create({
      key: a.key,
      frames: scene.anims.generateFrameNumbers(SHEETS[a.sheet].key, { frames: [...a.frames] }),
      frameRate: a.frameRate,
      repeat: a.repeat,
    });
  }
}

export const sheetKey = (id: SheetId): string => SHEETS[id].key;

/**
 * Plays a one-shot effect animation at a point and removes the sprite when it
 * ends. No-op in placeholder mode, so callers need no branching.
 */
export function playFx(
  scene: Phaser.Scene,
  anim: string,
  sheet: SheetId,
  x: number,
  y: number,
  depth: number,
  opts: { scale?: number; tint?: number; rotation?: number } = {},
): void {
  if (artMode(scene) !== "ninja") return;
  const fx = scene.add.sprite(x, y, sheetKey(sheet)).setDepth(depth);
  if (opts.scale) fx.setScale(opts.scale);
  if (opts.tint !== undefined) fx.setTint(opts.tint);
  if (opts.rotation !== undefined) fx.setRotation(opts.rotation);
  fx.play(anim);
  fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
}
