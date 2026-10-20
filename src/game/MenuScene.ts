import * as Phaser from "phaser";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, PALETTE } from "./config.ts";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("menu");
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const small = { fontFamily: FONT_FAMILY, fontSize: "11px", color: PALETTE.textDim };
    this.add
      .text(cx, 80, "DUNGEON SURVIVOR", { fontFamily: FONT_FAMILY, fontSize: "32px", color: PALETTE.text, fontStyle: "bold" })
      .setOrigin(0.5);
    this.add.text(cx, 114, "Five levels. One dungeon.", { ...small, fontSize: "12px" }).setOrigin(0.5);

    this.add
      .text(cx, 180, ["WASD     Move", "Mouse    Aim", "Hold LMB Shoot"].join("\n"), { ...small, lineSpacing: 4 })
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, GAME_HEIGHT - 70, "Click or press Enter to play", {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        color: PALETTE.accent,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 600, yoyo: true, repeat: -1 });
    this.add.text(cx, GAME_HEIGHT - 20, "Milestone 1 combat prototype", { ...small, fontSize: "9px" }).setOrigin(0.5);

    let started = false;
    const start = (): void => {
      if (started) return;
      started = true;
      this.scene.start("game");
    };
    this.input.once("pointerdown", start);
    this.input.keyboard?.once("keydown-ENTER", start);
  }
}
