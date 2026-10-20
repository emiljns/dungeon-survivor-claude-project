import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/config.ts";

// Gradient textures for cheap 2D lighting. Each is generated exactly once per
// game (keyed and cached by Phaser's texture manager) and then only stamped,
// scaled or tinted — no canvas or gradient is ever rebuilt per frame.

export const LightTex = {
  /** White radial falloff: erased out of the darkness, or tinted for additive glow. */
  light: "lt-light",
  /** Soft black ellipse for blob shadows. */
  shadow: "lt-shadow",
  /** Screen-sized edge darkening. */
  vignette: "lt-vignette",
  /** Small pixel flame for torches. */
  flame: "lt-flame",
} as const;

export const LIGHT_TEXTURE_SIZE = 256;

function canvasTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) throw new Error(`Could not create canvas texture ${key}`);
  draw(tex.getContext());
  tex.refresh();
}

export function ensureLightTextures(scene: Phaser.Scene): void {
  const S = LIGHT_TEXTURE_SIZE;
  canvasTexture(scene, LightTex.light, S, S, (ctx) => {
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.85)");
    g.addColorStop(0.7, "rgba(255,255,255,0.3)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  });

  canvasTexture(scene, LightTex.shadow, 32, 16, (ctx) => {
    // Draw a circle squashed into an ellipse so the falloff stays soft.
    ctx.save();
    ctx.scale(1, 0.5);
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(0.6, "rgba(0,0,0,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    ctx.restore();
  });

  canvasTexture(scene, LightTex.vignette, GAME_WIDTH, GAME_HEIGHT, (ctx) => {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const g = ctx.createRadialGradient(cx, cy, GAME_HEIGHT * 0.45, cx, cy, GAME_WIDTH * 0.62);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  });

  // 6×9 pixel flame, white so it can be tinted per theme.
  canvasTexture(scene, LightTex.flame, 6, 9, (ctx) => {
    const px = (x: number, y: number, w: number, h: number, a: number): void => {
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(x, y, w, h);
    };
    px(2, 0, 2, 2, 0.7);
    px(1, 2, 4, 3, 0.9);
    px(0, 4, 6, 3, 1);
    px(1, 7, 4, 2, 1);
    ctx.fillStyle = "#3a2a1a"; // bracket
    ctx.fillRect(2, 8, 2, 1);
  });
}
