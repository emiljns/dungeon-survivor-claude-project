import * as Phaser from "phaser";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, PALETTE } from "./config.ts";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("menu");
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add
      .text(cx, 96, "DUNGEON SURVIVOR", { fontFamily: FONT_FAMILY, fontSize: "32px", color: PALETTE.text, fontStyle: "bold" })
      .setOrigin(0.5);
    this.add
      .text(cx, 132, "Five levels. One dungeon.", { fontFamily: FONT_FAMILY, fontSize: "12px", color: PALETTE.textDim })
      .setOrigin(0.5);
    this.add
      .text(cx, GAME_HEIGHT - 80, "Combat prototype arrives in Milestone 1", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: PALETTE.accent,
      })
      .setOrigin(0.5);
  }
}
