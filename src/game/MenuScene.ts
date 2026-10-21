import * as Phaser from "phaser";
import { newRun } from "../logic/progression.ts";
import { browserStorage } from "../systems/HighScoreStore.ts";
import { loadSave } from "../systems/SaveStore.ts";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, PALETTE, Tuning } from "./config.ts";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("menu");
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const small = { fontFamily: FONT_FAMILY, fontSize: "11px", color: PALETTE.textDim };
    this.add
      .text(cx, 64, "NINJA SURVIVOR", { fontFamily: FONT_FAMILY, fontSize: "32px", color: PALETTE.text, fontStyle: "bold" })
      .setOrigin(0.5);
    this.add.text(cx, 96, "Five levels. One dungeon.", { ...small, fontSize: "12px" }).setOrigin(0.5);

    this.add
      .text(
        cx,
        196,
        ["WASD       Move", "Mouse      Aim", "Hold LMB   Shoot", "Space      Dash", "E          Talk / exit door", "Esc / P    Pause"].join("\n"),
        { ...small, lineSpacing: 3 },
      )
      .setOrigin(0.5);

    // Missing, malformed or blocked storage all read as a fresh save (v1 best scores migrate).
    const best = loadSave(browserStorage());
    const record = best.bestScore > 0 ? `BEST ${best.bestScore}  ·  LEVEL ${best.bestLevel}` : "NO BEST SCORE YET";
    this.add
      .text(cx, 122, `${record}   ·   SAVED COINS ${best.coins}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: PALETTE.accent,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, GAME_HEIGHT - 62, "Click or press Enter to play", {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        color: PALETTE.accent,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 600, yoyo: true, repeat: -1 });
    this.add.text(cx, GAME_HEIGHT - 20, "v1.1 · art: Ninja Adventure by Pixel-boy & AAA (CC0)", { ...small, fontSize: "9px" }).setOrigin(0.5);

    let started = false;
    const start = (): void => {
      if (started) return;
      started = true;
      // Explicit data: Phaser would otherwise reuse the last run's room/health.
      this.scene.start("game", newRun(Tuning.player.maxHealth));
    };
    this.input.once("pointerdown", start);
    this.input.keyboard?.once("keydown-ENTER", start);
    // Until the Home Village prologue exists, the village shop opens from here.
    this.add.text(cx, GAME_HEIGHT - 40, "[S] Village shop", { ...small, color: PALETTE.textDim }).setOrigin(0.5);
    this.input.keyboard?.once("keydown-S", () => {
      if (started) return;
      started = true;
      this.scene.start("shop");
    });
  }
}
