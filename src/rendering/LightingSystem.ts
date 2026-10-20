import * as Phaser from "phaser";
import { ART_DARKNESS_SCALE } from "../data/artManifest.ts";
import type { Theme } from "../data/themes.ts";
import { Depth, GAME_HEIGHT, GAME_WIDTH } from "../game/config.ts";
import { clampDarkness, flicker, type TorchLight } from "../logic/lighting.ts";
import type { Vec2 } from "../logic/vector.ts";
import { artMode, sheetKey } from "./Art.ts";
import { LIGHT_TEXTURE_SIZE, LightTex } from "./LightTextures.ts";

const TORCH_POOL_RADIUS = 92;
const TORCH_GLOW_RADIUS = 46;
/** Small light around each enemy so threats stay visible in dark corners. */
const ENEMY_LIGHT = { radius: 30, intensity: 0.55 } as const;
/**
 * The overlay covers the screen plus this margin on every side. The camera
 * scrolls after update(), so the overlay (placed from last frame's scroll)
 * must cover a frame of camera movement.
 */
const OVERLAY_MARGIN = 32;

interface LightStamp {
  x: number;
  y: number;
  radius: number;
  intensity: number;
}

/**
 * Cheap layered 2D lighting:
 *  1. A screen-sized RenderTexture (following the camera) filled with the
 *     theme's darkness each frame.
 *  2. Light pools erased out of it with one cached radial-gradient texture,
 *     drawn through a small pool of reusable stamp images in one batch.
 *  3. Additive glow + pixel flames on torches, and a static vignette.
 * Per frame that is one fill and one batched erase of the on-screen stamps; no
 * textures or gradients are created after setup.
 */
export class LightingSystem {
  private readonly overlay: Phaser.GameObjects.RenderTexture;
  private readonly stamps: Phaser.GameObjects.Image[] = [];
  private readonly glows: Phaser.GameObjects.Image[] = [];
  private readonly flames: (Phaser.GameObjects.Image | Phaser.GameObjects.Sprite)[] = [];
  private readonly vignette: Phaser.GameObjects.Image;
  private readonly darkness: number;
  private on = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly theme: Theme,
    private readonly torches: readonly TorchLight[],
    enabled: boolean,
  ) {
    const scale = artMode(scene) === "ninja" ? ART_DARKNESS_SCALE : 1;
    this.darkness = clampDarkness(theme.light.darkness * scale);
    const m = OVERLAY_MARGIN;
    this.overlay = scene.add.renderTexture(-m, -m, GAME_WIDTH + 2 * m, GAME_HEIGHT + 2 * m).setOrigin(0).setDepth(Depth.lighting);
    for (const t of torches) {
      this.glows.push(
        scene.add
          .image(t.flame.x, t.flame.y, LightTex.light)
          .setDepth(Depth.glow)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setTint(theme.light.torch)
          .setScale((TORCH_GLOW_RADIUS * 2) / LIGHT_TEXTURE_SIZE)
          .setAlpha(0.35),
      );
      // Sprite-art mode: the pack's animated fire (untinted: fire is fire; the glow carries the theme colour).
      const flame =
        artMode(scene) === "ninja"
          ? scene.add.sprite(t.flame.x, t.flame.y - 2, sheetKey("torchFire")).play({ key: "na-torch-fire", startFrame: Math.floor(t.seed) % 12 })
          : scene.add.image(t.flame.x, t.flame.y, LightTex.flame).setTint(theme.light.torch);
      this.flames.push(flame.setDepth(Depth.glow + 1));
    }
    this.vignette = scene.add.image(0, 0, LightTex.vignette).setOrigin(0).setScrollFactor(0).setDepth(Depth.vignette);
    this.setEnabled(enabled);
  }

  get enabled(): boolean {
    return this.on;
  }

  /** Lighting can be switched off (?nolight) for debugging and performance comparison. */
  setEnabled(on: boolean): void {
    this.on = on;
    this.overlay.setVisible(on);
    this.vignette.setVisible(on);
    for (const g of this.glows) g.setVisible(on);
    // Flames stay visible either way; they are part of the wall art.
  }

  /** `view`: the camera's scroll position (top-left of the screen in world px). */
  update(now: number, player: Vec2, enemies: readonly Vec2[], view: Vec2): void {
    this.animateTorches(now);
    if (!this.on) return;
    const ox = Math.round(view.x) - OVERLAY_MARGIN;
    const oy = Math.round(view.y) - OVERLAY_MARGIN;
    this.overlay.setPosition(ox, oy);
    const w = this.overlay.width;
    const h = this.overlay.height;

    const lights: LightStamp[] = [
      { x: player.x, y: player.y, radius: this.theme.light.playerRadius * flicker(now, 0, 0.015), intensity: 1 },
      ...this.torches.map((t) => ({
        x: t.pool.x,
        y: t.pool.y,
        radius: TORCH_POOL_RADIUS * flicker(now, t.seed, 0.05),
        intensity: 0.9,
      })),
      ...enemies.map((e) => ({ x: e.x, y: e.y, radius: ENEMY_LIGHT.radius, intensity: ENEMY_LIGHT.intensity })),
    ].filter((l) => l.x + l.radius > ox && l.x - l.radius < ox + w && l.y + l.radius > oy && l.y - l.radius < oy + h);

    while (this.stamps.length < lights.length) {
      // Not added to the display list: only ever drawn into the overlay.
      this.stamps.push(this.scene.make.image({ key: LightTex.light }, false));
    }
    const used = lights.map((l, i) => {
      const stamp = this.stamps[i];
      if (!stamp) throw new Error("light stamp pool underflow");
      return stamp.setPosition(l.x - ox, l.y - oy).setScale((l.radius * 2) / LIGHT_TEXTURE_SIZE).setAlpha(l.intensity);
    });

    this.overlay.clear();
    this.overlay.fill(this.theme.light.darkColor, this.darkness);
    this.overlay.erase(used);
  }

  private animateTorches(now: number): void {
    this.torches.forEach((t, i) => {
      const f = flicker(now, t.seed, 0.12);
      this.glows[i]?.setAlpha(0.3 * f);
      const flame = this.flames[i];
      // Animated sprites flicker on their own; only the generated flame is squashed.
      if (flame instanceof Phaser.GameObjects.Image && !(flame instanceof Phaser.GameObjects.Sprite)) flame.setScale(1, f);
    });
  }

  /** Stamp images are off the display list, so Phaser will not destroy them on shutdown. */
  destroy(): void {
    for (const s of this.stamps) s.destroy();
    this.stamps.length = 0;
  }
}
