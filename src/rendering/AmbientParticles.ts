import * as Phaser from "phaser";
import { Depth, GAME_HEIGHT, GAME_WIDTH } from "../game/config.ts";
import { PARTICLE_STYLES, stepParticle, type AmbientParticle, type ParticleKind } from "../logic/particles.ts";
import { sheetKey, type ArtMode } from "./Art.ts";
import { LIGHT_TEXTURE_SIZE, LightTex } from "./LightTextures.ts";

const MARGIN = 16;

/**
 * A fixed pool of screen-space particles: falling leaves or snow, glowing
 * fireflies or motes. Created once per scene; nothing is allocated per frame
 * beyond the small state objects.
 */
export class AmbientParticles {
  private readonly images: Phaser.GameObjects.Image[] = [];
  private states: AmbientParticle[] = [];
  private lastScroll: { x: number; y: number } | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly kind: ParticleKind,
    art: ArtMode,
  ) {
    const style = PARTICLE_STYLES[kind];
    const glow = kind === "fireflies" || kind === "motes";
    for (let i = 0; i < style.count; i++) {
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT;
      let img: Phaser.GameObjects.Image;
      if (glow || art !== "ninja") {
        img = scene.add
          .image(x, y, LightTex.light)
          .setScale((glow ? 10 : 4) / LIGHT_TEXTURE_SIZE)
          .setTint(kind === "fireflies" ? 0xd8ff7a : kind === "motes" ? 0xc49bff : kind === "snow" ? 0xffffff : 0x9cc64a)
          .setBlendMode(glow ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
      } else {
        img = scene.add.image(x, y, sheetKey(kind === "snow" ? "snowFlake" : "leaf"), kind === "snow" ? i % 4 : i % 6);
        if (kind === "snow") img.setScale(0.6);
      }
      // Above the walk-behind layer; glowing kinds sit above the darkness.
      this.images.push(img.setScrollFactor(0).setDepth(glow ? Depth.glow + 2 : Depth.foreground + 4).setAlpha(glow ? 0.9 : 0.85));
      this.states.push({ x, y, phase: Math.random() * Math.PI * 2 });
    }
  }

  update(now: number, dtMs: number, scroll: { x: number; y: number }): void {
    const style = PARTICLE_STYLES[this.kind];
    const cam = this.lastScroll ? { dx: scroll.x - this.lastScroll.x, dy: scroll.y - this.lastScroll.y } : { dx: 0, dy: 0 };
    this.lastScroll = { x: scroll.x, y: scroll.y };
    const view = { width: GAME_WIDTH, height: GAME_HEIGHT };
    this.states = this.states.map((p, i) => {
      const next = stepParticle(p, style, dtMs, now, cam, view, MARGIN);
      const img = this.images[i];
      if (img) {
        img.setPosition(next.x, next.y);
        if (this.kind === "fireflies") img.setAlpha(0.45 + 0.45 * Math.sin(now / 400 + p.phase));
        else if (this.kind === "leaves") img.setRotation(Math.sin(now / 500 + p.phase) * 0.6);
      }
      return next;
    });
  }
}
