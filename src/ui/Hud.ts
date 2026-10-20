import * as Phaser from "phaser";
import { Depth, FONT_FAMILY, PALETTE } from "../game/config.ts";
import type { HealthState } from "../logic/health.ts";

/** Screen-space HUD. scrollFactor 0 keeps it fixed if a camera moves later. */
export class Hud {
  private readonly hearts: Phaser.GameObjects.Graphics;
  private shown = "";

  constructor(scene: Phaser.Scene) {
    scene.add
      .text(6, 3, "HP", { fontFamily: FONT_FAMILY, fontSize: "10px", color: PALETTE.text, fontStyle: "bold" })
      .setScrollFactor(0)
      .setDepth(Depth.hud);
    this.hearts = scene.add.graphics().setScrollFactor(0).setDepth(Depth.hud);
  }

  update(health: HealthState): void {
    const key = `${health.current}/${health.max}`;
    if (key === this.shown) return;
    this.shown = key;
    this.hearts.clear();
    for (let i = 0; i < health.max; i++) {
      const x = 26 + i * 11;
      this.hearts.fillStyle(0x0a0d16).fillRect(x, 4, 9, 9);
      this.hearts.fillStyle(i < health.current ? 0xff5d73 : 0x3a2030).fillRect(x + 1, 5, 7, 7);
      if (i < health.current) this.hearts.fillStyle(0xffb3bd).fillRect(x + 2, 6, 2, 2);
    }
  }
}
